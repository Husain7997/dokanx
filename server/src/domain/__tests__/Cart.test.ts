/**
 * Phase-2: Cart Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 * ব্যবসায়িক নিয়ম:
 * - কার্টে আইটেম যোগ/আপডেট/ডিলিট
 * - কোয়ান্টিটি > ০
 * - কার্ট ক্লিয়ার 
 */

import { Cart, CartItem } from '../Cart';

describe('Cart Domain Entity', () => {
  const validCartItem: CartItem = {
    productId: 'prod_123',
    quantity: 2,
    unitPrice: 250
  };

  const validCartData = {
    id: 'cart_651fabc123',
    tenantId: 'tenant_123',
    items: [validCartItem],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('ভ্যালিড কার্ট তৈরি করা যেতে পারে', () => {
    const cart = new Cart(validCartData);
    expect(cart.id).toBe('cart_651fabc123');
    expect(cart.count).toBe(1);
  });

  test('কার্টে আইটেম যোগ করা যেতে পারে', () => {
    const cart = new Cart(validCartData);
    const newItem: CartItem = {
      productId: 'prod_456',
      quantity: 1,
      unitPrice: 100
    };
    
    cart.addItem(newItem.productId, newItem.quantity, newItem.unitPrice);
    expect(cart.count).toBe(2);
    
    // একই প্রোডাক্ট এড করলে কোয়ান্টিটি আপডেট 
    cart.addItem('prod_123', 1, 250); // quantity +=1 
    const updatedItem = cart['props'].items.find(i => i.productId === 'prod_123');
    expect(updatedItem?.quantity).toBe(3);
  });

  test('আইটেমের কোয়ান্টিটি ০ হলে Error', () => {
    const cart = new Cart(validCartData);
    expect(() => cart.addItem('prod_789', 0, 100)).toThrow(
      'কোয়ান্টিটি পজিটিভ হতে হবে'
    );
  });

  test('দাম নেগেটিভ হলে Error', () => {
    const cart = new Cart(validCartData);
    expect(() => cart.addItem('prod_789', 1, -10)).toThrow(
      'দাম নেগেটিভ হতে পারবে না'
    );
  });

  test('আইটেমের কোয়ান্টিটি আপডেট করা যেতে পারে', () => {
    const cart = new Cart(validCartData);
    cart.updateQuantity('prod_123', 5);
    const item = cart['props'].items[0];
    expect(item.quantity).toBe(5);
  });

  test('অবিষ্যৎ আইটেম আপডেট করলে Error', () => {
    const cart = new Cart(validCartData);
    expect(() => cart.updateQuantity('prod_nonexist', 1)).toThrow(
      'আইটেম কার্টে পাওয়া যায়নি'
    );
  });

  test('আইটেম ডিলিট করা যেতে পারে', () => {
    const cart = new Cart(validCartData);
    cart.removeItem('prod_123');
    expect(cart.count).toBe(0);
  });

  test('অবিষ্যৎ আইটেম ডিলিট করলে Error', () => {
    const cart = new Cart(validCartData);
    expect(() => cart.removeItem('prod_nonexist')).toThrow(
      'আইটেম কার্টে পাওয়া যায়নি'
    );
  });

  test('কার্ট ক্লিয়ার করা যেতে পারে', () => {
    const cart = new Cart(validCartData);
    cart.clear();
    expect(cart.count).toBe(0);
  });

  test('toJSON সঠিকভাবে ডাটা রিটার্ন করে', () => {
    const cart = new Cart(validCartData);
    const json = cart.toJSON();
    expect(json.id).toBe('cart_651fabc123');
    expect(json.items.length).toBe(1);
  });
});
