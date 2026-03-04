const mongoose = require("mongoose");
const PaymentAttempt =
  require("../models/paymentAttempt.model");

const {
  acquirePaymentLock,
  releasePaymentLock,
} = require("../system/locks/paymentLock.service");

const {
  transitionOrder,
} = require("./orderState.service");

exports.processSuccessfulPayment =
  async ({ providerPaymentId, webhookEventId }) => {

    const lockKey = providerPaymentId;

    await acquirePaymentLock(lockKey);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

      const payment =
        await PaymentAttempt.findOne({
          providerPaymentId,
        }).session(session);

      if (!payment)
        throw new Error("Payment not found");

      if (payment.processed) {
        await releasePaymentLock(lockKey);
        return;
      }

      await transitionOrder({
        orderId: payment.order,
        nextStatus: "CONFIRMED",
      });

      payment.status = "SUCCESS";
      payment.processed = true;
      payment.processedAt = new Date();
      payment.webhookEventId =
        webhookEventId;

      await payment.save({ session });

      await session.commitTransaction();

    } catch (err) {

      await session.abortTransaction();
      throw err;

    } finally {

      await releasePaymentLock(lockKey);
      session.endSession();
    }
};