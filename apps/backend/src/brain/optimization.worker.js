queue.process(async () => {

  const trends = await analytics.topSelling();

  for (const product of trends) {

    await Suggestion.create({
      action: "INCREASE_VISIBILITY",
      productId: product.id
    });

  }

});