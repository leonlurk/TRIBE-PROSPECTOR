import crypto from 'crypto';
import { Buffer } from 'buffer';

/**
 * Generates a Single Sign-On (SSO) JWT token for authentication
 * @param {Object} userData - User information from the main platform
 * @param {string} userData.userId - Unique user identifier from the main platform
 * @param {string} userData.email - User's email address
 * @param {string} userData.name - User's full name
 * @param {number} [expiresIn=3600] - Token expiration time in seconds (default 1 hour)
 * @returns {string} Generated JWT token
 */
function generateSSOToken(userData, expiresIn = 3600) {
  // Validate input
  if (!userData.userId || !userData.email || !userData.name) {
    throw new Error('Missing required user information: userId, email, and name are mandatory');
  }

  // Secret key (in production, use a secure, environment-specific secret)
  const SECRET_KEY = 'x7J9#kL2$pQ5^zR3*mN6&wS8';

  // Create JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Create JWT payload
  const payload = {
    sub: userData.userId,           // Unique user ID from main platform
    email: userData.email,           // User's email
    name: userData.name,             // User's full name
    exp: Math.floor(Date.now() / 1000) + expiresIn  // Expiration time
  };

  // Optional: Add additional custom claims if needed
  if (userData.additionalClaims) {
    Object.assign(payload, userData.additionalClaims);
  }

  // Base64Url encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create signature
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  // Combine into a complete JWT token
  const token = `${encodedHeader}.${encodedPayload}.${signature}`;

  return token;
}

// Remove the entire direct execution block
export default generateSSOToken;