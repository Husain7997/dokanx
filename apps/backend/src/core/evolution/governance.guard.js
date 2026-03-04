exports.approve = async proposal => {

  if (proposal.action === "FINANCIAL_CHANGE")
    throw new Error("Forbidden");

  await GovernanceQueue.add(proposal);

};