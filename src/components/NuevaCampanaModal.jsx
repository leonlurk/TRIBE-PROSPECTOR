import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { FaArrowRight, FaTimes } from "react-icons/fa";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import logApiRequest from "../requestLogger";
import { instagramApi } from "../instagramApi"; 
import { checkBlacklistedUsers } from "../blacklistUtils";
import { createCampaignOptions, startCampaignMonitoring } from "../campaignIntegration";
import { createCampaign as createCampaignStore, updateCampaign, ensureUserExists } from '../campaignStore';

// Componentes
import UsersList from './UsersList';
import MessagePanel from './MessagePanel';
import MediaPanel from './MediaPanel';
import LikesPanel from './LikesPanel';
import BlacklistModal from './BlacklistModal';
import LoadingOverlay from './LoadingOverlay';

const NuevaCampanaModal = ({ isOpen, onClose, user, instagramToken }) => {
  // Estados principales
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [targetLink, setTargetLink] = useState("");
  const [targetType, setTargetType] = useState("");
  const [isProspecting, setIsProspecting] = useState(false);
  const [users, setUsers] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para multimedia
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [mediaCaption, setMediaCaption] = useState("");
  
  // Estados para filtrado y procesamiento
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  
  // Estados para configuración de campaña
  const [objectives, setObjectives] = useState({
    comentarios: false,
    likes: false,
    seguidores: false
  });
  
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
  
  // Funciones auxiliares
  const updateProgress = (percentage, message = "") => {
    setProgress(percentage);
    if (message) setProgressMessage(message);
  };
  
  const removeUser = (username) => {
    setUsers(users.filter(user => user !== username));
  };
  
  const updateFilteredUsersState = (filteredResult) => {
    setFilteredUsers({
      original: users.length,
      filtered: filteredResult.length,
      blacklistedCount: users.length - filteredResult.length,
      blacklistedUsers: users.filter(u => !filteredResult.includes(u))
    });
  };

  const handleTaskError = async (error, campaignId, stopMonitoring, endpoint, action) => {
    updateProgress(100, `Error en la operación: ${error.message}`);
    console.error(`Error al ejecutar ${action}:`, error);
    setError(`Error en la operación: ${error.message}`);
    
    if (campaignId && user?.uid) {
      await updateCampaign(user.uid, campaignId, {
        status: "failed",
        progress: 100,
        error: error.message,
        endedAt: new Date()
      });
      
      if (stopMonitoring) stopMonitoring();
    }
    
    if (user) {
      await logApiRequest({
        endpoint: endpoint,
        requestData: { 
          usuarios_count: users.length,
          campaign_id: campaignId
        },
        userId: user.uid,
        status: "error",
        source: "NuevaCampanaModal",
        metadata: {
          action: action,
          error: error.message,
          usersCount: users.length,
          postLink: targetLink,
          campaignId: campaignId
        }
      });
    }
  };
  
  // Reset del estado cuando se abre/cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setCampaignName("");
      setTargetLink("");
      setTargetType("publicacion");
      setIsProspecting(false);
      setObjectives({ comentarios: false, likes: false, seguidores: false });
      setFilters({ genero: false });
      setTasks({
        seguir: false,
        enviarMensaje: false,
        darLikes: false,
        comentar: false,
        enviarMedia: false
      });
      setUsers([]);
      setMensaje("");
      setSelectedTemplate(null);
      setLoading(false);
      setError("");
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType("image");
      setMediaCaption("");
    }
  }, [isOpen]);
  
  // Manejadores para obtener usuarios
  const getLikesFromPost = async () => {
    if (!targetLink.trim()) {
      setError("Debes ingresar un enlace a una publicación");
      return false;
    }
    
    setLoading(true);
    setError("");
    
    try {
      if (user) {
        await logApiRequest({
          endpoint: "/obtener_likes",
          requestData: { link: targetLink },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: { action: "get_likes", postLink: targetLink }
        });
      }
      
      const data = await instagramApi.getLikes(targetLink);
      
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
      console.error("Error al conectar con la API:", error);
      setError("Error de conexión o problema de red.");
      
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
  
  const getCommentsFromPost = async () => {
    if (!targetLink.trim()) {
      setError("Debes ingresar un enlace a una publicación");
      return false;
    }
    
    setLoading(true);
    setError("");
    
    try {
      if (user) {
        await logApiRequest({
          endpoint: "/get_comments",
          requestData: { post_url: targetLink },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: { action: "get_comments", postLink: targetLink }
        });
      }
      
      const data = await instagramApi.getComments(targetLink);
      
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
  
  const getFollowersFromProfile = async () => {
    const usernameMatch = targetLink.match(/instagram\.com\/([^\/\?]+)/);
    if (!usernameMatch || !usernameMatch[1]) {
      setError("No se pudo extraer el nombre de usuario del enlace de perfil");
      return false;
    }
    
    const username = usernameMatch[1];
    setLoading(true);
    setError("");
    
    try {
      if (user) {
        await logApiRequest({
          endpoint: "/get_followers",
          requestData: { username, amount: 50 },
          userId: user.uid,
          status: "pending",
          source: "NuevaCampanaModal",
          metadata: { action: "get_followers", username, amount: 50 }
        });
      }
      
      const data = await instagramApi.getFollowers(username);
      
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
  
  // Funciones para acciones principales
  const followAllUsers = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para seguir");
      return;
    }
    
    const result = await checkBlacklistedUsers(users, user, (msg) => setError(msg), "NuevaCampanaModal");
    updateFilteredUsersState(result);
  
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se siguió a ningún usuario.");
      return;
    }
  
    setLoading(true);
    setError("");
    updateProgress(0, "Iniciando proceso de seguimiento...");
    
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      updateProgress(10, "Preparando campaña de seguimiento...");
      
      if (user?.uid) {
        const campaignOptions = createCampaignOptions({
          type: "follow_users",
          users: users,
          endpoint: "/seguir_usuarios",
          postLink: targetLink
        });
        
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        stopMonitoring = startCampaignMonitoring(user.uid, campaignId, { token: instagramToken });
      }
      
      updateProgress(20, "Registrando operación...");
      
      if (user) {
        await logApiRequest({
          endpoint: "/seguir_usuarios",
          requestData: { usuarios_count: users.length, campaign_id: campaignId },
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
      
      updateProgress(40, `Enviando solicitud para seguir a ${result.length} usuarios...`);
      const data = await instagramApi.followUsers(result);
      updateProgress(70, "Procesando resultados...");
      
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 10,
          initialResponse: data,
          filteredUsers: result.length,
          blacklistedUsers: users.length - result.length
        });
      }
      
      updateProgress(85, "Finalizando operación...");
      
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
      
      updateProgress(100, `Seguimiento de usuarios iniciado exitosamente`);
      setError(null);
      alert("Seguimiento en proceso. Se ha creado una campaña para seguir el progreso.");
      setStep(4);
      
    } catch (error) {
      handleTaskError(error, campaignId, stopMonitoring, "/seguir_usuarios", "follow_users");
    } finally {
      setLoading(false);
    }
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
    
    const result = await checkBlacklistedUsers(users, user, (msg) => setError(msg), "NuevaCampanaModal");
    updateFilteredUsersState(result);
  
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se enviaron mensajes.");
      return;
    }
    
    setLoading(true);
    setError("");
    updateProgress(0, "Iniciando envío de mensajes...");
    
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      updateProgress(10, "Preparando campaña de mensajes...");
      
      if (user?.uid) {
        const campaignOptions = createCampaignOptions({
          type: "send_messages",
          users: users,
          endpoint: "/enviar_mensajes_multiple",
          templateName: selectedTemplate?.name || null,
          postLink: targetLink
        });
        
        try {
          await ensureUserExists(user.uid);
          campaignId = await createCampaignStore(user.uid, campaignOptions);
          
          if (campaignId) {
            stopMonitoring = startCampaignMonitoring(user.uid, campaignId, { token: instagramToken });
          }
        } catch (campaignError) {
          console.error("Error al crear la campaña:", campaignError);
        }
      }
      
      updateProgress(20, "Registrando operación...");
      
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
      
      updateProgress(40, `Enviando mensajes a ${result.length} usuarios...`);
      const data = await instagramApi.sendMessages(result, mensaje, false);
      updateProgress(70, "Procesando resultados...");
      
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 80,
          initialResponse: data,
          filteredUsers: result.length,
          blacklistedUsers: users.length - result.length
        });
      }
      
      updateProgress(90, "Finalizando envío de mensajes...");
      
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
      
      updateProgress(100, `Mensajes enviados exitosamente a ${data.sent_count || 0} usuarios`);
      setError(null);
      alert(`Mensajes enviados exitosamente a ${data.sent_count || 0} usuarios`);
      setStep(4);
      
    } catch (error) {
      handleTaskError(error, campaignId, stopMonitoring, "/enviar_mensajes_multiple", "send_messages");
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
    
    const result = await checkBlacklistedUsers(users, user, (msg) => setError(msg), "NuevaCampanaModal");
    updateFilteredUsersState(result);
  
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se realizaron comentarios.");
      return;
    }
    
    setLoading(true);
    setError("");
    updateProgress(0, "Iniciando proceso de comentarios...");
    
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      updateProgress(10, "Preparando campaña de comentarios...");
      
      if (user?.uid) {
        const campaignOptions = createCampaignOptions({
          type: "comment_posts",
          users: users,
          endpoint: "/comment_latest_post",
          message: mensaje.substring(0, 50) + "...",
          postLink: targetLink
        });
        
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        stopMonitoring = startCampaignMonitoring(user.uid, campaignId, { token: instagramToken });
      }
      
      updateProgress(20, "Registrando operación...");
      
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
      
      updateProgress(40, `Preparando comentarios para ${result.length} publicaciones...`);
      
      // Simulación (implementar cuando exista el endpoint real)
      updateProgress(50, "Enviando comentarios...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateProgress(70, "Procesando resultados...");
      
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
      
      updateProgress(90, "Finalizando operación...");
      
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "completed",
          progress: 100,
          endedAt: new Date(),
          successCount: result.length,
          failedCount: 0
        });
      }
      
      updateProgress(100, `Comentarios programados para ${result.length} publicaciones`);
      setError(null);
      alert(`Se han programado comentarios para ${result.length} publicaciones`);
      setStep(4);
      
    } catch (error) {
      handleTaskError(error, campaignId, stopMonitoring, "/comment_latest_post", "comment_posts");
    } finally {
      setLoading(false);
    }
  };
  
  const likeLatestPosts = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para dar like a sus publicaciones");
      return;
    }
    
    const result = await checkBlacklistedUsers(users, user, (msg) => setError(msg), "NuevaCampanaModal");
    updateFilteredUsersState(result);
  
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se dieron likes.");
      return;
    }
    
    setLoading(true);
    setError("");
    updateProgress(0, "Iniciando proceso de likes...");
    
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      if (user?.uid) {
        const campaignOptions = createCampaignOptions({
          type: "like_posts",
          users: users,
          endpoint: "/like_latest_post",
          postLink: targetLink
        });
        
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        stopMonitoring = startCampaignMonitoring(user.uid, campaignId, { token: instagramToken });
      }
      
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
      
      // Procesar usuarios en secuencia
      let sucessCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < result.length; i++) {
        const username = result[i];
        
        try {
          if (campaignId) {
            await updateCampaign(user.uid, campaignId, {
              progress: Math.floor((i / result.length) * 100),
              currentUser: username,
              processedUsers: i,
              totalUsers: result.length
            });
          }
          
          const likeResult = await instagramApi.likeLatestPost(username);
          
          if (likeResult.status === "success") {
            sucessCount++;
          } else {
            failedCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`Error al dar like a las publicaciones de ${username}:`, error);
          failedCount++;
        }
      }
      
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          status: "completed",
          progress: 100,
          endedAt: new Date(),
          successCount: sucessCount,
          failedCount: failedCount
        });
      }
      
      if (user) {
        await logApiRequest({
          endpoint: "/like_latest_post",
          requestData: { 
            usuarios_count: users.length,
            filtered_users_count: result.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: "success",
            likedCount: sucessCount,
            failedCount: failedCount,
            blacklistedCount: users.length - result.length,
            campaignId: campaignId
          },
          status: "success",
          source: "NuevaCampanaModal",
          metadata: {
            action: "like_posts",
            usersCount: users.length,
            filteredUsersCount: result.length,
            blacklistedCount: users.length - result.length,
            postLink: targetLink,
            likedCount: sucessCount,
            failedCount: failedCount,
            campaignId: campaignId
          }
        });
      }
      
      setError(null);
      alert(`Se han procesado likes para ${sucessCount} usuarios (fallidos: ${failedCount})`);
      setStep(4);
      
    } catch (error) {
      handleTaskError(error, campaignId, stopMonitoring, "/like_latest_post", "like_posts");
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileType = file.type;
    if (fileType.startsWith('image/')) {
      setMediaType("image");
    } else if (fileType.startsWith('video/')) {
      setMediaType("video");
    } else {
      setError("Tipo de archivo no soportado. Por favor, selecciona una imagen o video.");
      return;
    }
    
    setMediaFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    setError(null);
  };
  
  const sendMedia = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para enviar medios");
      return;
    }
    
    if (!mediaFile) {
      setError("Debes seleccionar un archivo de imagen o video");
      return;
    }
  
    const result = await checkBlacklistedUsers(users, user, (msg) => setError(msg), "NuevaCampanaModal");
    updateFilteredUsersState(result);
  
    if (result.length === 0) {
      setError("Todos los usuarios están en listas negras. No se enviaron medios.");
      return;
    }
    
    setLoading(true);
    setError("");
    updateProgress(0, "Iniciando envío de medios...");
    
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      updateProgress(10, "Preparando archivo multimedia...");
      
      if (user?.uid) {
        const campaignOptions = createCampaignOptions({
          type: "send_media",
          users: users,
          endpoint: "/enviar_media",
          mediaType: mediaType,
          postLink: targetLink
        });
        
        await ensureUserExists(user.uid);
        campaignId = await createCampaignStore(user.uid, campaignOptions);
        
        if (campaignId) {
          stopMonitoring = startCampaignMonitoring(user.uid, campaignId, { token: instagramToken });
        }
      }
      
      updateProgress(20, "Registrando operación...");
      
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
      
      updateProgress(30, `Enviando ${mediaType} a ${result.length} usuarios...`);
      const data = await instagramApi.sendMedia(result, mediaFile, mediaType, mediaCaption, false);
      updateProgress(70, "Procesando resultados...");
      
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 80,
          initialResponse: data,
          filteredUsers: result.length,
          blacklistedUsers: users.length - result.length
        });
      }
      
      updateProgress(90, "Finalizando envío de medios...");
      
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
      
      updateProgress(100, `Medios enviados exitosamente a ${data.sent_count || 0} usuarios`);
      setError(null);
      alert(`Medios enviados exitosamente a ${data.sent_count || 0} usuarios`);
      setStep(4);
      
    } catch (error) {
      handleTaskError(error, campaignId, stopMonitoring, "/enviar_media", "send_media");
    } finally {
      setLoading(false);
    }
  };
  
  // Navegación y manejo de flujo
  const handleNext = async () => {
    setError("");
    
    if (step === 1) {
      if (!campaignName.trim()) {
        setError("Debes ingresar un nombre para la campaña");
        return;
      }
      if (!targetLink.trim()) {
        setError("Debes ingresar un link de perfil o publicación");
        return;
      }
      
      if (!targetLink.includes("instagram.com")) {
        setError("El enlace debe ser de Instagram");
        return;
      }
      
      setTargetType(targetLink.includes("/p/") ? "publicacion" : "perfil");
      setStep(step + 1);
      return;
    }
    
    if (step === 2) {
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
      
      if (tasks.enviarMedia && !targetLink.includes("/p/")) {
        setError("Para enviar media, debes seleccionar una publicación en el paso 1");
        return;
      }
      
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
      
      if (users.length > 100) {
        const confirmContinue = window.confirm(`¿Estás seguro de querer procesar ${users.length} usuarios? Esto podría generar limitaciones en tu cuenta de Instagram.`);
        if (!confirmContinue) {
          return;
        }
      }
      
      try {
        await createCampaign();
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
      
      const campaignData = {
        name: campaignName,
        targetLink,
        targetType,
        isProspecting,
        objectives,
        filters,
        tasks,
        users: users.length,
        message: mensaje ? true : false,
        templateId: selectedTemplate?.id || null,
        createdAt: new Date(),
        status: "processing",
        progress: 0,
        userId: user.uid
      };
      
      const campaignsRef = collection(db, "users", user.uid, "campaigns");
      const docRef = await addDoc(campaignsRef, campaignData);
      
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
      
      // Ejecutar las tareas seleccionadas secuencialmente
      if (tasks.seguir) {
        await followAllUsers();
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
      
      // Si no hay tareas que ejecutar inmediatamente
      setStep(4);
      setError(null);
      
    } catch (error) {
      console.error("Error al crear la campaña:", error);
      setError("Error al crear la campaña: " + error.message);
      
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
  
  // Render principal
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
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
          
          {/* Paso 1: Información básica */}
          {step === 1 && (
            <div>
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
            </div>
          )}
          
          {/* Paso 2: Objetivos y tareas */}
          {step === 2 && (
            <div>
              {/* Objetivos */}
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
              
              {/* Filtros */}
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
              
              {/* Tareas */}
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
            </div>
          )}
          
          {/* Paso 3: Usuarios y acciones */}
          {step === 3 && (
            <div className="flex flex-col md:flex-row gap-4">
              {/* Lista de usuarios */}
              <UsersList 
                users={users}
                removeUser={removeUser}
                filteredUsers={filteredUsers}
                setShowBlacklist={setShowBlacklist}
                followAllUsers={tasks.seguir ? followAllUsers : null}
                loading={loading}
              />
              
              {/* Panel de mensajes/comentarios */}
              {(tasks.enviarMensaje || tasks.comentar) && (
                <MessagePanel 
                  type={tasks.enviarMensaje ? "mensaje" : "comentario"}
                  mensaje={mensaje}
                  setMensaje={setMensaje}
                  selectedTemplate={selectedTemplate}
                  sendAction={tasks.enviarMensaje ? sendMessages : commentOnLatestPosts}
                  loading={loading}
                  usersCount={users.length}
                />
              )}
              
              {/* Panel de medios */}
              {tasks.enviarMedia && (
                <MediaPanel 
                  mediaFile={mediaFile}
                  mediaPreview={mediaPreview}
                  mediaType={mediaType}
                  mediaCaption={mediaCaption}
                  handleFileSelect={handleFileSelect}
                  setMediaCaption={setMediaCaption}
                  sendMedia={sendMedia}
                  loading={loading}
                  usersCount={users.length}
                />
              )}
              
              {/* Panel de likes */}
              {tasks.darLikes && (
                <LikesPanel 
                  likeLatestPosts={likeLatestPosts}
                  loading={loading}
                  usersCount={users.length}
                />
              )}
            </div>
          )}
          
          {/* Paso 4: Confirmación */}
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
      
      {/* Modales y overlays */}
      {showBlacklist && (
        <BlacklistModal 
          blacklistedUsers={filteredUsers?.blacklistedUsers || []}
          onClose={() => setShowBlacklist(false)}
        />
      )}
      
      {loading && (
        <LoadingOverlay 
          progress={progress}
          message={progressMessage}
        />
      )}
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