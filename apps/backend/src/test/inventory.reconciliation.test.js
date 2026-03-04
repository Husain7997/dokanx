it("should repair corrupted stock", async () => {
  product.stock = 999;
  await product.save();

  await reconcileProduct(product);

  const fixed = await Product.findById(product._id);

  expect(fixed.stock).toBe(correctValue);
});