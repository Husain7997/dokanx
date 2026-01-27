const approvalService = require('../../services/approval.service');

exports.create = async (req, res) => {
  const { type, referenceId, shopId, amount, reason } = req.body;

  const reqObj = await approvalService.createRequest({
    type,
    referenceId,
    shopId,
    amount,
    reason,
    makerId: req.user._id
  });

  res.json({ message: 'Approval request created', data: reqObj });
};

exports.approve = async (req, res) => {
  const { requestId } = req.params;
  const reqObj = await approvalService.approveRequest({
    requestId,
    checkerId: req.user._id
  });

  res.json({ message: 'Request approved', data: reqObj });
};

exports.reject = async (req, res) => {
  const { requestId } = req.params;
  const { comment } = req.body;

  const reqObj = await approvalService.rejectRequest({
    requestId,
    checkerId: req.user._id,
    comment
  });

  res.json({ message: 'Request rejected', data: reqObj });
};

exports.listPending = async (req, res) => {
  const list = await approvalService.listPending();
  res.json({ data: list });
};
