/**
 * Phase-2: Order Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 * ব্যবসায়িক নিয়ম:
 * - অর্ডারে কমপক্ষে ১টি আইটেম
 * - আইটেমের কোয়ান্টিটি > ০
 * - ভ্যালিড স্ট্যাটাস ট্রানজিশন
 * - টোটাল অটো-কালকুলেট (সাবটোটাল + ভ্যাট)
 */

import { Order, OrderItem } from '../Order';

describe('Order Domain Entity', () => {
  const validOrderItem: OrderItem = {
    productId: 'prod_123',
    quantity: 2,
    unitPrice: 250
  };

  const validOrderData = {
    id: 'order_651fabc123',
    tenantId: 'tenant_123',
    items: [validOrderItem],
    status: 'PENDING' as const,
    subtotal: 0, // ক্যালকুলেট হবে 
    vat: 0,
    total: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('ভ্যালিড অর্ডার তৈরি করা যেতে পারে', () => {
    const order = new Order(validOrderData);
    expect(order.id).toBe('order_651fabc123');
    expect(order.total).toBe(500); // (2*250) * 1.1 = 500
    expect(order.subtotal).toBe(500); // 2*250 = 500
    expect(order.vat).toBe(50); // 500 * 0.1 = 50
  });

  test('অর্ডারে ০ আইটেম হলে Error', () => {
    const invalidData = { ...validOrderData, items: [] };
    expect(() => new Order(invalidData)).toThrow(
      'অর্ডারে কমপক্ষে ১টি আইটেম থাকতে হবে'
    );
  });

  test('আইটেমে কোয়ান্টিটি ০ হলে Error', () => {
    const invalidItem = { ...validOrderItem, quantity: 0 };
    const invalidData = { ...validOrderData, items: [invalidItem] };
    expect(() => new Order(invalidData)).toThrow(
      'আইটেম 1: কোয়ান্টিটি পজিটিভ হতে হবে'
    );
  });

  test('দাম নেগেটিভ হলে Error', () => {
    const invalidItem = { ...validOrderItem, unitPrice: -10 };
    const invalidData = { ...validOrderData, items: [invalidItem] };
    expect(() => new Order(invalidData)).toThrow(
      'আইটেম 1: দাম নেগেটিভ হতে পারবে না'
    );
  });

  test('অবৈধ স্ট্যাটাস হলে Error', () => {
    const invalidData = { ...validOrderData, status: 'INVALID' as any };
    expect(() => new Order(invalidData)).toThrow(
      'অবৈধ অর্ডার স্ট্যাটাস'
    );
  });

  test('স্ট্যাটাস পেইড করতে পারবে (PENDING থেকে)', () => {
    const order = new Order(validOrderData);
    order.updateStatus('PAID');
    expect(order.status).toBe('PAID');
  });

  test('স্ট্যাটাস ডেলিভারড সরাসরি PENDING থেকে করতে পারবে না', () => {
    const order = new Order(validOrderData);
    expect(() => order.updateStatus('DELIVERED')).toThrow(
      'স্ট্যাটাস PENDING থেকে DELIVERED এ পরিবর্তন সম্ভব নয়'
    );
  });

  test('শিপড থেকে ডেলিভারড করতে পারবে', () => {
    const order = new Order({ ...validOrderData, status: 'PAID' });
    order.updateStatus('SHIPPED');
    expect(order.status).toBe('SHIPPED');
    
    order.updateStatus('DELIVERED');
    expect(order.status).toBe('DELIVERED');
  });

  test('কানসেলড পরেই স্ট্যাটাস চেঞ্জ করা যাবে না', () => {
    const order = new Order({ ...validOrderData, status: 'CANCELLED' });
    expect(() => order.updateStatus('PAID')).toThrow(
      'স্ট্যাটাস CANCELLED থেকে PAID এ পরিবর্তন সম্ভব নয়'
    );
  });

  test('আইটেম এড করলে টোটাল আপডেট হয়', () => {
    const order = new Order(validOrderData);
    const newItem: OrderItem = {
      productId: 'prod_456',
      quantity: 1,
      unitPrice: 100
    };
    
    order.addItem(newItem);
    expect(order.items.length).toBe(2);
    // সাবটোটাল: (2*250) + (1*100) = 600
    // ভ্যাট: ৬০ 
    // টোটাল: ৬৬০
    expect(order.subtotal).toBe(600);
    expect(order.vat).toBe(60);
    expect(order.total).toBe(660);
  });

  test('toJSON সঠিকভাবে ডাটা রিটার্ন করে', () => {
    const order = new Order(validOrderData);
    const json = order.toJSON();
    
    expect(json.status).toBe('PENDING');
    expect(json.total).toBe(500);
  });
});
