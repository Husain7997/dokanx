const SupportTicket = require("./models/supportTicket.model");
const SupportQuickReply = require("./models/quickReply.model");

const TEAM_BY_CATEGORY = {
  ORDER: "ORDER_OPS",
  PAYMENT: "FINANCE",
  DELIVERY: "DELIVERY",
  PRODUCT: "CATALOG",
  TECHNICAL: "TECH",
  GENERAL: "SUPPORT",
};

const SLA_HOURS_BY_PRIORITY = {
  LOW: 72,
  MEDIUM: 24,
  HIGH: 8,
  URGENT: 2,
};

function normalizeStatus(value = "") {
  return String(value || "").trim().toUpperCase();
}

function normalizePriority(value = "") {
  const upper = String(value || "").trim().toUpperCase();
  return ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(upper) ? upper : "MEDIUM";
}

function normalizeCategory(value = "") {
  const upper = String(value || "").trim().toUpperCase();
  return ["ORDER", "PAYMENT", "DELIVERY", "PRODUCT", "TECHNICAL", "GENERAL"].includes(upper)
    ? upper
    : "GENERAL";
}

function getSlaDueAt(priority = "MEDIUM", now = new Date()) {
  const hours = SLA_HOURS_BY_PRIORITY[normalizePriority(priority)] || 24;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function autoAssignTeam(category = "GENERAL") {
  return TEAM_BY_CATEGORY[normalizeCategory(category)] || "SUPPORT";
}

async function createTicket({
  shopId,
  createdBy,
  createdByRole,
  subject,
  description,
  category,
  priority,
  orderId = null,
}) {
  const normalizedCategory = normalizeCategory(category);
  const normalizedPriority = normalizePriority(priority);

  return SupportTicket.create({
    shopId,
    createdBy: createdBy || null,
    createdByRole: String(createdByRole || "").toUpperCase(),
    subject: String(subject || "").trim(),
    description: String(description || "").trim(),
    category: normalizedCategory,
    priority: normalizedPriority,
    status: "OPEN",
    assignedTeam: autoAssignTeam(normalizedCategory),
    orderId: orderId || null,
    slaDueAt: getSlaDueAt(normalizedPriority),
    comments: [],
  });
}

async function listTickets({ shopId, filters = {} }) {
  const query = { shopId };
  if (filters.status) query.status = normalizeStatus(filters.status);
  if (filters.priority) query.priority = normalizePriority(filters.priority);
  if (filters.category) query.category = normalizeCategory(filters.category);

  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 200);

  return SupportTicket.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getTicket({ shopId, ticketId }) {
  return SupportTicket.findOne({ _id: ticketId, shopId }).lean();
}

async function updateTicketStatus({
  shopId,
  ticketId,
  actorId,
  actorRole,
  status,
  note = "",
  assignedTo = null,
}) {
  const ticket = await SupportTicket.findOne({ _id: ticketId, shopId });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.statusCode = 404;
    throw err;
  }

  ticket.status = normalizeStatus(status);
  ticket.assignedTo = assignedTo || ticket.assignedTo || null;
  ticket.resolutionNote = String(note || "").trim();
  ticket.comments.push({
    authorId: actorId || null,
    authorRole: String(actorRole || "").toUpperCase(),
    message: `Status changed to ${ticket.status}${note ? ` | ${String(note).trim()}` : ""}`,
    createdAt: new Date(),
  });

  await ticket.save();
  return ticket;
}

async function addComment({ shopId, ticketId, actorId, actorRole, message }) {
  const ticket = await SupportTicket.findOne({ _id: ticketId, shopId });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.statusCode = 404;
    throw err;
  }

  ticket.comments.push({
    authorId: actorId || null,
    authorRole: String(actorRole || "").toUpperCase(),
    message: String(message || "").trim(),
    createdAt: new Date(),
  });

  await ticket.save();
  return ticket;
}

async function rateTicket({ shopId, ticketId, rating, feedback = "" }) {
  const ticket = await SupportTicket.findOne({ _id: ticketId, shopId });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.statusCode = 404;
    throw err;
  }

  ticket.satisfactionRating = Number(rating);
  ticket.feedback = String(feedback || "").trim();
  await ticket.save();
  return ticket;
}

async function createQuickReply({ shopId, title, body, category, createdBy }) {
  return SupportQuickReply.create({
    shopId,
    title: String(title || "").trim(),
    body: String(body || "").trim(),
    category: normalizeCategory(category),
    createdBy: createdBy || null,
  });
}

async function listQuickReplies({ shopId, category = null }) {
  const query = { shopId, isActive: true };
  if (category) query.category = normalizeCategory(category);
  return SupportQuickReply.find(query).sort({ createdAt: -1 }).lean();
}

module.exports = {
  _internals: {
    autoAssignTeam,
    getSlaDueAt,
    normalizePriority,
    normalizeCategory,
  },
  createTicket,
  listTickets,
  getTicket,
  updateTicketStatus,
  addComment,
  rateTicket,
  createQuickReply,
  listQuickReplies,
};
