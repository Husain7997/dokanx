/**
 * Phase-3: Settlement Domain Entity
 * 
 * ব্যবসায়িক নিয়ম:
 * - রাত ১১টা-তে অটোমেটিক সেটেলমেন্ট (BullMQ Cron)
 * - শপের `availableBalance` → `payoutBalance`
 * - পেমেন্ট গেটওয়ে রিট্রাই মেকানিজম (bKash, নগদ)
 * - ফলি সেটেলমেন্ট অ্যালার্ট
 * - ম্যালি-টেন্যান্ট (tenantId বাধ্যতামূলক)
 */

export interface SettlementProps {
  id: string;
  tenantId: string;
  amount: number; // সেটেলমেন্টের টাকা
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payoutMethod: 'BKASH' | 'NAGAD' | 'BANK';
  reference?: string; // পেমেন্ট গেটওয়ে রেফারেন্স
  scheduledAt: Date; // কবে সেটেলমেন্ট হবে
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Settlement {
  private props: SettlementProps;

  constructor(props: SettlementProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    // অ্যামাউন্ট পজিটিভ হতে হবে
    if (this.props.amount <= 0) {
      throw new Error('সেটেলমেন্ট অ্যামাউন্ট পজিটিভ হতে হবে');
    }

    // টেন্যান্ট আইডি চাই
    if (!this.props.tenantId) {
      throw new Error('টেন্যান্ট আইডি অবশ্যই দিতে হবে');
    }

    // স্ট্যাটাস ভ্যালিড
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
    if (!validStatuses.includes(this.props.status)) {
      throw new Error('অবৈধ সেটেলমেন্ট স্ট্যাটাস');
    }

    // পেমেন্ট মেথড ভ্যালিড
    const validMethods = ['BKASH', 'NAGAD', 'BANK'];
    if (!validMethods.includes(this.props.payoutMethod)) {
      throw new Error('অবৈধ পেমেন্ট মেথড');
    }

    // শিডিউলড ডেট phải ভবিষ্যতে বা বর্তমানে
    if (this.props.scheduledAt < new Date()) {
      throw new Error('শিডিউলড ডেট ভবিষ্যতে হতে হবে');
    }
  }

  // স্ট্যাটাস আপডেট 
  public updateStatus(
    newStatus: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    failureReason?: string,
    reference?: string
  ): void {
    const current = this.props.status;

    // ভ্যালিড ট্রানজিশন রুলস
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['PROCESSING', 'FAILED'],
      'PROCESSING': ['COMPLETED', 'FAILED'],
      'COMPLETED': [],
      'FAILED': ['PENDING'] // রিট্রাই করার জন্য 
    };

    if (!validTransitions[current]?.includes(newStatus)) {
      throw new Error(`স্ট্যাটাস ${current} থেকে ${newStatus} এ পরিবর্তন সম্ভব নয়`);
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();

    if (newStatus === 'COMPLETED') {
      this.props.processedAt = new Date();
    }

    if (newStatus === 'FAILED' && failureReason) {
      this.props.failureReason = failureReason;
    }

    if (reference) {
      this.props.reference = reference;
    }
  }

  public get id(): string { return this.props.id; }
  public get tenantId(): string { return this.props.tenantId; }
  public get amount(): number { return this.props.amount; }
  public get status(): string { return this.props.status; }

  public toJSON() {
    return { ...this.props };
  }
}
