queue.process(async job => {

  const proposal = job.data;

  if (proposal.action === "SCALE_WORKERS") {
    await infra.scaleWorkers(proposal.value);
  }

});