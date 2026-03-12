/**
 * Phase-3: LedgerEntry Domain Entity (Double-Entry Accounting)
 * 
 * ব্যবসায়িক নিয়ম:
 * - প্রতিটি ট্রানজেকশনে ২টি এন্ট্রি (ডেবিট ও ক্রেডিট)
 * - টোটাল ব্যালেন্স অবশ্যই ০ (অ্যাকাউন্টিং নীতি)
 * - অডিট ট্রেইল (প্রতিটি এন্ট্রির হিস্ট্রি)
 * - মাল্টি-টেন্যান্ট (tenantId বাধ্যতামূলক)
 * - ট্রানজেকশন আইডEMপোটেন্ট (idempotencyKey)
 */

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export interface LedgerEntryProps {
  id: string;
  tenantId: string;
  transactionId: string; // অর্ডার/পেমেন্ট আইডি 
  amount: number; // টাকা (BDT)
  entryType: LedgerEntryType;
  description: string; // "অর্ডার #123 পেমেন্ট", "সেটেলমেন্ট পায়আউট"
  reference?: string; // অতিরিক্ত রেফারেন্স (যেমন: bKash ট্রানজেকশন আইডি)
  createdAt: Date;
}

export class LedgerEntry {
  private props: LedgerEntryProps;

  constructor(props: LedgerEntryProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    // অ্যামাউন্ট পজিটিভ হতে হবে
    if (this.props.amount <= 0) {
      throw new Error('লেজার এন্ট্রির অ্যামাউন্ট পজিটিভ হতে হবে');
    }

    // টেন্যান্ট আইডি চাই
    if (!this.props.tenantId) {
      throw new Error('টেন্যান্ট আইডি অবশ্যই দিতে হবে');
    }

    // ট্রানজেকশন আইডি চাই
    if (!this.props.transactionId) {
      throw new Error('ট্রানজেকশন আইডি অবশ্যই দিতে হবে');
    }

    // ডেসক্রিপশন চাই
    if (!this.props.description || this.props.description.trim().length < 3) {
      throw new Error('ডেসক্রিপশন কমপক্ষে ৩ ক্যারেক্টার হতে হবে');
    }
  }

  // ডেবিট এন্ট্রি তৈরি (মূল্য কমানো)
  public static createDebitEntry(
    tenantId: string,
    transactionId: string,
    amount: number,
    description: string,
    reference?: string
  ): LedgerEntry {
    return new LedgerEntry({
      id: `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      transactionId,
      amount,
      entryType: 'DEBIT',
      description,
      reference,
      createdAt: new Date()
    });
  }

  // ক্রেডিট এন্ট্রি তৈরি (মূল্য বাড়ানো)
  public static createCreditEntry(
    tenantId: string,
    transactionId: string,
    amount: number,
    description: string,
    reference?: string
  ): LedgerEntry {
    return new LedgerEntry({
      id: `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      transactionId,
      amount,
      entryType: 'CREDIT',
      description,
      reference,
      createdAt: new Date()
    });
  }

  // টোটাল ব্যালেন্স ক্যালকুলেট (ডেবিট - ক্রেডিট)
  // স্ট্যাটিক মেথড কারণ মাল্টি এন্ট্রি কম্বাইন্ড করতে হবে
  public static calculateNetBalance(entries: LedgerEntry[]): number {
    return entries.reduce((sum, entry) => {
      return entry.props.entryType === 'DEBIT' 
        ? sum - entry.props.amount 
        : sum + entry.props.amount;
    }, 0);
  }

  // ভ্যালিডেশন: টোটাল ব্যালেন্স ০ হতে চেক 
  public static validateDoubleEntry(entries: LedgerEntry[]): void {
    const netBalance = this.calculateNetBalance(entries);
    if (netBalance !== 0) {
      throw new Error(`ডাবল-এন্ট্রি ভ্যালিডেশন ফেইল: নেট ব্যালেন্স ${netBalance} (০ হতে হবে)`);
    }
  }

  public get id(): string { return this.props.id; }
  public get tenantId(): string { return this.props.tenantId; }
  public get amount(): number { return this.props.amount; }
  public get entryType(): LedgerEntryType { return this.props.entryType; }

  public toJSON() {
    return { ...this.props };
  }
}
