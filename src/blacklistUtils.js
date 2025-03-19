// blacklistUtils.js
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import logApiRequest from "./requestLogger";

/**
 * Verifica si hay usuarios en la lista negra y los filtra de la lista original.
 * 
 * @param {Array} usersToCheck - Array de nombres de usuario a verificar
 * @param {Object} user - Objeto de usuario autenticado
 * @param {Function} showNotification - Función para mostrar notificaciones (opcional)
 * @param {String} source - Componente fuente para los logs
 * @returns {Array} - Array de usuarios filtrados (sin los que están en blacklist)
 */
export const checkBlacklistedUsers = async (usersToCheck, user, showNotification = null, source = "BlacklistUtils") => {
  if (!user || !user.uid || !Array.isArray(usersToCheck) || usersToCheck.length === 0) {
    return usersToCheck;
  }
  
  try {
    // Log la verificación de blacklist
    await logApiRequest({
      endpoint: "internal/check_blacklisted_users",
      requestData: { users_count: usersToCheck.length },
      userId: user.uid,
      status: "pending",
      source,
      metadata: {
        action: "check_blacklisted_users",
        usersCount: usersToCheck.length
      }
    });
    
    // Obtener todas las listas negras del usuario
    const blacklistsRef = collection(db, "users", user.uid, "blacklists");
    const blacklistsSnapshot = await getDocs(blacklistsRef);
    
    if (blacklistsSnapshot.empty) {
      // No hay listas negras, devolver todos los usuarios
      return usersToCheck;
    }
    
    // Array para almacenar todos los usuarios en blacklists
    let blacklistedUsers = [];
    
    // Para cada blacklist, obtener sus usuarios
    const fetchPromises = blacklistsSnapshot.docs.map(async (blacklistDoc) => {
      const usersRef = collection(db, "users", user.uid, "blacklists", blacklistDoc.id, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      // Extraer los nombres de usuario y añadirlos al array de blacklisted
      const blacklistNames = usersSnapshot.docs.map(doc => doc.data().username.toLowerCase());
      blacklistedUsers = [...blacklistedUsers, ...blacklistNames];
    });
    
    // Esperar a que todas las consultas terminen
    await Promise.all(fetchPromises);
    
    // Eliminar duplicados (un usuario puede estar en varias listas negras)
    blacklistedUsers = [...new Set(blacklistedUsers)];
    
    // Filtrar los usuarios que no están en la blacklist
    const filteredUsers = usersToCheck.filter(username => 
      !blacklistedUsers.includes(username.toLowerCase())
    );
    
    // Log el resultado de la verificación
    await logApiRequest({
      endpoint: "internal/check_blacklisted_users",
      requestData: { users_count: usersToCheck.length },
      userId: user.uid,
      responseData: { 
        total_users: usersToCheck.length,
        blacklisted_users: usersToCheck.length - filteredUsers.length,
        filtered_users: filteredUsers.length
      },
      status: "success",
      source,
      metadata: {
        action: "check_blacklisted_users",
        totalUsers: usersToCheck.length,
        blacklistedUsers: usersToCheck.length - filteredUsers.length,
        filteredUsers: filteredUsers.length
      }
    });
    
    // Mostrar notificación si se proporcionó una función para ello
    if (showNotification && usersToCheck.length !== filteredUsers.length) {
      showNotification(`Se omitieron ${usersToCheck.length - filteredUsers.length} usuarios que están en listas negras`, "info");
    }
    
    return filteredUsers;
  } catch (error) {
    console.error("Error al verificar usuarios en blacklist:", error);
    
    // Log el error
    await logApiRequest({
      endpoint: "internal/check_blacklisted_users",
      requestData: { users_count: usersToCheck.length },
      userId: user.uid,
      status: "error",
      source,
      metadata: {
        action: "check_blacklisted_users",
        error: error.message,
        usersCount: usersToCheck.length
      }
    });
    
    // En caso de error, devolver la lista original para no bloquear la funcionalidad principal
    return usersToCheck;
  }
};

/**
 * Verifica si un único usuario está en la lista negra
 * 
 * @param {String} username - Nombre de usuario a verificar
 * @param {Object} user - Objeto de usuario autenticado
 * @param {String} source - Componente fuente para los logs
 * @returns {Boolean} - True si está en blacklist, False si no
 */
export const isUserBlacklisted = async (username, user, source = "BlacklistUtils") => {
  if (!user || !user.uid || !username) {
    return false;
  }
  
  try {
    // Log la verificación de blacklist
    await logApiRequest({
      endpoint: "internal/check_single_blacklisted_user",
      requestData: { username },
      userId: user.uid,
      status: "pending",
      source,
      metadata: {
        action: "check_single_blacklisted_user",
        username
      }
    });
    
    // Obtener todas las listas negras del usuario
    const blacklistsRef = collection(db, "users", user.uid, "blacklists");
    const blacklistsSnapshot = await getDocs(blacklistsRef);
    
    if (blacklistsSnapshot.empty) {
      // No hay listas negras
      return false;
    }
    
    // Para cada blacklist, buscar el usuario
    const checkPromises = blacklistsSnapshot.docs.map(async (blacklistDoc) => {
      const usersRef = collection(db, "users", user.uid, "blacklists", blacklistDoc.id, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    });
    
    // Esperar a que todas las consultas terminen
    const results = await Promise.all(checkPromises);
    
    // Si el usuario está en alguna lista negra, devolver true
    const isBlacklisted = results.some(result => result === true);
    
    // Log el resultado de la verificación
    await logApiRequest({
      endpoint: "internal/check_single_blacklisted_user",
      requestData: { username },
      userId: user.uid,
      responseData: { isBlacklisted },
      status: "success",
      source,
      metadata: {
        action: "check_single_blacklisted_user",
        username,
        isBlacklisted
      }
    });
    
    return isBlacklisted;
  } catch (error) {
    console.error("Error al verificar usuario en blacklist:", error);
    
    // Log el error
    await logApiRequest({
      endpoint: "internal/check_single_blacklisted_user",
      requestData: { username },
      userId: user.uid,
      status: "error",
      source,
      metadata: {
        action: "check_single_blacklisted_user",
        error: error.message,
        username
      }
    });
    
    // En caso de error, asumir que no está en blacklist para no bloquear funcionalidad
    return false;
  }
};

export default {
  checkBlacklistedUsers,
  isUserBlacklisted
};