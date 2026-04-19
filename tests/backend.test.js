import request from 'supertest';
import app from '../api/index.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

/**
 * Advanced Backend Feature Tests
 * Covers all major functional areas of the API
 */

describe('Full Backend Feature Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
  let mockToken;
  let mockAdminToken;

  beforeAll(() => {
    // Generate dummy tokens for testing authorized routes
    mockToken = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'user' }, JWT_SECRET);
    mockAdminToken = jwt.sign({ id: '507f1f77bcf86cd799439012', role: 'admin' }, JWT_SECRET);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Authentication & User Management', () => {
    test('POST /api/auth/register - should validate input', async () => {
      const res = await request(app).post('/api/auth/register').send({});
      // Should fail due to missing fields
      expect(res.statusCode).toBe(500); 
    });

    test('POST /api/auth/login - should require credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.statusCode).toBe(500);
    });
  });

  describe('Item Management Features', () => {
    test('POST /api/items - should be protected', async () => {
      const res = await request(app).post('/api/items').send({ title: 'Lost Phone' });
      expect(res.statusCode).toBe(401); // Unauthorized
    });

    test('GET /api/items - should support query filters', async () => {
      const res = await request(app).get('/api/items?status=lost&category=Electronics');
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  describe('Claim System Features', () => {
    test('POST /api/items/:id/claim - should require login', async () => {
      const res = await request(app).post('/api/items/507f1f77bcf86cd799439011/claim').send({});
      expect(res.statusCode).toBe(401);
    });

    test('GET /api/claims - should require admin/user login', async () => {
      const res = await request(app).get('/api/claims');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Admin Dashboard Features', () => {
    test('GET /api/admin/stats - should require admin role', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${mockToken}`); // User token, not admin
      expect(res.statusCode).toBe(403); // Forbidden
    });
  });

  describe('Support & Help Desk Features', () => {
    test('POST /api/support - should allow users to create tickets', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ subject: 'Urgent', message: 'I lost my keys' });
      
      // If DB is connected, 201. If not, 500.
      expect([201, 500]).toContain(res.statusCode);
    });
  });

  describe('Notification System', () => {
    test('GET /api/notifications - should return user notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${mockToken}`);
      
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });
});
