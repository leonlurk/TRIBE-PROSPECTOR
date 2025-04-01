import crypto from 'crypto';
//headers
const header = {
  alg: 'HS256',
  typ: 'JWT'
};
//datos usuario
const payload = {
  email: "nuevo11.usuario@ejemplo.com",  
  username: "nuevo11_usuario",           
  name: "Nuevo11",                       
  lastname: "Usuario11",                 
  expiration_date: "2026-06-30T23:59:59Z", 
  sub: "user454",                      
  exp: Math.floor(Date.now() / 1000) + 3600
};
//generacion de token
const encodeBase64Url = (obj) => {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};


const encodedHeader = encodeBase64Url(header);
const encodedPayload = encodeBase64Url(payload);
const signature = crypto
  .createHmac('sha256', 'x7J9#kL2$pQ5^zR3*mN6&wS8')
  .update(`${encodedHeader}.${encodedPayload}`)
  .digest('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

  //url de redireccion
const token = `${encodedHeader}.${encodedPayload}.${signature}`;
const baseUrl = "https://iasystem.tribeinternational.net";
const redirectUrl = `${baseUrl}/sso?token=${token}`;

console.log('Token JWT generado:');
console.log(token);
console.log('\nURL para probar SSO:');
console.log(redirectUrl);