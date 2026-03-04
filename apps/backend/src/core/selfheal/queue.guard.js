module.exports = async function(job, handler) {

  try {
    await handler(job);

  } catch (err) {

    if (job.attemptsMade > 5) {

      await job.moveToFailed();

      console.error("POISON JOB REMOVED", job.id);

      return;
    }

    throw err;
  }
};