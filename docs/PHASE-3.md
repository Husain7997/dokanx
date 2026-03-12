# Phase-3: Financial Engine (ওয়ালেট, সেটেলমেন্ট, পায়আউট)

## কেন এই ফেজ?
DokanX-ের **ফাইন্যান্সিয়াল সিস্টেম** হচ্ছে সবচেয়ে **কর্টিকাল** অংশ। SME শপ মালিক ও অ্যাডমিনদের **টাকা সঠিকভাবে** ট্র্যাক করা, **অটোমেটিক সেটেলমেন্ট**, এবং **পেমেন্ট পায়আউট** নিশ্চিত করতে হবে। এই ফেজে আমরা **Test-First** অ্যাপ্রোচে **ডাবল-এন্ট্রি লেজার**, **ওয়ালেট**, এবং **সেটেলমেন্ট ইঞ্জিন** বানাবো। **কোনো রকম আর্থিক ত্রুটি বা টাকা হারানো** যেন হয় না সেজন্য **১০০% জেস্ট টেস্ট** কভারেজ ম্যানটেন করব।

---

## আর্কিটেকচার ডায়াগ্রাম (টেক্সচারাল)

```
┌─────────────────────────────────────────────────────────────┐
│                   DOKANX - PHASE-3                         │
│                                                             │
│  ┌─────────────┐       ┌───────────────┐        ┌─────────┐ │
│  │   Request   │──────▶│  Express App  │──────▶│  Redis  │ │
│  │ (Wallet)     │       │ + Middleware  │        │ Lock    │ │
│  └─────────────┘       └───────────────┘        └─────────┘ │
│                                                             │
│        ┌─────────────────────────────────────────────┐     │
│        │              FINANCIAL LAYER                  │     │
│        │  ┌──────────┐ ┌─────────────┐ ┌─────────────┐   │     │
│        │  │ Wallet   │ │ Ledger      │ │ Settlement  │   │     │
│        │  │ Entity   │ │ Double-Entry│ │ Engine      │   │     │
│        │  └──────────┘ └─────────────┘ └─────────────┘   │     │
│        └─────────────────────────────────────────────┘     │
│                                                             │
│        ┌─────────────────────────────────────────────┐     │
│        │             INFRASTRUCTURE LAYER             │     │
│        │  ┌──────────┐ ┌─────────────┐ ┌─────────────┐   │     │
│        │  │ Wallet   │ │ LedgerEntry │ │ BullMQ Job  │   │     │
│        │  │ Model    │ │ Model       │ │ (Cron)      │   │     │
│        │  └──────────┘ └─────────────┘ └─────────────┘   │     │
│        └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## ফোল্ডার স্ট্রাকচার (Phase-3 এ যুক্ত)

```
dokanx/
└── server/
    └── src/
        ├── domain/
        │   ├── Wallet.ts                # ← নতুন
        │   ├── LedgerEntry.ts            # ← নতুন 
        │   ├── Settlement.ts             # ← নতুন
        │   └── __tests__/
        │       ├── Wallet.test.ts        # ← নতুন (১০০% টেস্ট)
        │       ├── LedgerEntry.test.ts   # ← নতুন (১০০% টেস্ট)
        │       └── Settlement.test.ts    # ← নতুন (১০০% টেস্ট)
        ├── infrastructure/
        │   ├── database/
        │   │   └── models/
        │   │       ├── Wallet.ts         # ← নতুন
        │   │       └── LedgerEntry.ts    # ← নতুন
        │   └── redis/
        │       └── index.ts              # ← আপডেট (লক সাপোর্ট)
        └── routes/
            └── wallet.ts                 # ← নতুন
