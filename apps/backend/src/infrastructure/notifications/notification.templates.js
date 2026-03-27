const templates = {
  "order.created.customer": {
    category: "order",
    channels: ["inApp", "email", "push", "sms"],
    webhookEvent: "order.created",
    locales: {
      en: {
        title: "Order placed",
        message: "Your order #{orderId} has been placed successfully.",
        email: {
          subject: "Order #{orderId} confirmed",
          html:
            "<p>Hello {customerName},</p>" +
            "<p>Your order <strong>#{orderId}</strong> has been placed successfully.</p>" +
            "<p>Estimated delivery: {deliveryDate}</p>",
        },
        sms: "Order #{orderId} placed. Estimated delivery: {deliveryDate}.",
        push: {
          title: "Order placed",
          body: "Order #{orderId} placed successfully.",
        },
      },
      bn: {
        title: "অর্ডার গ্রহণ করা হয়েছে",
        message: "আপনার অর্ডার #{orderId} সফলভাবে গ্রহণ করা হয়েছে।",
        email: {
          subject: "অর্ডার #{orderId} কনফার্ম হয়েছে",
          html:
            "<p>প্রিয় {customerName},</p>" +
            "<p>আপনার অর্ডার <strong>#{orderId}</strong> সফলভাবে গ্রহণ করা হয়েছে।</p>" +
            "<p>সম্ভাব্য ডেলিভারি: {deliveryDate}</p>",
        },
        sms: "অর্ডার #{orderId} গ্রহণ করা হয়েছে। সম্ভাব্য ডেলিভারি: {deliveryDate}.",
        push: {
          title: "অর্ডার গ্রহণ",
          body: "অর্ডার #{orderId} গ্রহণ করা হয়েছে।",
        },
      },
    },
  },
  "order.created.merchant": {
    category: "order",
    channels: ["inApp", "push", "email"],
    webhookEvent: "order.created",
    locales: {
      en: {
        title: "New order received",
        message: "New order #{orderId} received. Total: {amount}.",
        email: {
          subject: "New order #{orderId}",
          html:
            "<p>Hello {merchantName},</p>" +
            "<p>You have received a new order <strong>#{orderId}</strong>.</p>" +
            "<p>Total: {amount}</p>",
        },
        push: {
          title: "New order",
          body: "Order #{orderId} received.",
        },
      },
      bn: {
        title: "নতুন অর্ডার এসেছে",
        message: "নতুন অর্ডার #{orderId} এসেছে। মোট: {amount}।",
        email: {
          subject: "নতুন অর্ডার #{orderId}",
          html:
            "<p>প্রিয় {merchantName},</p>" +
            "<p>আপনার কাছে নতুন অর্ডার <strong>#{orderId}</strong> এসেছে।</p>" +
            "<p>মোট: {amount}</p>",
        },
        push: {
          title: "নতুন অর্ডার",
          body: "অর্ডার #{orderId} এসেছে।",
        },
      },
    },
  },
  "order.confirmed.customer": {
    category: "order",
    channels: ["inApp", "email", "push", "sms"],
    webhookEvent: "order.confirmed",
    locales: {
      en: {
        title: "Order confirmed",
        message: "Your order #{orderId} has been confirmed.",
        email: {
          subject: "Order #{orderId} confirmed",
          html:
            "<p>Hello {customerName},</p>" +
            "<p>Your order <strong>#{orderId}</strong> has been confirmed.</p>",
        },
        sms: "Order #{orderId} confirmed.",
        push: {
          title: "Order confirmed",
          body: "Order #{orderId} is confirmed.",
        },
      },
      bn: {
        title: "অর্ডার কনফার্ম হয়েছে",
        message: "আপনার অর্ডার #{orderId} কনফার্ম হয়েছে।",
        email: {
          subject: "অর্ডার #{orderId} কনফার্ম হয়েছে",
          html:
            "<p>প্রিয় {customerName},</p>" +
            "<p>আপনার অর্ডার <strong>#{orderId}</strong> কনফার্ম হয়েছে।</p>",
        },
        sms: "অর্ডার #{orderId} কনফার্ম হয়েছে।",
        push: {
          title: "অর্ডার কনফার্ম",
          body: "অর্ডার #{orderId} কনফার্ম হয়েছে।",
        },
      },
    },
  },
  "order.shipped.customer": {
    category: "order",
    channels: ["inApp", "email", "push", "sms"],
    webhookEvent: "order.shipped",
    locales: {
      en: {
        title: "Order shipped",
        message: "Your order #{orderId} has been shipped. Tracking: {trackingNumber}.",
        email: {
          subject: "Order #{orderId} shipped",
          html:
            "<p>Hello {customerName},</p>" +
            "<p>Your order <strong>#{orderId}</strong> has been shipped.</p>" +
            "<p>Tracking number: {trackingNumber}</p>",
        },
        sms: "Order #{orderId} shipped. Tracking: {trackingNumber}.",
        push: {
          title: "Order shipped",
          body: "Order #{orderId} shipped.",
        },
      },
      bn: {
        title: "অর্ডার পাঠানো হয়েছে",
        message: "আপনার অর্ডার #{orderId} পাঠানো হয়েছে। ট্র্যাকিং: {trackingNumber}।",
        email: {
          subject: "অর্ডার #{orderId} পাঠানো হয়েছে",
          html:
            "<p>প্রিয় {customerName},</p>" +
            "<p>আপনার অর্ডার <strong>#{orderId}</strong> পাঠানো হয়েছে।</p>" +
            "<p>ট্র্যাকিং নম্বর: {trackingNumber}</p>",
        },
        sms: "অর্ডার #{orderId} পাঠানো হয়েছে। ট্র্যাকিং: {trackingNumber}.",
        push: {
          title: "অর্ডার পাঠানো হয়েছে",
          body: "অর্ডার #{orderId} পাঠানো হয়েছে।",
        },
      },
    },
  },
  "order.out_for_delivery.customer": {
    category: "order",
    channels: ["inApp", "push", "sms"],
    webhookEvent: "order.out_for_delivery",
    locales: {
      en: {
        title: "Out for delivery",
        message: "Your order #{orderId} is out for delivery.",
        sms: "Order #{orderId} is out for delivery.",
        push: {
          title: "Out for delivery",
          body: "Order #{orderId} is on the way.",
        },
      },
      bn: {
        title: "ডেলিভারির জন্য বের হয়েছে",
        message: "আপনার অর্ডার #{orderId} ডেলিভারির জন্য বের হয়েছে।",
        sms: "অর্ডার #{orderId} ডেলিভারির জন্য বের হয়েছে।",
        push: {
          title: "ডেলিভারির পথে",
          body: "অর্ডার #{orderId} ডেলিভারির পথে আছে।",
        },
      },
    },
  },
  "order.delivered.customer": {
    category: "order",
    channels: ["inApp", "email", "push"],
    webhookEvent: "order.delivered",
    locales: {
      en: {
        title: "Order delivered",
        message: "Your order #{orderId} has been delivered.",
        email: {
          subject: "Order #{orderId} delivered",
          html:
            "<p>Hello {customerName},</p>" +
            "<p>Your order <strong>#{orderId}</strong> has been delivered.</p>",
        },
        push: {
          title: "Order delivered",
          body: "Order #{orderId} delivered.",
        },
      },
      bn: {
        title: "অর্ডার ডেলিভারি হয়েছে",
        message: "আপনার অর্ডার #{orderId} ডেলিভারি হয়েছে।",
        email: {
          subject: "অর্ডার #{orderId} ডেলিভারি হয়েছে",
          html:
            "<p>প্রিয় {customerName},</p>" +
            "<p>আপনার অর্ডার <strong>#{orderId}</strong> ডেলিভারি হয়েছে।</p>",
        },
        push: {
          title: "অর্ডার ডেলিভারি",
          body: "অর্ডার #{orderId} ডেলিভারি হয়েছে।",
        },
      },
    },
  },
  "payment.received.customer": {
    category: "payment",
    channels: ["inApp", "email", "push", "sms"],
    webhookEvent: "payment.received",
    locales: {
      en: {
        title: "Payment received",
        message: "We received your payment for order #{orderId}.",
        email: {
          subject: "Payment received for order #{orderId}",
          html:
            "<p>Hello {customerName},</p>" +
            "<p>We received your payment for order <strong>#{orderId}</strong>.</p>" +
            "<p>Amount: {amount}</p>",
        },
        sms: "Payment received for order #{orderId}. Amount: {amount}.",
        push: {
          title: "Payment received",
          body: "Payment received for order #{orderId}.",
        },
      },
      bn: {
        title: "পেমেন্ট গ্রহণ করা হয়েছে",
        message: "অর্ডার #{orderId} এর পেমেন্ট গ্রহণ করা হয়েছে।",
        email: {
          subject: "অর্ডার #{orderId} এর পেমেন্ট গ্রহণ",
          html:
            "<p>প্রিয় {customerName},</p>" +
            "<p>অর্ডার <strong>#{orderId}</strong> এর পেমেন্ট গ্রহণ করা হয়েছে।</p>" +
            "<p>পরিমাণ: {amount}</p>",
        },
        sms: "অর্ডার #{orderId} এর পেমেন্ট গ্রহণ করা হয়েছে। পরিমাণ: {amount}.",
        push: {
          title: "পেমেন্ট গ্রহণ",
          body: "অর্ডার #{orderId} এর পেমেন্ট গ্রহণ করা হয়েছে।",
        },
      },
    },
  },
  "payment.received.merchant": {
    category: "payment",
    channels: ["inApp", "email", "push"],
    webhookEvent: "payment.received",
    locales: {
      en: {
        title: "Payment received",
        message: "Payment received for order #{orderId}. Amount: {amount}.",
        email: {
          subject: "Payment received for order #{orderId}",
          html:
            "<p>Hello {merchantName},</p>" +
            "<p>Payment received for order <strong>#{orderId}</strong>.</p>" +
            "<p>Amount: {amount}</p>",
        },
        push: {
          title: "Payment received",
          body: "Payment received for order #{orderId}.",
        },
      },
      bn: {
        title: "পেমেন্ট গ্রহণ হয়েছে",
        message: "অর্ডার #{orderId} এর পেমেন্ট গ্রহণ হয়েছে। পরিমাণ: {amount}।",
        email: {
          subject: "অর্ডার #{orderId} এর পেমেন্ট গ্রহণ হয়েছে",
          html:
            "<p>প্রিয় {merchantName},</p>" +
            "<p>অর্ডার <strong>#{orderId}</strong> এর পেমেন্ট গ্রহণ হয়েছে।</p>" +
            "<p>পরিমাণ: {amount}</p>",
        },
        push: {
          title: "পেমেন্ট গ্রহণ",
          body: "অর্ডার #{orderId} এর পেমেন্ট গ্রহণ হয়েছে।",
        },
      },
    },
  },
  "inventory.low_stock.merchant": {
    category: "inventory",
    channels: ["inApp", "email", "push"],
    webhookEvent: "inventory.low_stock",
    locales: {
      en: {
        title: "Low stock alert",
        message: "{productName} stock is low ({stock} left).",
        email: {
          subject: "Low stock alert: {productName}",
          html:
            "<p>Hello {merchantName},</p>" +
            "<p><strong>{productName}</strong> stock is low.</p>" +
            "<p>Current stock: {stock}</p>",
        },
        push: {
          title: "Low stock",
          body: "{productName} is running low.",
        },
      },
      bn: {
        title: "লো স্টক সতর্কতা",
        message: "{productName} এর স্টক কম ({stock} বাকি)।",
        email: {
          subject: "লো স্টক সতর্কতা: {productName}",
          html:
            "<p>প্রিয় {merchantName},</p>" +
            "<p><strong>{productName}</strong> এর স্টক কম।</p>" +
            "<p>বর্তমান স্টক: {stock}</p>",
        },
        push: {
          title: "লো স্টক",
          body: "{productName} এর স্টক কম।",
        },
      },
    },
  },
  "payout.completed.merchant": {
    category: "payment",
    channels: ["inApp", "email", "push"],
    webhookEvent: "payout.completed",
    locales: {
      en: {
        title: "Payout completed",
        message: "Your payout #{payoutId} has been completed. Amount: {amount}.",
        email: {
          subject: "Payout #{payoutId} completed",
          html:
            "<p>Hello {merchantName},</p>" +
            "<p>Your payout <strong>#{payoutId}</strong> has been completed.</p>" +
            "<p>Amount: {amount}</p>",
        },
        push: {
          title: "Payout completed",
          body: "Payout #{payoutId} completed.",
        },
      },
      bn: {
        title: "পেআউট সম্পন্ন",
        message: "আপনার পেআউট #{payoutId} সম্পন্ন হয়েছে। পরিমাণ: {amount}।",
        email: {
          subject: "পেআউট #{payoutId} সম্পন্ন",
          html:
            "<p>প্রিয় {merchantName},</p>" +
            "<p>আপনার পেআউট <strong>#{payoutId}</strong> সম্পন্ন হয়েছে।</p>" +
            "<p>পরিমাণ: {amount}</p>",
        },
        push: {
          title: "পেআউট সম্পন্ন",
          body: "পেআউট #{payoutId} সম্পন্ন হয়েছে।",
        },
      },
    },
  },
  "admin.order.created": {
    category: "order",
    channels: ["inApp"],
    webhookEvent: "order.created",
    locales: {
      en: {
        title: "New order placed",
        message: "Order #{orderId} placed in shop {shopName}.",
      },
      bn: {
        title: "নতুন অর্ডার",
        message: "অর্ডার #{orderId} এসেছে। শপ: {shopName}।",
      },
    },
  },
};

module.exports = templates;
