/**
 * Phase-2: Cart Domain Entity
 * 
 * ব্যবসায়িক নিয়ম:
 * - কার্টে আইটেম যোগ/আপডেট/ডিলিট
 * - কার্ট টেন্যান্ট-স্কোপড (প্রতিটি শপের আলাদা কার্ট)
 * - আইটেমের কোয়ান্টিটি > ০
 * - সাবটোটাল অটো-কালকুলেট
 * - কার্ট ২৪ ঘণ্টা পর অটো ক্লিয়ার (ফিউচার: Redis TTL)
 */

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number; // প্রোডাক্টের দাম কার্ট টাইমে
}

export interface CartProps {
  id: string;
  tenantId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export class Cart {
  private props: CartProps;

  constructor(props: CartProps) {
    this.props = props;
    this.validate();
    this.calculateSubtotal();
  }

  private validate(): void {
    // টেন্যান্ট আইডি চাই
    if (!this.props.tenantId) {
      throw new Error('টেন্যান্ট আইডি অবশ্যই দিতে হবে');
    }

    // আইটেম কমপক্ষে ১টি থাকতে পারে না? (খালি কার্টও হতে পারে, তাই অপশনাল)
    if (this.props.items) {
      this.props.items.forEach((item, index) => {
        if (item.quantity <= 0) {
          throw new Error(`আইটেম ${index + 1}: কোয়ান্টিটি পজিটিভ হতে হবে`);
        }
        if (item.unitPrice < 0) {
          throw new Error(`আইটেম ${index + 1}: দাম নেগেটিভ হতে পারবে না`);
        }
      });
    }
  }

  private calculateSubtotal(): void {
    const subtotal = this.props.items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);
    // সাবটোটাল আলাদা প্রপ নাই, অর্ডারে ক্যালকুলেট হবে
    // কার্টে শুধু আইটেম রাখা হবে
  }

  // আইটেম যোগ করুন (যদি প্রোডাক্ট আগে থাকে তেড়ে কোয়ান্টিটি আপডেট)
  public addItem(productId: string, quantity: number, unitPrice: number): void {
    if (quantity <= 0) {
      throw new Error('কোয়ান্টিটি পজিটিভ হতে হবে');
    }
    if (unitPrice < 0) {
      throw new Error('দাম নেগেটিভ হতে পারবে না');
    }

    // আগের আইটেম খুঁজুন
    const existingIndex = this.props.items.findIndex(
      item => item.productId === productId
    );

    if (existingIndex >= 0) {
      // কোয়ান্টিটি আপডেট 
      this.props.items[existingIndex].quantity += quantity;
      // দাম রিফ্রেশ (যদি নতুন দাম দেয়)
      this.props.items[existingIndex].unitPrice = unitPrice;
    } else {
      // নতুন আইটেম যোগ 
      this.props.items.push({ productId, quantity, unitPrice });
    }

    this.props.updatedAt = new Date();
  }

  // আইটেমের কোয়ান্টিটি আপডেট 
  public updateQuantity(productId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('কোয়ান্টিটি পজিটিভ হতে হবে');
    }

    const index = this.props.items.findIndex(
      item => item.productId === productId
    );

    if (index === -1) {
      throw new Error('আইটেম কার্টে পাওয়া যায়নি');
    }

    this.props.items[index].quantity = newQuantity;
    this.props.updatedAt = new Date();
  }

  // আইটেম ডিলিট 
  public removeItem(productId: string): void {
    const initialLength = this.props.items.length;
    this.props.items = this.props.items.filter(
      item => item.productId !== productId
    );

    if (this.props.items.length === initialLength) {
      throw new Error('আইটেম কার্টে পাওয়া যায়নি');
    }

    this.props.updatedAt = new Date();
  }

  // কার্ট ক্লিয়ার 
  public clear(): void {
    this.props.items = [];
    this.props.updatedAt = new Date();
  }

  // আইটেম সংখ্যা 
  public get count(): number {
    return this.props.items.length;
  }

  public get items(): CartItem[] {
    return this.props.items;
  }

  public get tenantId(): string {
    return this.props.tenantId;
  }

  public toJSON() {
    return { ...this.props };
  }
}
