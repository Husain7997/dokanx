import express, { Application, Request, Response, NextFunction } from 'express';
import { resolveTenant, tenantRateLimit } from './middleware/tenant';
import { connectDB } from './infrastructure/database';
import { initRedis } from './infrastructure/redis';
import { config } from '../config';
import productRouter from './routes/product';
import orderRouter from './routes/order';
import cartRouter from './routes/cart';
import walletRouter from './routes/wallet';

/**
 * Initialize Express application with production-grade middleware
 */
export async function createApp(): Promise<Application> {
  const app = express();

  // Connect to databases first
  await connectDB();
  await initRedis();

  // Essential middleware
  app.use(express.json({ limit: '10mb' })); // Body parser
  app.use(express.urlencoded({ extended: true }));

  // Multi-tenant middleware - MUST come before routes
  app.use(resolveTenant);
  app.use(tenantRateLimit);

  // Health check endpoint (no tenant required)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ 
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'DokanX API'
    });
  });

  // Simple test route to verify tenant isolation
  app.get('/api/shop/info', (req: Request, res: Response) => {
    // req.tenantId is guaranteed by resolveTenant middleware
    res.json({
      success: true,
      data: {
        tenantId: req.tenantId,
        message: 'শপ তথ্য সফলভাবে লোড হয়েছে',
      }
    });
  });

  // Mount core commerce routes
  app.use('/api/products', productRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/cart', cartRouter);
  
  // Mount financial routes (Phase-3)
  app.use('/api/wallet', walletRouter);

  // Global error handler (financial safety)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('💥 Global error:', err);
    
    // Never leak internal errors to client in production
    res.status(500).json({ 
      success: false,
      message: 'সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন' 
    });
  });

  return app;
}

// Export for testing
export default createApp;