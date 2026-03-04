const i18n = require("./translation");

module.exports = async function notify({
  key,
  lang,
  data
}) {

  const message = i18n.t(key, lang);

  await Notification.create({
    message,
    data
  });

};