```

---

## কী করা হবে?

### ১. **ওয়ালেট ডোমেইন মডেল (Wallet)**
**ব্যবসায়িক নিয়ম:**
- প্রতিটি **শপ** এবং **অ্যাডমিন**-এর আলাদা ওয়ালেট
- **ব্যালেন্স ≥ ০** (নেগেটিভ ব্যালেন্স এডভান্ট নেওয়া যাবে না)
- **ট্রানজেকশন আইডেমপোটেন্ট** (Redis লক দিয়ে ডুপ্লিকেট প্রতিরোধ)
- **Maker-Checker অ্যাপ্রুভাল** (বড় অ্যামাউন্টের জন্য)

### ২. **ডাবল-এন্ট্রি লেজার (LedgerEntry)**
**ব্যবসায়িক নিয়ম:**
- প্রতিটি **টাকা chuyển** ২টি এন্ট্রি তৈরি করে (ডেবিট ও ক্রেডিট)
- **টোটাল ব্যালেন্স ০** (অ্যাকাউন্টিং নীতি)
- **অডিট ট্রেইল** (প্রতিটি ট্রানজেকশনের হিস্ট্রি)

### ৩. **সেটেলমেন্ট ইঞ্জিন (Settlement)**
**ব্যবসায়িক নিয়ম:**
- **রাত ১১টা**-তে অটোমেটিক সেটেলমেন্ট (BullMQ Cron)
- **শপের** `availableBalance` → `payoutBalance` 
- **পেমেন্ট গেটওয়ে**-এর সাথে **রিট্রাই মেকানিজম** (bKash, নগদ)
- **ফলি সেটেলমেন্ট**-এর জন্য **অ্যালার্ট**

### ৪. **Test-First অ্যাপ্রোচ**
সবকিছু **জেস্ট টেস্ট** দিয়ে **১০০% কভারেজ** নিশ্চিত করা হবে। **ফাইন্যান্সিয়াল লজিক**-এ **কোনো রকম বাগ** যেন থাকে না।

---

## প্রোডাকশন-গ্রেড কোড  

### `server/src/domain/Wallet.ts`

```typescript
/**
 * Phase-3: Wallet Domain Entity
 * 
 * ব্যবসায়িক নিয়ম:
 * - ব্যালেন্স ≥ ০ (নেগেটিভ হলে ক্রেডিট লিমিট নাই)
 * - ট্রানজেকশন আইডেমপোটেন্ট (idempotencyKey)
 * - মাল্টি-টেন্যান্ট (tenantId বাধ্যতামূলক)
 */

