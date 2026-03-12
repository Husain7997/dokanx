import mongoose, { Schema, Document } from 'mongoose';

/**
 * Order MongoDB Model
 * 
 * মাল্টি-টেন্যান্ট স্কিম:
 * - `tenantId` বাধ্যতামূলক
 * - অর্ডার স্ট্যাটাস: PENDING | PAID | SHIPPED | DELIVERED | CANCELLED
 * - আইটেমস সাবডকুমেন্ট
 */

export interface IOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface IOrder extends Document {
  tenantId: string;
  customerId?: string;
  items: IOrderItem[];
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  vat: number;
  total: number;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema: Schema = new Schema<IOrderItem>({
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

const OrderSchema: Schema = new Schema<IOrder>({
  tenantId: { 
    type: String, 
    required: true,
    index: true
  },
  customerId: { 
    type: String 
  },
  items: { 
    type: [OrderItemSchema], 
    required: true 
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  subtotal: { 
    type: Number,
    required: true,
    min: [0]
  },
  vat: { 
    type: Number,
    required: true,
    min: [0]
  },
  total: { 
    type: Number,
    required: true,
    min: [0]
  },
  idempotencyKey: {
    type: String,
    sparse: true // ইউনিক কিন্তু নল হতে পারে 
  }
}, {
  timestamps: true
});

// কম্পোজিট ইনডেক্স: tenantId + createdAt (অর্ডার লিস্টিং এর জন্য)
OrderSchema.index({ tenantId: 1, createdAt: -1 });

// আইডেমপোটেন্সি ইনডেক্স (পেমেন্ট ডুপ্লিকেট প্রতিরোধ)
OrderSchema.index({ idempotencyKey: 1 }, { sparse: true, unique: true });

const OrderModel = mongoose.model<IOrder>('Order', OrderSchema);

export default OrderModel;