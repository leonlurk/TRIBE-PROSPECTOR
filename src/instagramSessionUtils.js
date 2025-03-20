// src/instagramSessionUtils.js
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";


/**
 * Guarda los datos de sesión de Instagram en Firebase y localStorage
 * @param {string} userId - ID del usuario en Firebase
 * @param {Object} sessionData - Datos de sesión a guardar
 * @returns {Promise<boolean>} - True si se guardó correctamente
 */
export const saveInstagramSession = async (userId, sessionData) => {
    console.log("saveInstagramSession llamado con userId:", userId);
    console.log("sessionData:", JSON.stringify(sessionData, null, 2));
  
    if (!userId || !sessionData) {
      console.error("Error: userId y sessionData son obligatorios");
      return false;
    }
  
    try {
      // Datos a guardar en Firebase
      const dataToSave = {
        instagramToken: sessionData.token || null,
        instagramUsername: sessionData.username || null,
        instagramDeviceId: sessionData.deviceId || null,
        instagramConnected: true,
        instagramLastLogin: new Date(),
      };
  
      console.log("Datos a guardar en Firebase:", JSON.stringify(dataToSave, null, 2));
  
      // Si hay cookies, las guardamos como string
      if (sessionData.cookies) {
        dataToSave.instagramCookies = 
          typeof sessionData.cookies === 'string' 
            ? sessionData.cookies 
            : JSON.stringify(sessionData.cookies);
      }
  
      // Guardar en Firebase
      const userRef = doc(db, "users", userId);
      console.log("Referencia de documento creada para:", userId);
      
      try {
        // Verificar si el documento existe
        const userDoc = await getDoc(userRef);
        console.log("Documento existe:", userDoc.exists());
        
        if (userDoc.exists()) {
          console.log("Actualizando documento existente con merge");
          await setDoc(userRef, dataToSave, { merge: true });
        } else {
          console.log("Creando nuevo documento de usuario");
          await setDoc(userRef, {
            ...dataToSave,
            createdAt: new Date()
          });
        }
        console.log("Operación de escritura en Firestore completada");
      } catch (firestoreError) {
        console.error("Error específico de Firestore:", firestoreError);
        throw firestoreError;
      }
  
      // Guardar en localStorage para acceso rápido
      if (sessionData.token) {
        localStorage.setItem("instagram_bot_token", sessionData.token);
      }
      if (sessionData.username) {
        localStorage.setItem("instagram_username", sessionData.username);
      }
      if (sessionData.deviceId) {
        localStorage.setItem("instagram_device_id", sessionData.deviceId);
      }
      if (sessionData.cookies) {
        localStorage.setItem(
          "instagram_cookies", 
          typeof sessionData.cookies === 'string' 
            ? sessionData.cookies 
            : JSON.stringify(sessionData.cookies)
        );
      }
  
      console.log("Sesión de Instagram guardada correctamente en Firebase");
      return true;
    } catch (error) {
      console.error("Error al guardar la sesión de Instagram:", error);
      console.error("Tipo de error:", error.name);
      console.error("Mensaje de error:", error.message);
      console.error("Stack:", error.stack);
      return false;
    }
  };

/**
 * Obtiene los datos de sesión de Instagram desde Firebase
 * @param {string} userId - ID del usuario en Firebase
 * @returns {Promise<Object|null>} - Datos de sesión o null
 */
export const getInstagramSession = async (userId) => {
  if (!userId) {
    console.error("Error: userId es obligatorio");
    return null;
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Si no hay token de Instagram, no hay sesión
      if (!userData.instagramToken) {
        return null;
      }

      // Procesar cookies si existen
      let cookies = null;
      if (userData.instagramCookies) {
        try {
          cookies = JSON.parse(userData.instagramCookies);
        } catch (e) {
          cookies = userData.instagramCookies;
        }
      }

      return {
        token: userData.instagramToken,
        username: userData.instagramUsername,
        deviceId: userData.instagramDeviceId,
        cookies: cookies,
        isConnected: userData.instagramConnected === true,
        lastLogin: userData.instagramLastLogin,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error al obtener la sesión de Instagram:", error);
    return null;
  }
};

/**
 * Elimina los datos de sesión de Instagram
 * @param {string} userId - ID del usuario en Firebase
 * @returns {Promise<boolean>} - True si se eliminó correctamente
 */
export const clearInstagramSession = async (userId) => {
  if (!userId) {
    console.error("Error: userId es obligatorio");
    return false;
  }

  try {
    // Actualizar Firebase
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      instagramToken: null,
      instagramUsername: null,
      instagramDeviceId: null,
      instagramCookies: null,
      instagramConnected: false,
    }, { merge: true });

    // Limpiar localStorage
    localStorage.removeItem("instagram_bot_token");
    localStorage.removeItem("instagram_username");
    localStorage.removeItem("instagram_device_id");
    localStorage.removeItem("instagram_cookies");
    localStorage.removeItem("instagram_2fa_session");
    localStorage.removeItem("instagram_csrf_token");
    localStorage.removeItem("instagram_2fa_info");

    console.log("Sesión de Instagram eliminada correctamente");
    return true;
  } catch (error) {
    console.error("Error al eliminar la sesión de Instagram:", error);
    return false;
  }
};