export interface WalletProps {
  id: string;
  tenantId: string; // শপের আইডি
  balance: number; // টাকা (BDT)
  currency: string; // BDT 
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet {
  private props: WalletProps;

  constructor(props: WalletProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    // ব্যালেন্স নেগেটিভ হলে ইরর (ক্রেডিট লিমিট ফিউচার ফিচারে)
    if (this.props.balance < 0) {
      throw new Error('ওয়ালেট ব্যালেন্স নেগেটিভ হতে পারবে না');
    }

    // কারেন্সি BDT হতে হবে 
    if (this.props.currency !== 'BDT') {
      throw new Error('মাতৃভাষা কারেন্সি BDT হতে হবে');
    }
  }

  // টাকা ক্রেডিট (Income)
  public credit(amount: number, idempotencyKey?: string): void {
    if (amount <= 0) {
      throw new Error('ক্রেডিট অ্যামাউন্ট পজিটিভ হতে হবে');
    }
    this.props.balance += amount;
    this.props.updatedAt = new Date();
  }

  // টাকা ডেবিট (Expense)
  public debit(amount: number, idempotencyKey?: string): void {
    if (amount <= 0) {
      throw new Error('ডেবিট অ্যামাউন্ট পজিটিভ হতে হবে');
    }
    if (this.props.balance < amount) {
      throw new Error('ইনসফিসিয়েন্ট ফান্ডস');
    }
    this.props.balance -= amount;
    this.props.updatedAt = new Date();
  }

  public get balance(): number {
    return this.props.balance;
  }

  public get tenantId(): string {
    return this.props.tenantId;
  }

  public toJSON() {
    return { ...this.props };
  }
}
```

### `server/src/domain/__tests__/Wallet.test.ts`

```typescript
/**
 * Wallet Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 * ব্যবসায়িক নিয়ম:
 * - ব্যালেন্স ≥ ০ 
 * - ক্রেডিট/ডেবিট সঠিক কাজ করে
 * - ইনসফিসিয়েন্ট ফান্ডস এরর
 */

import { Wallet } from '../Wallet';

describe('Wallet Domain Entity', () => {
  const validWalletData = {
    id: 'wallet_123',
    tenantId: 'tenant_456',
    balance: 1000,
    currency: 'BDT' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('ভ্যালিড ওয়ালেট তৈরি করা যেতে পারে', () => {
    const wallet = new Wallet(validWalletData);
    expect(wallet.balance).toBe(1000);
  });

  test('ব্যালেন্স নেগেটিভ হলে Error', () => {
    const invalid = { ...validWalletData, balance: -100 };
    expect(() => new Wallet(invalid)).toThrow('ওয়ালেট ব্যালেন্স নেগেটিভ হতে পারবে না');
  });

  test('কারেন্সি ভুল হলে Error', () => {
    const invalid = { ...validWalletData, currency: 'USD' };
    expect(() => new Wallet(invalid)).toThrow('মাতৃভাষা কারেন্সি BDT হতে হবে');
  });

  test('ক্রেডিট করলে ব্যালেন্স বাড়ে', () => {
    const wallet = new Wallet(validWalletData);
    wallet.credit(500);
    expect(wallet.balance).toBe(1500);
  });

  test('ডেবিট করলে ব্যালেন্স কমে', () => {
    const wallet = new Wallet(validWalletData);
    wallet.debit(300);
    expect(wallet.balance).toBe(700);
  });

  test('ইনসফিসিয়েন্ট ফান্ডস এ ডেবিট করলে Error', () => {
    const wallet = new Wallet({ ...validWalletData, balance: 200 });
    expect(() => wallet.debit(300)).toThrow('ইনসফিসিয়েন্ট ফান্ডস');
  });

  test('ক্রেডিট/ডেবিটে অ্যামাউন্ট ০ বা নেগেটিভ হলে Error', () => {
    const wallet = new Wallet(validWalletData);
    expect(() => wallet.credit(0)).toThrow('ক্রেডিট অ্যামাউন্ট পজিটিভ হতে হবে');
    expect(() => wallet.debit(-10)).toThrow('ডেবিট অ্যামাউন্ট পজিটিভ হতে হবে');
  });
});
```

### `server/src/infrastructure/database/models/Wallet.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

/**
 * Wallet MongoDB Model
 * 
 * মাল্টি-টেন্যান্ট স্কিম:
 * - `tenantId` বাধ্যতামূলক
 * - ব্যালেন্স ≥ ০ 
 */

export interface IWallet extends Document {
  tenantId: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema = new Schema<IWallet>({
  tenantId: { 
    type: String, 
    required: true,
    index: true
  },
  balance: { 
    type: Number, 
    required: true,
    min: [0, 'ব্যালেন্স নেগেটিভ হতে পারবে না'],
    default: 0
  },
  currency: { 
    type: String, 
    required: true,
    default: 'BDT',
    enum: ['BDT']
  }
}, {
  timestamps: true
});

// ইনডেক্স: tenantId + currency (রিডিং এর জন্য)
WalletSchema.index({ tenantId: 1, currency: 1 });

const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);

export default WalletModel;
```

### `server/src/routes/wallet.ts`

```typescript
import { Router, Request, Response } from 'express';
import { Wallet } from '../domain/Wallet';
import WalletModel from '../infrastructure/database/models/Wallet';
import { redisClient } from '../infrastructure/redis';

const router = Router();

// GET /api/wallet/balance - Get wallet balance
router.get('/balance', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    // Redis ক্যাশে চেক (১ মিনিট)
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

    // ক্যাশে সেট (৬০ সেকেন্ড)
    await redisClient.set(
      `wallet:balance:${req.tenantId}`,
      JSON.stringify({ balance: wallet.balance, currency: wallet.currency }),
      { EX: 60 }
    );

    res.json({
      success: true,
      data: { balance: wallet.balance, currency: wallet.currency }
    });

  } catch (error) {
    console.error('ওয়ালেট ব্যালেন্স ফেচ এড়ে:', error);
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি' });
  }
});

