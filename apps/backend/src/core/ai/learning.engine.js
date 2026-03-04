class LearningEngine {

  async learn(event) {
    console.log("Learning from event:", event.type);
  }

}

module.exports = new LearningEngine();