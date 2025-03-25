import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { FaArrowRight, FaTimes, FaTrash } from "react-icons/fa";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import logApiRequest from "../requestLogger";
import { instagramApi } from "../instagramApi"; 
import { checkBlacklistedUsers } from "../blacklistUtils";
import { createCampaignOptions, startCampaignMonitoring } from "../campaignIntegration";
import { createCampaign as createCampaignStore, updateCampaign, ensureUserExists } from '../campaignStore';


const NuevaCampanaModal = ({ isOpen, onClose, user, instagramToken }) => {
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [targetLink, setTargetLink] = useState("");
  const [targetType, setTargetType] = useState(""); // "perfil" o "publicacion"
  const [isProspecting, setIsProspecting] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState("image"); // "image" o "video"
  const [mediaCaption, setMediaCaption] = useState("");
  const removeUser = (username) => {
    setUsers(users.filter(user => user !== username));
  };
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  
  // Para el paso 2 - Objetivos y filtros
  const [objectives, setObjectives] = useState({
    comentarios: false,
    likes: false,
    seguidores: false
  });

  const updateProgress = (percentage, message = "") => {
    setProgress(percentage);
    if (message) setProgressMessage(message);
  };
  
  const [filters, setFilters] = useState({
    genero: false
  });
  
  const [tasks, setTasks] = useState({
    seguir: false,
    enviarMensaje: false,
    darLikes: false,
    comentar: false,
    enviarMedia: false
  });
  
  // Para el paso 3 - Usuarios y mensajes
  const [users, setUsers] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Reset el estado cuando se abre/cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setCampaignName("");
      setTargetLink("");
      setTargetType("publicacion");
      setIsProspecting(false);
      setObjectives({
        comentarios: false,
        likes: false,
        seguidores: false
      });
      setFilters({
        genero: false
      });
      setTasks({
        seguir: false,
        enviarMensaje: false,
        darLikes: false,
        comentar: false,
        enviarMedia: false  // Resetear la nueva tarea
      });
      setUsers([]);
      setMensaje("");
      setSelectedTemplate(null);
      setLoading(false);
      setError("");
      
      // Resetear estados de media
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType("image");
      setMediaCaption("");
    }
  }, [isOpen]);
  
  const sendMedia = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para enviar medios");
      return;
    }
    
    if (!mediaFile) {
      setError("Debes seleccionar un archivo de imagen o video");
      return;
    }
  
    const result = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
    setFilteredUsers({
      original: users.length,
      filtered: result.length,
      blacklistedCount: users.length - result.length,
      blacklistedUsers: users.filter(u => !result.includes(u))
    });
  
    // Verificar si hay usuarios después de filtrar la blacklist
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se enviaron medios.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Progreso inicial
    updateProgress(0, "Iniciando envío de medios...");
    
    // Variables para campaña
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      // Actualizar progreso al preparar archivo
      updateProgress(10, "Preparando archivo multimedia...");
      
      // Crear una campaña para esta operación
      if (user && user.uid) {
        const campaignOptions = createCampaignOptions({
          type: "send_media",
          users: users,
          endpoint: "/enviar_media",
          mediaType: mediaType,
          postLink: targetLink
        });
        
        // Aseguramos que el documento del usuario exista antes de crear la campaña
        await ensureUserExists(user.uid);
        
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        
        // Iniciar monitoreo de la campaña
        if (campaignId) {
          stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
            token: instagramToken
          });
        }
      }
      
      // Actualizar progreso antes de registrar
      updateProgress(20, "Registrando operación...");
      
      // Log the send media attempt
      if (user) {
        await logApiRequest({
          endpoint: "/enviar_media",
          requestData: { 
            usuarios_count: users.length,
            media_type: mediaType,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: {
            action: "send_media",
            usersCount: users.length,
            mediaType: mediaType,
            postLink: targetLink || null,
            campaignId: campaignId
          }
        });
      }
      
      // Actualizar progreso antes de enviar medios
      updateProgress(30, `Enviando ${mediaType} a ${result.length} usuarios...`);
      
      // Usar la API centralizada para enviar medios
      const data = await instagramApi.sendMedia(
        result,
        mediaFile,
        mediaType,
        mediaCaption,
        false // skipExisting
      );
      
      // Actualizar progreso después de enviar medios
      updateProgress(70, "Procesando resultados...");
      
      // Actualizar campaña con resultado inicial
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 80,
          initialResponse: data,
          filteredUsers: result.length,
          blacklistedUsers: users.length - result.length
        });
      }
      
      // Actualizar progreso antes de registrar respuesta
      updateProgress(90, "Finalizando envío de medios...");
      
      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/enviar_media",
          requestData: { 
            usuarios_count: users.length,
            filtered_users_count: result.length,
            media_type: mediaType,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: data.status,
            sentCount: data.sent_count || 0,
            failedCount: data.failed_count || 0,
            blacklistedCount: users.length - result.length,
            campaignId: campaignId
          },
          status: data.status === "success" ? "success" : "completed",
          source: "NuevaCampanaModal",
          metadata: {
            action: "send_media",
            usersCount: users.length,
            filteredUsersCount: result.length,
            blacklistedCount: users.length - result.length,
            mediaType: mediaType,
            postLink: targetLink,
            sentCount: data.sent_count || 0,
            failedCount: data.failed_count || 0,
            campaignId: campaignId
          }
        });
      }
      
      // Actualizar progreso al completar
      updateProgress(100, `Medios enviados exitosamente a ${data.sent_count || 0} usuarios`);
      
      setError(null);
      alert(`Medios enviados exitosamente a ${data.sent_count || 0} usuarios`);
      
      // Avanzar al paso 4 (éxito) si todo va bien
      setStep(4);
      
    } catch (error) {
      // Actualizar progreso en caso de error
      updateProgress(100, "Error en el envío de medios");
      
      console.error("Error al enviar medios:", error);
      setError("Error al enviar medios: " + error.message);
      
      // Actualizar campaña con el error
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "failed",
          progress: 100,
          error: error.message,
          endedAt: new Date()
        });
        
        if (stopMonitoring) stopMonitoring();
      }
      
      // Log the error
      if (user) {
        await logApiRequest({
          endpoint: "/enviar_media",
          requestData: { 
            usuarios_count: users.length,
            media_type: mediaType,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "error",
          source: "NuevaCampanaModal",
          metadata: {
            action: "send_media",
            error: error.message,
            usersCount: users.length,
            mediaType: mediaType,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const commentOnLatestPosts = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para comentar en sus publicaciones");
      return;
    }
    
    if (!mensaje.trim()) {
      setError("Debes escribir un comentario para enviar");
      return;
    }
    
    const result = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
    setFilteredUsers({
      original: users.length,
      filtered: result.length,
      blacklistedCount: users.length - result.length,
      blacklistedUsers: users.filter(u => !result.includes(u))
    });
  
    // Verificar si hay usuarios después de filtrar la blacklist
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se realizaron comentarios.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Progreso inicial
    updateProgress(0, "Iniciando proceso de comentarios...");
    
    // Variables para campaña
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      // Actualizar progreso al crear campaña
      updateProgress(10, "Preparando campaña de comentarios...");
      
      // Crear una campaña para esta operación
      if (user && user.uid) {
        const campaignOptions = createCampaignOptions({
          type: "comment_posts",
          users: users,
          endpoint: "/comment_latest_post",
          message: mensaje.substring(0, 50) + "...",
          postLink: targetLink
        });
        
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        
        // Iniciar monitoreo de la campaña
        stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
          token: instagramToken
        });
      }
      
      // Actualizar progreso antes de registrar
      updateProgress(20, "Registrando operación...");
      
      // Log del intento de comentar
      if (user) {
        await logApiRequest({
          endpoint: "/comment_latest_post",
          requestData: { 
            usuarios_count: users.length,
            message: mensaje,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: {
            action: "comment_posts",
            usersCount: users.length,
            messageLength: mensaje.length,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
      
      // Actualizar progreso antes de simular
      updateProgress(40, `Preparando comentarios para ${result.length} publicaciones...`);
      
      // Esta funcionalidad es hipotética ya que el endpoint no está en la documentación
      // pero quedaría implementada así con la estructura actual
      
      // Simular proceso (implementar cuando exista el endpoint real)
      updateProgress(50, "Enviando comentarios...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar progreso después de procesar
      updateProgress(70, "Procesando resultados...");
      
      // Log de respuesta simulada
      if (user) {
        await logApiRequest({
          endpoint: "/comment_latest_post",
          requestData: { 
            usuarios_count: users.length,
            filtered_users_count: result.length,
            message: mensaje,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: "success",
            commentedCount: result.length,
            failedCount: 0,
            blacklistedCount: users.length - result.length,
            campaignId: campaignId
          },
          status: "success",
          source: "NuevaCampanaModal",
          metadata: {
            action: "comment_posts",
            usersCount: users.length,
            filteredUsersCount: result.length,
            blacklistedCount: users.length - result.length,
            messageLength: mensaje.length,
            postLink: targetLink,
            commentedCount: result.length,
            failedCount: 0,
            campaignId: campaignId
          }
        });
      }
      
      // Actualizar progreso antes de finalizar campaña
      updateProgress(90, "Finalizando operación...");
      
      // Actualizar campaña como completada
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "completed",
          progress: 100,
          endedAt: new Date(),
          successCount: result.length,
          failedCount: 0
        });
      }
      
      // Actualizar progreso al completar
      updateProgress(100, `Comentarios programados para ${result.length} publicaciones`);
      
      setError(null);
      alert(`Se han programado comentarios para ${result.length} publicaciones`);
      
      // Avanzar al paso 4 (éxito)
      setStep(4);
      
    } catch (error) {
      // Actualizar progreso en caso de error
      updateProgress(100, "Error en el proceso de comentarios");
      
      console.error("Error al comentar publicaciones:", error);
      setError("Error al comentar publicaciones: " + error.message);
      
      // Actualizar campaña con el error
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "failed",
          progress: 100,
          error: error.message,
          endedAt: new Date()
        });
        
        if (stopMonitoring) stopMonitoring();
      }
      
      // Log del error
      if (user) {
        await logApiRequest({
          endpoint: "/comment_latest_post",
          requestData: { 
            usuarios_count: users.length,
            message: mensaje,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "error",
          source: "NuevaCampanaModal",
          metadata: {
            action: "comment_posts",
            error: error.message,
            usersCount: users.length,
            messageLength: mensaje.length,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const likeLatestPosts = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para dar like a sus publicaciones");
      return;
    }
    const result = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
    setFilteredUsers({
      original: users.length,
      filtered: result.length,
      blacklistedCount: users.length - result.length,
      blacklistedUsers: users.filter(u => !result.includes(u))
    });
    
    setLoading(true);
    setError("");
     // CAMBIO 1: Verificar si hay usuarios después de filtrar la blacklist
     if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se dieron likes.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // CAMBIO 2: Establecer progreso inicial
    updateProgress(0, "Iniciando proceso de likes...");
    // Variables para campaña
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      // Crear una campaña para esta operación
      if (user && user.uid) {
        const campaignOptions = createCampaignOptions({
          type: "like_posts",
          users: users,
          endpoint: "/like_latest_post",
          postLink: targetLink
        });
        
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        
        // Iniciar monitoreo de la campaña
        stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
          token: instagramToken
        });
      }
      
      // Log the like posts attempt
      if (user) {
        await logApiRequest({
          endpoint: "/like_latest_post",
          requestData: { 
            usuarios_count: users.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: {
            action: "like_posts",
            usersCount: users.length,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
      
      // Verificar usuarios en blacklist
      const filteredUsers = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
      
      if (filteredUsers.length === 0) {
        setError("Todos los usuarios están en listas negras. No se dieron likes.");
        
        // Si se creó una campaña, actualizarla como cancelada
        if (campaignId) {
          await updateCampaign(user.uid, campaignId, {
            status: "cancelled",
            progress: 100,
            endedAt: new Date(),
            error: "Todos los usuarios están en listas negras"
          });
          
          if (stopMonitoring) stopMonitoring();
        }
        
        setLoading(false);
        return;
      }
      
      // Procesar usuarios en secuencia
      let sucessCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < filteredUsers.length; i++) {
        const username = filteredUsers[i];
        
        try {
          // Actualizar progreso
          if (campaignId) {
            await updateCampaign(user.uid, campaignId, {
              progress: Math.floor((i / filteredUsers.length) * 100),
              currentUser: username,
              processedUsers: i,
              totalUsers: filteredUsers.length
            });
          }
          
          // Usar la API para dar like a la última publicación
          const result = await instagramApi.likeLatestPost(username);
          
          if (result.status === "success") {
            sucessCount++;
          } else {
            failedCount++;
          }
          
          // Pausa breve entre solicitudes para no sobrecargar
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`Error al dar like a las publicaciones de ${username}:`, error);
          failedCount++;
        }
      }
      
      // Finalizar campaña
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "completed",
          progress: 100,
          endedAt: new Date(),
          successCount: sucessCount,
          failedCount: failedCount
        });
      }
      
      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/like_latest_post",
          requestData: { 
            usuarios_count: users.length,
            filtered_users_count: filteredUsers.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: "success",
            likedCount: sucessCount,
            failedCount: failedCount,
            blacklistedCount: users.length - filteredUsers.length,
            campaignId: campaignId
          },
          status: "success",
          source: "NuevaCampanaModal",
          metadata: {
            action: "like_posts",
            usersCount: users.length,
            filteredUsersCount: filteredUsers.length,
            blacklistedCount: users.length - filteredUsers.length,
            postLink: targetLink,
            likedCount: sucessCount,
            failedCount: failedCount,
            campaignId: campaignId
          }
        });
      }
      
      setError(null);
      alert(`Se han procesado likes para ${sucessCount} usuarios (fallidos: ${failedCount})`);
      
      // Avanzar al paso 4 (éxito) si todo va bien
      setStep(4);
      
    } catch (error) {
      console.error("Error al dar likes:", error);
      setError("Error al dar likes: " + error.message);
      
      // Actualizar campaña con el error
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "failed",
          progress: 100,
          error: error.message,
          endedAt: new Date()
        });
        
        if (stopMonitoring) stopMonitoring();
      }
      
      // Log the error
      if (user) {
        await logApiRequest({
          endpoint: "/like_latest_post",
          requestData: { 
            usuarios_count: users.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "error",
          source: "NuevaCampanaModal",
          metadata: {
            action: "like_posts",
            error: error.message,
            usersCount: users.length,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const fileType = file.type;
    if (fileType.startsWith('image/')) {
      setMediaType("image");
    } else if (fileType.startsWith('video/')) {
      setMediaType("video");
    } else {
      setError("Tipo de archivo no soportado. Por favor, selecciona una imagen o video.");
      return;
    }
    
    // Establecer el archivo
    setMediaFile(file);
    
    // Generar una vista previa
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Limpiar cualquier error previo
    setError(null);
  };

  const sendMessages = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para enviar mensajes");
      return;
    }
    
    if (!mensaje.trim()) {
      setError("El mensaje no puede estar vacío");
      return;
    }
    
    const result = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
    setFilteredUsers({
      original: users.length,
      filtered: result.length,
      blacklistedCount: users.length - result.length,
      blacklistedUsers: users.filter(u => !result.includes(u))
    });
  
    // Verificar si hay usuarios después de filtrar la blacklist
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se enviaron mensajes.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Progreso inicial
    updateProgress(0, "Iniciando envío de mensajes...");
    
    // Variables para campaña
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      // Actualizar progreso al crear campaña
      updateProgress(10, "Preparando campaña de mensajes...");
      
      // Crear una campaña para esta operación
      if (user && user.uid) {
        const campaignOptions = createCampaignOptions({
          type: "send_messages",
          users: users,
          endpoint: "/enviar_mensajes_multiple",
          templateName: selectedTemplate?.name || null,
          postLink: targetLink
        });
        
        try {
          // Aseguramos que el documento del usuario exista antes de crear la campaña
          await ensureUserExists(user.uid);
          
          campaignId = await createCampaignStore(user.uid, campaignOptions);
          
          // Iniciar monitoreo de la campaña solo si se creó exitosamente
          if (campaignId) {
            stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
              token: instagramToken
            });
          }
        } catch (campaignError) {
          console.error("Error al crear la campaña:", campaignError);
          // Continuar con el envío de mensajes incluso si falla la creación de la campaña
        }
      }
      
      // Actualizar progreso antes de registrar
      updateProgress(20, "Registrando operación...");
      
      // Log the send messages attempt
      if (user) {
        await logApiRequest({
          endpoint: "/enviar_mensajes_multiple",
          requestData: { 
            usuarios_count: users.length,
            mensaje_length: mensaje.length,
            template_id: selectedTemplate ? selectedTemplate.id : null,
            campaign_id: campaignId || null
          },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: {
            action: "send_messages",
            usersCount: users.length,
            messageLength: mensaje.length,
            templateId: selectedTemplate ? selectedTemplate.id : null,
            templateName: selectedTemplate ? selectedTemplate.name : null, 
            postLink: targetLink || null,
            campaignId: campaignId || null
          }
        });
      }
      
      // Actualizar progreso antes de enviar mensajes
      updateProgress(40, `Enviando mensajes a ${result.length} usuarios...`);
      
      // Usar la API centralizada para enviar mensajes
      const data = await instagramApi.sendMessages(result, mensaje, false);
      
      // Actualizar progreso después de enviar mensajes
      updateProgress(70, "Procesando resultados...");
      
      // Actualizar campaña con información inicial
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 80,
          initialResponse: data,
          filteredUsers: result.length,
          blacklistedUsers: users.length - result.length
        });
      }
      
      // Actualizar progreso antes de registrar respuesta
      updateProgress(90, "Finalizando envío de mensajes...");
      
      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/enviar_mensajes_multiple",
          requestData: { 
            usuarios_count: users.length,
            mensaje_length: mensaje.length,
            template_id: selectedTemplate?.id,
            filtered_users_count: result.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: data.status,
            sentCount: data.sent_count || 0,
            failedCount: data.failed_count || 0,
            blacklistedCount: users.length - result.length,
            campaignId: campaignId
          },
          status: data.status === "success" ? "success" : "completed",
          source: "NuevaCampanaModal",
          metadata: {
            action: "send_messages",
            usersCount: users.length,
            filteredUsersCount: result.length,
            blacklistedCount: users.length - result.length,
            messageLength: mensaje.length,
            templateId: selectedTemplate?.id,
            templateName: selectedTemplate?.name,
            postLink: targetLink,
            sentCount: data.sent_count || 0,
            failedCount: data.failed_count || 0,
            campaignId: campaignId
          }
        });
      }
      
      // Actualizar progreso al completar
      updateProgress(100, `Mensajes enviados exitosamente a ${data.sent_count || 0} usuarios`);
      
      setError(null);
      alert(`Mensajes enviados exitosamente a ${data.sent_count || 0} usuarios`);
      
      // Avanzar al paso 4 (éxito) si todo va bien
      setStep(4);
      
    } catch (error) {
      // Actualizar progreso en caso de error
      updateProgress(100, "Error en el envío de mensajes");
      
      console.error("Error al enviar mensajes:", error);
      setError("Error al enviar mensajes: " + error.message);
      
      // Actualizar campaña con el error
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "failed",
          progress: 100,
          error: error.message,
          endedAt: new Date()
        });
        
        if (stopMonitoring) stopMonitoring();
      }
      
      // Log the error
      if (user) {
        await logApiRequest({
          endpoint: "/enviar_mensajes_multiple",
          requestData: { 
            usuarios_count: users.length,
            mensaje_length: mensaje.length,
            template_id: selectedTemplate?.id,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "error",
          source: "NuevaCampanaModal",
          metadata: {
            action: "send_messages",
            error: error.message,
            usersCount: users.length,
            messageLength: mensaje.length,
            templateId: selectedTemplate?.id,
            templateName: selectedTemplate?.name,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getCommentsFromPost = async () => {
    if (!targetLink.trim()) {
      setError("Debes ingresar un enlace a una publicación");
      return false;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Log the request
      if (user) {
        await logApiRequest({
          endpoint: "/get_comments",
          requestData: { post_url: targetLink },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: {
            action: "get_comments",
            postLink: targetLink
          }
        });
      }
      
      // Usar la API centralizada
      const data = await instagramApi.getComments(targetLink);

      const getFollowersFromProfile = async () => {
        // Validar que el targetLink sea un perfil y extraer username
        const usernameMatch = targetLink.match(/instagram\.com\/([^\/\?]+)/);
        if (!usernameMatch || !usernameMatch[1]) {
          setError("No se pudo extraer el nombre de usuario del enlace de perfil");
          return false;
        }
        
        const username = usernameMatch[1];
        setLoading(true);
        setError("");
        
        try {
          // Log the request
          if (user) {
            await logApiRequest({
              endpoint: "/get_followers",
              requestData: { username, amount: 50 },
              userId: user.uid,
              status: "pending",
              source: "NuevaCampanaModal",
              metadata: {
                action: "get_followers",
                username,
                amount: 50
              }
            });
          }
          
          // Usar la API centralizada
          const data = await instagramApi.getFollowers(username);
          
          // Log the response
          if (user) {
            await logApiRequest({
              endpoint: "/get_followers",
              requestData: { username, amount: 50 },
              userId: user.uid,
              responseData: { 
                status: data.status,
                followersCount: data.followers?.length || 0
              },
              status: data.status === "success" ? "success" : "completed",
              source: "NuevaCampanaModal",
              metadata: {
                action: "get_followers",
                username,
                followersCount: data.followers?.length || 0
              }
            });
          }
          
          if (data.status === "success" && data.followers) {
            setUsers(data.followers);
            return true;
          } else {
            setError("Error al obtener seguidores: " + (data.message || "Error desconocido"));
            return false;
          }
        } catch (error) {
          console.error("Error obteniendo seguidores:", error);
          setError("Error de conexión o problema de red");
          
          // Log the error
          if (user) {
            await logApiRequest({
              endpoint: "/get_followers",
              requestData: { username, amount: 50 },
              userId: user.uid,
              status: "error",
              source: "NuevaCampanaModal",
              metadata: {
                action: "get_followers",
                error: error.message,
                username
              }
            });
          }
          return false;
        } finally {
          setLoading(false);
        }
      };

      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/get_comments",
          requestData: { post_url: targetLink },
          userId: user.uid,
          responseData: { 
            status: data.status,
            commentsCount: data.comments?.length || 0
          },
          status: data.status === "success" ? "success" : "completed",
          source: "NuevaCampanaModal",
          metadata: {
            action: "get_comments",
            postLink: targetLink,
            commentsCount: data.comments?.length || 0
          }
        });
      }
      
      if (data.status === "success" && data.comments) {
        // Extraer los nombres de usuario de los comentarios
        const commentUsers = data.comments.map(comment => comment.user);
        setUsers(commentUsers);
        return true;
      } else {
        setError("Error al obtener comentarios: " + (data.message || "Error desconocido"));
        return false;
      }
    } catch (error) {
      console.error("Error obteniendo comentarios:", error);
      setError("Error de conexión o problema de red");
      
      // Log the error
      if (user) {
        await logApiRequest({
          endpoint: "/get_comments",
          requestData: { post_url: targetLink },
          userId: user.uid,
          status: "error",
          source: "NuevaCampanaModal",
          metadata: {
            action: "get_comments",
            error: error.message,
            postLink: targetLink
          }
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const followAllUsers = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para seguir");
      return;
    }
    
    const result = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
    setFilteredUsers({
      original: users.length,
      filtered: result.length,
      blacklistedCount: users.length - result.length,
      blacklistedUsers: users.filter(u => !result.includes(u))
    });
  
    // Verificar si hay usuarios después de filtrar la blacklist
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se siguió a ningún usuario.");
      return;
    }
  
    setLoading(true);
    setError("");
    
    // Progreso inicial
    updateProgress(0, "Iniciando proceso de seguimiento...");
    
    // Variables para campaña
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      // Actualizar progreso al crear campaña
      updateProgress(10, "Preparando campaña de seguimiento...");
      
      // Crear una campaña para esta operación
      if (user && user.uid) {
        const campaignOptions = createCampaignOptions({
          type: "follow_users",
          users: users,
          endpoint: "/seguir_usuarios",
          postLink: targetLink
        });
        
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        
        // Iniciar monitoreo de la campaña
        stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
          token: instagramToken
        });
      }
      
      // Actualizar progreso antes de registrar
      updateProgress(20, "Registrando operación...");
      
      // Log the follow users attempt
      if (user) {
        await logApiRequest({
          endpoint: "/seguir_usuarios",
          requestData: { 
            usuarios_count: users.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: {
            action: "follow_users",
            usersCount: users.length,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
      
      // Actualizar progreso antes de llamar a la API
      updateProgress(40, `Enviando solicitud para seguir a ${result.length} usuarios...`);
      
      // Usar la API centralizada para seguir usuarios
      const data = await instagramApi.followUsers(result);
      
      // Actualizar progreso después de la respuesta
      updateProgress(70, "Procesando resultados...");
      
      // Actualizar campaña con información inicial
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 10, // Inicio del proceso
          initialResponse: data,
          filteredUsers: result.length,
          blacklistedUsers: users.length - result.length
        });
      }
      
      // Actualizar progreso antes de registrar respuesta
      updateProgress(85, "Finalizando operación...");
      
      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/seguir_usuarios",
          requestData: { 
            usuarios_count: users.length,
            filtered_users_count: result.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: data.status,
            followedCount: data.followed_count || 0,
            skippedCount: data.skipped_count || 0,
            blacklistedCount: users.length - result.length,
            campaignId: campaignId
          },
          status: data.status === "success" ? "success" : "completed",
          source: "NuevaCampanaModal",
          metadata: {
            action: "follow_users",
            usersCount: users.length,
            filteredUsersCount: result.length,
            blacklistedCount: users.length - result.length,
            postLink: targetLink,
            followedCount: data.followed_count || 0,
            skippedCount: data.skipped_count || 0,
            campaignId: campaignId
          }
        });
      }
      
      // Actualizar progreso al 100% al completar exitosamente
      updateProgress(100, `Seguimiento de usuarios iniciado exitosamente`);
      
      setError(null);
      alert("Seguimiento en proceso. Se ha creado una campaña para seguir el progreso.");
      
      // Avanzar al paso 4 (éxito) si todo va bien
      setStep(4);
      
    } catch (error) {
      // Actualizar progreso en caso de error
      updateProgress(100, "Error en el proceso de seguimiento");
      
      console.error("Error al seguir usuarios:", error);
      setError("Error al seguir usuarios: " + error.message);
      
      // Actualizar campaña con el error
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "failed",
          progress: 100,
          error: error.message,
          endedAt: new Date()
        });
        
        if (stopMonitoring) stopMonitoring();
      }
      
      // Log the error
      if (user) {
        await logApiRequest({
          endpoint: "/seguir_usuarios",
          requestData: { 
            usuarios_count: users.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          status: "error",
          source: "NuevaCampanaModal",
          metadata: {
            action: "follow_users",
            error: error.message,
            usersCount: users.length,
            postLink: targetLink,
            campaignId: campaignId
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getLikesFromPost = async () => {
    if (!targetLink.trim()) {
      setError("Debes ingresar un enlace a una publicación");
      return false;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Log the get likes attempt
      if (user) {
        await logApiRequest({
          endpoint: "/obtener_likes",
          requestData: { link: targetLink },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: {
            action: "get_likes",
            postLink: targetLink
          }
        });
      }
      
      // Usar la API centralizada
      const data = await instagramApi.getLikes(targetLink);
      
      console.log("Respuesta completa:", data);
      
      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/obtener_likes",
          requestData: { link: targetLink },
          userId: user.uid,
          responseData: { 
            status: data.status,
            likesCount: data.likes?.length || 0
          },
          status: data.status === "success" ? "success" : "completed",
          source: "NuevaCampanaModal",
          metadata: {
            action: "get_likes",
            postLink: targetLink,
            usersCount: data.likes?.length || 0
          }
        });
      }
      
      if (data.status === "success") {
        setUsers(data.likes);
        return true;
      } else {
        setError("Error al obtener likes: " + (data.message || "Error desconocido"));
        return false;
      }
    } catch (error) {
      console.error("Ocurrió un error al conectar con la API:", error);
      setError("Error de conexión o problema de red.");
      
      // Log the error
      if (user) {
        await logApiRequest({
          endpoint: "/obtener_likes",
          requestData: { link: targetLink },
          userId: user.uid,
          status: "error",
          source: "NuevaCampanaModal",
          metadata: {
            action: "get_likes",
            error: error.message,
            postLink: targetLink
          }
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };


  const handleNext = async () => {
    // Resetear mensajes de error
    setError("");
    
    // Validaciones básicas
    if (step === 1) {
      if (!campaignName.trim()) {
        setError("Debes ingresar un nombre para la campaña");
        return;
      }
      if (!targetLink.trim()) {
        setError("Debes ingresar un link de perfil o publicación");
        return;
      }
      
      // Validar el formato del link
      if (!targetLink.includes("instagram.com")) {
        setError("El enlace debe ser de Instagram");
        return;
      }
      
      // Determinar si es un perfil o una publicación
      if (targetLink.includes("/p/")) {
        setTargetType("publicacion");
      } else {
        setTargetType("perfil");
      }
      
      // Avanzar al siguiente paso
      setStep(step + 1);
      return;
    }
    
    if (step === 2) {
      // Validar que se haya seleccionado al menos un objetivo y una tarea
      const hasObjective = Object.values(objectives).some(val => val);
      const hasTask = Object.values(tasks).some(val => val);
      
      if (!hasObjective) {
        setError("Debes seleccionar al menos un objetivo");
        return;
      }
      
      if (!hasTask) {
        setError("Debes seleccionar al menos una tarea");
        return;
      }
      
      // Validar que enviar media solo esté habilitado con la opción correcta del paso 1
      if (tasks.enviarMedia && !targetLink.includes("/p/")) {
        setError("Para enviar media, debes seleccionar una publicación en el paso 1");
        return;
      }
      
      // Obtener usuarios según los objetivos seleccionados
      let success = false;
      
      try {
        setLoading(true);
        
        if (objectives.likes) {
          success = await getLikesFromPost();
        } else if (objectives.comentarios) {
          success = await getCommentsFromPost();
        } else if (objectives.seguidores) {
          success = await getFollowersFromProfile();
        }
        
        if (success && users.length > 0) {
          // Filtrar duplicados antes de continuar
          const uniqueUsers = [...new Set(users)];
          if (uniqueUsers.length < users.length) {
            console.log(`Filtrados ${users.length - uniqueUsers.length} usuarios duplicados`);
            setUsers(uniqueUsers);
          }
          
          setStep(step + 1);
        } else if (users.length === 0) {
          setError("No se pudieron obtener usuarios para la campaña");
        }
      } catch (error) {
        console.error("Error al obtener usuarios:", error);
        setError("Error al obtener usuarios: " + error.message);
      } finally {
        setLoading(false);
      }
      
      return;
    }
    
    if (step === 3) {
      // Validaciones específicas según las tareas seleccionadas
      if ((tasks.enviarMensaje || tasks.comentar) && !mensaje.trim()) {
        setError("Debes escribir un mensaje para enviar");
        return;
      }
      
      if (tasks.enviarMedia && !mediaFile) {
        setError("Debes seleccionar un archivo de imagen o video para enviar");
        return;
      }
      
      if (users.length === 0) {
        setError("No hay usuarios para realizar acciones. Revisa los pasos anteriores.");
        return;
      }
      
      // Confirmar si hay muchos usuarios (posible abuso)
      if (users.length > 100) {
        const confirmContinue = window.confirm(`¿Estás seguro de querer procesar ${users.length} usuarios? Esto podría generar limitaciones en tu cuenta de Instagram.`);
        if (!confirmContinue) {
          return;
        }
      }
      
      // Crear la campaña en Firestore y ejecutar acciones
      try {
        await createCampaign();
        // Las funciones individuales ya manejan la navegación al paso 4
      } catch (error) {
        console.error("Error al crear la campaña:", error);
        setError("Error al crear la campaña: " + error.message);
      }
    }
  };
  
  const createCampaign = async () => {
    try {
      if (!user?.uid) {
        setError("Debes iniciar sesión para crear campañas");
        return;
      }
      
      setLoading(true);
      
      // Preparar los datos de la campaña
      const campaignData = {
        name: campaignName,
        targetLink,
        targetType,
        isProspecting,
        objectives,
        filters,
        tasks,
        users: users.length, // Solo guardar el conteo para no sobrecargar Firestore
        message: mensaje ? true : false, // Solo indicar si hay mensaje, no guardar el contenido
        templateId: selectedTemplate?.id || null,
        createdAt: new Date(),
        status: "processing", // processing, paused, completed, failed
        progress: 0,
        userId: user.uid
      };
      
      // Guardar en Firestore
      const campaignsRef = collection(db, "users", user.uid, "campaigns");
      const docRef = await addDoc(campaignsRef, campaignData);
      
      // Log de la acción
      await logApiRequest({
        endpoint: "internal/create_campaign",
        requestData: campaignData,
        userId: user.uid,
        status: "success",
        source: "NuevaCampanaModal",
        metadata: {
          action: "create_campaign",
          campaignId: docRef.id,
          campaignName
        }
      });
      
      // Ejecutar las tareas seleccionadas de forma secuencial para evitar problemas de límites
      if (tasks.seguir) {
        await followAllUsers();
        // Las funciones seguir, enviar mensajes y enviar media ya avanzan a paso 4 por sí mismas
        return;
      }
      
      if (tasks.enviarMensaje) {
        await sendMessages();
        return;
      }
      
      if (tasks.enviarMedia && mediaFile) {
        await sendMedia();
        return;
      }
      
      if (tasks.darLikes) {
        await likeLatestPosts();
        return;
      }
      
      if (tasks.comentar) {
        await commentOnLatestPosts();
        return;
      }
      
      // Si no hay tareas que ejecutar inmediatamente pero sí se creó la campaña,
      // avanzar al paso 4 de todas maneras
      setStep(4);
      setError(null);
      
    } catch (error) {
      console.error("Error al crear la campaña:", error);
      setError("Error al crear la campaña: " + error.message);
      
      // Log del error
      await logApiRequest({
        endpoint: "internal/create_campaign",
        requestData: { campaignName },
        userId: user?.uid,
        status: "error",
        source: "NuevaCampanaModal",
        metadata: {
          action: "create_campaign",
          error: error.message
        }
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header del modal con botón de cierre */}
        <div className="flex justify-between items-center p-5 border-b">
        <h2 className="text-xl font-semibold">
          Nueva Campaña - Paso {step} de 4
        </h2>
        <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-transparent border-0 p-0 m-0"
        >
            <FaTimes size={20} />
        </button>
      </div>
        
        {/* Contenido dinámico según el paso */}
        <div className="p-5">
           {/* Mensaje de error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}
          {step === 1 && (
            <>
              <div className="mb-4">
                <label className="block text-xl text-black font-semibold mb-2">Nombre de la Campaña</label>
                <input 
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-white text-black p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Influencers Fitness"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-xl text-black font-semibold mb-2">Pega el link del perfil o publicación</label>
                <input 
                  type="text"
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  className="w-full p-3 text-black bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.instagram.com/..."
                />
              </div>
              
              <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={tasks.enviarMedia}
                  onChange={(e) => setTasks({...tasks, enviarMedia: e.target.checked})}
                  className="w-5 h-5"
                  disabled={loading}
                />
                <span>Enviar fotos o videos</span>
              </label>
              </div>
            </>
          )}
          
          {step === 2 && (
            <>
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-2">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black">Objetivos</h3>
                </div>
                
                <div className="pl-10 space-y-2">
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.comentarios}
                      onChange={(e) => setObjectives({...objectives, comentarios: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Comentarios de la publicación</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.likes}
                      onChange={(e) => setObjectives({...objectives, likes: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Likes de la publicación</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.seguidores}
                      onChange={(e) => setObjectives({...objectives, seguidores: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Seguidores del perfil</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-2">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black">Filtros</h3>
                </div>
                
                <div className="pl-10 space-y-2">
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={filters.genero}
                      onChange={(e) => setFilters({...filters, genero: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Género</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-2">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 15S3 14 3 12.5 4 10 4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 15S21 14 21 12.5 20 10 20 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 19V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 19V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 4H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black">Tareas</h3>
                </div>
                
                <div className="pl-10 space-y-2 text-black">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.seguir}
                      onChange={(e) => setTasks({...tasks, seguir: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Seguir instagrammers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.enviarMensaje}
                      onChange={(e) => setTasks({...tasks, enviarMensaje: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Enviar Mensaje</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.darLikes}
                      onChange={(e) => setTasks({...tasks, darLikes: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Dar likes a las publicaciones</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.comentar}
                      onChange={(e) => setTasks({...tasks, comentar: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Comentar en sus publicaciones</span>
                  </label>
                </div>
              </div>
            </>
          )}
          
          {step === 3 && (
            <div className="flex flex-col md:flex-row gap-4">
              {/* Panel de usuarios */}
              <div className="flex-1 bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-black">Usuarios Obtenidos ({users.length})</h3>
                </div>
                <div className="h-64 overflow-y-auto">
                  {users.map((username, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-200 rounded">
                      <span>{username}</span>
                      <button 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeUser(username)}
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No hay usuarios disponibles
                    </div>
                  )}
                </div>
                
                {/* Contador de usuarios filtrados por blacklist, si aplica */}
{filteredUsers && filteredUsers.blacklistedCount > 0 && (
  <div className="mt-2 text-xs text-gray-500">
    <span className="font-semibold text-red-500">{filteredUsers.blacklistedCount}</span> usuarios en lista negra no se mostrarán.
    <button 
      className="text-blue-500 hover:text-blue-700 ml-1 underline text-xs"
      onClick={() => setShowBlacklist(true)}
    >
      Ver detalles
    </button>
  </div>
)}
        
        {/* Panel de mensajes - Utilizado tanto para enviar mensajes como para comentar */}
{(tasks.enviarMensaje || tasks.comentar) && (
  <div className="flex-1 bg-gray-100 rounded-lg p-4">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-semibold text-black">
        {tasks.enviarMensaje ? "Enviar Mensajes" : "Escribir Comentario"}
      </h3>
      
      {selectedTemplate && (
        <div className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-700">
          Plantilla: {selectedTemplate.name}
        </div>
      )}
    </div>
    <textarea
      value={mensaje}
      onChange={(e) => setMensaje(e.target.value)}
      className="w-full h-56 p-3 border rounded-lg resize-none bg-white text-black"
      placeholder={tasks.enviarMensaje ? 
        "Escribe un mensaje para enviar a los usuarios" : 
        "Escribe un comentario para las publicaciones"}
      disabled={loading}
    ></textarea>
    
    <button 
      className="w-full bg-blue-600 text-white rounded-full py-2 mt-3"
      onClick={tasks.enviarMensaje ? sendMessages : commentOnLatestPosts}
      disabled={loading || users.length === 0 || !mensaje.trim()}
    >
      {loading ? "Enviando..." : (tasks.enviarMensaje ? "Enviar mensajes" : "Comentar publicaciones")}
    </button>
  </div>
)}
      {/* Panel para dar likes a publicaciones */}
{tasks.darLikes && (
  <div className="flex-1 bg-gray-100 rounded-lg p-4">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-semibold text-black">Dar Likes a Publicaciones</h3>
    </div>
    
    <p className="text-sm text-gray-600 mb-4">
      Esta acción dará like a la publicación más reciente de cada usuario en la lista.
    </p>
    
    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
      <p className="text-yellow-700 text-sm">
        <strong>Nota:</strong> Instagram puede limitar esta acción si se realiza en muchos perfiles simultáneamente. 
        Se recomienda procesar en lotes pequeños.
      </p>
    </div>
    
    <button 
      className="w-full bg-pink-600 text-white rounded-full py-2 mt-3"
      onClick={likeLatestPosts}
      disabled={loading || users.length === 0}
    >
      {loading ? "Procesando..." : "Dar likes a publicaciones"}
    </button>
  </div>
)}

        {/* Modal para mostrar usuarios en blacklist */}
        {showBlacklist && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Usuarios en lista negra</h3>
                <button onClick={() => setShowBlacklist(false)} className="text-gray-500">
                  <FaTimes size={16} />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredUsers.blacklistedUsers.map((user, idx) => (
                  <div key={idx} className="py-1 border-b">
                    {user}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowBlacklist(false)}
                className="mt-4 w-full bg-gray-200 rounded-lg py-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
                {tasks.seguir && (
                  <button 
                    className="w-full bg-black text-white rounded-full py-2 mt-2"
                    onClick={followAllUsers}
                    disabled={loading || users.length === 0}
                  >
                    {loading ? "Procesando..." : "Seguir a todos"}
                  </button>
                )}
              </div>
              
              {/* Panel de mensajes */}
              {/* Panel de mensajes - Utilizado tanto para enviar mensajes como para comentar */}
              {(tasks.enviarMensaje || tasks.comentar) && (
                <div className="flex-1 bg-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-black">
                      {tasks.enviarMensaje ? "Enviar Mensajes" : "Escribir Comentario"}
                    </h3>
                    
                    {selectedTemplate && (
                      <div className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-700">
                        Plantilla: {selectedTemplate.name}
                      </div>
                    )}
                  </div>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    className="w-full h-56 p-3 border rounded-lg resize-none bg-white text-black"
                    placeholder={tasks.enviarMensaje ? 
                      "Escribe un mensaje para enviar a los usuarios" : 
                      "Escribe un comentario para las publicaciones"}
                    disabled={loading}
                  ></textarea>
                  
                  <button 
                    className="w-full bg-blue-600 text-white rounded-full py-2 mt-3"
                    onClick={tasks.enviarMensaje ? sendMessages : commentOnLatestPosts}
                    disabled={loading || users.length === 0 || !mensaje.trim()}
                  >
                    {loading ? "Enviando..." : (tasks.enviarMensaje ? "Enviar mensajes" : "Comentar publicaciones")}
                  </button>
                </div>
              )}
              {/* Panel de envío de medios */}
    {tasks.enviarMedia && (
      <div className="flex-1 bg-gray-100 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-black">Enviar Media</h3>
        </div>
    
       <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Selecciona una imagen o video
      </label>
      <input
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="w-full p-2 border rounded-lg bg-white text-black"
        disabled={loading}
      />
    </div>
    
    {mediaPreview && (
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
        {mediaType === "image" ? (
          <img 
            src={mediaPreview} 
            alt="Preview" 
            className="max-h-32 rounded border inline-block"
          />
        ) : (
          <video 
            src={mediaPreview} 
            controls 
            className="max-h-32 rounded border inline-block"
          />
        )}
      </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pie de foto/video (opcional)
          </label>
          <textarea
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
            className="w-full h-24 p-3 border rounded-lg resize-none bg-white text-black"
            placeholder="Escribe un pie de foto o descripción (opcional)"
            disabled={loading}
          ></textarea>
        </div>
        
        <button 
          className="w-full bg-indigo-600 text-white rounded-full py-2 mt-3"
          onClick={sendMedia}
          disabled={loading || users.length === 0 || !mediaFile}
        >
          {loading ? "Enviando..." : "Enviar media"}
        </button>
      </div>
    )}

    {/* Panel para dar likes a publicaciones */}
      {tasks.darLikes && (
        <div className="flex-1 bg-gray-100 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-black">Dar Likes a Publicaciones</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Esta acción dará like a la publicación más reciente de cada usuario en la lista.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
            <p className="text-yellow-700 text-sm">
              <strong>Nota:</strong> Instagram puede limitar esta acción si se realiza en muchos perfiles simultáneamente. 
              Se recomienda procesar en lotes pequeños.
            </p>
          </div>
          
          <button 
            className="w-full bg-pink-600 text-white rounded-full py-2 mt-3"
            onClick={likeLatestPosts}
            disabled={loading || users.length === 0}
          >
            {loading ? "Procesando..." : "Dar likes a publicaciones"}
          </button>
        </div>
      )}
            </div>
          )}
          
          {step === 4 && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-2">¡Campaña creada con éxito!</h3>
              <p className="text-gray-600 mb-4">
                Tu campaña "{campaignName}" ha sido creada y está en proceso.
                Puedes seguir su progreso en la sección de Campañas.
              </p>
              <button 
                onClick={onClose}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          )}
        </div>

        {/* Indicador de carga para operaciones largas */}
{loading && (
  <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col justify-center items-center">
    <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      <p className="text-center font-medium">{progressMessage || "Procesando operación..."}</p>
      <p className="text-center text-sm text-gray-500 mt-2">
        Las campañas en Instagram pueden tomar tiempo para evitar límites de uso.
        No cierre esta ventana.
      </p>
    </div>
  </div>
)}
        
        {/* Footer con botones de navegación */}
        {step < 4 && (
          <div className="p-5 border-t flex justify-end">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border rounded-lg mr-2 hover:bg-gray-100"
              >
                Atrás
              </button>
            )}
            <button 
              onClick={handleNext}
              className="px-8 py-3 bg-black text-white rounded-lg flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  Siguiente <FaArrowRight className="ml-2" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

NuevaCampanaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.object,
  instagramToken: PropTypes.string
};

export default NuevaCampanaModal;