const service =
require("./idempotency.service");

module.exports = async (req,res,next)=>{

  const key = req.headers["idempotency-key"];

  if(!key)
    return res.status(400).json({
      success: false,
      error:"Idempotency-Key required",
      message: "Idempotency-Key required",
    });

  const existing =
    await service.findExisting(key);

  if(existing)
    return res
      .status(existing.statusCode)
      .json(existing.response);

  const original = res.json.bind(res);

  res.json = async body => {

    await service.saveResult({
      key,
      route:req.originalUrl,
      requestHash:
        JSON.stringify(req.body),
      response:body,
      statusCode:res.statusCode,
      shop:req.shop?._id
    });

    return original(body);
  };

  next();
};
