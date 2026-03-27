const CustomerIdentity = require("./customer.identity.model");
const {
  createGlobalCustomerId,
  normalizePhone,
} = require("./customer.identity.service");

async function findOrCreateCustomer(phone, name) {
  const normalizedPhone = normalizePhone(phone);
  let customer = await CustomerIdentity.findOne({
    $or: [{ phone }, { normalizedPhone }],
  });

  if (!customer) {
    customer = await CustomerIdentity.create({
      phone,
      normalizedPhone,
      name,
      globalCustomerId: createGlobalCustomerId(),
    });
  }

  return customer;
}

module.exports = {
  findOrCreateCustomer,
};
