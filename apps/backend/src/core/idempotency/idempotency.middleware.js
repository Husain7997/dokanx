const service =
require("./idempotency.service");

module.exports = async (req,res,next)=>{

  const rawKey = req.headers["idempotency-key"];

  if(!rawKey)
    return res.status(400).json({
      error:"Idempotency-Key required"
    });

  const requestHash = service.hashRequest({
    body: req.body || {},
    params: req.params || {},
    query: req.query || {},
  });
  const scopedKey = `${req.method}:${req.baseUrl}${req.route?.path || req.path}:${String(rawKey)}`;

  const existing =
    await service.findExisting(scopedKey);

  if (existing) {
    if (existing.requestHash && existing.requestHash !== requestHash) {
      return res.status(409).json({
        error: "Idempotency-Key reused with different request payload",
      });
    }

    return res
      .status(existing.statusCode)
      .json(existing.response);
  }

  const pendingRecord = await service.findRecord(scopedKey);
  if (pendingRecord && pendingRecord.status === "PENDING") {
    if (pendingRecord.requestHash && pendingRecord.requestHash !== requestHash) {
      return res.status(409).json({
        error: "Idempotency-Key reused with different request payload",
      });
    }

    return res.status(409).json({
      error: "Request with this Idempotency-Key is still processing",
    });
  }

  await service.reserveExecution({
    key: scopedKey,
    scope: req.baseUrl || "api",
    route: req.originalUrl,
    requestHash,
    ttlMs: 24 * 60 * 60 * 1000,
  });

  const original = res.json.bind(res);

  res.json = async body => {

    await service.saveResult({
      key: scopedKey,
      route:req.originalUrl,
      requestHash,
      response:body,
      statusCode:res.statusCode,
      shop:req.shop?._id
    });

    return original(body);
  };

  next();
};
