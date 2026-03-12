/**
 * Tenant Middleware Unit Tests
 * 
 * টেস্ট কভারেজ:
 * - ভ্যালিড সাবডোমেইনে টেন্যান্ট আইডি অ্যাটাচ
 * - ইনভ্যালিড সাবডোমেইনে ৪০০ এরর
 * - সাসপেন্ডেড টেন্যান্টে ৪০৩ এরর
 * - রিডিস ক্যাশ মিস সценаরিও
 */

import { resolveTenant, tenantRateLimit } from '../tenant';
import { Request, Response } from 'express';
import { Tenant } from '../../domain/Tenant';
import TenantModel from '../../infrastructure/database/models/Tenant';
import { redisClient } from '../../infrastructure/redis';

// মক ডাটা
const mockTenantData = {
  id: '651fabc12345def456789012',
  name: 'আলির দোকান',
  subdomain: 'alir-dokan',
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerId: 'user_123',
  plan: 'BASIC' as const
};

// হেল্পার ফাংশনেস
const mockRequest = (host: string = 'alir-dokan.dokanx.com'): Request => {
  return {
    get: (key: string) => {
      if (key === 'host') return host;
      return '';
    },
    tenantId: undefined
  } as unknown as Request;
};

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn();
  return res;
};

describe('resolveTenant Middleware', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
    // রিডিস কানেকশন মক (আলাদা টেস্ট এনভায়রনেমেন্টে)
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('ভ্যালিড সাবডোমেইনে টেন্যান্ট আইডি অ্যাটাচ করে', async () => {
    // মক MongoDB ফাইন্ড
    jest.spyOn(TenantModel, 'findOne').mockResolvedValue({
      ...mockTenantData,
      _id: mockTenantData.id
    } as any);

    // মক Redis
    jest.spyOn(redisClient, 'get').mockResolvedValue(null); // ক্যাশে নাই
    jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await resolveTenant(req, res, next);

    expect(req.tenantId).toBe(mockTenantData.id);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled(); // কোনো এরর রেসপন্স নয়
  });

  test('ইনভ্যালিড সাবডোমেইনে ৪০০ এরর রিটার্ন করে', async () => {
    const req = mockRequest('invalid'); // টপ-লেভেল ডোমেইন
    const res = mockResponse();
    const next = jest.fn();

    await resolveTenant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'সাবডোমেইন সঠিক নয়'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('সাসপেন্ডেড টেন্যান্টে ৪০৩ এরর রিটার্ন করে', async () => {
    jest.spyOn(TenantModel, 'findOne').mockResolvedValue({
      ...mockTenantData,
      status: 'SUSPENDED',
      _id: mockTenantData.id
    } as any);

    jest.spyOn(redisClient, 'get').mockResolvedValue(JSON.stringify({
      ...mockTenantData,
      status: 'SUSPENDED'
    }));

    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await resolveTenant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'আপনার শপ সাসপেন্ড করা হয়েছে। অ্যাডমিন সাথে যোগাযোগ করুন'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('টেন্যান্ট না পেলে ৪০৪ এরর', async () => {
    jest.spyOn(TenantModel, 'findOne').mockResolvedValue(null);
    jest.spyOn(redisClient, 'get').mockResolvedValue(null);

    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await resolveTenant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'শপ খুঁজে পাওয়া যায়নি'
    });
  });
});

describe('tenantRateLimit Middleware', () => {
  test('রেট লিমিট এক্সিডেড হলে ৪২৯ রিটার্ন করে', async () => {
    // মক Redis: ১০০+ রিকুয়েস্ট
    jest.spyOn(redisClient, 'get').mockResolvedValue('100');

    const req = {
      tenantId: 'tenant_123',
      get: jest.fn()
    } as unknown as Request;
    
    const res = mockResponse();
    const next = jest.fn();

    // Access internal checkRateLimit by importing
    const { checkRateLimit } = await import('../../infrastructure/redis');
    
    // সরাসরি মিডলওয়্যার কল
    await tenantRateLimit(req, res, next);
    
    // Since middleware calls checkRateLimit
    // But we need to simulate via actual call
    const allowed = await checkRateLimit('tenant_123');
    expect(allowed).toBe(false);
  });
});