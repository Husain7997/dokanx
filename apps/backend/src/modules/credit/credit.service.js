const mongoose = require("mongoose");
const CreditAccount = require("./credit.account.model");
const CreditLedger = require("./credit.ledger.model");
const CreditPolicy = require("./credit.policy.model");
const { findOrCreateCustomer } = require("@/modules/customer/customer.index.service");
const { eventBus, lockManager } = require("@/core/infrastructure");

function toRiskLevel(score) {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function calculateRisk({ overdueDays, outstandingBalance, recentLateCount }) {
  const overdueWeight = Math.min(overdueDays * 2, 50);
  const exposureWeight = outstandingBalance > 0 ? Math.min(outstandingBalance / 1000, 25) : 0;
  const behaviorWeight = Math.min(recentLateCount * 5, 25);
  return Math.round(overdueWeight + exposureWeight + behaviorWeight);
}

function computeOverdueDays(account) {
  if (!account?.dueSince || !account?.outstandingBalance) return 0;
  const diffMs = Date.now() - new Date(account.dueSince).getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function getOrCreatePolicy(shopId) {
  let policy = await CreditPolicy.findOne({ shop: shopId });
  if (!policy) {
    policy = await CreditPolicy.create({ shop: shopId });
  }
  return policy;
}

async function updatePolicy({
  shopId,
  allowCredit,
  defaultLimit,
  maxOverdueDays,
  autoBlockCustomer,
}) {
  const policy = await CreditPolicy.findOneAndUpdate(
    { shop: shopId },
    {
      $set: {
        ...(allowCredit !== undefined ? { allowCredit: Boolean(allowCredit) } : {}),
        ...(defaultLimit !== undefined ? { defaultLimit: Math.max(Number(defaultLimit) || 0, 0) } : {}),
        ...(maxOverdueDays !== undefined ? { maxOverdueDays: Math.max(Number(maxOverdueDays) || 0, 0) } : {}),
        ...(autoBlockCustomer !== undefined ? { autoBlockCustomer: Boolean(autoBlockCustomer) } : {}),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return policy;
}

async function getOrCreateAccount({
  shopId,
  customerId,
  session,
}) {
  const policy = await getOrCreatePolicy(shopId);
  let account = await CreditAccount.findOne({
    shop: shopId,
    customer: customerId,
  }).session(session || null);

  if (!account) {
    account = await CreditAccount.create(
      [
        {
          shop: shopId,
          customer: customerId,
          creditLimit: policy.defaultLimit,
        },
      ],
      session ? { session } : {}
    );
    account = account[0];
  }

  return { account, policy };
}

async function registerCustomer({
  shopId,
  phone,
  name,
}) {
  const customer = await findOrCreateCustomer({ shopId, phone, name });
  const { account } = await getOrCreateAccount({
    shopId,
    customerId: customer._id,
  });
  return { customer, account };
}

async function writeLedger({
  shopId,
  customerId,
  type,
  amount,
  reference,
  idempotencyKey,
  meta = {},
  session,
}) {
  return CreditLedger.create(
    [
      {
        shop: shopId,
        customer: customerId,
        type,
        amount,
        reference: reference || "",
        idempotencyKey: idempotencyKey || null,
        meta,
      },
    ],
    session ? { session } : {}
  );
}

async function issueCredit({
  shopId,
  customerId,
  amount,
  reference,
  idempotencyKey,
  meta = {},
}) {
  const creditAmount = Number(amount);
  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    throw new Error("Invalid credit amount");
  }

  const lockKey = `credit:issue:${shopId}:${customerId}:${idempotencyKey || reference || Date.now()}`;
  const acquired = await lockManager.acquire(lockKey);
  if (!acquired) throw new Error("Credit operation locked");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (idempotencyKey) {
      const existing = await CreditLedger.findOne({ idempotencyKey }).session(session);
      if (existing) {
        await session.commitTransaction();
        session.endSession();
        return { duplicate: true, ledger: existing };
      }
    }

    const { account, policy } = await getOrCreateAccount({
      shopId,
      customerId,
      session,
    });

    if (!policy.allowCredit) throw new Error("Credit is disabled by policy");
    if (account.status !== "ACTIVE") throw new Error("Customer credit account is blocked");

    const nextOutstanding = account.outstandingBalance + creditAmount;
    if (account.creditLimit > 0 && nextOutstanding > account.creditLimit) {
      throw new Error("Credit limit exceeded");
    }

    const [ledger] = await writeLedger({
      shopId,
      customerId,
      type: "CREDIT_ISSUED",
      amount: creditAmount,
      reference,
      idempotencyKey,
      meta,
      session,
    });

    account.outstandingBalance = nextOutstanding;
    account.totalCreditIssued += creditAmount;
    account.lastCreditAt = new Date();
    if (!account.dueSince) account.dueSince = new Date();

    account.overdueDays = computeOverdueDays(account);
    account.riskScore = calculateRisk({
      overdueDays: account.overdueDays,
      outstandingBalance: account.outstandingBalance,
      recentLateCount: 0,
    });
    account.riskLevel = toRiskLevel(account.riskScore);

    if (
      policy.autoBlockCustomer &&
      policy.maxOverdueDays > 0 &&
      account.overdueDays > policy.maxOverdueDays
    ) {
      account.status = "BLOCKED";
    }

    await account.save({ session });
    await session.commitTransaction();

    eventBus.emit("CREDIT_ISSUED", {
      shopId: String(shopId),
      customerId: String(customerId),
      amount: creditAmount,
      outstandingBalance: account.outstandingBalance,
    });

    return { account, ledger };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
    await lockManager.release(lockKey);
  }
}

async function receivePayment({
  shopId,
  customerId,
  amount,
  reference,
  idempotencyKey,
  meta = {},
}) {
  const paymentAmount = Number(amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const lockKey = `credit:payment:${shopId}:${customerId}:${idempotencyKey || reference || Date.now()}`;
  const acquired = await lockManager.acquire(lockKey);
  if (!acquired) throw new Error("Credit operation locked");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (idempotencyKey) {
      const existing = await CreditLedger.findOne({ idempotencyKey }).session(session);
      if (existing) {
        await session.commitTransaction();
        session.endSession();
        return { duplicate: true, ledger: existing };
      }
    }

    const { account } = await getOrCreateAccount({
      shopId,
      customerId,
      session,
    });

    const nextOutstanding = Math.max(account.outstandingBalance - paymentAmount, 0);
    const paidAgainstDue = Math.min(account.outstandingBalance, paymentAmount);
    const advance = paymentAmount - paidAgainstDue;

    const [ledger] = await writeLedger({
      shopId,
      customerId,
      type: "PAYMENT_RECEIVED",
      amount: paymentAmount,
      reference,
      idempotencyKey,
      meta: {
        ...meta,
        paidAgainstDue,
        advance,
      },
      session,
    });

    account.outstandingBalance = nextOutstanding;
    account.totalPaymentsReceived += paidAgainstDue;
    account.lastPaymentAt = new Date();
    account.overdueDays = computeOverdueDays(account);

    if (account.outstandingBalance === 0) {
      account.dueSince = null;
      account.overdueDays = 0;
    }

    account.riskScore = calculateRisk({
      overdueDays: account.overdueDays,
      outstandingBalance: account.outstandingBalance,
      recentLateCount: 0,
    });
    account.riskLevel = toRiskLevel(account.riskScore);

    if (account.status === "BLOCKED" && account.overdueDays === 0) {
      account.status = "ACTIVE";
    }

    await account.save({ session });
    await session.commitTransaction();

    eventBus.emit("CREDIT_PAYMENT_RECEIVED", {
      shopId: String(shopId),
      customerId: String(customerId),
      amount: paymentAmount,
      outstandingBalance: account.outstandingBalance,
    });

    return { account, ledger };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
    await lockManager.release(lockKey);
  }
}

async function getCustomerCredit({
  shopId,
  customerId,
  historyLimit = 30,
}) {
  const account = await CreditAccount.findOne({
    shop: shopId,
    customer: customerId,
  }).lean();

  if (!account) {
    throw new Error("Credit account not found");
  }

  const history = await CreditLedger.find({
    shop: shopId,
    customer: customerId,
  })
    .sort({ createdAt: -1 })
    .limit(Math.max(Number(historyLimit) || 30, 1))
    .lean();

  return { account, history };
}

async function listDueAccounts({
  shopId,
  overdueOnly = false,
  limit = 50,
}) {
  const policy = await getOrCreatePolicy(shopId);

  const accounts = await CreditAccount.find({
    shop: shopId,
    outstandingBalance: { $gt: 0 },
  })
    .sort({ updatedAt: -1 })
    .limit(Math.max(Number(limit) || 50, 1))
    .populate("customer", "phone name riskLevel globalCreditScore")
    .lean();

  const decorated = accounts.map(account => {
    const overdueDays = computeOverdueDays(account);
    const reminderReady = overdueDays > 0;
    const highRisk = account.riskLevel === "HIGH" || overdueDays > policy.maxOverdueDays;

    return {
      ...account,
      overdueDays,
      reminderReady,
      highRisk,
    };
  });

  if (overdueOnly) {
    return decorated.filter(a => a.overdueDays > 0);
  }
  return decorated;
}

async function getReminderReadyAccounts({
  shopId,
  limit = 100,
}) {
  const dueAccounts = await listDueAccounts({
    shopId,
    overdueOnly: true,
    limit,
  });

  return dueAccounts
    .filter(a => a.customer?.phone)
    .map(a => ({
      customerId: a.customer?._id,
      phone: a.customer?.phone,
      name: a.customer?.name || "Customer",
      outstandingBalance: a.outstandingBalance,
      overdueDays: a.overdueDays,
      riskLevel: a.riskLevel,
      reminderType: "SMS_READY",
    }));
}

module.exports = {
  getOrCreatePolicy,
  updatePolicy,
  registerCustomer,
  issueCredit,
  receivePayment,
  getCustomerCredit,
  listDueAccounts,
  getReminderReadyAccounts,
};
