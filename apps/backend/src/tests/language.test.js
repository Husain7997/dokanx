const {
  api,
  languageHeader
} = require('../utils/testHelpers');

describe('Language Switching', () => {

  it('fallback language must work', async () => {

    const res = await api()
      .get('/api/health')
      .set(languageHeader('fr'));

    expect(res.statusCode).toBe(200);
  });

});