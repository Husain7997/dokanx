const {
  api,
  languageHeader
} = require('../utils/testHelpers');

describe('API Language Test', () => {

  it('should return Bengali response', async () => {

    const res = await api()
      .get('/api/health')
      .set(languageHeader('bn'));

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('should return English response', async () => {

    const res = await api()
      .get('/api/health')
      .set(languageHeader('en'));

    expect(res.statusCode).toBe(200);
  });

});