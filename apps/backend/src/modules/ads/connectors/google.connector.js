const BaseAdsConnector = require("./base.connector");

class GoogleAdsConnector extends BaseAdsConnector {
  constructor() {
    super("google");
  }
}

module.exports = new GoogleAdsConnector();
