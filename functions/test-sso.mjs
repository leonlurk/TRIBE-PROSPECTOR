// Guarda esto como test-sso.mjs o renómbralo a .cjs como sugiere el error
import crypto from 'crypto';
import https from 'https';

// Crear header y payload
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
  exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora de validez
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

console.log('Token JWT generado:');
console.log(token);

// Opcional: Probar el token con fetch
const data = JSON.stringify({
  token: token
});

const options = {
  hostname: 'us-central1-koafy-5bbb8.cloudfunctions.net',
  port: 443,
  path: '/verifySSOToken',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Código de estado:', res.statusCode);
    console.log('Respuesta de la función:');
    try {
      console.log(JSON.parse(responseData));
    } catch (e) {
      console.log('Error al analizar respuesta:', e);
      console.log('Respuesta cruda:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error en la solicitud:', error);
});

req.write(data);
req.end();