import mongoose, { Schema, Document } from 'mongoose';

/**
 * Wallet MongoDB Model
 * 
 * মাল্টি-টেন্যান্ট স্কিম:
 * - `tenantId` বাধ্যতামূলক
 * - ব্যালেন্স ≥ ০ 
 * - কারেন্সি: BDT (বাংলাদেশ)
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
    index: true // মাল্টি-টেন্যান্ট ফিল্টারিং এর জন্য 
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
    enum: ['BDT'] // শুধু বাংলাদেশি টাকা
  }
}, {
  timestamps: true
});

// ইনডেক্স: tenantId + currency (রিডিং এর জন্য অপ্টিমাইজ)
WalletSchema.index({ tenantId: 1, currency: 1 });

const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);

export default WalletModel;