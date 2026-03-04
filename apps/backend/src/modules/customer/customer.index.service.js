const CustomerIdentity = require("./customer.identity.model");

async function findOrCreateCustomer(phone, name) {
  let customer = await CustomerIdentity.findOne({ phone });

  if (!customer) {
    customer = await CustomerIdentity.create({
      phone,
      name,
    });
  }

  return customer;
}

module.exports = {
  findOrCreateCustomer,
};