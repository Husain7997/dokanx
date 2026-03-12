/**
 * Phase-0: Domain Modeling - Tenant Aggregate
 * 
 * ব্যবসায়িক নিয়ম:
 * - প্রতিটি শপ একটি স্বাধীন টেন্যান্ট
 * - টেন্যান্ট আইডি সব ডাটায় উপস্থিত থাকবে
 * - টেন্যান্ট ক্রিয়ায় অ্যাডমিন অ্যাপ্রুভাল প্রয়োজন
 */

export interface TenantProps {
  id: string; // MongoDB ObjectId
  name: string; // শপের নাম
  subdomain: string; // ইউনিক সাবডোমেইন (e.g., dokanx.com/মাইশপ)
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  updatedAt: Date;
  ownerId: string; // User ID of shop owner
  plan: 'FREE' | 'BASIC' | 'PREMIUM';
}

export class Tenant {
  private props: TenantProps;

  constructor(props: TenantProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    // টেন্যান্ট নাম বৈধ কিনা চেক
    if (this.props.name.length < 2) {
      throw new Error('টেন্যান্টের নাম কমপক্ষে ২ ক্যারেক্টার হতে হবে');
    }

    // সাবডোমেইন ইউনিক ও ভ্যালিড
    const subdomainRegex = /^[a-z0-9-]{3,30}$/;
    if (!subdomainRegex.test(this.props.subdomain)) {
      throw new Error('সাবডোমেইন শুধু ছোট হাতের অক্ষর, সংখ্যা এবং হাইফেন থাকতে পারে (৩-৩০ ক্যারেক্টার)');
    }
  }

  // getter methods
  public get id(): string { return this.props.id; }
  public get name(): string { return this.props.name; }
  public get subdomain(): string { return this.props.subdomain; }
  public get status(): string { return this.props.status; }

  // স্ট্যাটাস আপডেট (Maker-Checker সাপোর্টের জন্য)
  public updateStatus(newStatus: 'ACTIVE' | 'SUSPENDED'): void {
    if (this.props.status === 'SUSPENDED' && newStatus === 'ACTIVE') {
      // রি-অ্যাক্টিভেশনে বিশেষ লজিক থাকতে পারে
      console.log(`টেন্যান্ট ${this.props.id} রি-অ্যাক্টিভ করা হচ্ছে`);
    }
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  // টেন্যান্ট ডিটেইল রিটার্ন (সেফ)
  public toJSON() {
    return { ...this.props };
  }
}
