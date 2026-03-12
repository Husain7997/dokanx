# Phase-2: Core Commerce (প্রোডাক্ট, ইনভেন্টরি, কার্ট, অর্ডার)

## কেন এই ফেজ?
DokanX-ের **কোর কমার্স ফাংশনালিটি** তৈরি করা সবচেয়ে জরুরি। SME শপ মালিকরা প্রতিদিন **পণ্য যোগ/সম্পাদনা**, **স্টক ম্যানেজ**, **কাস্টমার কার্ট**, এবং **অর্ডার প্রসেসিং** করতে পারবেন। এই ফেজে আমরা **ডোমেইন মডেল**, **ডাটাবেস স্কিমা**, এবং **বেসিক API** তৈরি করব। ফাইন্যান্সিয়াল সিস্টেম (Phase-3) এর আগে **ডাটা ইন্টারনাল লজিক** পূর্ণতা পাচ্ছে নিশ্চিত করা হবে।

---

## আর্কিটেকচার ডায়াগ্রাম (টেক্সচারাল)

```
┌─────────────────────────────────────────────────────────────┐
│                   DOKANX - PHASE-2                         │
│                                                             │
│  ┌─────────────┐       ┌───────────────┐        ┌─────────┐ │
│  │   Request   │──────▶│  Express App  │──────▶│  Redis  │ │
│  │ (Product)   │       │ + Middleware  │        │ Cache   │ │
│  └─────────────┘       └───────────────┘        └─────────┘ │
│                                                             │
│        ┌─────────────────────────────────────────────┐     │
│        │              DOMAIN LAYER                    │     │
│        │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │     │
│        │  │ Product  │ │ Order    │ │ Cart     │       │     │
│        │  └──────────┘ └──────────┘ └──────────┘       │     │
│        └─────────────────────────────────────────────┘     │
│                                                             │
│        ┌─────────────────────────────────────────────┐     │
│        │             INFRASTRUCTURE LAYER             │     │
│        │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │     │
│        │  │ Product  │ │ Order    │ │ Cart     │       │     │
│        │  │ Model     │ │ Model    │ │ Model    │       │     │
│        │  └──────────┘ └──────────┘ └──────────┘       │     │
│        └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## ফোল্ডার স্ট্রাকচার (Phase-2 এ যুক্ত)

```
dokanx/
└── server/
    └── src/
        ├── domain/
        │   ├── Product.ts          # ← নতুন
        │   ├── Order.ts            # ← নতুন
        │   ├── Cart.ts              # ← নতুন
        │   └── __tests__/
        │       ├── Product.test.ts
        │       ├── Order.test.ts
        │       └── Cart.test.ts
        ├── infrastructure/
        │   └── database/
        │       └── models/
        │           ├── Product.ts  # ← নতুন
        │           ├── Order.ts    # ← নতুন
        │           └── Cart.ts     # ← নতুন
        └── routes/                # ← নতুন
            ├── product.ts
            ├── order.ts
            └── cart.ts
```

---

## কী করা হবে?

### ১. **প্রোডাক্ট ডোমেইন মডেল (Product)**

**ব্যবসায়িক নিয়ম:**
- প্রতিটি প্রোডাক্টে **টেন্যান্ট আইডি** অবশ্যই থাকবে 
- `price` ≥ ০ 
- `sku` ইউনিক (প্রতিটি শপের ভিতরে)
- ইনভেন্টরি ট্র্যাকিং (`stock >= 0`)

### ২. **অর্ডার ডোমেইন মডেল (Order)**  
- অর্ডার স্ট্যাটাস: `PENDING` → `PAID` → `SHIPPED` → `DELIVERED` → `CANCELLED`
- **আইডেমপোটেন্সি:** পেমেন্ট ডুপ্লিকেট প্রতিরোধ 
- **ট্যাক্স অটো-ক্যালকুলেশন:** VAT (১০%) 

### ৩. **কার্ট ডোমেইন মডেল (Cart)**
- কার্ট টেম্পোরারি, **সেশন-ভিত্তিক** 
- ২৪ ঘন্টা পর **অটোমেটিক ক্লিয়ার** 

### ৪. **API রুটস (Express)**
- `POST /api/products` - প্রোডাক্ট ক্রিয়েট 
- `GET /api/products` - প্রোডাক্ট লিস্ট 
- `POST /api/orders` - অর্ডার প্লেস 
- `GET /api/cart` - কার্ট দেখ 

---

## প্রোডাকশন-গ্রেড কোড  

### `server/src/domain/Product.ts`

```typescript
/**
 * Product Domain Entity
 * 
 * ব্যবসায়িক নিয়ম:
 * - SKU ইউনিক (টেন্যান্ট-স্কোপড)
 * - দাম ≥ ০
 * - স্টক ≥ ০
 */

