import mongoose, { Schema, Document } from 'mongoose';

/**
 * LedgerEntry MongoDB Model (Double-Entry Accounting)
 * 
 * মাল্টি-টেন্যান্ট স্কিম:
 * - `tenantId` বাধ্যতামূলক
 * - `entryType`: DEBIT | CREDIT
 * - অডিট ট্রেইল (সম্পূর্ণ হিস্ট্রি রাখা হবে)
 * - ট্রানজেকশন আইডি (idempotencyKey)
 */

export type ELedgerEntryType = 'DEBIT' | 'CREDIT';

export interface ILedgerEntry extends Document {
  tenantId: string;
  transactionId: string; // অর্ডার/পেমেন্ট আইডি 
  amount: number;
  entryType: ELedgerEntryType;
  description: string;
  reference?: string; // bKash ট্রানজেকশন আইডি 
  createdAt: Date;
}

const LedgerEntrySchema: Schema = new Schema<ILedgerEntry>({
  tenantId: { 
    type: String, 
    required: true,
    index: true
  },
  transactionId: { 
    type: String, 
    required: true,
    index: true // আইডেমপোটেন্সি জন্য 
  },
  amount: { 
    type: Number, 
    required: true,
    min: [0.01, 'অ্যামাউন্ট পজিটিভ হতে হবে'] 
  },
  entryType: {
    type: String,
    required: true,
    enum: ['DEBIT', 'CREDIT']
  },
  description: { 
    type: String, 
    required: true,
    maxlength: [500, 'ডেসক্রিপশন ৫০০ ক্যারেক্টার থেকে বেশি হতে পারবে না']
  },
  reference: { 
    type: String 
  }
}, {
  timestamps: { 
    createdAt: 'createdAt',
    updatedAt: false // লেজার এন্ট্রি আপডেট হবে না, এটি অডিট ট্রেইলের জন্য 
  }
});

// ইনডেক্স: tenantId + transactionId (ইউনিক ট্রানজেকশন চেক)
LedgerEntrySchema.index({ tenantId: 1, transactionId: 1 }, { unique: true });

// ইনডেক্স: tenantId + createdAt (রিপোর্টিং এর জন্য)
LedgerEntrySchema.index({ tenantId: 1, createdAt: -1 });

const LedgerEntryModel = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);

export default LedgerEntryModel;