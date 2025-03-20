import { updateCampaign, getCampaignDetails, getActiveCampaigns } from "./campaignStore";

// URL base de la API (ajusta según tu configuración)
const API_BASE_URL = "https://alets.com.ar";

/**
 * Crea un objeto de opciones de campaña para un tipo específico
 * @param {Object} options - Opciones basadas en el tipo de campaña
 * @returns {Object} - Datos de la campaña para guardarse
 */
export const createCampaignOptions = (options = {}) => {
  const {
    type,
    name,
    users = [],
    endpoint,
    mediaType,
    fileName,
    templateName,
    postLink,
  } = options;

  // Datos base de campaña
  const campaignData = {
    name: name || `${type} - ${new Date().toLocaleString()}`,
    campaignType: type,
    targetUsers: users,
    targetCount: users.length,
    endpoint: endpoint,
    createdAt: new Date(),
    status: "processing",
    progress: 0,
    totalProcessed: 0,
  };

  // Añadir datos específicos según el tipo
  switch (type) {
    case "send_messages":
      return {
        ...campaignData,
        name: name || `Envío de mensajes (${users.length} usuarios)`,
        templateName,
        postLink,
      };

    case "send_media":
      return {
        ...campaignData,
        name: name || `Envío de ${mediaType || "media"} (${users.length} usuarios)`,
        mediaType,
        fileName,
        postLink,
      };

    case "follow_users":
      return {
        ...campaignData,
        name: name || `Seguimiento de usuarios (${users.length} usuarios)`,
        postLink,
      };

    default:
      return campaignData;
  }
};

/**
 * Inicia el monitoreo de una campaña con verificaciones periódicas de estado
 * @param {string} userId - ID del usuario
 * @param {string} campaignId - ID de la campaña
 * @param {Object} options - Opciones adicionales
 * @returns {Function} - Función para detener el monitoreo
 */
export const startCampaignMonitoring = (userId, campaignId, options = {}) => {
  const { 
    token,
    initialDelay = 5000, // Esperar 5 segundos antes del primer check
    checkInterval = 15000, // Verificar cada 15 segundos
    maxChecks = 20, // Máximo número de verificaciones
  } = options;

  let checkCount = 0;
  let intervalId = null;

  // Primera verificación después de initialDelay
  const initialTimeoutId = setTimeout(() => {
    checkCampaignStatus(userId, campaignId, token)
      .then(shouldContinue => {
        if (shouldContinue) {
          // Iniciar verificaciones periódicas
          intervalId = setInterval(async () => {
            checkCount++;
            
            // Verificar si se alcanzó el máximo de verificaciones
            if (checkCount >= maxChecks) {
              clearInterval(intervalId);
              
              // Actualizar la campaña como incompleta o sin confirmación
              try {
                await updateCampaign(userId, campaignId, {
                  status: "unknown",
                  progress: 95, // No podemos confirmar 100%
                  message: "No se pudo confirmar la finalización del proceso"
                });
              } catch (error) {
                console.error("Error al actualizar campaña tras máximos intentos:", error);
              }
              
              return;
            }
            
            // Verificar estado
            const shouldContinue = await checkCampaignStatus(userId, campaignId, token);
            if (!shouldContinue && intervalId) {
              clearInterval(intervalId);
            }
          }, checkInterval);
        }
      })
      .catch(error => {
        console.error("Error en la verificación inicial de campaña:", error);
      });
  }, initialDelay);

  // Devolver función para detener el monitoreo
  return () => {
    clearTimeout(initialTimeoutId);
    if (intervalId) clearInterval(intervalId);
  };
};

/**
 * Verifica el estado actual de una campaña usando la API
 * @param {string} userId - ID del usuario
 * @param {string} campaignId - ID de la campaña
 * @param {string} token - Token de autenticación para la API
 * @returns {Promise<boolean>} - true si se debe seguir verificando, false si ya terminó
 */
