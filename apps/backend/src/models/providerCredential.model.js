const mongoose = require("mongoose");

const providerCredentialSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, unique: true, index: true },
    publicData: { type: Object, default: null },
    secretCipher: { type: String, default: null },
    secretIv: { type: String, default: null },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ProviderCredential ||
  mongoose.model("ProviderCredential", providerCredentialSchema);
