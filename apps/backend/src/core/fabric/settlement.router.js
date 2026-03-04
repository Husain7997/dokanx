exports.route = async tx => {

  if (tx.fromRegion === tx.toRegion)
    return localSettlement(tx);

  await CrossBorderQueue.add(tx);

};