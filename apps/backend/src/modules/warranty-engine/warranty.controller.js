const warrantyService = require("./warranty.service");

exports.createClaim = async (req, res, next) => {
  try {
    const data = await warrantyService.createClaim(req.body || {}, req.user);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerClaims = async (req, res, next) => {
  try {
    const data = await warrantyService.listCustomerClaims(req.params.id, req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.listClaims = async (req, res, next) => {
  try {
    const data = await warrantyService.listAllClaims(req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.getShopClaims = async (req, res, next) => {
  try {
    const data = await warrantyService.listShopClaims(req.params.shopId, req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.updateClaimStatus = async (req, res, next) => {
  try {
    const data = await warrantyService.updateClaimStatus(req.params.id, req.body || {}, req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (_req, res, next) => {
  try {
    const data = await warrantyService.getAnalytics();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
