const Order = require("../models/order.model");
const Shipment = require("../models/shipment.model");
const Shop = require("../models/shop.model");
const { randomToken } = require("../utils/crypto.util");
const { createAudit } = require("../utils/audit.util");
const shippingGateway = require("../services/shipping/shippingGateway.service");
const { publishEvent } = require("@/infrastructure/events/event.dispatcher");
const logger = require("@/core/infrastructure/logger");
const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const QRCode = require("qrcode");
const { resolveShopId } = require("../utils/order-normalization.util");

exports.getRates = async (req, res) => {
  const { destination } = req.query;
  if (!destination) return res.status(400).json({ message: "destination required" });

  res.json({
    data: [
      { id: "standard", name: "Standard", fee: 120, etaDays: 3 },
      { id: "express", name: "Express", fee: 220, etaDays: 1 },
    ],
  });
};

exports.listCarriers = async (_req, res) => {
  res.json({
    data: [
      { id: "dokanx", name: "DokanX Logistics", supportsTracking: true },
      { id: "pathao", name: "Pathao", supportsTracking: true },
      { id: "paperfly", name: "Paperfly", supportsTracking: true },
    ],
  });
};

exports.listShipments = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) {
    return res.status(400).json({ message: "Shop context missing" });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rawFrom = req.query.dateFrom;
  const rawTo = req.query.dateTo;
  const cursor = req.query.cursor;
  const dateFrom = rawFrom ? new Date(rawFrom) : null;
  const dateTo = rawTo ? new Date(rawTo) : null;
  if (dateFrom && rawFrom.length <= 10) {
    dateFrom.setHours(0, 0, 0, 0);
  }
  if (dateTo && rawTo.length <= 10) {
    dateTo.setHours(23, 59, 59, 999);
  }

  const createdAt = {};
  if (dateFrom && !Number.isNaN(dateFrom.getTime())) {
    createdAt.$gte = dateFrom;
  }
  if (dateTo && !Number.isNaN(dateTo.getTime())) {
    createdAt.$lte = dateTo;
  }

  let cursorPayload = null;
  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
      if (decoded?.createdAt && decoded?.id) {
        cursorPayload = {
          createdAt: new Date(decoded.createdAt),
          id: decoded.id,
        };
      }
    } catch (_err) {
      cursorPayload = null;
    }
  }

  const filters = [{ shopId }];
  if (Object.keys(createdAt).length) {
    filters.push({ createdAt });
  }
  if (cursorPayload && !Number.isNaN(cursorPayload.createdAt?.getTime?.())) {
    filters.push({
      $or: [
        { createdAt: { $lt: cursorPayload.createdAt } },
        { createdAt: cursorPayload.createdAt, _id: { $lt: cursorPayload.id } },
      ],
    });
  }

  const query = filters.length > 1 ? { $and: filters } : filters[0];

  const rows = await Shipment.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  let nextCursor = null;
  if (rows.length > limit) {
    const last = rows.pop();
    nextCursor = Buffer.from(
      JSON.stringify({ createdAt: last.createdAt, id: String(last._id) }),
      "utf8"
    ).toString("base64");
  }

  res.json({ data: rows, nextCursor });
};

exports.createShipment = async (req, res) => {
  const { orderId, carrier } = req.body || {};
  if (!orderId || !carrier) {
    return res.status(400).json({ message: "orderId and carrier required" });
  }

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const shopId = resolveShopId(order);

  const gatewayResult = await shippingGateway.createShipment({ carrier, orderId });
  const trackingNumber = gatewayResult.trackingNumber || `trk_${randomToken(8)}`;

  const shipment = await Shipment.create({
    orderId: order._id,
    shopId,
    carrier,
    trackingNumber,
    metadata: gatewayResult,
    events: [
      {
        status: "CREATED",
        message: "Shipment created",
        timestamp: new Date(),
      },
    ],
  });

  order.status = "SHIPPED";
  await order.save();

  logger.info({
    event: "SHIPMENT_CREATED",
    orderId: String(order._id),
    shopId: shopId ? String(shopId) : null,
    shipmentId: String(shipment._id),
    trackingNumber: shipment.trackingNumber,
    carrier,
  }, "Shipment created for order");

  res.status(201).json({ data: shipment });

  await publishEvent("order.shipped", {
    orderId: order._id,
    shopId,
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrier,
    status: "SHIPPED",
  });

  await createAudit({
    action: "CREATE_SHIPMENT",
    performedBy: req.user?._id,
    targetType: "Shipment",
    targetId: shipment._id,
    req,
  });
};

