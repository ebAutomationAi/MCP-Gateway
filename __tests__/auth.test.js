const request = require('supertest');
const express = require('express');

// Mock the authenticateToken middleware logic
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const apiToken = process.env.API_TOKEN;

  if (!apiToken) {
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  if (token !== apiToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next();
};

describe('Authentication Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    process.env.API_TOKEN = 'test-token-12345';

    app.get('/protected', authenticateToken, (req, res) => {
      res.json({ message: 'Protected resource' });
    });
  });

  test('should reject request without token when API_TOKEN is set', async () => {
    const response = await request(app).get('/protected');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing authorization token');
  });

  test('should reject request with invalid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer wrong-token');
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Invalid token');
  });

  test('should accept request with valid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer test-token-12345');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Protected resource');
  });

  test('should allow request when API_TOKEN is not set (dev mode)', async () => {
    delete process.env.API_TOKEN;
    const response = await request(app).get('/protected');
    expect(response.status).toBe(200);
  });
});
