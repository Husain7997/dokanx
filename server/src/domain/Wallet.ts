/**
 * Phase-3: Wallet Domain Entity
 * 
 * ব্যবসায়িক নিয়ম:
 * - ব্যালেন্স ≥ ০ (নেগেটিভ ব্যালেন্স এডভান্ট নেওয়া যাবে না)
 * - ট্রানজেকশন আইডেমপোটেন্ট (Redis লক দিয়ে ডুপ্লিকেট প্রতিরোধ)
 * - Maker-Checker অ্যাপ্রুভাল (বড় অ্যামাউন্টের জন্য)
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

  // টাকা ক্রেডিট (Income) - Maker-Checker অ্যাপ্রুভাল সাপোর্ট
  public credit(amount: number, idempotencyKey?: string): void {
    if (amount <= 0) {
      throw new Error('ক্রেডিট অ্যামাউন্ট পজিটিভ হতে হবে');
    }

    // TODO: Maker-Checker লজিক (Phase-4 এ ইমপ্লিমেন্ট)
    // যদি অ্যামাউন্ট > ১০,০০০ টাকা হয়, তবে অ্যাডমিন অ্যাপ্রুভাল প্রয়োজন
    
    this.props.balance += amount;
    this.props.updatedAt = new Date();
  }

  // টাকা ডেবিট (Expense) - Maker-Checker অ্যাপ্রুভাল সাপোর্ট
  public debit(amount: number, idempotencyKey?: string): void {
    if (amount <= 0) {
      throw new Error('ডেবিট অ্যামাউন্ট পজিটিভ হতে হবে');
    }
    if (this.props.balance < amount) {
      throw new Error('ইনসফিসিয়েন্ট ফান্ডস');
    }

    // TODO: Maker-Checker লজিক (Phase-4 এ ইমপ্লিমেন্ট)
    
    this.props.balance -= amount;
    this.props.updatedAt = new Date();
  }

  // ব্যালেন্স রিড (Read-Only)
  public get balance(): number {
    return this.props.balance;
  }

  public get tenantId(): string {
    return this.props.tenantId;
  }

  // সেফ JSON রিটার্ন (সিকিউরিটি: সনসিটিভ ডাটা এক্সক্লুড)
  public toJSON() {
    return {
      id: this.props.id,
      tenantId: this.props.tenantId,
      balance: this.props.balance,
      currency: this.props.currency,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt
    };
  }
}
