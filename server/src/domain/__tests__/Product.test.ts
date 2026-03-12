/**
 * Phase-2: Product Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 * ব্যবসায়িক নিয়ম:
 * - নাম ≥ ২ ক্যারেক্টার
 * - দাম ≥ ০
 * - স্টক ≥ ০
 * - SKU ≥ ৩ ক্যারেক্টার
 */

import { Product } from '../Product';

describe('Product Domain Entity', () => {
  const validProductData = {
    id: 'prod_651fabc123',
    tenantId: 'tenant_123',
    name: 'চায় নাস্তা প্যাক',
    price: 250,
    sku: 'CN-001',
    stock: 50,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('ভ্যালিড প্রোডাক্ট তৈরি করা যেতে পারে', () => {
    const product = new Product(validProductData);
    expect(product.id).toBe('prod_651fabc123');
    expect(product.name).toBe('চায় নাস্তা প্যাক');
    expect(product.price).toBe(250);
  });

  test('নাম যদি ১ ক্যারেক্টার হয় তেড়ে Error থ্রো করে', () => {
    const invalidData = { ...validProductData, name: 'A' };
    expect(() => new Product(invalidData)).toThrow(
      'প্রোডাক্টের নাম কমপক্ষে ২ ক্যারেক্টার হতে হবে'
    );
  });

  test('দাম নেগেটিভ হলে Error থ্রো করে', () => {
    const invalidData = { ...validProductData, price: -10 };
    expect(() => new Product(invalidData)).toThrow(
      'দাম নেগেটিভ হতে পারবে না'
    );
  });

  test('স্টক নেগেটিভ হলে Error থ্রো করে', () => {
    const invalidData = { ...validProductData, stock: -5 };
    expect(() => new Product(invalidData)).toThrow(
      'স্টক নেগেটিভ হতে পারবে না'
    );
  });

  test('SKU যদি ২ ক্যারেক্টার হয় তেড়ে Error থ্রো করে', () => {
    const invalidData = { ...validProductData, sku: 'AB' };
    expect(() => new Product(invalidData)).toThrow(
      'SKU কমপক্ষে ৩ ক্যারেক্টার হতে হবে'
    );
  });

  test('স্টক আপডেট সঠিকভাবে কাজ করে', () => {
    const product = new Product(validProductData);
    const oldUpdatedAt = product['props'].updatedAt;
    
    product.updateStock(30);
    expect(product.stock).toBe(30);
    expect(product['props'].updatedAt.getTime()).toBeGreaterThan(
      oldUpdatedAt.getTime()
    );
  });

  test('দাম আপডেট সঠিকভাবে কাজ করে', () => {
    const product = new Product(validProductData);
    product.updatePrice(300);
    expect(product.price).toBe(300);
  });

  test('toJSON সঠিকভাবে ডাটা রিটার্ন করে', () => {
    const product = new Product(validProductData);
    const json = product.toJSON();
    
    expect(json).toEqual({
      id: 'prod_651fabc123',
      tenantId: 'tenant_123',
      name: 'চায় নাস্তা প্যাক',
      description: undefined,
      price: 250,
      sku: 'CN-001',
      stock: 50,
      images: undefined,
      createdAt: validProductData.createdAt,
      updatedAt: validProductData.updatedAt
    });
  });
});
