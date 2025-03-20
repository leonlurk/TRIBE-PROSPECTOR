import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, setDoc, query, where, orderBy, limit } from "firebase/firestore";

/**
 * Crea una nueva campaña en Firestore
 * @param {string} userId - ID del usuario en Firebase
 * @param {Object} campaignData - Datos de la campaña a guardar
 * @returns {Promise<string>} - ID de la campaña creada
 */
export const createCampaign = async (userId, campaignData) => {
  try {
    // Verificar que userId existe
    if (!userId) {
      console.error("Error: userId no proporcionado");
      throw new Error("userId es obligatorio para crear una campaña");
    }
    
    // Referencia correcta a la subcolección campaigns dentro del documento del usuario
    const campaignsRef = collection(db, "users", userId, "campaigns");
    
    // Asegurar que los campos necesarios existen
    const campaignDataToSave = {
      ...campaignData,
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: "processing", 
      progress: 0,
      totalProcessed: 0
    };
    
    // Crear el documento
    const docRef = await addDoc(campaignsRef, campaignDataToSave);
    
    console.log(`Campaña creada exitosamente: ${docRef.id} para usuario: ${userId}`);
    
    return docRef.id;
  } catch (error) {
    console.error("Error al crear campaña:", error);
    console.error("Detalles adicionales:", {
      userId: userId,
      campaignData: JSON.stringify(campaignData)
    });
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

export const ensureUserExists = async (userId) => {
  if (!userId) return false;
  
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Crear el documento del usuario si no existe
      await setDoc(userRef, {
        createdAt: new Date(),
        userCreatedManually: true
      });
      console.log("Documento de usuario creado:", userId);
    }
    
    return true;
  } catch (error) {
    console.error("Error al verificar/crear usuario:", error);
    return false;
  }
};

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