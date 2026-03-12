import { Router, Request, Response } from 'express';
import { Cart, CartItem } from '../domain/Cart';
import CartModel from '../infrastructure/database/models/Cart';
import ProductModel from '../infrastructure/database/models/Product';

const router = Router();

// GET /api/cart - Get current cart
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    // Find latest cart for tenant (or create if none)
    let cartDoc = await CartModel.findOne({ 
      tenantId: req.tenantId 
    }).sort({ updatedAt: -1 });

    if (!cartDoc) {
      // Create empty cart
      cartDoc = new CartModel({
        tenantId: req.tenantId,
        items: []
      });
      await cartDoc.save();
    }

    // Convert to domain object
    const cart = new Cart({
      id: cartDoc._id.toString(),
      tenantId: cartDoc.tenantId,
      items: cartDoc.items as any,
      createdAt: cartDoc.createdAt,
      updatedAt: cartDoc.updatedAt
    });

    res.json({
      success: true,
      data: cart.toJSON()
    });

  } catch (error) {
    console.error('🚨 কার্ট ফেচ এড়ে:', error);
    res.status(500).json({ 
      success: false, 
      message: 'সার্ভার ত্রুটি' 
    });
  }
});

// POST /api/cart/items - Add item to cart
router.post('/items', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ভ্যালিড প্রোডাক্ট আইডি ও পজিটিভ কোয়ান্টিটি দিতে হবে'
      });
    }

    // Get product details
    const product = await ProductModel.findOne({
      _id: productId,
      tenantId: req.tenantId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'প্রোডাক্ট খুঁজে পাওয়া যায়নি'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `স্টক যথেষ্ট নয় (লাভ: ${product.stock})`
      });
    }

    // Get or create cart
    let cartDoc = await CartModel.findOne({ 
      tenantId: req.tenantId 
    }).sort({ updatedAt: -1 });

    if (!cartDoc) {
      cartDoc = new CartModel({
        tenantId: req.tenantId,
        items: []
      });
    }

    // Convert to domain object to use business logic
    const cart = new Cart({
      id: cartDoc._id.toString(),
      tenantId: cartDoc.tenantId,
      items: cartDoc.items as any,
      createdAt: cartDoc.createdAt,
      updatedAt: cartDoc.updatedAt
    });

    // Add item using domain logic
    cart.addItem(productId, quantity, product.price);

    // Save back to DB
    cartDoc.items = cart.items;
    cartDoc.updatedAt = new Date();
    await cartDoc.save();

    res.json({
      success: true,
      data: cart.toJSON()
    });

  } catch (error: any) {
    console.error('🚨 কার্ট আইটেম এড এড়ে:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'কার্ট আপডেটে সমস্যা'
    });
  }
});

// PATCH /api/cart/items/:productId - Update item quantity
router.patch('/items/:productId', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'পজিটিভ কোয়ান্টিটি দিতে হবে'
      });
    }

    // Get cart
    const cartDoc = await CartModel.findOne({ 
      tenantId: req.tenantId 
    }).sort({ updatedAt: -1 });

    if (!cartDoc) {
      return res.status(404).json({
        success: false,
        message: 'কার্ট খুঁজে পাওয়া যায়নি'
      });
    }

    // Check product stock
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'প্রোডাক্ট খুঁজে পাওয়া যায়নি'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `স্টক যথেষ্ট নয় (লাভ: ${product.stock})`
      });
    }

    // Update using domain
    const cart = new Cart({
      id: cartDoc._id.toString(),
      tenantId: cartDoc.tenantId,
      items: cartDoc.items as any,
      createdAt: cartDoc.createdAt,
      updatedAt: cartDoc.updatedAt
    });

    cart.updateQuantity(productId, quantity);
    
    // Save
    cartDoc.items = cart.items;
    cartDoc.updatedAt = new Date();
    await cartDoc.save();

    res.json({
      success: true,
      data: cart.toJSON()
    });

  } catch (error: any) {
    console.error('🚨 কার্ট আইটেম আপডেট এড়ে:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'কার্ট আপডেটে সমস্যা'
    });
  }
});

// DELETE /api/cart/items/:productId - Remove item
router.delete('/items/:productId', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { productId } = req.params;

    const cartDoc = await CartModel.findOne({ 
      tenantId: req.tenantId 
    }).sort({ updatedAt: -1 });

    if (!cartDoc) {
      return res.status(404).json({
        success: false,
        message: 'কার্ট খুঁজে পাওয়া যায়নি'
      });
    }

    // Remove using domain
    const cart = new Cart({
      id: cartDoc._id.toString(),
      tenantId: cartDoc.tenantId,
      items: cartDoc.items as any,
      createdAt: cartDoc.createdAt,
      updatedAt: cartDoc.updatedAt
    });

    cart.removeItem(productId);
    
    // Save
    cartDoc.items = cart.items;
    cartDoc.updatedAt = new Date();
    await cartDoc.save();

    res.json({
      success: true,
      data: cart.toJSON()
    });

  } catch (error: any) {
    console.error('🚨 কার্ট আইটেম ডিলিট এড়ে:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'কার্ট আপডেটে সমস্যা'
    });
  }
});

// DELETE /api/cart - Clear entire cart
router.delete('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const cartDoc = await CartModel.findOne({ 
      tenantId: req.tenantId 
    }).sort({ updatedAt: -1 });

    if (!cartDoc) {
      return res.status(404).json({
        success: false,
        message: 'কার্ট খুঁজে পাওয়া যায়নি'
      });
    }

    // Clear using domain
    const cart = new Cart({
      id: cartDoc._id.toString(),
      tenantId: cartDoc.tenantId,
      items: cartDoc.items as any,
      createdAt: cartDoc.createdAt,
      updatedAt: cartDoc.updatedAt
    });

    cart.clear();
    
    // Save
    cartDoc.items = [];
    cartDoc.updatedAt = new Date();
    await cartDoc.save();

    res.json({
      success: true,
      message: 'কার্ট সফলভাবে ক্লিয়ার হয়েছে'
    });

  } catch (error) {
    console.error('🚨 কার্ট ক্লিয়ার এড়ে:', error);
    res.status(500).json({ 
      success: false, 
      message: 'সার্ভার ত্রুটি' 
    });
  }
});

export default router;