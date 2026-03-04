const { t } =
require("@/infrastructure/translation/translation.service");

class NotificationService {

  async notify(user, key, vars = {}) {

    const lang = user.language || "en";

    const message = t(lang, key, vars);

    console.log("🔔 Notify", {
      user: user._id,
      message,
    });

    // future:
    // email
    // push
    // websocket
  }
}

module.exports = new NotificationService();