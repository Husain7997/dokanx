import mongoose, { Schema, Document } from 'mongoose';

/**
 * Cart MongoDB Model
 * 
 * কার্ট মডেল:
 * - টেন্যান্ট-স্কোপড (tenantId বাধ্যতামূলক)
 * - আইটেমস সাবডকুমেন্ট
 * - কার্ট ২৪ ঘণ্টা পর এক্সপায়ার (TTL ইনডেক্স দিয়ে)
 */

export interface ICartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface ICart extends Document {
  tenantId: string;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema: Schema = new Schema<ICartItem>({
  productId: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: [1, 'কোয়ান্টিটি পজিটিভ হতে হবে']
  },
  unitPrice: { 
    type: Number, 
    required: true,
    min: [0, 'দাম নেগেটিভ হতে পারবে না']
  }
});

const CartSchema: Schema = new Schema<ICart>({
  tenantId: { 
    type: String, 
    required: true,
    index: true
  },
  items: { 
    type: [CartItemSchema], 
    default: [] 
  }
}, {
  timestamps: true
});

// TTL ইনডেক্স: ২৪ ঘণ্টা পর কার্ট অটো ডিলিট (প্রোডাকশন-গ্রেড)
CartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

// পারফরম্যান্স ইনডেক্স 
CartSchema.index({ tenantId: 1, updatedAt: -1 });

const CartModel = mongoose.model<ICart>('Cart', CartSchema);

export default CartModel;