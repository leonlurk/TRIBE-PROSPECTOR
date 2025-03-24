import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { FaArrowRight, FaTimes, FaTrash } from "react-icons/fa";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import logApiRequest from "../requestLogger";
import { checkBlacklistedUsers } from "../blacklistUtils";
import { createCampaignOptions, startCampaignMonitoring } from "../campaignIntegration";
import { createCampaign, updateCampaign, ensureUserExists } from '../campaignStore';

const API_BASE_URL = "https://alets.com.ar";

const NuevaCampanaModal = ({ isOpen, onClose, user, instagramToken }) => {
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [targetLink, setTargetLink] = useState("");
  const [targetType, setTargetType] = useState("publicacion"); // "perfil" o "publicacion"
  const [isProspecting, setIsProspecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  
  // Para el paso 2 - Objetivos y filtros
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
    comentar: false
  });
  
  // Para el paso 3 - Usuarios y mensajes
  const [users, setUsers] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
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
        comentar: false
      });
      setUsers([]);
      setMensaje("");
      setSelectedTemplate(null);
      setLoading(false);
      setError("");
    }
  }, [isOpen]);

  // Funciones para obtener datos de la API
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
      
      const formData = new FormData();
      formData.append("link", targetLink);
      
      console.log("Enviando request a obtener_likes con token:", instagramToken);
      
      const response = await fetch(`${API_BASE_URL}/obtener_likes`, {
        method: "POST",
        headers: {
          token: instagramToken
        },
        body: formData,
      });
      
      console.log("Status HTTP:", response.status);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      let data = {};
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("No se pudo parsear la respuesta como JSON:", jsonError);
        setError("Error inesperado: la respuesta del servidor no es válida.");
        
        // Log the parsing error
        if (user) {
          await logApiRequest({
            endpoint: "/obtener_likes",
            requestData: { link: targetLink },
            userId: user.uid,
            status: "error",
            source: "NuevaCampanaModal",
            metadata: {
              action: "get_likes",
              error: "JSON parsing error",
              postLink: targetLink
            }
          });
        }
        
        setLoading(false);
        return false;
      }
      
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
      
      const response = await fetch(`${API_BASE_URL}/get_comments`, {
        method: "POST",
        headers: {
          token: instagramToken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          post_url: targetLink
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
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
      
      const response = await fetch(`${API_BASE_URL}/get_followers`, {
        method: "POST",
        headers: {
          token: instagramToken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          username,
          amount: 50
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
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
  
  const followAllUsers = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para seguir");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Variables para campaña
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
      // Crear una campaña para esta operación
      if (user && user.uid) {
        const campaignOptions = createCampaignOptions({
          type: "follow_users",
          users: users,
          endpoint: "/seguir_usuarios",
          postLink: targetLink
        });
        
        campaignId = await createCampaign(user.uid, campaignOptions);
        
        // Iniciar monitoreo de la campaña
        stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
          token: instagramToken
        });
      }
      
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
      
      // Verificar usuarios en blacklist
      const filteredUsers = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
      
      if (filteredUsers.length === 0) {
        setError("Todos los usuarios están en listas negras. No se siguió a ningún usuario.");
        
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
      
      // Enviar la solicitud
      const response = await fetch(`${API_BASE_URL}/seguir_usuarios`, {
        method: "POST",
        headers: {
          token: instagramToken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          usuarios: filteredUsers.join(",")
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Actualizar campaña con información inicial
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 10, // Inicio del proceso
          initialResponse: data,
          filteredUsers: filteredUsers.length,
          blacklistedUsers: users.length - filteredUsers.length
        });
      }
      
      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/seguir_usuarios",
          requestData: { 
            usuarios_count: users.length,
            filtered_users_count: filteredUsers.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: data.status,
            followedCount: data.followed_count || 0,
            skippedCount: data.skipped_count || 0,
            blacklistedCount: users.length - filteredUsers.length,
            campaignId: campaignId
          },
          status: data.status === "success" ? "success" : "completed",
          source: "NuevaCampanaModal",
          metadata: {
            action: "follow_users",
            usersCount: users.length,
            filteredUsersCount: filteredUsers.length,
            blacklistedCount: users.length - filteredUsers.length,
            postLink: targetLink,
            followedCount: data.followed_count || 0,
            skippedCount: data.skipped_count || 0,
            campaignId: campaignId
          }
        });
      }
      
      // En lugar de showNotification, actualizamos el estado del modal
      setError(null);
      alert("Seguimiento en proceso. Se ha creado una campaña para seguir el progreso.");
      
    } catch (error) {
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
  
  const sendMessages = async () => {
    if (users.length === 0) {
      setError("No hay usuarios para enviar mensajes");
      return;
    }
    
    if (!mensaje.trim()) {
      setError("El mensaje no puede estar vacío");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Variables para campaña
    let campaignId = null;
    let stopMonitoring = null;
    
    try {
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
          
          campaignId = await createCampaign(user.uid, campaignOptions);
          
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
      
      // Verificar usuarios en blacklist
      const filteredUsers = await checkBlacklistedUsers(users, user, (msg, type) => setError(msg), "NuevaCampanaModal");
      
      if (filteredUsers.length === 0) {
        setError("Todos los usuarios están en listas negras. No se enviaron mensajes.");
        
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
      
      // Enviar la solicitud
      const response = await fetch(`${API_BASE_URL}/enviar_mensajes_multiple`, {
        method: "POST",
        headers: {
          token: instagramToken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          usuarios: filteredUsers.join(","),
          mensaje: mensaje
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Actualizar campaña con información inicial
      if (campaignId) {
        await updateCampaign(user.uid, campaignId, {
          progress: 10, // Inicio del proceso
          initialResponse: data,
          filteredUsers: filteredUsers.length,
          blacklistedUsers: users.length - filteredUsers.length
        });
      }
      
      // Log the response
      if (user) {
        await logApiRequest({
          endpoint: "/enviar_mensajes_multiple",
          requestData: { 
            usuarios_count: users.length,
            mensaje_length: mensaje.length,
            template_id: selectedTemplate?.id,
            filtered_users_count: filteredUsers.length,
            campaign_id: campaignId
          },
          userId: user.uid,
          responseData: { 
            status: data.status,
            sentCount: data.sent_count || 0,
            failedCount: data.failed_count || 0,
            blacklistedCount: users.length - filteredUsers.length,
            campaignId: campaignId
          },
          status: data.status === "success" ? "success" : "completed",
          source: "NuevaCampanaModal",
          metadata: {
            action: "send_messages",
            usersCount: users.length,
            filteredUsersCount: filteredUsers.length,
            blacklistedCount: users.length - filteredUsers.length,
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
      
      setError(null);
      alert(`Mensajes enviados exitosamente a ${data.sent_count || 0} usuarios`);
      
      // Avanzar al paso 4 (éxito) si todo va bien
      setStep(4);
      
    } catch (error) {
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
      
      // Obtener usuarios según los objetivos seleccionados
      let success = false;
      
      if (objectives.likes) {
        success = await getLikesFromPost();
      } else if (objectives.comentarios) {
        success = await getCommentsFromPost();
      } else if (objectives.seguidores) {
        success = await getFollowersFromProfile();
      }
      
      if (success && users.length > 0) {
        setStep(step + 1);
      } else if (users.length === 0) {
        setError("No se pudieron obtener usuarios para la campaña");
      }
      
      return;
    }
    
    if (step === 3) {
      // Aquí iría la lógica para completar la campaña
      if (tasks.enviarMensaje && !mensaje.trim()) {
        setError("Debes escribir un mensaje para enviar");
        return;
      }
      
      // Crear la campaña en Firestore
      createCampaign();
      
      // Si todo va bien, avanzar al paso 4 (se hace en sendMessages o createCampaign)
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
        users,
        message: mensaje,
        templateId: selectedTemplate?.id || null,
        createdAt: new Date(),
        status: "processing", // processing, paused, completed, failed
        progress: 0,
        userId: user.uid
      };
      
      // Si la tarea es enviar mensaje, ejecutar esa acción
      if (tasks.enviarMensaje) {
        await sendMessages();
        // La función sendMessages se encarga de avanzar al paso 4 si tiene éxito
      }
      // Si la tarea es seguir usuarios, ejecutar esa acción
      else if (tasks.seguir) {
        await followAllUsers();
        // Avanzar al paso 4
        setStep(4);
      }
      // Para otras tareas o si no hay tareas específicas, solo guardar la campaña
      else {
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
        
        // Avanzar al paso 4
        setStep(4);
      }
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
  
  // Función para eliminar un usuario de la lista
  const removeUser = (username) => {
    setUsers(users.filter(user => user !== username));
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
        
        <div className="p-5">
          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Paso 1: Configuración inicial */}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
              
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={isProspecting}
                    onChange={(e) => setIsProspecting(e.target.checked)}
                    className="w-5 h-5"
                    disabled={loading}
                  />
                  <span className="text-lg text-black">Prospectar lista de seguimiento</span>
                </label>
              </div>
            </>
          )}
          
          {/* Paso 2: Objetivos y filtros */}
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
                      disabled={loading}
                    />
                    <span>Comentarios de la publicación</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.likes}
                      onChange={(e) => setObjectives({...objectives, likes: e.target.checked})}
                      className="w-5 h-5"
                      disabled={loading}
                    />
                    <span>Likes de la publicación</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.seguidores}
                      onChange={(e) => setObjectives({...objectives, seguidores: e.target.checked})}
                      className="w-5 h-5"
                      disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
                    />
                    <span>Seguir instagrammers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.enviarMensaje}
                      onChange={(e) => setTasks({...tasks, enviarMensaje: e.target.checked})}
                      className="w-5 h-5"
                      disabled={loading}
                    />
                    <span>Enviar Mensaje</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.darLikes}
                      onChange={(e) => setTasks({...tasks, darLikes: e.target.checked})}
                      className="w-5 h-5"
                      disabled={loading}
                    />
                    <span>Dar likes a las publicaciones</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.comentar}
                      onChange={(e) => setTasks({...tasks, comentar: e.target.checked})}
                      className="w-5 h-5"
                      disabled={loading}
                    />
                    <span>Comentar en sus publicaciones</span>
                  </label>
                </div>
              </div>
            </>
          )}
          
          {/* Paso 3: Usuarios y mensajes */}
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
              {tasks.enviarMensaje && (
                <div className="flex-1 bg-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-black">Enviar Mensajes</h3>
                    
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
                    placeholder="Escribe un mensaje para enviar a los usuarios"
                    disabled={loading}
                  ></textarea>
                  
                  <button 
                    className="w-full bg-blue-600 text-white rounded-full py-2 mt-3"
                    onClick={sendMessages}
                    disabled={loading || users.length === 0 || !mensaje.trim()}
                  >
                    {loading ? "Enviando..." : "Enviar mensajes"}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Paso 4: Confirmación de éxito */}
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
                disabled={loading}
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