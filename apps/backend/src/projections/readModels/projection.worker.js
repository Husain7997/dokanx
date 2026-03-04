const { workerManager } = require('../../infrastructure/queue');
const handler = require('./projection.handler');

/**
 * Projection Worker
 */

workerManager.createWorker(
  'projection-queue',
  async (job) => {

    const { type, payload } = job.data;

    switch (type) {

      case 'ORDER_CREATED':
        return handler.handleOrderCreated(payload);

      default:
        console.log('Unknown projection event');
    }
  }
);