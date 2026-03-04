let failures = 0;

exports.guard = async fn => {

  if (failures > 10)
    throw new Error("FINANCE CIRCUIT OPEN");

  try {
    return await fn();
  } catch (e) {
    failures++;
    throw e;
  }
};