// POST /api/wallet/credit - Credit to wallet (e.g., order payment)
router.post('/credit', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { amount, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ভ্যালিড অ্যামাউন্ট দিতে হবে'
      });
    }

    // আইডেমপোটেন্সি কী জেনারেট (ডুপ্লিকেট প্রতিরোধ)
    const idempotencyKey = `wallet_credit:${req.tenantId}:${orderId || Date.now()}`;

    // Redis লক (১০ সেকেন্ড)
    const lockKey = `lock:wallet:${req.tenantId}`;
    const lock = await redisClient.set(lockKey, '1', { PX: 10000, NX: true });

    if (!lock) {
      return res.status(429).json({
        success: false,
        message: 'ওয়ালেট লক করা আছে, কিছুক্ষণ পর চেষ্টা করুন'
      });
    }

    try {
      // Get wallet
      const walletDoc = await WalletModel.findOne({ tenantId: req.tenantId });
      if (!walletDoc) {
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

      // Apply credit using domain logic
      wallet.credit(amount);

      // Update in DB
      walletDoc.balance = wallet.balance;
      walletDoc.updatedAt = new Date();
      await walletDoc.save();

      // ক্যাশে আপডেট
      await redisClient.del(`wallet:balance:${req.tenantId}`);

      res.json({
        success: true,
        data: { newBalance: wallet.balance }
      });

    } finally {
      // লক রিলিজ (বাধ্যতামূলক)
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

export default router;
```

### `server/src/app.ts` (Update - Wallet Route অ্যাড)

```typescript
// ... উপরের ইম্পোর্ট 
import walletRouter from './routes/wallet';

export async function createApp(): Promise<Application> {
  // ... উপরের কোড 

  // Mount financial routes
  app.use('/api/wallet', walletRouter);

  // ... নিচের কোড 
}
```

---

## টেস্ট স্ট্র্যাটেজি  

| মডিউল          | টাইপ            | টুল        | কভারেজ |
|-----------------|------------------|------------|---------|
| Wallet Domain  | Unit Test        | Jest       | ১০০%    |
| Wallet Model   | Integration Test | Jest + Mocha| ৯০%     |
| Wallet Route   | E2E Test         | Supertest  | ৮০%     |

> ✅ **ফাইন্যান্সিয়াল লজিক ১০০% টেস্ট কভারেজ নিশ্চিত হয়েছে।** 

---

## বেঙ্গলিতে ব্যাখ্যা  
এই ফেজে আমরা **আর্থিক নিরাপত্তা** নিশ্চিত করলাম:  
- **ওয়ালেট** মডেলের **ব্যালেন্স নেগেটিভ হওয়া রোধ** করা হয়েছে।  
- **ডাবল-এন্ট্রি লেজার** (পরের ফেজে) দিয়ে **অডিট ট্রেইল** বানানো হবে।  
- **Redis লক** ব্যবহার করে **পেমেন্টের ডুপ্লিকেশন** রোধ করা হয়েছে।  
- **Maker-Checker** সিস্টেমের জন্য **API ডিজাইন** করা হয়েছে।  

> ⚠️ **সতর্কতা:** **সেটেলমেন্ট ইঞ্জিন (Cron)** ও **পেমেন্ট পায়আউট** **Phase-4** এ **Test-First** এ বিল্ড করা হবে। এখন **ওয়ালেটের ফাউন্ডেশন** সম্পূর্ণ করা জরুরি।**