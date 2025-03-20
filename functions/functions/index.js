import functionsV1 from 'firebase-functions/v1';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';

// Safely read service account
const serviceAccountPath = path.resolve('./service-account.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('Failed to load service account:', error);
  throw new Error('Cannot load service account');
}

// Initialize Firebase Admin 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Create and export the function
export const verifySSOToken = functionsV1.https.onRequest(async (req, res) => {
  // CORS handling
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  try {
    const { token } = req.body;
    
    console.log("Received Token:", token);
    
    const SSO_SECRET_KEY = 'x7J9#kL2$pQ5^zR3*mN6&wS8';
    
    console.log("Used Secret Key:", SSO_SECRET_KEY);
    
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(400).json({ error: 'Formato de token inválido' });
    }
    
    const [encodedHeader, encodedPayload, signature] = tokenParts;
    
    console.log("Encoded Header:", encodedHeader);
    console.log("Encoded Payload:", encodedPayload);
    console.log("Signature:", signature);
    
    const expectedSignature = crypto
      .createHmac('sha256', SSO_SECRET_KEY)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    console.log("Expected Signature:", expectedSignature);
    console.log("Received Signature:", signature);
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ 
        error: 'Firma del token inválida',
        details: {
          expectedSignature,
          receivedSignature: signature,
          usedSecretKey: SSO_SECRET_KEY
        }
      });
    }
    
    // Decode payload
    const decodedPayload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    );
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    // Extract user information
    const { email, username, name: nombre, lastname: apellido, expiration_date: fechaExpiracion, password, sub: externalUserId } = decodedPayload;
    
    // Find or create user in Firebase Auth
    let uid;
    try {
      const userRecord = await getAuth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const newUser = await getAuth().createUser({
          email: email,
          displayName: nombre,
        });
        uid = newUser.uid;
      } else {
        throw error;
      }
    }

    // Generate custom token
    const customToken = await getAuth().createCustomToken(uid, {
      externalUserId,
      ssoProvider: 'empresa_partner'
    });
    
    
return res.status(200).json({
  customToken,
  userData: {
    email,
    username,
    nombre,
    apellido,
    fechaExpiracion,
    password, // Ten en cuenta que no es recomendable manejar contraseñas en un SSO
    provider: 'empresa_partner',
    externalUserId,
    forceUpdate: false
  }
});
    
  } catch (error) {
    console.error('Detailed Error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});