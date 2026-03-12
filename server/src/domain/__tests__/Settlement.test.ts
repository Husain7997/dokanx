/**
 * Phase-3: Settlement Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 * ব্যবসায়িক নিয়ম:
 * - স্ট্যাটাস ট্রানজিশন ভ্যালিড
 * - অ্যামাউন্ট পজিটিভ
 * - শিডিউলড ডেট ভবিষ্যতে
 * - রিট্রাই মেকানিজম (FAILED → PENDING)
 */

import { Settlement } from '../Settlement';

describe('Settlement Domain Entity', () => {
  const tenantId = 'tenant_456';
  const validSettlementData = {
    id: 'sett_123',
    tenantId,
    amount: 50000, // ৫০,০০০ টাকা
    status: 'PENDING' as const,
    payoutMethod: 'BKASH' as const,
    scheduledAt: new Date(Date.now() + 86400000), // ১ দিন পর
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('ভ্যালিড সেটেলমেন্ট তৈরি করা যেতে পারে', () => {
    const settlement = new Settlement(validSettlementData);
    expect(settlement.id).toBe('sett_123');
    expect(settlement.amount).toBe(50000);
    expect(settlement.status).toBe('PENDING');
  });

  test('অ্যামাউন্ট ০ বা নেগেটিভ হলে Error', () => {
    expect(() => new Settlement({ 
      ...validSettlementData, 
      amount: 0 
    })).toThrow('সেটেলমেন্ট অ্যামাউন্ট পজিটিভ হতে হবে');

    expect(() => new Settlement({ 
      ...validSettlementData, 
      amount: -100 
    })).toThrow('সেটেলমেন্ট অ্যামাউন্ট পজিটিভ হতে হবে');
  });

  test('শিডিউলড ডেট অতীত হলে Error', () => {
    expect(() => new Settlement({ 
      ...validSettlementData, 
      scheduledAt: new Date(Date.now() - 86400000) // ১ দিন আগে
    })).toThrow('শিডিউলড ডেট ভবিষ্যতে হতে হবে');
  });

  test('অবৈধ স্ট্যাটাস হলে Error', () => {
    expect(() => new Settlement({ 
      ...validSettlementData, 
      status: 'INVALID' as any 
    })).toThrow('অবৈধ সেটেলমেন্ট স্ট্যাটাস');
  });

  test('অবৈধ পেমেন্ট মেথড হলে Error', () => {
    expect(() => new Settlement({ 
      ...validSettlementData, 
      payoutMethod: 'INVALID' as any 
    })).toThrow('অবৈধ পেমেন্ট মেথড');
  });

  test('স্ট্যাটাস প্রসেসিং আপডেট করা যেতে পারে', () => {
    const settlement = new Settlement(validSettlementData);
    settlement.updateStatus('PROCESSING');
    expect(settlement.status).toBe('PROCESSING');
  });

  test('স্ট্যাটাস কমপ্লিটেড আপডেট করা যেতে পারে', () => {
    const settlement = new Settlement({ 
      ...validSettlementData, 
      status: 'PROCESSING' 
    });
    settlement.updateStatus('COMPLETED');
    expect(settlement.status).toBe('COMPLETED');
    expect(settlement.processedAt).toBeDefined();
  });

  test('স্ট্যাটাস ফেইলড আপডেট করলে রিজন অ্যাড হয়', () => {
    const settlement = new Settlement(validSettlementData);
    settlement.updateStatus('FAILED', 'bKash টোকেন এক্সপায়ার হয়েছে');
    expect(settlement.status).toBe('FAILED');
    expect(settlement.failureReason).toBe('bKash টোকেন এক্সপায়ার হয়েছে');
  });

  test('ফেইলড স্ট্যাটাস থেকে পেন্ডিংে রিট্রাই করা যেতে পারে', () => {
    const settlement = new Settlement({ 
      ...validSettlementData, 
      status: 'FAILED' 
    });
    settlement.updateStatus('PENDING');
    expect(settlement.status).toBe('PENDING');
  });

  test('কোমপ্লিটেড স্ট্যাটাস থেকে অন্য স্ট্যাটাসে চেঞ্জ করা যাবে না', () => {
    const settlement = new Settlement({ 
      ...validSettlementData, 
      status: 'COMPLETED' 
    });
    expect(() => settlement.updateStatus('PENDING'))
      .toThrow('স্ট্যাটাস COMPLETED থেকে PENDING এ পরিবর্তন সম্ভব নয়');
  });

  test('toJSON সঠিকভাবে ডাটা রিটার্ন করে', () => {
    const settlement = new Settlement(validSettlementData);
    const json = settlement.toJSON();
    
    expect(json.id).toBe('sett_123');
    expect(json.amount).toBe(50000);
    expect(json.status).toBe('PENDING');
  });
});
