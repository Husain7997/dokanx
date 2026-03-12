import { Router, Request, Response } from 'express';
import { Wallet } from '../domain/Wallet';
import WalletModel from '../infrastructure/database/models/Wallet';
import LedgerEntryModel from '../infrastructure/database/models/LedgerEntry';
import { redisClient } from '../infrastructure/redis';
import { LedgerEntry } from '../domain/LedgerEntry';

const router = Router();

// GET /api/wallet/balance - Get wallet balance with double-entry validation
router.get('/balance', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    // Redis cache check (5 minutes)
    const cached = await redisClient.get(`wallet:balance:${req.tenantId}`);
    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached)
      });
    }

    const walletDoc = await WalletModel.findOne({ tenantId: req.tenantId });

    if (!walletDoc) {
      return res.status(404).json({
        success: false,
        message: 'ওয়ালেট খুঁজে পাওয়া যায়নি'
      });
    }

    const wallet = new Wallet({
      id: walletDoc._id.toString(),
      tenantId: walletDoc.tenantId,
      balance: walletDoc.balance,
      currency: walletDoc.currency,
      createdAt: walletDoc.createdAt,
      updatedAt: walletDoc.updatedAt
    });

    // Cache for 300 seconds (5 min)
    await redisClient.set(
      `wallet:balance:${req.tenantId}`,
      JSON.stringify(wallet.toJSON()),
      { EX: 300 }
    );

    res.json({
      success: true,
      data: wallet.toJSON()
    });

  } catch (error) {
    console.error('ওয়ালেট ব্যালেন্স ফেচ এড়ে:', error);
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি' });
  }
});

// POST /api/wallet/credit - Credit to wallet (order payment) with double-entry
router.post('/credit', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { amount, orderId, reference } = req.body;

    if (!amount || amount <= 0 || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'ভ্যালিড অ্যামাউন্ট ও অর্ডার আইডি দিতে হবে'
      });
    }

    // Generate idempotency key
    const idempotencyKey = `wallet_credit:${req.tenantId}:${orderId}:${Date.now()}`;

    // Redis lock (prevent duplicate transactions)
    const lockKey = `lock:wallet:${req.tenantId}`;
    const lock = await redisClient.set(lockKey, '1', { PX: 15000, NX: true });

    if (!lock) {
      return res.status(429).json({
        success: false,
        message: 'ট্রানজেকশন লক, কিছুক্ষণ পর চেষ্টা করুন'
      });
    }

    try {
      // Atomic transaction using MongoDB session
      const session = await (await import('mongoose')).default.startSession();
      session.startTransaction();

      try {
        // 1. Get wallet
        const walletDoc = await WalletModel.findOne({ tenantId: req.tenantId }).session(session);
        if (!walletDoc) {
          await session.abortTransaction();
          return res.status(404).json({ success: false, message: 'ওয়ালেট না পাওয়া' });
        }

        const wallet = new Wallet({
          id: walletDoc._id.toString(),
          tenantId: req.tenantId,
          balance: walletDoc.balance,
          currency: walletDoc.currency,
          createdAt: walletDoc.createdAt,
          updatedAt: walletDoc.updatedAt
        });

        // 2. Create double-entry ledger
        const debitEntry = LedgerEntry.createDebitEntry(
          req.tenantId,
          orderId,
          amount,
          `অর্ডার #${orderId} পেমেন্ট রিসিভ`,
          reference
        );

        const creditEntry = LedgerEntry.createCreditEntry(
          req.tenantId,
          orderId,
          amount,
          `কাস্টমার পেমেন্ট: অর্ডার #${orderId}`,
          reference
        );

        // Validate double-entry
        LedgerEntry.validateDoubleEntry([debitEntry, creditEntry]);

        // 3. Save ledger entries
        const debitDoc = new LedgerEntryModel(debitEntry.toJSON());
        const creditDoc = new LedgerEntryModel(creditEntry.toJSON());
        
        await debitDoc.save({ session });
        await creditDoc.save({ session });

        // 4. Update wallet balance (credit operation)
        wallet.credit(amount);
        walletDoc.balance = wallet.balance;
        await walletDoc.save({ session });

        // 5. Clear cache
        await redisClient.del(`wallet:balance:${req.tenantId}`);

        await session.commitTransaction();

        res.json({
          success: true,
          data: {
            newBalance: wallet.balance,
            ledgerEntries: [debitEntry.toJSON(), creditEntry.toJSON()]
          }
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } finally {
      // Release lock
      await redisClient.del(lockKey);
    }

  } catch (error: any) {
    console.error('ওয়ালেট ক্রেডিট এড়ে:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'ক্রেডিটে সমস্যা'
    });
  }
});

// POST /api/wallet/debit - Debit from wallet (payout) with double-entry
router.post('/debit', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { amount, payoutId, reference } = req.body;

    if (!amount || amount <= 0 || !payoutId) {
      return res.status(400).json({
        success: false,
        message: 'ভ্যালিড অ্যামাউন্ট ও পায়আউট আইডি দিতে হবে'
      });
    }

    // Redis lock
    const lockKey = `lock:wallet:${req.tenantId}`;
    const lock = await redisClient.set(lockKey, '1', { PX: 15000, NX: true });

    if (!lock) {
      return res.status(429).json({
        success: false,
        message: 'ট্রানজেকশন লক, কিছুক্ষণ পর চেষ্টা করুন'
      });
    }

    try {
      const session = await (await import('mongoose')).default.startSession();
      session.startTransaction();

      try {
        // 1. Get wallet
        const walletDoc = await WalletModel.findOne({ tenantId: req.tenantId }).session(session);
        if (!walletDoc) {
          await session.abortTransaction();
          return res.status(404).json({ success: false, message: 'ওয়ালেট না পাওয়া' });
        }

        const wallet = new Wallet({
          id: walletDoc._id.toString(),
          tenantId: req.tenantId,
          balance: walletDoc.balance,
          currency: walletDoc.currency,
          createdAt: walletDoc.createdAt,
          updatedAt: walletDoc.updatedAt
        });

        // Check sufficient balance
        if (wallet.balance < amount) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: 'ইনসফিসিয়েন্ট ফান্ডস'
          });
        }

        // 2. Create double-entry ledger
        const debitEntry = LedgerEntry.createDebitEntry(
          req.tenantId,
          payoutId,
          amount,
          `পায়আউট #${payoutId}`,
          reference
        );

        const creditEntry = LedgerEntry.createCreditEntry(
          req.tenantId,
          payoutId,
          amount,
          `সেটেলমেন্ট পায়আউট: #${payoutId}`,
          reference
        );

        LedgerEntry.validateDoubleEntry([debitEntry, creditEntry]);

        // 3. Save ledger entries
        await new LedgerEntryModel(debitEntry.toJSON()).save({ session });
        await new LedgerEntryModel(creditEntry.toJSON()).save({ session });

        // 4. Update wallet (debit operation)
        wallet.debit(amount);
        walletDoc.balance = wallet.balance;
        await walletDoc.save({ session });

        // 5. Clear cache
        await redisClient.del(`wallet:balance:${req.tenantId}`);

        await session.commitTransaction();

        res.json({
          success: true,
          data: {
            newBalance: wallet.balance,
            ledgerEntries: [debitEntry.toJSON(), creditEntry.toJSON()]
          }
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } finally {
      await redisClient.del(lockKey);
    }

  } catch (error: any) {
    console.error('ওয়ালেট ডেবিট এড়ে:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'ডেবিটে সমস্যা'
    });
  }
});

export default router;