module.exports = {
  app: {
    port: process.env.PORT || 5001,
  },

  db: {
    uri: process.env.MONGO_URI,
  },

  features: {
    autoSettlement: true,
  },
};
