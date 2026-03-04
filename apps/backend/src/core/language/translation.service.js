// src/core/language/translation.service.js

const en = {
  SUCCESS: "Operation successful",
  LOCK_FAILED: "Resource is locked",
  UNKNOWN_ERROR: "Unexpected error occurred",
  ORDER_SUCCESS: "Order placed successfully",
  PAYMENT_RECEIVED: "Payment received",
};

const bn = {
  SUCCESS: "অপারেশন সফল হয়েছে",
  LOCK_FAILED: "রিসোর্স লক করা আছে",
  UNKNOWN_ERROR: "অপ্রত্যাশিত ত্রুটি ঘটেছে",
  ORDER_SUCCESS: "অর্ডার সফল হয়েছে",
  PAYMENT_RECEIVED: "পেমেন্ট গ্রহণ করা হয়েছে",
};

const languages = { en, bn };

function t(lang = "en", key, vars = {}) {
  const dict = languages[lang] || languages.en;

  let message = dict[key] || key;

  for (const k in vars) {
    message = message.replace(`{${k}}`, vars[k]);
  }

  return message;
}

module.exports = { t };