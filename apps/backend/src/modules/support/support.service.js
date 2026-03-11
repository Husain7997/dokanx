const SupportTicket = require("./models/supportTicket.model");
const SupportQuickReply = require("./models/quickReply.model");
const { notificationDispatcher, logger } = require("@/core/infrastructure");

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

async function findLeastLoadedAssignee({ shopId, team }) {
  const [row] = await SupportTicket.aggregate([
    {
      $match: {
        shopId,
        assignedTeam: team,
        assignedTo: { $ne: null },
        status: { $in: ["ASSIGNED", "IN_PROGRESS", "OPEN"] },
      },
    },
    {
      $group: {
        _id: "$assignedTo",
        openCount: { $sum: 1 },
      },
    },
    { $sort: { openCount: 1, _id: 1 } },
    { $limit: 1 },
  ]);

  return row?._id || null;
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
  const assignedTeam = autoAssignTeam(normalizedCategory);
  const assignedTo = await findLeastLoadedAssignee({
    shopId,
    team: assignedTeam,
  });

  return SupportTicket.create({
    shopId,
    createdBy: createdBy || null,
    createdByRole: String(createdByRole || "").toUpperCase(),
    subject: String(subject || "").trim(),
    description: String(description || "").trim(),
    category: normalizedCategory,
    priority: normalizedPriority,
    status: assignedTo ? "ASSIGNED" : "OPEN",
    assignedTeam,
    assignedTo,
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

async function getSupportAnalytics({ shopId, now = new Date() }) {
  const baseQuery = { shopId };
  const [statusAgg, priorityAgg, ratingAgg, overdueCount, teamAgg] = await Promise.all([
    SupportTicket.aggregate([
      { $match: baseQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    SupportTicket.aggregate([
      { $match: baseQuery },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    SupportTicket.aggregate([
      {
        $match: {
          ...baseQuery,
          satisfactionRating: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$satisfactionRating" },
          ratedCount: { $sum: 1 },
        },
      },
    ]),
    SupportTicket.countDocuments({
      ...baseQuery,
      status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
      slaDueAt: { $lt: now },
    }),
    SupportTicket.aggregate([
      { $match: baseQuery },
      { $group: { _id: "$assignedTeam", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    statusBreakdown: statusAgg,
    priorityBreakdown: priorityAgg,
    averageRating: Number((ratingAgg[0]?.avgRating || 0).toFixed?.(2) || 0),
    ratedCount: Number(ratingAgg[0]?.ratedCount || 0),
    overdueOpenTickets: overdueCount,
    teamBreakdown: teamAgg,
  };
}

async function getAgentLeaderboard({ shopId }) {
  return SupportTicket.aggregate([
    {
      $match: {
        shopId,
        assignedTo: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$assignedTo",
        totalTickets: { $sum: 1 },
        resolvedTickets: {
          $sum: {
            $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0],
          },
        },
        avgRating: { $avg: "$satisfactionRating" },
      },
    },
    {
      $project: {
        totalTickets: 1,
        resolvedTickets: 1,
        avgRating: { $ifNull: ["$avgRating", 0] },
      },
    },
    { $sort: { resolvedTickets: -1, avgRating: -1, totalTickets: -1 } },
    { $limit: 20 },
  ]);
}

async function listSlaBreaches({ shopId, now = new Date(), limit = 50 }) {
  return SupportTicket.find({
    shopId,
    status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
    slaDueAt: { $lt: now },
  })
    .sort({ slaDueAt: 1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function runSlaEscalation({ shopId, now = new Date() }) {
  const tickets = await SupportTicket.find({
    shopId,
    status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
    slaDueAt: { $lt: now },
  }).limit(100);

  const escalated = [];
  for (const ticket of tickets) {
    const nextLevel = Number(ticket.escalationLevel || 0) + 1;
    ticket.escalationLevel = nextLevel;
    ticket.slaBreachedAt = ticket.slaBreachedAt || now;
    ticket.lastEscalatedAt = now;
    ticket.comments.push({
      authorId: null,
      authorRole: "SYSTEM",
      message: `SLA breached. Escalation level ${nextLevel} triggered.`,
      createdAt: now,
    });
    await ticket.save();

    const recipientId = ticket.assignedTo || ticket.createdBy || null;
    if (recipientId) {
      try {
        await notificationDispatcher.dispatch({
          tenantId: String(shopId),
          userId: String(recipientId),
          message: `Support ticket "${ticket.subject}" breached SLA. Escalation level ${nextLevel}.`,
          language: "en",
        });
      } catch (err) {
        logger.warn({ err: err.message, ticketId: ticket._id }, "SLA escalation notification failed");
      }
    }

    escalated.push(ticket);
  }

  return escalated;
}

async function buildTicketExportRows({ shopId, filters = {} }) {
  const rows = await listTickets({ shopId, filters });
  return rows.map(row => ({
    ticketId: String(row._id || ""),
    subject: String(row.subject || ""),
    category: String(row.category || ""),
    priority: String(row.priority || ""),
    status: String(row.status || ""),
    assignedTeam: String(row.assignedTeam || ""),
    assignedTo: String(row.assignedTo || ""),
    satisfactionRating: Number(row.satisfactionRating || 0),
    slaDueAt: row.slaDueAt || "",
    createdAt: row.createdAt || "",
  }));
}

module.exports = {
  _internals: {
    autoAssignTeam,
    getSlaDueAt,
    normalizePriority,
    normalizeCategory,
    findLeastLoadedAssignee,
  },
  createTicket,
  listTickets,
  getTicket,
  updateTicketStatus,
  addComment,
  rateTicket,
  createQuickReply,
  listQuickReplies,
  getSupportAnalytics,
  getAgentLeaderboard,
  listSlaBreaches,
  runSlaEscalation,
  buildTicketExportRows,
};
