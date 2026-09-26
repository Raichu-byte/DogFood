const request = require('supertest');
const app = require('../../src/app');

describe('GET /health (Baseline Health Check)', () => {
  it('should return 200 OK with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ok');
    expect(res.body.service).toEqual('dogfood-backend');
    expect(res.body).toHaveProperty('timestamp');
  });
});
