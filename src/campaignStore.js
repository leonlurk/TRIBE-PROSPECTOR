import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, query, where, orderBy, limit } from "firebase/firestore";

/**
 * Crea una nueva campaña en Firestore
 * @param {string} userId - ID del usuario en Firebase
 * @param {Object} campaignData - Datos de la campaña a guardar
 * @returns {Promise<string>} - ID de la campaña creada
 */
export const createCampaign = async (userId, campaignData) => {
  try {
    const campaignsRef = collection(db, "users", userId, "campaigns");
    const docRef = await addDoc(campaignsRef, {
      ...campaignData,
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: "processing", // processing, completed, failed
      progress: 0,
      totalProcessed: 0
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error al crear campaña:", error);
    throw error;
  }
};

/**
 * Actualiza el estado de una campaña
 * @param {string} userId - ID del usuario en Firebase
 * @param {string} campaignId - ID de la campaña a actualizar
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<void>}
 */
export const updateCampaign = async (userId, campaignId, updateData) => {
  try {
    const campaignRef = doc(db, "users", userId, "campaigns", campaignId);
    
    // Asegurar que lastUpdated siempre se actualice
    await updateDoc(campaignRef, {
      ...updateData,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error("Error al actualizar campaña:", error);
    throw error;
  }
};

/**
 * Obtiene todas las campañas activas de un usuario
 * @param {string} userId - ID del usuario en Firebase
 * @returns {Promise<Array>} - Lista de campañas activas
 */
export const getActiveCampaigns = async (userId) => {
  try {
    const campaignsRef = collection(db, "users", userId, "campaigns");
    const q = query(
      campaignsRef,
      where("status", "==", "processing"),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
    }));
  } catch (error) {
    console.error("Error al obtener campañas activas:", error);
    return [];
  }
};

/**
 * Obtiene las campañas recientes de un usuario (completadas o no)
 * @param {string} userId - ID del usuario en Firebase
 * @param {number} limit - Número máximo de campañas a obtener
 * @returns {Promise<Array>} - Lista de campañas recientes
 */
export const getRecentCampaigns = async (userId, limitCount = 10) => {
  try {
    const campaignsRef = collection(db, "users", userId, "campaigns");
    const q = query(
      campaignsRef,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
    }));
  } catch (error) {
    console.error("Error al obtener campañas recientes:", error);
    return [];
  }
};

/**
 * Obtiene los detalles de una campaña específica
 * @param {string} userId - ID del usuario en Firebase
 * @param {string} campaignId - ID de la campaña
 * @returns {Promise<Object|null>} - Detalles de la campaña o null si no existe
 */
export const getCampaignDetails = async (userId, campaignId) => {
  try {
    const campaignRef = doc(db, "users", userId, "campaigns", campaignId);
    const docSnap = await getDoc(campaignRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error al obtener detalles de campaña:", error);
    return null;
  }
};

/**
 * Cancela una campaña en curso
 * @param {string} userId - ID del usuario en Firebase
 * @param {string} campaignId - ID de la campaña a cancelar
 * @returns {Promise<boolean>} - true si se canceló correctamente
 */
export const cancelCampaign = async (userId, campaignId) => {
  try {
    await updateCampaign(userId, campaignId, {
      status: "cancelled",
      endedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error("Error al cancelar campaña:", error);
    return false;
  }
};