exports.handleWebhook = async (req, res) => {
  const carrier = req.headers["x-shipping-carrier"] || req.body.carrier;
  if (!carrier) return res.status(400).json({ message: "carrier required" });
  const signature = req.headers["x-shipping-signature"] || "";
  const verified = await shippingGateway.verifyWebhook(carrier, req.body, signature);
  if (!verified) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const parsed = await shippingGateway.parseWebhook(carrier, req.body);
  const shipment = await Shipment.findOne({ trackingNumber: parsed.trackingNumber });
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  shipment.status = parsed.status || shipment.status;
  shipment.events.push({
    status: parsed.status,
    message: parsed.message || "",
    location: parsed.location || "",
    geo: parsed.geo || undefined,
    timestamp: new Date(),
  });
  await shipment.save();

  if (parsed.status === "OUT_FOR_DELIVERY") {
    await publishEvent("order.out_for_delivery", {
      orderId: shipment.orderId,
      shopId: shipment.shopId,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      status: parsed.status,
    });
  }

  if (parsed.status === "DELIVERED") {
    await publishEvent("order.delivered", {
      orderId: shipment.orderId,
      shopId: shipment.shopId,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      status: parsed.status,
    });
  }

  res.json({ data: shipment });
};

exports.getTracking = async (req, res) => {
  const { trackingNumber } = req.params;
  const shipment = await Shipment.findOne({ trackingNumber });
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });
  res.json({ data: shipment });
};

exports.getLabelPdf = async (req, res) => {
  const { trackingNumber } = req.params;
  if (!trackingNumber) return res.status(400).json({ message: "trackingNumber required" });

  const shopId = req.shop?._id || req.user?.shopId;
  const query = shopId ? { trackingNumber, shopId } : { trackingNumber };
  const shipment = await Shipment.findOne(query).lean();
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  const order = await Order.findById(shipment.orderId).populate("user customer customerId").lean();
  const shop = shipment.shopId ? await Shop.findById(shipment.shopId).lean() : null;
  const customerName = order?.user?.name || order?.contact?.email || "Guest customer";
  const customerEmail = order?.user?.email || order?.contact?.email || "";
  const customerPhone = order?.contact?.phone || "";
  const deliveryAddress =
    order?.shippingAddress ||
    order?.deliveryAddress ||
    order?.address ||
    order?.contact?.address ||
    null;
  const parcelWeight =
    shipment?.metadata?.parcelWeight ||
    shipment?.metadata?.weight ||
    order?.metadata?.parcelWeight ||
    order?.metadata?.weight ||
    null;

  const qrPayload = JSON.stringify({
    orderId: order?._id?.toString?.() || shipment.orderId,
    trackingNumber: shipment.trackingNumber || trackingNumber,
    carrier: shipment.carrier,
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    deliveryAddress: deliveryAddress || undefined,
    parcelWeight: parcelWeight || undefined,
    status: shipment.status,
  });

  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: "code128",
    text: shipment.trackingNumber || trackingNumber,
    scale: 3,
    height: 12,
    includetext: false,
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 140,
    margin: 1,
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="shipment-label-${shipment.trackingNumber || trackingNumber}.pdf"`
  );

  const doc = new PDFDocument({ size: "A6", margin: 24 });
  doc.pipe(res);

  doc.fontSize(16).text("DokanX Shipping Label", { align: "left" });
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor("#6b7280").text("Generated by DokanX Logistics");
  doc.moveDown(0.8);

  doc.fillColor("#111827").fontSize(12);
  doc.text(`Order ID: ${shipment.orderId || "N/A"}`);
  doc.text(`Carrier: ${shipment.carrier || "N/A"}`);
  doc.text(`Tracking: ${shipment.trackingNumber || trackingNumber}`);
  doc.text(`Status: ${shipment.status || "CREATED"}`);
  doc.moveDown(0.4);
  doc.fontSize(11);
  doc.text(`Customer: ${customerName}`);
  if (customerPhone) doc.text(`Phone: ${customerPhone}`);
  if (customerEmail) doc.text(`Email: ${customerEmail}`);
  if (parcelWeight) doc.text(`Parcel weight: ${parcelWeight}`);
  doc.moveDown(0.6);

  doc.fontSize(10).fillColor("#111827").text("From (Seller)");
  doc.fontSize(10).fillColor("#6b7280");
  doc.text(shop?.name || "DokanX Merchant");
  if (shop?.addressLine1) doc.text(shop.addressLine1);
  if (shop?.addressLine2) doc.text(shop.addressLine2);
  if (shop?.city || shop?.country) {
    doc.text([shop?.city, shop?.country].filter(Boolean).join(", "));
  }
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#111827").text("To (Customer)");
  doc.fontSize(10).fillColor("#6b7280");
  if (deliveryAddress) {
    if (typeof deliveryAddress === "string") {
      doc.text(deliveryAddress);
    } else {
      Object.values(deliveryAddress).forEach((value) => {
        if (value) doc.text(String(value));
      });
    }
  } else {
    doc.text("Address not available");
  }
  doc.moveDown(0.4);

  doc.fontSize(10).fillColor("#6b7280");
  doc.text(`Printed: ${new Date().toLocaleString()}`);
  doc.moveDown(0.8);

  doc.image(barcodeBuffer, { fit: [200, 50] });
  doc.moveDown(0.6);
  doc.image(qrBuffer, { fit: [90, 90] });

  doc.end();
};