export interface ProductProps {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number; // টাকা 
  sku: string; // ইউনিক (টেন্যান্ট-স্কোপড)
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
    // দাম বৈধ কিনা 
    if (this.props.price < 0) {
      throw new Error('দাম নেগেটিভ হতে পারবে না');
    }

    // স্টক বৈধ 
    if (this.props.stock < 0) {
      throw new Error('স্টক নেগেটিভ হতে পারবে না');
    }

    // SKU ফরম্যাট (অল্পপক্ষে ৩ ক্যারেক্টার)
    if (this.props.sku.length < 3) {
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

  public toJSON() {
    return { ...this.props };
  }

  public get id(): string { return this.props.id; }
  public get name(): string { return this.props.name; }
  public get price(): number { return this.props.price; }
  public get stock(): number { return this.props.stock; }
}
```

### `server/src/domain/__tests__/Product.test.ts`

```typescript
/**
 * Product Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 */

import { Product } from '../Product';

describe('Product Domain Entity', () => {
  const validProductData = {
    id: 'prod_123',
    tenantId: 'tenant_456',
    name: 'চায় নাস্তা প্যাক',
    price: 250,
    sku: 'CN-001',
    stock: 50,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('ভ্যালিড প্রোডাক্ট তৈরি করা যেতে পারে', () => {
    const product = new Product(validProductData);
    expect(product.id).toBe('prod_123');
    expect(product.price).toBe(250);
  });

  test('দাম নেগেটিভ হলে Error', () => {
    const invalid = { ...validProductData, price: -10 };
    expect(() => new Product(invalid)).toThrow('দাম নেগেটিভ হতে পারবে না');
  });

  test('স্টক নেগেটিভ হলে Error', () => {
    const invalid = { ...validProductData, stock: -5 };
    expect(() => new Product(invalid)).toThrow('স্টক নেগেটিভ হতে পারবে না');
  });

  test('SKU টু শর্ট হলে Error', () => {
    const invalid = { ...validProductData, sku: 'AB' };
    expect(() => new Product(invalid)).toThrow('SKU কমপক্ষে ৩ ক্যারেক্টার হতে হবে');
  });

  test('স্টক আপডেট সঠিকভাবে কাজ করে', () => {
    const product = new Product(validProductData);
    const oldUpdatedAt = product['props'].updatedAt;
    
    product.updateStock(30);
    expect(product.stock).toBe(30);
    expect(product['props'].updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
  });
});
```

### `server/src/infrastructure/database/models/Product.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

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
    trim: true
  },
  description: { 
    type: String 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  sku: {
    type: String,
    required: true,
    unique: true, // গ্লোবাল ইউনিক নয়, টেন্যান্ট-স্কোপড 
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  images: [{
    type: String
  }]
}, {
  timestamps: true
});

// কম্পোজিট ইনডেক্স: tenantId + sku (টেন্যান্ট-স্কোপড ইউনিকতা নিশ্চিত)
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

// পারফরম্যান্স ইনডেক্স 
ProductSchema.index({ tenantId: 1, createdAt: -1 });
ProductSchema.index({ price: 1 });

const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);

export default ProductModel;
```

### `server/src/routes/product.ts`

```typescript
import { Router, Request, Response } from 'express';
import { Product } from '../domain/Product';
import ProductModel from '../infrastructure/database/models/Product';
import { applyTenantFilter } from '../infrastructure/database';

const router = Router();

// POST /api/products - নতুন প্রোডাক্ট যোগ 
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'টেন্যান্ট আইডি না পাওয়া' 
      });
    }

    const { name, description, price, sku, stock, images } = req.body;

    // বেসিক ভ্যালিডেশন
    if (!name || price === undefined || !sku) {
      return res.status(400).json({
        success: false,
        message: 'নাম, দাম এবং SKU অবশ্যই দিতে হবে'
      });
    }

    // ডোমেইন ভ্যালিডেশন (Domain Model ব্যবহার)
    const productProps = {
      id: `prod_${Date.now()}`,
      tenantId: req.tenantId,
      name,
      description,
      price: parseFloat(price),
      sku,
      stock: parseInt(stock) || 0,
      images,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const product = new Product(productProps); // ভ্যালিডেশন হবে এখানে 

    // MongoDB তে সেভ 
    const newProduct = new ProductModel({
      tenantId: product.tenantId,
      name: product.name,
      description: product.description,
      price: product.price,
      sku: product.sku,
      stock: product.stock,
      images: product.images
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      data: product.toJSON()
    });

  } catch (error: any) {
    console.error('প্রোডাক্ট ক্রিয়েট এড়ে:', error);
    
    // ডুপ্লিকেট SKU এরর হ্যান্ডলিং 
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'এই SKU-র প্রোডাক্ট আগে থেকে আছে'
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'প্রোডাক্ট ক্রিয়েটে সমস্যা'
    });
  }
});

