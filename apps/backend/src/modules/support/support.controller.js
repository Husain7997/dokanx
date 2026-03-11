const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");
const service = require("./support.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.createTicket = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const ticket = await service.createTicket({
      shopId,
      createdBy: req.user?._id || null,
      createdByRole: req.user?.role || "",
      subject: req.body.subject,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority,
      orderId: req.body.orderId || null,
    });

    return response.success(res, { data: ticket }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create support ticket failed");
    return next(err);
  }
};

exports.listTickets = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const tickets = await service.listTickets({ shopId, filters: req.query });
    return response.updated(res, req, tickets);
  } catch (err) {
    logger.error({ err: err.message }, "List support tickets failed");
    return next(err);
  }
};

exports.getTicket = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const ticket = await service.getTicket({ shopId, ticketId: req.params.ticketId });
    if (!ticket) return response.notFound(res, "Ticket");

    return response.updated(res, req, ticket);
  } catch (err) {
    return next(err);
  }
};

exports.updateTicketStatus = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const ticket = await service.updateTicketStatus({
      shopId,
      ticketId: req.params.ticketId,
      actorId: req.user?._id || null,
      actorRole: req.user?.role || "",
      status: req.body.status,
      note: req.body.note || "",
      assignedTo: req.body.assignedTo || null,
    });

    return response.updated(res, req, ticket);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const ticket = await service.addComment({
      shopId,
      ticketId: req.params.ticketId,
      actorId: req.user?._id || null,
      actorRole: req.user?.role || "",
      message: req.body.message,
    });

    return response.updated(res, req, ticket);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.rateTicket = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const ticket = await service.rateTicket({
      shopId,
      ticketId: req.params.ticketId,
      rating: req.body.rating,
      feedback: req.body.feedback || "",
    });

    return response.updated(res, req, ticket);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.createQuickReply = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const quickReply = await service.createQuickReply({
      shopId,
      title: req.body.title,
      body: req.body.body,
      category: req.body.category,
      createdBy: req.user?._id || null,
    });

    return response.success(res, { data: quickReply }, 201);
  } catch (err) {
    return next(err);
  }
};

exports.listQuickReplies = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rows = await service.listQuickReplies({
      shopId,
      category: req.query.category || null,
    });

    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};
