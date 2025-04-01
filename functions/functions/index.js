import functionsV1 from 'firebase-functions/v1';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.resolve('./service-account.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('Failed to load service account:', error);
  throw new Error('Cannot load service account');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const verifySSOToken = functionsV1.https.onRequest(async (req, res) => {
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
    
    // Calculamos múltiples variantes de la firma para flexibilidad
    const computeSignatures = (encodedHeader, encodedPayload, secret) => {
      // Método 1: usando base64url directo (Node.js moderno)
      const method1 = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');
      
      // Método 2: usando base64 con reemplazos manuales (más común en implementaciones C#)
      const method2 = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      // Método 3: Algunas implementaciones C# pueden dejar el padding (=)
      const method3 = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      return { method1, method2, method3 };
    };
    
    const signatures = computeSignatures(encodedHeader, encodedPayload, SSO_SECRET_KEY);
    
    console.log("Calculated signatures for verification:");
    console.log("Method 1 (base64url):", signatures.method1);
    console.log("Method 2 (base64 with replacements, no padding):", signatures.method2);
    console.log("Method 3 (base64 with replacements, with padding):", signatures.method3);
    console.log("Received Signature:", signature);
    
    // Verificar contra todas las variantes para mayor flexibilidad
    if (signature !== signatures.method1 && 
        signature !== signatures.method2 && 
        signature !== signatures.method3) {
      
      // Si la firma sigue sin coincidir, intentamos con diferentes codificaciones de la clave
      // Algunas implementaciones pueden usar diferentes codificaciones para la clave secreta
      const altKeySignatures = [
        computeSignatures(encodedHeader, encodedPayload, Buffer.from(SSO_SECRET_KEY, 'utf8').toString('utf8')),
        computeSignatures(encodedHeader, encodedPayload, Buffer.from(SSO_SECRET_KEY, 'binary').toString('utf8'))
      ];
      
      let signatureMatch = false;
      
      for (const altSigs of altKeySignatures) {
        if (signature === altSigs.method1 || 
            signature === altSigs.method2 || 
            signature === altSigs.method3) {
          signatureMatch = true;
          break;
        }
      }
      
      if (!signatureMatch) {
        return res.status(401).json({ 
          error: 'Firma del token inválida',
          details: {
            expectedSignatures: signatures,
            receivedSignature: signature,
            message: "La firma proporcionada no coincide con ninguna de las variantes calculadas. Revise su implementación de HMAC-SHA256 y Base64URL."
          }
        });
      }
    }
    
    let decodedPayload;
    try {
      // Intenta decodificar con base64url primero
      decodedPayload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf-8')
      );
    } catch (error) {
      // Si falla, intenta agregar padding si es necesario
      const paddedPayload = encodedPayload.padEnd(encodedPayload.length + (4 - (encodedPayload.length % 4)) % 4, '=');
      const normalizedPayload = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
      decodedPayload = JSON.parse(
        Buffer.from(normalizedPayload, 'base64').toString('utf-8')
      );
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    const { email, username, name: nombre, lastname: apellido, expiration_date: fechaExpiracion, password, sub: externalUserId } = decodedPayload;
    
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
        password, 
        provider: 'empresa_partner',
        externalUserId,
        forceUpdate: false
      }
    });
    
  } catch (error) {
    console.error('Detailed Error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message,
      stack: error.stack 
    });
  }
});