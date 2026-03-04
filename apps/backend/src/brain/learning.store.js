decision: RESTOCK_ALERT
result: SUCCESS
impact: +23% revenue

exports.record = async data => {

  await LearningModel.create({
    data,
    createdAt: new Date()
  });

};