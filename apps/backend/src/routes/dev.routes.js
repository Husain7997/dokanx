const router = require("express").Router();
const bcrypt = require("bcryptjs");

const autoSettlement = require("../jobs/autoSettlement.job");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const Product = require("../models/product.model");
const Inventory = require("../models/Inventory.model");

router.get("/run-settlement", async (req, res) => {
  await autoSettlement.runNow();
  res.send("Settlement executed");
});

router.post("/e2e/bootstrap", async (_req, res) => {
  const ownerEmail = "owner@dokanx.test";
  const customerEmail = "customer@dokanx.test";
  const password = "Password123!";
  const hashedPassword = await bcrypt.hash(password, 10);

  const owner = await User.findOneAndUpdate(
    { email: ownerEmail },
    {
      $set: {
        name: "Demo Owner",
        password: hashedPassword,
        role: "OWNER",
      },
    },
    { upsert: true, returnDocument: "after" }
  ).select("+password");

  let shop = owner.shopId ? await Shop.findById(owner.shopId) : null;
  if (!shop) {
    shop = await Shop.findOneAndUpdate(
      { owner: owner._id },
      {
        $set: {
          name: "Demo Merchant Shop",
          owner: owner._id,
          isActive: true,
          status: "ACTIVE",
          supportEmail: ownerEmail,
          subdomain: "demo-merchant",
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    owner.shopId = shop._id;
    owner.role = "OWNER";
    owner.passwordResetRequired = false;
    await owner.save();
  }

  const customer = await User.findOneAndUpdate(
    { email: customerEmail },
    {
      $set: {
        name: "Demo Customer",
        password: hashedPassword,
        role: "CUSTOMER",
        phone: "01700000000",
      },
    },
    { upsert: true, returnDocument: "after" }
  ).select("+password");

  const product = await Product.findOneAndUpdate(
    { shopId: shop._id, name: "E2E Lamp" },
    {
      $set: {
        category: "Testing",
        price: 1200,
        stock: 25,
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  await Inventory.findOneAndUpdate(
    { shopId: shop._id, product: product._id },
    {
      $set: {
        stock: 25,
        isActive: true,
      },
      $setOnInsert: {
        reserved: 0,
        inventoryVersion: 0,
        isReconciling: false,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  res.json({
    success: true,
    owner: {
      email: ownerEmail,
      password,
      shopId: String(shop._id),
    },
    customer: {
      email: customerEmail,
      password,
    },
    product: {
      id: String(product._id),
      name: product.name,
      shopId: String(shop._id),
    },
  });
});

module.exports = router;
