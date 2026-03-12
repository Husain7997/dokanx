import mongoose, { Schema, Document } from 'mongoose';

/**
 * Product MongoDB Model
 * 
 * মাল্টি-টেন্যান্ট স্কিম:
 * - `tenantId` প্রতিটি প্রোডাক্টে বাধ্যতামূলক
 * - `sku` টেন্যান্ট-স্কোপড ইউনিক (tenantId + sku কম্বিনেশন)
 */

export interface IProduct extends Document {
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  sku: string;
  stock: number;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema<IProduct>({
  tenantId: {
    type: String,
    required: true,
    index: true // মাল্টি-টেন্যান্ট ফিল্টারিং এর জন্য 
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'প্রোডাক্টের নাম ২০০ ক্যারেক্টার থেকে বেশি হতে পারবে না']
  },
  description: {
    type: String,
    maxlength: [2000, 'ডেস্ক্রিপশন ২০০০ ক্যারেক্টার থেকে বেশি হতে পারবে না']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'দাম নেগেটিভ হতে পারবে না']
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'স্টক নেগেটিভ হতে পারবে না'],
    default: 0
  },
  images: [{
    type: String
  }]
}, {
  timestamps: true
});

// কম্পোজিট ইনডেক্স: tenantId + sku (টেন্যান্ট-স্কোপড ইউনিকতা)
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

// পারফরম্যান্স ইনডেক্স 
ProductSchema.index({ tenantId: 1, createdAt: -1 });
ProductSchema.index({ price: 1 });

const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);

export default ProductModel;