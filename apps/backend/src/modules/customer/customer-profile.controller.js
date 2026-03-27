const customerProfileService = require("./customer-profile.service");

exports.getCustomerProfile = async (req, res, next) => {
  try {
    const data = await customerProfileService.getCustomerProfile(
      req.params.globalCustomerId,
      req.user
    );
    res.json({ data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};
