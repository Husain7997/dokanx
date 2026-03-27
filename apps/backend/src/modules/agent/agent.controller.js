const service = require("./agent.service");

exports.registerFromLead = async (req, res) => {
  try {
    const result = await service.registerFromLead(req.body || {});
    res.status(201).json({
      message: "Lead converted into agent account",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.trackReferralClick = async (req, res) => {
  try {
    const result = await service.trackReferralClick({
      agentCode: req.query.ref || req.params.agentCode,
      metadata: {
        referrer: req.headers.referer || "",
        userAgent: req.headers["user-agent"] || "",
      },
    });
    res.json({ data: result });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const agent = await service.getAgentMe(req.user._id);
    if (!agent) {
      return res.status(404).json({ message: "Agent profile not found" });
    }
    res.json({ data: agent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listAdminAgents = async (_req, res) => {
  try {
    const data = await service.listAdminAgents();
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const data = await service.updateAgentStatus(req.params.id, req.body?.status);
    res.json({ data, message: "Agent status updated" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
