import { Router, Request, Response } from 'express';
import { Product } from '../domain/Product';
import ProductModel from '../infrastructure/database/models/Product';
import { applyTenantFilter } from '../infrastructure/database';

const router = Router();

// POST /api/products - Create new product
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'টেন্যান্ট আইডি না পাওয়া' 
      });
    }

    const { name, description, price, sku, stock, images } = req.body;

    // Basic validation
    if (!name || price === undefined || !sku) {
      return res.status(400).json({
        success: false,
        message: 'নাম, দাম এবং SKU অবশ্যই দিতে হবে'
      });
    }

    // Create domain object to validate business rules
    const productProps = {
      id: `prod_${Date.now()}`,
      tenantId: req.tenantId,
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      sku: sku.trim().toUpperCase(),
      stock: parseInt(stock) || 0,
      images: images || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const product = new Product(productProps); // Will throw if invalid

    // Save to MongoDB
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
    console.error('🚨 প্রোডাক্ট ক্রিয়েট এড়ে:', error);
    
    // Duplicate SKU error (tenant-scoped)
    if (error.code === 11000 && error.keyPattern?.sku) {
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

// GET /api/products - List products (with pagination)
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Query with tenant filter
    const products = await ProductModel.find({ 
      tenantId: req.tenantId 
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await ProductModel.countDocuments({ 
      tenantId: req.tenantId 
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('🚨 প্রোডাক্ট লিস্ট এড়ে:', error);
    res.status(500).json({ 
      success: false, 
      message: 'সার্ভার ত্রুটি' 
    });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const product = await ProductModel.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'প্রোডাক্ট খুঁজে পাওয়া যায়নি'
      });
    }

    // Convert to domain object if needed, but for now return DB doc
    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('🚨 প্রোডাক্ট ডিটেইল এড়ে:', error);
    res.status(500).json({ 
      success: false, 
      message: 'সার্ভার ত্রুটি' 
    });
  }
});

// PATCH /api/products/:id - Update product (e.g., stock, price)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { name, description, price, stock, images } = req.body;
    const updates: any = { updatedAt: new Date() };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (price !== undefined) {
      if (parseFloat(price) < 0) {
        return res.status(400).json({
          success: false,
          message: 'দাম নেগেটিভ হতে পারবে না'
        });
      }
      updates.price = parseFloat(price);
    }
    if (stock !== undefined) {
      if (parseInt(stock) < 0) {
        return res.status(400).json({
          success: false,
          message: 'স্টক নেগেটিভ হতে পারবে না'
        });
      }
      updates.stock = parseInt(stock);
    }
    if (images !== undefined) updates.images = images;

    const updatedProduct = await ProductModel.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId: req.tenantId 
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'প্রোডাক্ট খুঁজে পাওয়া যায়নি'
      });
    }

    res.json({
      success: true,
      data: updatedProduct
    });

  } catch (error: any) {
    console.error('🚨 প্রোডাক্ট আপডেট এড়ে:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'এই SKU-র প্রোডাক্ট আগে থেকে আছে'
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'প্রোডাক্ট আপডেটে সমস্যা'
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const deleted = await ProductModel.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'প্রোডাক্ট খুঁজে পাওয়া যায়নি'
      });
    }

    res.json({
      success: true,
      message: 'প্রোডাক্ট সফলভাবে ডিলিট হয়েছে'
    });

  } catch (error) {
    console.error('🚨 প্রোডাক্ট ডিলিট এড়ে:', error);
    res.status(500).json({ 
      success: false, 
      message: 'সার্ভার ত্রুটি' 
    });
  }
});

export default router;