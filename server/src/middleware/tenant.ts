import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../domain/Tenant';
import { redisClient } from '../infrastructure/redis';
import TenantModel from '../infrastructure/database/models/Tenant';

/**
 * Middleware to resolve tenant from subdomain
 * Ensures data isolation and security
 */
export async function resolveTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract subdomain from Host header (e.g., alirshop.dokanx.com)
    const hostname = req.get('host') || '';
    const subdomain = hostname.split('.')[0];

    if (!subdomain || subdomain.length < 3) {
      return res.status(400).json({ 
        success: false,
        message: 'সাবডোমেইন সঠিক নয়' 
      });
    }

    // Check Redis cache first (1-hour TTL)
    let cachedTenant = await redisClient.get(`tenant:${subdomain}`);
    let tenant: Tenant | null = null;

    if (cachedTenant) {
      const parsed = JSON.parse(cachedTenant);
      tenant = new Tenant(parsed);
    } else {
      // Fetch from MongoDB
      const dbTenant = await TenantModel.findOne({ subdomain });
      
      if (!dbTenant) {
        return res.status(404).json({
          success: false,
          message: 'শপ খুঁজে পাওয়া যায়নি'
        });
      }

      // Convert DB document to domain object
      tenant = new Tenant({
        id: dbTenant._id.toString(),
        name: dbTenant.name,
        subdomain: dbTenant.subdomain,
        status: dbTenant.status,
        createdAt: dbTenant.createdAt,
        updatedAt: dbTenant.updatedAt,
        ownerId: dbTenant.ownerId,
        plan: dbTenant.plan
      });

      // Cache for 1 hour (3600 seconds)
      await redisClient.set(
        `tenant:${subdomain}`, 
        JSON.stringify(tenant.toJSON()),
        { EX: 3600 }
      );
    }

    // Check tenant status - block suspended accounts
    if (tenant.status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false,
        message: 'আপনার শপ সাসপেন্ড করা হয়েছে। অ্যাডমিন সাথে যোগাযোগ করুন' 
      });
    }

    // Attach tenant ID to request for downstream handlers
    req.tenantId = tenant.id;
    
    // Also attach full tenant object if needed
    (req as any).tenant = tenant;

    next();
  } catch (error) {
    console.error('❌ টেন্যান্ট রেজোলভিং এড়ে:', error);
    res.status(500).json({ 
      success: false,
      message: 'সার্ভার ত্রুটি' 
    });
  }
}

/**
 * Optional: Rate limiting middleware per tenant
 * Uses Redis to limit to 100 requests/minute per shop
 */
export async function tenantRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.tenantId) {
    return next(); // Skip if tenant not resolved
  }

  try {
    const allowed = await (await import('../infrastructure/redis')).checkRateLimit(req.tenantId);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: 'অতিরিক্ত রিকুয়েস্ট। কিছুক্ষণ পর আবার চেষ্টা করুন'
      });
    }
    next();
  } catch (error) {
    console.error('Rate limit check failed:', error);
    next(); // Fail-open for availability
  }
}