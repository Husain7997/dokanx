const TaxRule = require('../models/TaxRule');
const Ledger = require('../models/ledger.model');
const ShopWallet = require('../models/ShopWallet');

exports.applyVAT = async (order) => {
  const vatRule = await TaxRule.findOne({ type: 'VAT', active: true });
  if (!vatRule) return 0;

  const vatAmount = (order.totalAmount * vatRule.rate) / 100;

  // Ledger entry
  await Ledger.create({
    walletId: null, // VAT collected goes to platform
    type: 'TAX_VAT',
    direction: 'CREDIT',
    amount: vatAmount,
    meta: {
      orderId: order._id,
      taxRule: vatRule.name
    }
  });

  return vatAmount;
};

exports.applyWithholding = async (payout) => {
  const whRule = await TaxRule.findOne({ type: 'WITHHOLDING', active: true });
  if (!whRule) return 0;

  const whAmount = (payout.amount * whRule.rate) / 100;

  // Ledger entry (debit Shop payable, credit Platform)
  const shopWallet = await ShopWallet.findById(payout.shopWalletId);

  await Ledger.create({
    walletId: shopWallet._id,
    type: 'TAX_WITHHOLDING',
    direction: 'DEBIT',
    amount: whAmount,
    meta: {
      payoutId: payout._id,
      taxRule: whRule.name
    }
  });

  return whAmount;
};
