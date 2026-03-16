const ProviderCredential = require("../../models/providerCredential.model");
const { encryptSecret, decryptSecret } = require("../../utils/crypto.util");

function maskSecret(secret) {
  if (!secret) return "";
  if (secret.length <= 6) return "***";
  return `${secret.slice(0, 3)}***${secret.slice(-2)}`;
}

exports.listCredentials = async (_req, res) => {
  const records = await ProviderCredential.find().lean();
  const data = records.map((record) => ({
    provider: record.provider,
    status: record.status,
    publicData: record.publicData,
    secretPreview: record.secretCipher
      ? maskSecret(decryptSecret(record.secretCipher, record.secretIv))
      : "",
  }));
  res.json({ data });
};

exports.upsertCredential = async (req, res) => {
  const { provider, publicData, secret, status } = req.body || {};
  if (!provider) return res.status(400).json({ message: "provider required" });

  const update = {
    ...(publicData ? { publicData } : {}),
    ...(status ? { status } : {}),
  };

  if (secret) {
    const encrypted = encryptSecret(secret);
    update.secretCipher = encrypted.cipher;
    update.secretIv = encrypted.iv;
  }

  const record = await ProviderCredential.findOneAndUpdate(
    { provider },
    { provider, ...update },
    { new: true, upsert: true }
  );

  res.json({
    message: "Credential saved",
    data: {
      provider: record.provider,
      status: record.status,
      publicData: record.publicData,
      secretPreview: record.secretCipher
        ? maskSecret(decryptSecret(record.secretCipher, record.secretIv))
        : "",
    },
  });
};

exports.testCredential = async (req, res) => {
  const { provider } = req.params;
  const record = await ProviderCredential.findOne({ provider });
  if (!record) return res.status(404).json({ message: "Credential not found" });

  res.json({
    data: {
      provider,
      status: record.status,
      reachable: true,
      message: "Test successful (stubbed).",
    },
  });
};
