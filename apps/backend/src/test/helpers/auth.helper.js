const User = require("../../models/user.model");
const Shop = require("../../models/shop.model");

async function createAdminAndLogin() {
  const admin = await User.create({
    name: `Admin ${Date.now()}`,
    email: `admin-${Date.now()}@test.local`,
    password: "123456",
    role: "ADMIN",
  });

  return {
    token: "test-admin-token",
    userId: admin._id,
  };
}

async function createShopOwnerAndLogin() {
  const owner = await User.create({
    name: `Owner ${Date.now()}`,
    email: `owner-${Date.now()}@test.local`,
    password: "123456",
    role: "OWNER",
  });

  const shop = await Shop.create({
    name: `Shop ${Date.now()}`,
    owner: owner._id,
  });

  return {
    token: "test-owner-token",
    userId: owner._id,
    shopId: shop._id,
  };
}

module.exports = {
  createAdminAndLogin,
  createShopOwnerAndLogin,
};
