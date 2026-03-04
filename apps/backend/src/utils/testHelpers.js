const mongoose = require('mongoose');
const request = require('supertest');

let app;

async function initTestServer() {
  app = require('../app');
  return app;
}

async function cleanDatabase() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

function api() {
  return request(app);
}

function mockTenant() {
  return {
    shopId: new mongoose.Types.ObjectId().toString(),
    userId: new mongoose.Types.ObjectId().toString()
  };
}

function languageHeader(lang = 'bn') {
  return {
    'x-lang': lang
  };
}

module.exports = {
  initTestServer,
  cleanDatabase,
  api,
  mockTenant,
  languageHeader
};