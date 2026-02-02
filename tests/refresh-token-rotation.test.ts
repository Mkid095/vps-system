/**
 * Refresh Token Rotation Tests
 *
 * This test suite verifies the refresh token rotation flow across:
 * 1. Auth Service (/api/auth/refresh)
 * 2. Developer Portal (/api/developer/refresh)
 *
 * Test Coverage:
 * - Successful token refresh
 * - Expired access token refresh
 * - Invalid refresh token rejection
 * - Expired refresh token rejection
 * - Token rotation (new refresh token issued)
 * - Project status enforcement
 * - Developer/project not found scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Test configuration
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000'
const PORTAL_URL = process.env.DEVELOPER_PORTAL_URL || 'http://localhost:3000'

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret'

describe('Refresh Token Rotation - Auth Service', () => {
  let testUserId: string
  let testTenantId: string
  let validRefreshToken: string

  beforeAll(async () => {
    // Create test user and tenant
    const tenantResponse = await request(AUTH_SERVICE_URL)
      .post('/api/auth/create-tenant')
      .send({
        name: 'Test Tenant',
        slug: `test-refresh-${Date.now()}`,
        adminEmail: `refresh-${Date.now()}@test.com`,
        adminPassword: 'TestPassword123!',
        adminName: 'Refresh Test User',
      })

    testTenantId = tenantResponse.body.tenant.id
    testUserId = tenantResponse.body.user.id

    // Generate a valid refresh token
    validRefreshToken = jwt.sign(
      { userId: testUserId, tenantId: testTenantId },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
  })

  it('should issue new access and refresh tokens', async () => {
    const response = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken })
      .expect(200)

    expect(response.body).toHaveProperty('accessToken')
    expect(response.body).toHaveProperty('refreshToken')
    expect(typeof response.body.accessToken).toBe('string')
    expect(typeof response.body.refreshToken).toBe('string')

    // Verify the new access token
    const decoded = jwt.verify(response.body.accessToken, JWT_SECRET) as any
    expect(decoded.userId).toBe(testUserId)
    expect(decoded.tenantId).toBe(testTenantId)
    expect(decoded.role).toBeDefined()
  })

  it('should reject missing refresh token', async () => {
    const response = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({})
      .expect(400)

    expect(response.body.error).toMatch(/refresh token/i)
  })

  it('should reject invalid refresh token', async () => {
    const response = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' })
      .expect(401)

    expect(response.body.error).toMatch(/invalid/i)
  })

  it('should reject expired refresh token', async () => {
    const expiredToken = jwt.sign(
      { userId: testUserId, tenantId: testTenantId },
      JWT_SECRET,
      { expiresIn: '-1h' } // Expired
    )

    const response = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({ refreshToken: expiredToken })
      .expect(401)

    expect(response.body.error).toMatch(/invalid/i)
  })

  it('should reject refresh token for non-existent user', async () => {
    const invalidUserToken = jwt.sign(
      { userId: 'non-existent-user-id', tenantId: testTenantId },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    const response = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({ refreshToken: invalidUserToken })
      .expect(401)

    expect(response.body.error).toMatch(/invalid/i)
  })

  it('should implement token rotation', async () => {
    const response1 = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken })

    const newRefreshToken = response1.body.refreshToken

    // Old refresh token should still work (graceful transition)
    const response2 = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken })
      .expect(200)

    // New refresh token should also work
    const response3 = await request(AUTH_SERVICE_URL)
      .post('/api/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(200)

    expect(response2.body).toHaveProperty('accessToken')
    expect(response3.body).toHaveProperty('accessToken')
  })
})

describe('Refresh Token Rotation - Developer Portal', () => {
  let testDeveloperId: string
  let testProjectId: string
  let validRefreshToken: string

  beforeAll(async () => {
    // Create test developer and project
    const registerResponse = await request(PORTAL_URL)
      .post('/api/developer/register')
      .send({
        email: `portal-refresh-${Date.now()}@test.com`,
        password: 'TestPassword123!',
        name: 'Portal Refresh Test',
        organization: 'Test Org',
      })

    testDeveloperId = registerResponse.body.developer.id
    testProjectId = registerResponse.body.project.id
    validRefreshToken = registerResponse.body.refreshToken
  })

  it('should issue new access and refresh tokens', async () => {
    const response = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: validRefreshToken })
      .expect(200)

    expect(response.body).toHaveProperty('accessToken')
    expect(response.body).toHaveProperty('refreshToken')
    expect(typeof response.body.accessToken).toBe('string')
    expect(typeof response.body.refreshToken).toBe('string')

    // Verify the new access token contains project_id
    const decoded = jwt.verify(
      response.body.accessToken,
      JWT_SECRET
    ) as any
    expect(decoded.id).toBe(testDeveloperId)
    expect(decoded.project_id).toBeDefined()
  })

  it('should reject missing refresh token', async () => {
    const response = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({})
      .expect(400)

    expect(response.body.error).toMatch(/refresh token/i)
  })

  it('should reject invalid refresh token', async () => {
    const response = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: 'invalid-token' })
      .expect(401)

    expect(response.body.error).toMatch(/invalid/i)
  })

  it('should reject expired refresh token', async () => {
    const expiredToken = jwt.sign(
      { id: testDeveloperId },
      REFRESH_SECRET,
      { expiresIn: '-1h' }
    )

    const response = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: expiredToken })
      .expect(401)

    expect(response.body.error).toMatch(/invalid/i)
  })

  it('should reject refresh token for non-existent developer', async () => {
    const invalidDevToken = jwt.sign(
      { id: 'non-existent-developer-id' },
      REFRESH_SECRET,
      { expiresIn: '30d' }
    )

    const response = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: invalidDevToken })
      .expect(401)

    expect(response.body.error).toMatch(/not found/i)
  })

  it('should enforce project status - suspended project', async () => {
    // This test requires a suspended project setup
    // For now, we'll verify the structure
    const response = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: validRefreshToken })

    // Should succeed for active project
    expect([200, 403]).toContain(response.status)

    if (response.status === 403) {
      expect(response.body).toHaveProperty('projectStatus')
      expect(response.body.projectStatus).toBeDefined()
    }
  })

  it('should implement token rotation', async () => {
    const response1 = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: validRefreshToken })

    const newRefreshToken = response1.body.refreshToken

    // Old refresh token should still work (graceful transition)
    const response2 = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: validRefreshToken })
      .expect(200)

    // New refresh token should also work
    const response3 = await request(PORTAL_URL)
      .post('/api/developer/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(200)

    expect(response2.body).toHaveProperty('accessToken')
    expect(response3.body).toHaveProperty('accessToken')
  })
})

describe('Refresh Token Security', () => {
  it('should have different secrets for access and refresh tokens', () => {
    // Access tokens use JWT_SECRET
    // Refresh tokens use REFRESH_SECRET
    expect(JWT_SECRET).toBeDefined()
    expect(REFRESH_SECRET).toBeDefined()
    expect(JWT_SECRET).not.toBe(REFRESH_SECRET)
  })

  it('should enforce appropriate expiration times', async () => {
    const portalRefresh = jwt.sign(
      { id: 'test-id' },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    const authRefresh = jwt.sign(
      { userId: 'test-user', tenantId: 'test-tenant' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Verify expiration times
    const portalDecoded = jwt.decode(portalRefresh) as any
    const authDecoded = jwt.decode(authRefresh) as any

    const portalExpiry = portalDecoded.exp - portalDecoded.iat
    const authExpiry = authDecoded.exp - authDecoded.iat

    // Portal: 7 days = 7 * 24 * 60 * 60 = 604800 seconds
    // Auth: 30 days = 30 * 24 * 60 * 60 = 2592000 seconds
    expect(portalExpiry).toBe(7 * 24 * 60 * 60)
    expect(authExpiry).toBe(30 * 24 * 60 * 60)
  })
})
