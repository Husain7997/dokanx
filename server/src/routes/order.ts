import { Router, Request, Response } from 'express';
import { Order, OrderItem } from '../domain/Order';
import OrderModel from '../infrastructure/database/models/Order';
import ProductModel from '../infrastructure/database/models/Product';

const router = Router();

// POST /api/orders - Create new order from cart
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { items, customerId, idempotencyKey } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'অর্ডারে কমপক্ষে ১টি আইটেম থাকতে হবে'
      });
    }

    // Validate products exist and get current prices/stock
    const productDetails = await Promise.all(
      items.map(async (item: any) => {
        const product = await ProductModel.findOne({
          _id: item.productId,
          tenantId: req.tenantId
        });
        
        if (!product) {
          throw new Error(`প্রোডাক্ট ${item.productId} পাওয়া যায়নি`);
        }
        
        if (product.stock < item.quantity) {
          throw new Error(`প্রোডাক্ট ${product.name} এর স্টক যথেষ্ট নয় (লাভ: ${product.stock})`);
        }
        
        return {
          productId: product._id.toString(),
          quantity: item.quantity,
          unitPrice: product.price // Use current price at order time
        };
      })
    );

    // Prepare order props
    const orderId = `order_${Date.now()}`;
    const now = new Date();

    // Calculate totals using domain model
    const tempOrder = new Order({
      id: orderId,
      tenantId: req.tenantId,
      customerId,
      items: productDetails,
      status: 'PENDING',
      subtotal: 0,
      vat: 0,
      total: 0,
      createdAt: now,
      updatedAt: now,
      idempotencyKey
    });
    
    // The domain model will auto-calculate totals

    // Create Order in DB
    const newOrder = new OrderModel({
      tenantId: tempOrder.tenantId,
      customerId: tempOrder.customerId,
      items: tempOrder.items,
      status: tempOrder.status,
      subtotal: tempOrder.subtotal,
      vat: tempOrder.vat,
      total: tempOrder.total,
      idempotencyKey,
      createdAt: now,
      updatedAt: now
    });

    await newOrder.save();

    // Update product stock (atomic decrement)
    await Promise.all(
      productDetails.map(async (detail) => {
        await ProductModel.updateOne(
          { 
            _id: detail.productId, 
            tenantId: req.tenantId,
            stock: { $gte: detail.quantity } // Ensure stock not negative
          },
          { $inc: { stock: -detail.quantity } }
        );
      })
    );

    res.status(201).json({
      success: true,
      data: {
        id: newOrder._id,
        status: newOrder.status,
        total: newOrder.total,
        items: newOrder.items
      }
    });

  } catch (error: any) {
    console.error('🚨 অর্ডার ক্রিয়েট এড়ে:', error);
    
    // Idempotency check - if key exists, return existing order
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const existing = await OrderModel.findOne({ idempotencyKey });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: {
            id: existing._id,
            status: existing.status,
            total: existing.total,
            items: existing.items,
            message: 'ইডেমপোটেন্ট রিকুয়েস্ট: পুরনো অর্ডার রিটার্ন'
          }
        });
      }
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'অর্ডার ক্রিয়েটে সমস্যা'
    });
  }
});

// GET /api/orders - List orders with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const filter: any = { tenantId: req.tenantId };
    if (status) filter.status = status;

    const orders = await OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await OrderModel.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('🚨 অর্ডার লিস্ট এড়ে:', error);
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি' });
  }
});

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'স্ট্যাটাস দিতে হবে'
      });
    }

    const validStatuses = ['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'অবৈধ স্ট্যাটাস'
      });
    }

    // Get current order
    const currentOrder = await OrderModel.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'অর্ডার খুঁজে পাওয়া যায়নি'
      });
    }

    // Convert to domain object to validate transition
    const order = new Order({
      id: currentOrder._id.toString(),
      tenantId: currentOrder.tenantId,
      customerId: currentOrder.customerId,
      items: currentOrder.items as any,
      status: currentOrder.status,
      subtotal: currentOrder.subtotal,
      vat: currentOrder.vat,
      total: currentOrder.total,
      createdAt: currentOrder.createdAt,
      updatedAt: currentOrder.updatedAt
    });

    // Update status using domain logic
    order.updateStatus(status as any);

    // Save to DB
    const updated = await OrderModel.findByIdAndUpdate(
      req.params.id,
      { 
        status: order.status,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      data: updated
    });

  } catch (error: any) {
    console.error('🚨 অর্ডার স্ট্যাটাস আপডেট এড়ে:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'স্ট্যাটাস আপডেটে সমস্যা'
    });
  }
});

export default router;