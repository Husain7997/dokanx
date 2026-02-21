const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');

const { createAdminAndLogin } = require('../helpers/auth.helper');
const { createPayoutRequest } = require('../helpers/payout.helper');

describe('ADMIN PAYOUT FLOW', () => {
  let adminToken;
  let payoutId;

  beforeAll(async () => {
    const admin = await createAdminAndLogin();
    adminToken = admin.token;

    const payout = await createPayoutRequest(4000);
    payoutId = payout._id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('✅ admin can approve payout', async () => {
    const res = await request(app)
      .post(`/api/admin/payouts/${payoutId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('APPROVED');
  });

  it('❌ admin cannot approve twice', async () => {
    const res = await request(app)
      .post(`/api/admin/payouts/${payoutId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
  });
});
