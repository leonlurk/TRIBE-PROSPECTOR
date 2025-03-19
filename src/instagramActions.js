// instagramActions.js
// Centraliza las funciones para consumir los endpoints “extendidos”.
// Puedes ubicar este archivo en /src/ (p.ej., junto a Dashboard.jsx, etc.)

const API_BASE_URL = "https://your-api-domain.com"; 
// Ajusta esto al dominio real de tu API, p.ej. "https://alets.com.ar"

// Función para construir headers comunes, con el token y cookies de localStorage
function getCommonHeaders() {
  const headers = {
    "User-Agent": "Instagram 219.0.0.12.117 Android",
    "Accept-Language": "es-ES, en-US",
  };
  
  // Leer token (JWT) guardado por tu login/2FA
  const token = localStorage.getItem("instagram_bot_token");
  if (token) {
    headers["token"] = token;
  }

  // Leer cookies en caso de que tu API también las necesite
  const storedCookies = localStorage.getItem("instagram_cookies");
  if (storedCookies) {
    try {
      headers["Cookie"] = JSON.parse(storedCookies);
    } catch (e) {
      console.error("Error parsing stored cookies:", e);
    }
  }

  return headers;
}

/**
 * Dar “Like” a la última publicación de un usuario
 * Endpoint: /like_latest_post
 * Method: POST
 * Body formData:
 *   - username
 */
export async function likeLatestPost(username) {
  try {
    const formData = new FormData();
    formData.append("username", username);

    const response = await fetch(`${API_BASE_URL}/like_latest_post`, {
      method: "POST",
      headers: getCommonHeaders(),
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in likeLatestPost:", error);
    throw error;
  }
}

/**
 * Obtener lista de seguidores
 * Endpoint: /get_followers
 * Method: POST
 * Body formData:
 *   - username
 *   - amount (opcional, default = 50)
 */
export async function getFollowers(username, amount = 50) {
  try {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("amount", amount);

    const response = await fetch(`${API_BASE_URL}/get_followers`, {
      method: "POST",
      headers: getCommonHeaders(),
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in getFollowers:", error);
    throw error;
  }
}

/**
 * Obtener lista de seguidos
 * Endpoint: /get_following
 * Method: POST
 * Body formData:
 *   - username
 *   - amount (opcional, default = 50)
 */
export async function getFollowing(username, amount = 50) {
  try {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("amount", amount);

    const response = await fetch(`${API_BASE_URL}/get_following`, {
      method: "POST",
      headers: getCommonHeaders(),
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in getFollowing:", error);
    throw error;
  }
}

/**
 * Obtener comentarios de una publicación
 * Endpoint: /get_comments
 * Method: POST
 * Body formData:
 *   - post_url
 *   - amount (opcional, default = 50)
 */
export async function getComments(postUrl, amount = 50) {
  try {
    const formData = new FormData();
    formData.append("post_url", postUrl);
    formData.append("amount", amount);

    const response = await fetch(`${API_BASE_URL}/get_comments`, {
      method: "POST",
      headers: getCommonHeaders(),
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in getComments:", error);
    throw error;
  }
}

/**
 * Dar “Like” a un comentario de un usuario específico
 * Endpoint: /like_comment
 * Method: POST
 * Body formData:
 *   - post_url
 *   - comment_username
 */
export async function likeComment(postUrl, commentUsername) {
  try {
    const formData = new FormData();
    formData.append("post_url", postUrl);
    formData.append("comment_username", commentUsername);

    const response = await fetch(`${API_BASE_URL}/like_comment`, {
      method: "POST",
      headers: getCommonHeaders(),
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in likeComment:", error);
    throw error;
  }
}
