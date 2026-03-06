const creditService = require("./credit.service");
const { createAudit } = require("@/utils/audit.util");

async function upsertPolicy(req, res, next) {
  try {
    const policy = await creditService.updatePolicy({
      shopId: req.shop._id,
      allowCredit: req.body.allowCredit,
      defaultLimit: req.body.defaultLimit,
      maxOverdueDays: req.body.maxOverdueDays,
      autoBlockCustomer: req.body.autoBlockCustomer,
    });

    await createAudit({
      action: "CREDIT_POLICY_UPDATED",
      performedBy: req.user._id,
      targetType: "CreditPolicy",
      targetId: policy._id,
      req,
    });

    res.json({
      success: true,
      policy,
    });
  } catch (err) {
    next(err);
  }
}

async function getPolicy(req, res, next) {
  try {
    const policy = await creditService.getOrCreatePolicy(req.shop._id);
    res.json({
      success: true,
      policy,
    });
  } catch (err) {
    next(err);
  }
}

async function registerCustomer(req, res, next) {
  try {
    const { phone, name } = req.body;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "phone is required",
      });
    }

    const result = await creditService.registerCustomer({
      shopId: req.shop._id,
      phone,
      name,
    });

    await createAudit({
      action: "CREDIT_CUSTOMER_REGISTERED",
      performedBy: req.user._id,
      targetType: "CustomerIdentity",
      targetId: result.customer._id,
      req,
    });

    res.status(201).json({
      success: true,
      customer: result.customer,
      account: result.account,
    });
  } catch (err) {
    next(err);
  }
}

async function issueCredit(req, res, next) {
  try {
    const { customerId, amount, reference, meta } = req.body;
    const result = await creditService.issueCredit({
      shopId: req.shop._id,
      customerId,
      amount,
      reference,
      meta,
      idempotencyKey: req.headers["idempotency-key"] || null,
    });

    await createAudit({
      action: "CREDIT_ISSUED",
      performedBy: req.user._id,
      targetType: "CreditAccount",
      targetId: result.account?._id,
      req,
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

async function receivePayment(req, res, next) {
  try {
    const { customerId, amount, reference, meta } = req.body;
    const result = await creditService.receivePayment({
      shopId: req.shop._id,
      customerId,
      amount,
      reference,
      meta,
      idempotencyKey: req.headers["idempotency-key"] || null,
    });

    await createAudit({
      action: "CREDIT_PAYMENT_RECEIVED",
      performedBy: req.user._id,
      targetType: "CreditAccount",
      targetId: result.account?._id,
      req,
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

async function getCustomerCredit(req, res, next) {
  try {
    const result = await creditService.getCustomerCredit({
      shopId: req.shop._id,
      customerId: req.params.customerId,
      historyLimit: req.query.limit,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

async function listDueAccounts(req, res, next) {
  try {
    const data = await creditService.listDueAccounts({
      shopId: req.shop._id,
      overdueOnly: String(req.query.overdueOnly || "false") === "true",
      limit: req.query.limit,
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function remindersReady(req, res, next) {
  try {
    const data = await creditService.getReminderReadyAccounts({
      shopId: req.shop._id,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upsertPolicy,
  getPolicy,
  registerCustomer,
  issueCredit,
  receivePayment,
  getCustomerCredit,
  listDueAccounts,
  remindersReady,
};
