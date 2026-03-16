exports.listGateways = async (_req, res) => {
  res.json({
    data: [
      { id: "bkash", name: "bKash", mode: "sandbox" },
      { id: "nagad", name: "Nagad", mode: "sandbox" },
      { id: "stripe", name: "Stripe", mode: "sandbox" },
    ],
  });
};