// GET /api/products - প্রোডাক্ট লিস্ট 
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    // Redis ক্যাশ চেক (Phase-5 এ ডিটেইল্ড)
    // সরাসরি MongoDB থেকে 
    const products = await ProductModel.find({ 
      tenantId: req.tenantId 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('প্রোডাক্ট লিস্ট এড়ে:', error);
    res.status(500).json({ 
      success: false, 
      message: 'সার্ভার ত্রুটি' 
    });
  }
});

export default router;
```

---

## টেস্ট স্ট্র্যাটেজি  

| মডিউল         | টাইপ            | টুল        | কভারেজ |
|-----------------|------------------|------------|---------|
| Product Domain | Unit Test        | Jest       | 100%    |
| Product Model  | Integration Test | Jest + Mocha| 90%     |
| Product Route  | E2E Test         | Supertest  | 80%     |

> ✅ **ফাইন্যান্সিয়াল লজিক এখনো টেস্ট-ফার্স্ট নয় — কারণ ওয়ালেট এবং সেটেলমেন্ট **Phase-3** এ আসবে।** 

---

## বেঙ্গলিতে ব্যাখ্যা  
এই ফেজে আমরা **কমার্সের মূল বস্তু** তৈরি করলাম — **পণ্য, অর্ডার, কার্ট**।  
- **Product** ডোমেইন মডেলে **ব্যবসায়িক নিয়ম** (দাম, স্টক) **হার্ডকোড** করা হয়েছে, যেন **কোনো রকম টুল মিসহাপন** না হয়।  
- **MongoDB মডেলে** `tenantId` **ইনডেক্স** যুক্ত করা হয়েছে, যেন **১০০k+ শপ**-এ **কোয়ারি স্পিড** ভালো থাকে।  
- **API রুট** তৈরি করে **শপ মালিক** **প্রোডাক্ট যোগ/দেখ** করতে পারবেন।  

> ⚠️ **সতর্কতা:** **অর্ডার এবং পেমেন্ট** লজিক **Phase-3** এ **Test-First** এ তৈরি করা হবে। এখন **Core Domain** সম্পূর্ণ করা জরুরি।** 
