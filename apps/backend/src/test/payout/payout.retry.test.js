const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');

const { createAdminAndLogin } = require('../helpers/auth.helper');
const { createFailedPayout } = require('../helpers/payout.helper');

describe('PAYOUT RETRY', () => {
  let token;
  let payoutId;

  beforeAll(async () => {
    const admin = await createAdminAndLogin();
    token = admin.token;

    const payout = await createFailedPayout();
    payoutId = payout._id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('✅ admin can retry failed payout', async () => {
    const res = await request(app)
      .post(`/api/admin/payouts/${payoutId}/retry`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('PROCESSING');
  });
});
