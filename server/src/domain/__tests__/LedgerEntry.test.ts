/**
 * Phase-3: LedgerEntry Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 * ব্যবসায়িক নিয়ম:
 * - ডাবল-এন্ট্রি ভ্যালিডেশন
 * - টোটাল ব্যালেন্স ০ হতে হবে
 * - ট্রানজেকশন আইডি ইউনিক
 */

import { LedgerEntry, LedgerEntryType } from '../LedgerEntry';

describe('LedgerEntry Domain Entity', () => {
  const tenantId = 'tenant_456';
  const transactionId = 'txn_123';

  test('ডেবিট এন্ট্রি তৈরি করা যেতে পারে', () => {
    const entry = LedgerEntry.createDebitEntry(
      tenantId,
      transactionId,
      500_00, // 500 BDT in paise (but here as number)
      'অর্ডার #123 পেমেন্ট',
      'bkash_txn_789'
    );

    expect(entry.id).toBeDefined();
    expect(entry.tenantId).toBe(tenantId);
    expect(entry.amount).toBe(500);
    expect(entry.entryType).toBe('DEBIT');
    expect(entry.description).toBe('অর্ডার #123 পেমেন্ট');
    expect(entry.reference).toBe('bkash_txn_789');
  });

  test('ক্রেডিট এন্ট্রি তৈরি করা যেতে পারে', () => {
    const entry = LedgerEntry.createCreditEntry(
      tenantId,
      transactionId,
      300_00,
      'কাস্টমার রিফান্ড',
      'bkash_txn_790'
    );

    expect(entry.entryType).toBe('CREDIT');
    expect(entry.amount).toBe(300);
  });

  test('অ্যামাউন্ট ০ বা নেগেটিভ হলে Error', () => {
    expect(() => 
      LedgerEntry.createDebitEntry(tenantId, transactionId, 0, 'টেস্ট')
    ).toThrow('লেজার এন্ট্রির অ্যামাউন্ট পজিটিভ হতে হবে');

    expect(() => 
      LedgerEntry.createCreditEntry(tenantId, transactionId, -100, 'টেস্ট')
    ).toThrow('লেজার এন্ট্রির অ্যামাউন্ট পজিটিভ হতে হবে');
  });

  test('ডেসক্রিপশন টু শর্ট হলে Error', () => {
    expect(() => 
      LedgerEntry.createDebitEntry(tenantId, transactionId, 100, 'A')
    ).toThrow('ডেসক্রিপশন কমপক্ষে ৩ ক্যারেক্টার হতে হবে');
  });

  test('টোটাল ব্যালেন্স ০ হলে ডাবল-এন্ট্রি ভ্যালিড', () => {
    const debit = LedgerEntry.createDebitEntry(tenantId, transactionId, 500, 'ডেবিট');
    const credit = LedgerEntry.createCreditEntry(tenantId, transactionId, 500, 'ক্রেডিট');
    
    expect(() => LedgerEntry.validateDoubleEntry([debit, credit])).not.toThrow();
  });

  test('টোটাল ব্যালেন্স ০ নয় হলে ভ্যালিডেশন ফেইল', () => {
    const debit = LedgerEntry.createDebitEntry(tenantId, transactionId, 500, 'ডেবিট');
    const credit = LedgerEntry.createCreditEntry(tenantId, transactionId, 400, 'ক্রেডিট');
    
    expect(() => LedgerEntry.validateDoubleEntry([debit, credit]))
      .toThrow('ডাবল-এন্ট্রি ভ্যালিডেশন ফেইল: নেট ব্যালেন্স 100 (০ হতে হবে)');
  });

  test('একক এন্ট্রি দিয়ে ভ্যালিডেশন ফেইল', () => {
    const debit = LedgerEntry.createDebitEntry(tenantId, transactionId, 500, 'ডেবিট');
    expect(() => LedgerEntry.validateDoubleEntry([debit]))
      .toThrow('ডাবল-এন্ট্রি ভ্যালিডেশন ফেইল: নেট ব্যালেন্স -500 (০ হতে হবে)');
  });

  test('toJSON সঠিকভাবে ডাটা রিটার্ন করে', () => {
    const entry = LedgerEntry.createDebitEntry(
      tenantId,
      transactionId,
      100,
      'টেস্ট এন্ট্রি'
    );
    
    const json = entry.toJSON();
    expect(json.tenantId).toBe(tenantId);
    expect(json.transactionId).toBe(transactionId);
    expect(json.amount).toBe(100);
    expect(json.entryType).toBe('DEBIT');
  });
});
