// Crear un archivo centralizado de utilidades para la API
// src/api/instagramApi.js

const API_BASE_URL = "https://alets.com.ar";

// Función auxiliar para headers comunes
function getCommonHeaders() {
  const headers = {
    "User-Agent": "Instagram 219.0.0.12.117 Android",
    "Accept-Language": "es-ES, en-US",
  };
  
  const token = localStorage.getItem("instagram_bot_token");
  if (token) {
    headers["token"] = token;
  }
  
  const storedCookies = localStorage.getItem("instagram_cookies");
  if (storedCookies) {
    try {
      headers["Cookie"] = JSON.parse(storedCookies);
    } catch (e) {
      console.error("Error parsing stored cookies:", e);
    }
  }
  
  const deviceId = localStorage.getItem("instagram_device_id");
  if (deviceId) {
    headers["X-IG-Device-ID"] = deviceId;
    headers["X-IG-Android-ID"] = deviceId;
  }
  
  return headers;
}

// Función genérica para peticiones a la API
// Línea aproximada 23 en instagramApi.js
async function apiRequest(endpoint, params = {}, method = "POST", customToken = null) {
  console.log(`API Request to ${endpoint}:`, { params, method, customToken });
  // Cambiar FormData por URLSearchParams
  const urlParams = new URLSearchParams();
  
  // Agregar todos los parámetros
  Object.keys(params).forEach(key => {
    urlParams.append(key, params[key]);
  });
  
  try {
    // Obtener headers comunes
    const headers = {
      ...getCommonHeaders(),
      "Content-Type": "application/x-www-form-urlencoded"
    };
    
    // Si hay token personalizado, usarlo
    if (customToken) {
      headers["token"] = customToken;
    }
    
    // Log headers right before the request
    console.log("Request headers:", headers);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: urlParams, // Usar urlParams en lugar de formData
    });
    
    console.log(`Response status for ${endpoint}:`, response.status);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Response data for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`Error en petición a ${endpoint}:`, error);
    throw error;
  }
}

// Implementación de cada endpoint según la documentación
export const instagramApi = {
  // Autenticación
  login: (username, password, deviceId = null) => {
    const params = { username, password };
    if (deviceId) {
      params.device_id = deviceId;
      params.login_attempt_count = "1";
    }
    return apiRequest("/login", params);
  },
  
  verify2FA: (username, verificationCode, deviceId = null) => {
    const params = { 
      username, 
      verification_code: verificationCode 
    };
    
    if (deviceId) {
      params.device_id = deviceId;
    }
    
    // Añadir información de 2FA almacenada localmente
    const sessionId = localStorage.getItem("instagram_2fa_session");
    if (sessionId) params.session_id = sessionId;
    
    const csrfToken = localStorage.getItem("instagram_csrf_token");
    if (csrfToken) params.csrf_token = csrfToken;
    
    const twoFactorInfo = localStorage.getItem("instagram_2fa_info");
    if (twoFactorInfo) params.two_factor_info = twoFactorInfo;
    
    return apiRequest("/verify_2fa", params);
  },
  
  requestNew2FACode: (username, deviceId = null) => {
    const params = { username };
    if (deviceId) params.device_id = deviceId;
    
    const sessionId = localStorage.getItem("instagram_2fa_session");
    if (sessionId) params.session_id = sessionId;
    
    return apiRequest("/request_new_2fa_code", params);
  },
  
  checkSession: () => apiRequest("/session", {}, "GET"),
  
  resetSession: (username) => apiRequest("/reset_session", { username }),
  
  // Operaciones
  getLikes: (postLink, token = null) => {
    console.log("getLikes called with:", { postLink, token });
    console.log("Current localStorage token:", localStorage.getItem("instagram_bot_token"));
    
    return apiRequest("/obtener_likes", { link: postLink }, "POST", token)
      .then(data => {
        console.log("getLikes success response:", data);
        return data;
      })
      .catch(error => {
        console.error("getLikes error:", error);
        throw error;
      });
  },
  
  followUsers: (users, token = null) => {
    const usersStr = Array.isArray(users) ? users.join(",") : users;
    return apiRequest("/seguir_usuarios", { usuarios: usersStr }, "POST", token);
  },
  
  sendMessages: (users, message, skipExisting = false, token = null) => {
    const usersStr = Array.isArray(users) ? users.join(",") : users;
    return apiRequest("/enviar_mensajes_multiple", { 
      usuarios: usersStr, 
      mensaje: message,
      skip_existing: skipExisting 
    }, "POST", token);
  },
  
  sendMedia: async (users, file, mediaType, message = "", skipExisting = false, token = null) => {
    const usersStr = Array.isArray(users) ? users.join(",") : users;
    
    // Usar FormData para archivos
    const formData = new FormData();
    formData.append("usuarios", usersStr);
    formData.append("file", file);
    formData.append("media_type", mediaType);
    formData.append("mensaje", message);
    formData.append("skip_existing", skipExisting);
    
    // Petición especial para FormData
  try {
    // Obtener headers y agregar token personalizado si existe
    const headers = getCommonHeaders();
    if (token) headers["token"] = token;
    
    const response = await fetch(`${API_BASE_URL}/enviar_media`, {
      method: "POST",
      headers: headers,
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error en envío de media:`, error);
    throw error;
  }
},
  
  // Estadísticas y gestión
  getUsageStats: () => apiRequest("/usage_stats", {}, "GET"),
  
  getAccountHealth: () => apiRequest("/account_health", {}, "GET"),
  
  setActivityLevel: (level) => apiRequest("/set_activity_level", { level }),
  
  setWarmingMode: (enable) => apiRequest("/warming_mode", { enable }),
  
  pauseOperations: (durationMinutes) => 
    apiRequest("/pause_operations", { duration_minutes: durationMinutes }),
  
  getMessageHistory: (limit = 100) => 
    apiRequest("/message_history", { limit }, "GET"),
  
  getCachedLikes: () => apiRequest("/get_cached_likes", {}, "GET"),
  
  // Operaciones adicionales
  getComments: (postUrl, token = null) => 
    apiRequest("/get_comments", { post_url: postUrl }, "POST", token),
  
  getFollowers: (username, token = null) => 
    apiRequest("/get_followers", { username }, "POST", token),
  
  getFollowing: (username, amount = 50) => 
    apiRequest("/get_following", { username, amount }),
  
  likeLatestPost: (username) => apiRequest("/like_latest_post", { username }),
  
  likeComment: (postUrl, commentUsername) => 
    apiRequest("/like_comment", { post_url: postUrl, comment_username: commentUsername })
};