async function checkCampaignStatus(userId, campaignId, token) {
  try {
    // Obtener la campaña actual
    // TODO: Idealmente usar una función de la API para verificar el estado específico de la campaña
    const response = await fetch(`${API_BASE_URL}/usage_stats`, {
      method: "GET",
      headers: {
        token: token
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    // Actualizar campaña según respuesta
    // Esto es una estimación ya que la API actual no proporciona datos exactos de progreso
    // por cada campaña. En un sistema ideal, la API debería tener un endpoint específico.
    // const activityLevel = data.activity_level || "normal"; // No lo usamos por ahora
    const blockStatus = data.block_status || null;
    
    // Si hay un proceso en curso, suponemos que está relacionado con esta campaña
    const hasActiveProcesses = data.active_processes && data.active_processes.length > 0;
    
    // Si hay bloqueos, actualizamos la campaña
    if (blockStatus) {
      await updateCampaign(userId, campaignId, {
        status: "failed",
        progress: 100,
        error: `Cuenta bloqueada: ${blockStatus.message || "Razón desconocida"}`,
        endedAt: new Date()
      });
      return false; // No seguir verificando
    }
    
    // Si no hay procesos activos, asumimos que la campaña terminó
    if (!hasActiveProcesses) {
      // Verificar si hay estadísticas disponibles
      let totalProcessed = 0;
      
      if (data.message && data.message.day && data.message.day.current) {
        totalProcessed = data.message.day.current;
      } else if (data.follow && data.follow.day && data.follow.day.current) {
        totalProcessed = data.follow.day.current;
      }
      
      await updateCampaign(userId, campaignId, {
        status: "completed",
        progress: 100,
        totalProcessed: totalProcessed,
        endedAt: new Date()
      });
      return false; // No seguir verificando
    }
    
    // Si todavía hay procesos activos, actualizar el progreso (estimación)
    // Como no tenemos datos exactos, hacemos una estimación basada en el tiempo transcurrido
    // En una implementación real, la API debería proporcionar datos de progreso precisos
    const campaign = await getCampaignDetails(userId, campaignId);
    if (campaign) {
      const startTime = campaign.createdAt;
      const now = new Date();
      const elapsedMs = now - startTime;
      
      // Estimamos que una operación típica toma unos 5 minutos (300000ms)
      // Ajustar este valor según las características reales de la API
      const estimatedDuration = 300000; 
      
      // Calculamos progreso en base al tiempo transcurrido, máximo 95%
      // (el 100% solo cuando se confirma finalización)
      const estimatedProgress = Math.min(95, Math.round((elapsedMs / estimatedDuration) * 100));
      
      await updateCampaign(userId, campaignId, {
        progress: estimatedProgress,
        // Estimar procesados en base al progreso y el total objetivo
        totalProcessed: Math.round((estimatedProgress / 100) * campaign.targetCount)
      });
    }
    
    // Devolver true para seguir monitoreando
    return true;
  } catch (error) {
    console.error("Error al verificar estado de campaña:", error);
    
    // En caso de error, seguimos monitoreando
    return true;
  }
}

/**
 * Verifica si hay alguna campaña activa para un usuario específico
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - true si hay campañas activas
 */
export const hasActiveCampaigns = async (userId) => {
  try {
    const campaigns = await getActiveCampaigns(userId);
    return campaigns.length > 0;
  } catch (error) {
    console.error("Error al verificar campañas activas:", error);
    return false;
  }
};

/**
 * Calcula el tiempo estimado que lleva una campaña en curso
 * @param {Object} campaign - Objeto de campaña
 * @returns {Object} - Objeto con tiempo en milisegundos y formato legible
 */
export const calculateCampaignElapsedTime = (campaign) => {
  if (!campaign || !campaign.createdAt) {
    return { ms: 0, formatted: "0:00" };
  }
  
  const now = new Date();
  const start = campaign.createdAt instanceof Date 
    ? campaign.createdAt 
    : new Date(campaign.createdAt);
  
  const elapsedMs = now - start;
  
  // Formato legible
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  
  return {
    ms: elapsedMs,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`
  };
};

/**
 * Formatea el tiempo transcurrido de forma legible
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de finalización (por defecto: ahora)
 * @returns {string} - Tiempo transcurrido formateado
 */
export const formatElapsedTime = (startDate, endDate = new Date()) => {
  if (!startDate) return "N/A";
  
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  const elapsed = Math.floor((end - start) / 1000); // segundos
  
  if (elapsed < 60) return `${elapsed} segundo${elapsed !== 1 ? 's' : ''}`;
  
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours} hora${hours !== 1 ? 's' : ''} ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
};

/**
 * Obtiene el nombre descriptivo para un tipo de campaña
 * @param {string} type - Tipo de campaña
 * @returns {string} - Nombre descriptivo
 */
export const getCampaignTypeName = (type) => {
  switch (type) {
    case "send_messages": return "Envío de mensajes";
    case "send_media": return "Envío de media";
    case "follow_users": return "Seguimiento de usuarios";
    default: return type || "Operación";
  }
};

/**
 * Estima el tiempo restante para completar una campaña
 * @param {Object} campaign - Objeto de campaña
 * @returns {string} - Tiempo restante estimado formateado
 */
export const estimateRemainingTime = (campaign) => {
  if (!campaign || !campaign.createdAt || !campaign.progress) {
    return "Calculando...";
  }
  
  // Si está casi completo, estimamos que quedan 30 segundos
  if (campaign.progress >= 90) {
    return "< 1 minuto";
  }
  
  const elapsedTime = calculateCampaignElapsedTime(campaign);
  
  // Regla de tres simple: si para el x% del progreso se tomó y tiempo,
  // para el 100% se tomará (y * 100 / x) tiempo
  const totalEstimatedMs = (elapsedTime.ms * 100) / campaign.progress;
  const remainingMs = totalEstimatedMs - elapsedTime.ms;
  
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  
  if (remainingMinutes < 1) return "< 1 minuto";
  if (remainingMinutes === 1) return "~1 minuto";
  if (remainingMinutes < 60) return `~${remainingMinutes} minutos`;
  
  const hours = Math.floor(remainingMinutes / 60);
  return `~${hours} hora${hours !== 1 ? 's' : ''}`;
};