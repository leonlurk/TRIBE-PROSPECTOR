
import crypto from 'crypto';

const header = {
  alg: 'HS256',
  typ: 'JWT'
};

const payload = {
  email: 'usuario.prueba@ejemplo.com',
  username: 'usuario_test',
  name: 'Usuario',
  lastname: 'De Prueba',
  expiration_date: '2025-12-31T23:59:59Z',
  sub: 'user123',
  exp: Math.floor(Date.now() / 1000) + 3600
};

// Codificar a base64url
const encodeBase64Url = (obj) => {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// Generar token
const encodedHeader = encodeBase64Url(header);
const encodedPayload = encodeBase64Url(payload);
const signature = crypto
  .createHmac('sha256', 'x7J9#kL2$pQ5^zR3*mN6&wS8')
  .update(`${encodedHeader}.${encodedPayload}`)
  .digest('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const token = `${encodedHeader}.${encodedPayload}.${signature}`;

// URL de redirección
const baseUrl = "https://iasystem.tribeinternational.net";
const redirectUrl = `${baseUrl}/sso?token=${token}`;

console.log('Token JWT generado:');
console.log(token);
console.log('\nURL para probar SSO:');
console.log(redirectUrl);