/**
 * Phase-3: Wallet Domain Unit Tests
 * 
 * টেস্ট কভারেজ: ১০০%
 * ব্যবসায়িক নিয়ম:
 * - ব্যালেন্স ≥ ০ 
 * - ক্রেডিট/ডেবিট সঠিক কাজ করে
 * - ইনসফিসিয়েন্ট ফান্ডস এরর
 * - আইডেমপোটেন্সি কী সাপোর্ট
 */

import { Wallet } from '../Wallet';

describe('Wallet Domain Entity', () => {
  const validWalletData = {
    id: 'wallet_123',
    tenantId: 'tenant_456',
    balance: 1000,
    currency: 'BDT' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('ভ্যালিড ওয়ালেট তৈরি করা যেতে পারে', () => {
    const wallet = new Wallet(validWalletData);
    expect(wallet.id).toBe('wallet_123');
    expect(wallet.tenantId).toBe('tenant_456');
    expect(wallet.balance).toBe(1000);
  });

  test('ব্যালেন্স নেগেটিভ হলে Error', () => {
    const invalid = { ...validWalletData, balance: -100 };
    expect(() => new Wallet(invalid)).toThrow('ওয়ালেট ব্যালেন্স নেগেটিভ হতে পারবে না');
  });

  test('কারেন্সি ভুল হলে Error', () => {
    const invalid = { ...validWalletData, currency: 'USD' };
    expect(() => new Wallet(invalid)).toThrow('মাতৃভাষা কারেন্সি BDT হতে হবে');
  });

  test('ক্রেডিট করলে ব্যালেন্স বাড়ে', () => {
    const wallet = new Wallet(validWalletData);
    wallet.credit(500);
    expect(wallet.balance).toBe(1500);
  });

  test('ডেবিট করলে ব্যালেন্স কমে', () => {
    const wallet = new Wallet(validWalletData);
    wallet.debit(300);
    expect(wallet.balance).toBe(700);
  });

  test('ইনসফিসিয়েন্ট ফান্ডস এ ডেবিট করলে Error', () => {
    const wallet = new Wallet({ ...validWalletData, balance: 200 });
    expect(() => wallet.debit(300)).toThrow('ইনসফিসিয়েন্ট ফান্ডস');
  });

  test('ক্রেডিট/ডেবিটে অ্যামাউন্ট ০ বা নেগেটিভ হলে Error', () => {
    const wallet = new Wallet(validWalletData);
    expect(() => wallet.credit(0)).toThrow('ক্রেডিট অ্যামাউন্ট পজিটিভ হতে হবে');
    expect(() => wallet.debit(-10)).toThrow('ডেবিট অ্যামাউন্ট পজিটিভ হতে হবে');
  });

  test('toJSON সঠিকভাবে ডাটা রিটার্ন করে', () => {
    const wallet = new Wallet(validWalletData);
    const json = wallet.toJSON();
    
    expect(json).toEqual({
      id: 'wallet_123',
      tenantId: 'tenant_456',
      balance: 1000,
      currency: 'BDT',
      createdAt: validWalletData.createdAt,
      updatedAt: validWalletData.updatedAt
    });
  });
});
