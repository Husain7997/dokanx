/**
 * Phase-2: Product Domain Entity
 * 
 * ব্যবসায়িক নিয়ম:
 * - SKU ইউনিক (টেন্যান্ট-স্কোপড)
 * - দাম ≥ ০
 * - স্টক ≥ ০
 * - নাম কমপক্ষে ২ ক্যারেক্টার
 */

export interface ProductProps {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number; // টাকা (BDT)
  sku: string; // টেন্যান্ট-স্কোপড ইউনিক
  stock: number;
  images?: string[]; 
  createdAt: Date;
  updatedAt: Date;
}

export class Product {
  private props: ProductProps;

  constructor(props: ProductProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    // নাম ভ্যালিডেশন
    if (this.props.name?.trim().length < 2) {
      throw new Error('প্রোডাক্টের নাম কমপক্ষে ২ ক্যারেক্টার হতে হবে');
    }

    // দাম নেগেটিভ হলে ইরর
    if (this.props.price < 0) {
      throw new Error('দাম নেগেটিভ হতে পারবে না');
    }

    // স্টক নেগেটিভ হলে ইরর
    if (this.props.stock < 0) {
      throw new Error('স্টক নেগেটিভ হতে পারবে না');
    }

    // SKU ভ্যালিডেশন (টেন্যান্ট-স্কোপড)
    if (this.props.sku?.trim().length < 3) {
      throw new Error('SKU কমপক্ষে ৩ ক্যারেক্টার হতে হবে');
    }
  }

  // স্টক আপডেট (ইনভেন্টরি ম্যানেজমেন্ট)
  public updateStock(newStock: number): void {
    if (newStock < 0) {
      throw new Error('স্টক নেগেটিভ হতে পারবে না');
    }
    this.props.stock = newStock;
    this.props.updatedAt = new Date();
  }

  // দাম আপডেট 
  public updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('দাম নেগেটিভ হতে পারবে না');
    }
    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }

  // পাবলিক গেটারস
  public get id(): string { return this.props.id; }
  public get tenantId(): string { return this.props.tenantId; }
  public get name(): string { return this.props.name; }
  public get description(): string | undefined { return this.props.description; }
  public get price(): number { return this.props.price; }
  public get sku(): string { return this.props.sku; }
  public get stock(): number { return this.props.stock; }
  public get images(): string[] | undefined { return this.props.images; }

  // সেফ JSON রিটার্ন (সিকিউরিটি: সনসিটিভ ডাটা এক্সক্লুড)
  public toJSON() {
    return {
      id: this.props.id,
      tenantId: this.props.tenantId,
      name: this.props.name,
      description: this.props.description,
      price: this.props.price,
      sku: this.props.sku,
      stock: this.props.stock,
      images: this.props.images,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt
    };
  }
}
