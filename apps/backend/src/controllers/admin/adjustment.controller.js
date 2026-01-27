const Ledger = require('../../models/ledger.model');
const ShopWallet = require('../../models/ShopWallet');
const AuditLog = require('../../models/AuditLog');
const mongoose = require('mongoose');

/**
 * REFUND AFTER SETTLEMENT (ledger-safe)
 */
exports.refundShop = async (req, res) => {
  const { shopId, amount, reason } = req.body;

  if (!reason || amount <= 0) {
    return res.status(400).json({ message: 'Invalid refund request' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await ShopWallet.findOne({ shopId }).session(session);
    if (!wallet) throw new Error('Wallet not found');

    await Ledger.create(
      [
        {
          walletId: wallet._id,
          amount,
          type: 'REFUND',
          direction: 'DEBIT',
          meta: { reason }
        }
      ],
      { session }
    );

    wallet.balance -= amount;
    await wallet.save({ session });

    await AuditLog.create(
      [
        {
          actorId: req.user._id,
          actorRole: req.user.role,
          shopId,
          referenceType: 'REFUND',
          amount,
          direction: 'DEBIT',
          reason
        }
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({ message: 'Refund completed (ledger-safe)' });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * MANUAL ADJUSTMENT (credit/debit)
 */
exports.adjustWallet = async (req, res) => {
  const { shopId, amount, direction, reason } = req.body;

  if (!['CREDIT', 'DEBIT'].includes(direction)) {
    return res.status(400).json({ message: 'Invalid direction' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await ShopWallet.findOne({ shopId }).session(session);
    if (!wallet) throw new Error('Wallet not found');

    await Ledger.create(
      [
        {
          walletId: wallet._id,
          amount,
          type: 'MANUAL_ADJUSTMENT',
          direction,
          meta: { reason }
        }
      ],
      { session }
    );

    wallet.balance += direction === 'CREDIT' ? amount : -amount;
    await wallet.save({ session });

    await AuditLog.create(
      [
        {
          actorId: req.user._id,
          actorRole: req.user.role,
          shopId,
          referenceType: 'ADJUSTMENT',
          amount,
          direction,
          reason
        }
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({ message: 'Adjustment applied' });
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};
