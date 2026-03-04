class SagaEngine {

  constructor() {
    this.handlers = {};
  }

  register(event, handler) {
    this.handlers[event] = handler;
  }

  async execute(event) {
    const handler = this.handlers[event.type];

    if (handler)
      await handler(event);
  }
}

module.exports = new SagaEngine();