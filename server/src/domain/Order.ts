/**
 * Phase-2: Order Domain Entity
 * 
 * ব্যবসায়িক নিয়ম:
 * - অর্ডার স্ট্যাটাস ভ্যালিড ট্রানজিশন
 * - টোটাল অ্যামাউন্ট অটো-কালকুলেট (প্রোডাক্ট দাম × কোয়ান্টিটি + ভ্যাট)
 * - ভ্যাট = ১০% (বাংলাদেশ)
 * - টেন্যান্ট আইডি অবশ্যই থাকবে
 * - আইডেমপোটেন্সি কী (পেমেন্টের জন্য, Phase-3 এ ব্যবহার)
 */

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number; // প্রোডাক্টের দাম অর্ডার টাইমে (হিস্টরিক্যাল)
}

export interface OrderProps {
  id: string;
  tenantId: string;
  customerId?: string; // ফিউচার অথেন্টিকেশনের জন্য
  items: OrderItem[];
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number; // আইটেম টোটাল (ভ্যাট ছাড়া)
  vat: number; // ১০%
  total: number; // subtotal + vat
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey?: string; // পেমেন্ট ডুপ্লিকেট প্রতিরোধ (Phase-3)
}

export class Order {
  private props: OrderProps;

  constructor(props: OrderProps) {
    this.props = props;
    this.validate();
    this.calculateTotals(); // অটো-কালকুলেট
  }

  private validate(): void {
    // টেন্যান্ট আইডি চাই
    if (!this.props.tenantId) {
      throw new Error('টেন্যান্ট আইডি অবশ্যই দিতে হবে');
    }

    // আইটেম কমপক্ষে ১টি থাকতে হবে
    if (!this.props.items || this.props.items.length === 0) {
      throw new Error('অর্ডারে কমপক্ষে ১টি আইটেম থাকতে হবে');
    }

    // প্রতিটি আইটেম ভ্যালিড
    this.props.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        throw new Error(`আইটেম ${index + 1}: কোয়ান্টিটি পজিটিভ হতে হবে`);
      }
      if (item.unitPrice < 0) {
        throw new Error(`আইটেম ${index + 1}: দাম নেগেটিভ হতে পারবে না`);
      }
    });

    // স্ট্যাটাস ভ্যালিড
    const validStatuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(this.props.status)) {
      throw new Error('অবৈধ অর্ডার স্ট্যাটাস');
    }
  }

  private calculateTotals(): void {
    // সাবটোটাল ক্যালকুলেট 
    const subtotal = this.props.items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    // ভ্যাট (১০%)
    const vat = parseFloat((subtotal * 0.1).toFixed(2));

    // টোটাল
    const total = parseFloat((subtotal + vat).toFixed(2));

    // প্রপস আপডেট 
    this.props.subtotal = subtotal;
    this.props.vat = vat;
    this.props.total = total;
  }

  // স্ট্যাটাস আপডেট (ভ্যালিড ট্রানজিশন ম্যানেজ)
  public updateStatus(newStatus: 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'): void {
    const current = this.props.status;

    // ভ্যালিড ট্রানজিশন রুলস
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['PAID', 'CANCELLED'],
      'PAID': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED'],
      'DELIVERED': [],
      'CANCELLED': []
    };

    if (!validTransitions[current]?.includes(newStatus)) {
      throw new Error(`স্ট্যাটাস ${current} থেকে ${newStatus} এ পরিবর্তন সম্ভব নয়`);
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  // আইটেম এড (কর্ট থেকে অর্ডারে কনভার্ট করার সময়)
  public addItem(item: OrderItem): void {
    // কোয়ান্টিটি ভ্যালিড 
    if (item.quantity <= 0) {
      throw new Error('কোয়ান্টিটি পজিটিভ হতে হবে');
    }
    if (item.unitPrice < 0) {
      throw new Error('দাম নেগেটিভ হতে পারবে না');
    }

    this.props.items.push(item);
    this.calculateTotals();
    this.props.updatedAt = new Date();
  }

  public get id(): string { return this.props.id; }
  public get tenantId(): string { return this.props.tenantId; }
  public get status(): string { return this.props.status; }
  public get total(): number { return this.props.total; }
  public get items(): OrderItem[] { return this.props.items; }

  public toJSON() {
    return { ...this.props };
  }
}
