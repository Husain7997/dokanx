const riskEngine =
  require("./risk.engine");

const actionEngine =
  require("./action.engine");

exports.process = async event => {

  const risk =
    await riskEngine.calculate(event);

  if (risk.score > 70) {

    console.log("⚠ High Risk detected");

    await actionEngine.act({
      risk,
      event
    });
  }
};