/**
 * Tenant Domain Unit Tests
 * 
 * ব্যাবসায়িক নীতিমালা:
 * - টেন্যান্টের সাবডোমেইন ইউনিক ও ভ্যালিড হতে হবে
 * - নাম কমপক্ষে ২ ক্যারেক্টার
 */

import { Tenant } from '../Tenant';

describe('Tenant Domain Entity', () => {
  const validTenantData = {
    id: '651fabc12345def456789012',
    name: 'আলির দোকান',
    subdomain: 'alir-dokan',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: 'user_123',
    plan: 'BASIC' as const
  };

  test('ভ্যালিড টেন্যান্ট তৈরি করা যেতে পারে', () => {
    const tenant = new Tenant(validTenantData);
    expect(tenant.id).toBe(validTenantData.id);
    expect(tenant.name).toBe('আলির দোকান');
  });

  test('নাম যদি ১ ক্যারেক্টার হয় তেড়ে Error থ্রো করে', () => {
    const invalidData = { ...validTenantData, name: 'A' };
    expect(() => new Tenant(invalidData)).toThrow(
      'টেন্যান্টের নাম কমপক্ষে ২ ক্যারেক্টার হতে হবে'
    );
  });

  test('সাবডোমেইনে অক্ষর/সংখ্যা/হাইফেন ছাড়া অন্য চর থাকলে Error', () => {
    const invalidData = { ...validTenantData, subdomain: 'ali@store' };
    expect(() => new Tenant(invalidData)).toThrow(
      'সাবডোমেইন শুধু ছোট হাতের অক্ষর, সংখ্যা এবং হাইফেন থাকতে পারে (৩-৩০ ক্যারেক্টার)'
    );
  });

  test('স্ট্যাটাস আপডেট সঠিকভাবে কাজ করে', () => {
    const tenant = new Tenant(validTenantData);
    const oldUpdatedAt = tenant['props'].updatedAt;
    
    // কক্ষপট: সাময়িকভাবে TypeScript এর error এড়াতে
    tenant.updateStatus('SUSPENDED');
    
    expect(tenant.status).toBe('SUSPENDED');
    expect(tenant['props'].updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
  });
});