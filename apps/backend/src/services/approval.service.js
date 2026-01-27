const ApprovalRequest = require('../models/ApprovalRequest');
const { triggerPayout } = require('./payoutGateway.service');
const Ledger = require('../models/ledger.model');

exports.createRequest = async ({ type, referenceId, shopId, amount, reason, makerId }) => {
  return await ApprovalRequest.create({
    type,
    referenceId,
    shopId,
    amount,
    reason,
    makerId
  });
};

exports.approveRequest = async ({ requestId, checkerId }) => {
  const reqObj = await ApprovalRequest.findById(requestId);
  if (!reqObj) throw new Error('Approval request not found');
  if (reqObj.status !== 'PENDING') throw new Error('Already processed');

  // Execute based on type
  if (reqObj.type === 'PAYOUT') {
    await triggerPayout({
      walletId: reqObj.shopId, // assume walletId=shopId for simplicity
      amount: reqObj.amount,
      type: 'BKASH', // default, could be dynamic
      referenceId: reqObj.referenceId,
      idempotencyKey: `${reqObj.referenceId}_APPROVAL`
    });
  }

  // Other types like REFUND / ADJUSTMENT should call respective services (ledger-safe)

  reqObj.status = 'APPROVED';
  reqObj.checkerId = checkerId;
  await reqObj.save();

  return reqObj;
};

exports.rejectRequest = async ({ requestId, checkerId, comment }) => {
  const reqObj = await ApprovalRequest.findById(requestId);
  if (!reqObj) throw new Error('Approval request not found');
  if (reqObj.status !== 'PENDING') throw new Error('Already processed');

  reqObj.status = 'REJECTED';
  reqObj.checkerId = checkerId;
  reqObj.checkerComment = comment;
  await reqObj.save();

  return reqObj;
};

exports.listPending = async () => {
  return await ApprovalRequest.find({ status: 'PENDING' }).sort({ createdAt: 1 });
};
