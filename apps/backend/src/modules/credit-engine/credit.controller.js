const creditService = require("./credit.service");

exports.createCreditSale = async (req, res, next) => {
  try {
    const data = await creditService.createCreditSale(req.body || {}, req.user);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerDue = async (req, res, next) => {
  try {
    const data = await creditService.getCustomerDue(req.params.id, req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.getMyCredit = async (req, res, next) => {
  try {
    const data = await creditService.getMyCredit(req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.getShopCreditCustomers = async (req, res, next) => {
  try {
    const data = await creditService.getShopCreditCustomers(req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.upsertCreditPolicy = async (req, res, next) => {
  try {
    const data = await creditService.upsertCreditPolicy(req.body || {}, req.user, req);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.payDue = async (req, res, next) => {
  try {
    const data = await creditService.payDue(req.body || {}, req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
