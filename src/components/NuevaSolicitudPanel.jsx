import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import SendMediaComponent from "./SendMediaComponent"; 
import logApiRequest from "../requestLogger"; // Import the logger utility
import { checkBlacklistedUsers } from "../blacklistUtils";
import { createCampaignOptions, startCampaignMonitoring } from "../campaignIntegration";
import { createCampaign, updateCampaign, ensureUserExists } from '../campaignStore';

const API_BASE_URL = "https://alets.com.ar";

const NuevaSolicitudPanel = ({ instagramToken, user, templates = [], initialTab }) => {
    const [postLink, setPostLink] = useState("");
    const [usersList, setUsersList] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: "", type: "" });
    const [whitelists, setWhitelists] = useState([]);
    const [showSaveToWhitelist, setShowSaveToWhitelist] = useState(false);
    const [selectedWhitelist, setSelectedWhitelist] = useState("");
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [filteredTemplates, setFilteredTemplates] = useState([]);
    const [templateSearchQuery, setTemplateSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState(initialTab || "message");
    
    // Nuevas variables de estado para integrar funcionalidades adicionales
    const [commentsList, setCommentsList] = useState([]);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);

    // Función para mostrar notificaciones
    const showNotification = (message, type = "info") => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: "", type: "" });
        }, 3000);
    };

    // Inicializar las plantillas filtradas con todas las plantillas
    useEffect(() => {
        setFilteredTemplates(templates);
    }, [templates]);

    // Cargar las listas blancas del usuario
    const fetchWhitelists = async () => {
        if (!user || !user.uid) return;

        try {
            // Log the fetch attempt
            await logApiRequest({
                endpoint: "internal/fetch_whitelists",
                requestData: { userId: user.uid },
                userId: user.uid,
                status: "pending",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "fetch_whitelists"
                }
            });
            
            const whitelistsRef = collection(db, "users", user.uid, "whitelists");
            const whitelistsSnapshot = await getDocs(whitelistsRef);
            const whitelistsList = whitelistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWhitelists(whitelistsList);
            
            // Log the fetch success
            await logApiRequest({
                endpoint: "internal/fetch_whitelists",
                requestData: { userId: user.uid },
                userId: user.uid,
                responseData: { count: whitelistsList.length },
                status: "success",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "fetch_whitelists",
                    whitelistCount: whitelistsList.length
                }
            });
        } catch (error) {
            console.error("Error al cargar las listas blancas:", error);
            showNotification("Error al cargar las listas para guardar", "error");
            
            // Log the fetch error
            await logApiRequest({
                endpoint: "internal/fetch_whitelists",
                requestData: { userId: user.uid },
                userId: user.uid,
                status: "error",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "fetch_whitelists",
                    error: error.message
                }
            });
        }
    };

    // Cargar las listas blancas al montar el componente
    useEffect(() => {
        if (user && user.uid) {
            fetchWhitelists();
        }
    }, [user]);

    // Funciones para filtrar plantillas en tiempo real
    const filterTemplates = (searchValue) => {
        setTemplateSearchQuery(searchValue);
        if (!searchValue.trim()) {
            setFilteredTemplates(templates);
            return;
        }
        
        const filtered = templates.filter(template => 
            template.name.toLowerCase().includes(searchValue.toLowerCase()) || 
            template.body.toLowerCase().includes(searchValue.toLowerCase()) ||
            template.platform.toLowerCase().includes(searchValue.toLowerCase())
        );
        
        setFilteredTemplates(filtered);
        
        // Log the search action
        if (user) {
            logApiRequest({
                endpoint: "internal/search_templates",
                requestData: { searchQuery: searchValue },
                userId: user.uid,
                status: "success",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "search_templates",
                    searchQuery: searchValue,
                    resultsCount: filtered.length,
                    totalTemplates: templates.length
                }
            });
        }
    };

    // Función para seleccionar una plantilla y usar su contenido
    const selectAndUseTemplate = async (template) => {
        setMessage(template.body);
        setSelectedTemplate(template);
        setShowTemplateSelector(false);
        showNotification(`Plantilla "${template.name}" seleccionada`, "success");
        
        // Log template selection
        if (user) {
            await logApiRequest({
                endpoint: "internal/use_template",
                requestData: { templateId: template.id },
                userId: user.uid,
                status: "success",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "use_template",
                    templateName: template.name,
                    templateId: template.id,
                    templatePlatform: template.platform
                }
            });
        }
    };

    // Nueva función generalizada para realizar peticiones a la API (integrada del otro archivo)
    const fetchData = async (endpoint, bodyParams, setStateCallback, logAction) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: "POST",
                headers: { token: instagramToken },
                body: new URLSearchParams(bodyParams)
            });

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json();
            if (data.status === "success") {
                setStateCallback(data);
                showNotification(`Datos obtenidos exitosamente`, "success");
            } else {
                showNotification(`Error: ${data.message}`, "error");
            }

            await logApiRequest({
                endpoint,
                requestData: bodyParams,
                userId: user?.uid,
                status: data.status === "success" ? "success" : "error",
                source: "NuevaSolicitudPanel",
                metadata: { action: logAction }
            });
        } catch (error) {
            showNotification("Error al conectar con la API", "error");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Nuevas funciones integradas
    const getComments = () => {
        fetchData("get_comments", { post_url: postLink }, (data) => setCommentsList(data.comments), "get_comments");
    };

    const getFollowers = (username) => {
        fetchData("get_followers", { username, amount: 50 }, (data) => setFollowersList(data.followers), "get_followers");
    };

    const getFollowing = (username) => {
        fetchData("get_following", { username, amount: 50 }, (data) => setFollowingList(data.following), "get_following");
    };

    const likeLatestPost = (username) => {
        fetchData("like_latest_post", { username }, () => showNotification("Like enviado", "success"), "like_latest_post");
    };

    const getLikes = async () => {
        if (!postLink.trim()) {
            showNotification("Debes introducir un enlace a una publicación", "warning");
            return;
        }
        
        setLoading(true);
        setUsersList([]);
    
        try {
            // Log the get likes attempt
            if (user) {
                await logApiRequest({
                    endpoint: "/obtener_likes",
                    requestData: { link: postLink },
                    userId: user.uid,
                    status: "pending",
                    source: "NuevaSolicitudPanel",
                    metadata: {
                        action: "get_likes",
                        postLink: postLink
                    }
                });
            }
            
            const formData = new FormData();
            formData.append("link", postLink);
    
            console.log("Enviando request a obtener_likes con token:", instagramToken);
    
            const response = await fetch(`${API_BASE_URL}/obtener_likes`, {
                method: "POST",
                headers: {
                    token: instagramToken, 
                },
                body: formData,
            });
    
            console.log("Status HTTP:", response.status);
    
            // Verificar status HTTP
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
    
            let data = {};
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error("No se pudo parsear la respuesta como JSON:", jsonError);
                showNotification("Error inesperado: la respuesta del servidor no es válida.", "error");
                
                // Log the parsing error
                if (user) {
                    await logApiRequest({
                        endpoint: "/obtener_likes",
                        requestData: { link: postLink },
                        userId: user.uid,
                        status: "error",
                        source: "NuevaSolicitudPanel",
                        metadata: {
                            action: "get_likes",
                            error: "JSON parsing error",
                            postLink: postLink
                        }
                    });
                }
                
                setLoading(false);
                return;
            }
    
            console.log("Respuesta completa:", data);
            
            // Log the response
            if (user) {
                await logApiRequest({
                    endpoint: "/obtener_likes",
                    requestData: { link: postLink },
                    userId: user.uid,
                    responseData: { 
                        status: data.status,
                        likesCount: data.likes?.length || 0
                    },
                    status: data.status === "success" ? "success" : "completed",
                    source: "NuevaSolicitudPanel",
                    metadata: {
                        action: "get_likes",
                        postLink: postLink,
                        usersCount: data.likes?.length || 0
                    }
                });
            }
    
            if (data.status === "success") {
                setUsersList(data.likes);
                showNotification(`Se obtuvieron ${data.likes.length} usuarios`, "success");
            } else {
                showNotification("Error al obtener likes: " + (data.message || "Error desconocido"), "error");
            }
        } catch (error) {
            console.error("Ocurrió un error al conectar con la API:", error);
            showNotification("Error de conexión o problema de red.", "error");
            
            // Log the error
            if (user) {
                await logApiRequest({
                    endpoint: "/obtener_likes",
                    requestData: { link: postLink },
                    userId: user.uid,
                    status: "error",
                    source: "NuevaSolicitudPanel",
                    metadata: {
                        action: "get_likes",
                        error: error.message,
                        postLink: postLink
                    }
                });
            }
        } finally {
            setLoading(false);
        }
    };
    
    const followUsers = async () => {
        if (usersList.length === 0) {
          showNotification("No hay usuarios para seguir", "warning");
          return;
        }
        
        setLoading(true);
        
        // Variables para campaña
        let campaignId = null;
        let stopMonitoring = null;
        
        try {
          // Crear una campaña para esta operación
          if (user && user.uid) {
            const campaignOptions = createCampaignOptions({
              type: "follow_users",
              users: usersList,
              endpoint: "/seguir_usuarios",
              postLink: postLink
            });
            
            campaignId = await createCampaign(user.uid, campaignOptions);
            
            // Iniciar monitoreo de la campaña
            stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
              token: instagramToken
            });
          }
          
          // Log the follow users attempt (código existente - añadir campaignId)
          if (user) {
            await logApiRequest({
              endpoint: "/seguir_usuarios",
              requestData: { 
                usuarios_count: usersList.length,
                campaign_id: campaignId
              },
              userId: user.uid,
              status: "pending",
              source: "NuevaSolicitudPanel",
              metadata: {
                action: "follow_users",
                usersCount: usersList.length,
                postLink: postLink,
                campaignId: campaignId
              }
            });
          }
          
          // Verificar usuarios en blacklist (código existente)
          const filteredUsers = await checkBlacklistedUsers(usersList, user, showNotification, "NuevaSolicitudPanel");
          
          if (filteredUsers.length === 0) {
            showNotification("Todos los usuarios están en listas negras. No se siguió a ningún usuario.", "warning");
            
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
          
          // Código existente para enviar la solicitud
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
              blacklistedUsers: usersList.length - filteredUsers.length
            });
          }
          
          // Log the response (código existente - añadir campaignId)
          if (user) {
            await logApiRequest({
              endpoint: "/seguir_usuarios",
              requestData: { 
                usuarios_count: usersList.length,
                filtered_users_count: filteredUsers.length,
                campaign_id: campaignId
              },
              userId: user.uid,
              responseData: { 
                status: data.status,
                followedCount: data.followed_count || 0,
                skippedCount: data.skipped_count || 0,
                blacklistedCount: usersList.length - filteredUsers.length,
                campaignId: campaignId
              },
              status: data.status === "success" ? "success" : "completed",
              source: "NuevaSolicitudPanel",
              metadata: {
                action: "follow_users",
                usersCount: usersList.length,
                filteredUsersCount: filteredUsers.length,
                blacklistedCount: usersList.length - filteredUsers.length,
                postLink: postLink,
                followedCount: data.followed_count || 0,
                skippedCount: data.skipped_count || 0,
                campaignId: campaignId
              }
            });
          }
          
          showNotification("Seguimiento en proceso", "success");
          // Mostrar notificación adicional sobre la campaña creada
          if (campaignId) {
            showNotification("Se ha creado una campaña para seguir el progreso", "info");
          }
          console.log(data);
        } catch (error) {
          showNotification("Error al seguir usuarios", "error");
          console.error("Ocurrió un error:", error);
          
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
          
          // Log the error (código existente - añadir campaignId)
          if (user) {
            await logApiRequest({
              endpoint: "/seguir_usuarios",
              requestData: { 
                usuarios_count: usersList.length,
                campaign_id: campaignId
              },
              userId: user.uid,
              status: "error",
              source: "NuevaSolicitudPanel",
              metadata: {
                action: "follow_users",
                error: error.message,
                usersCount: usersList.length,
                postLink: postLink,
                campaignId: campaignId
              }
            });
          }
        } finally {
          setLoading(false);
        }
      };

      const sendMessages = async () => {
        if (usersList.length === 0) {
          showNotification("No hay usuarios para enviar mensajes", "warning");
          return;
        }
        
        if (!message.trim()) {
          showNotification("El mensaje no puede estar vacío", "warning");
          return;
        }
        
        setLoading(true);
        
        // Variables para campaña
        let campaignId = null;
        let stopMonitoring = null;
        
        try {
          // Crear una campaña para esta operación
          if (user && user.uid) {
            console.log("Creando campaña para usuario:", user.uid);
            
            const campaignOptions = createCampaignOptions({
                type: "send_messages",
                users: usersList,
                endpoint: "/enviar_mensajes_multiple",
                templateName: selectedTemplate?.name || null,
                postLink: postLink
            });
            
            try {
                // Aseguramos que el documento del usuario exista antes de crear la campaña
                await ensureUserExists(user.uid);
                
                campaignId = await createCampaign(user.uid, campaignOptions);
                console.log("Campaña creada con ID:", campaignId);
                
                // Iniciar monitoreo de la campaña solo si se creó exitosamente
                if (campaignId) {
                    stopMonitoring = startCampaignMonitoring(user.uid, campaignId, {
                        token: instagramToken
                    });
                    console.log("Monitoreo de campaña iniciado");
                }
            } catch (campaignError) {
                console.error("Error al crear la campaña:", campaignError);
                // Continuar con el envío de mensajes incluso si falla la creación de la campaña
            }
        }
          
          // Log the send messages attempt (código existente)
          if (user) {
            await logApiRequest({
                endpoint: "/enviar_mensajes_multiple",
                requestData: { 
                  usuarios_count: usersList.length,
                  mensaje_length: message.length,
                  template_id: selectedTemplate ? selectedTemplate.id : null, // Usar null en lugar de undefined
                  campaign_id: campaignId || null // Asegurar que campaignId no sea undefined
                },
                userId: user.uid,
                status: "pending",
                source: "NuevaSolicitudPanel",
                metadata: {
                  action: "send_messages",
                  usersCount: usersList.length,
                  messageLength: message.length,
                  templateId: selectedTemplate ? selectedTemplate.id : null, // Asegurar que no es undefined
                  templateName: selectedTemplate ? selectedTemplate.name : null, 
                  postLink: postLink || null, // Asegurar que no es undefined
                  campaignId: campaignId || null // Asegurar que no es undefined
                }
              });
          }
          
          // Verificar usuarios en blacklist (código existente)
          const filteredUsers = await checkBlacklistedUsers(usersList, user, showNotification, "NuevaSolicitudPanel");
          
          if (filteredUsers.length === 0) {
            showNotification("Todos los usuarios están en listas negras. No se enviaron mensajes.", "warning");
            
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
          
          // Código existente para enviar la solicitud
          const response = await fetch(`${API_BASE_URL}/enviar_mensajes_multiple`, {
            method: "POST",
            headers: {
              token: instagramToken,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              usuarios: filteredUsers.join(","),
              mensaje: message
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
              blacklistedUsers: usersList.length - filteredUsers.length
            });
          }
          
          // Log the response (código existente - añadir campaignId)
          if (user) {
            await logApiRequest({
              endpoint: "/enviar_mensajes_multiple",
              requestData: { 
                usuarios_count: usersList.length,
                mensaje_length: message.length,
                template_id: selectedTemplate?.id,
                filtered_users_count: filteredUsers.length,
                campaign_id: campaignId
              },
              userId: user.uid,
              responseData: { 
                status: data.status,
                sentCount: data.sent_count || 0,
                failedCount: data.failed_count || 0,
                blacklistedCount: usersList.length - filteredUsers.length,
                campaignId: campaignId
              },
              status: data.status === "success" ? "success" : "completed",
              source: "NuevaSolicitudPanel",
              metadata: {
                action: "send_messages",
                usersCount: usersList.length,
                filteredUsersCount: filteredUsers.length,
                blacklistedCount: usersList.length - filteredUsers.length,
                messageLength: message.length,
                templateId: selectedTemplate?.id,
                templateName: selectedTemplate?.name,
                postLink: postLink,
                sentCount: data.sent_count || 0,
                failedCount: data.failed_count || 0,
                campaignId: campaignId
              }
            });
          }
          
          showNotification(`Mensajes enviados exitosamente a ${data.sent_count || 0} usuarios`, "success");
          // Mostrar notificación adicional sobre la campaña creada
          if (campaignId) {
            showNotification("Se ha creado una campaña para seguir el progreso", "info");
          }
          console.log(data);
        } catch (error) {
          showNotification("Error al enviar mensajes", "error");
          console.error("Ocurrió un error:", error);
          
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
          
          // Log the error (código existente - añadir campaignId)
          if (user) {
            await logApiRequest({
              endpoint: "/enviar_mensajes_multiple",
              requestData: { 
                usuarios_count: usersList.length,
                mensaje_length: message.length,
                template_id: selectedTemplate?.id,
                campaign_id: campaignId
              },
              userId: user.uid,
              status: "error",
              source: "NuevaSolicitudPanel",
              metadata: {
                action: "send_messages",
                error: error.message,
                usersCount: usersList.length,
                messageLength: message.length,
                templateId: selectedTemplate?.id,
                templateName: selectedTemplate?.name,
                postLink: postLink,
                campaignId: campaignId
              }
            });
          }
        } finally {
          setLoading(false);
        }
      };

    // Guardar usuarios en una lista blanca
    const saveUsersToWhitelist = async () => {
        if (!user || !user.uid) {
            showNotification("Debes iniciar sesión para guardar usuarios", "warning");
            return;
        }
        
        if (usersList.length === 0) {
            showNotification("No hay usuarios para guardar", "warning");
            return;
        }
        
        if (!selectedWhitelist) {
            showNotification("Debes seleccionar una lista", "warning");
            return;
        }
        
        setLoading(true);
        try {
            // Log the save to whitelist attempt
            await logApiRequest({
                endpoint: "internal/save_to_whitelist",
                requestData: { 
                    whitelistId: selectedWhitelist,
                    usersCount: usersList.length
                },
                userId: user.uid,
                status: "pending",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "save_to_whitelist",
                    whitelistId: selectedWhitelist,
                    usersCount: usersList.length,
                    postLink: postLink
                }
            });
            
            // Referencia a la colección de usuarios de la lista blanca
            const usersRef = collection(db, "users", user.uid, "whitelists", selectedWhitelist, "users");
            
            // Obtener usuarios existentes para evitar duplicados
            const existingUsersSnapshot = await getDocs(usersRef);
            const existingUsernames = existingUsersSnapshot.docs.map(doc => doc.data().username);
            
            // Filtrar usuarios que ya existen
            const newUsers = usersList.filter(username => !existingUsernames.includes(username));
            
            if (newUsers.length === 0) {
                showNotification("Todos los usuarios ya están en la lista", "info");
                
                // Log the all duplicates case
                await logApiRequest({
                    endpoint: "internal/save_to_whitelist",
                    requestData: { 
                        whitelistId: selectedWhitelist,
                        usersCount: usersList.length
                    },
                    userId: user.uid,
                    status: "completed",
                    source: "NuevaSolicitudPanel",
                    metadata: {
                        action: "save_to_whitelist",
                        whitelistId: selectedWhitelist,
                        usersCount: usersList.length,
                        postLink: postLink,
                        result: "all_duplicates",
                        duplicateCount: usersList.length,
                        addedCount: 0
                    }
                });
                
                setLoading(false);
                return;
            }
            
            // Añadir cada usuario a la lista blanca
            const addPromises = newUsers.map(username => 
                addDoc(usersRef, {
                    username,
                    addedAt: new Date(),
                    source: "post_likes",
                    sourceUrl: postLink
                })
            );
            
            await Promise.all(addPromises);
            
            // Actualizar contador de usuarios en la lista blanca
            const whitelistRef = doc(db, "users", user.uid, "whitelists", selectedWhitelist);
            await updateDoc(whitelistRef, {
                userCount: increment(newUsers.length)
            });
            
            // Log the save to whitelist success
            await logApiRequest({
                endpoint: "internal/save_to_whitelist",
                requestData: { 
                    whitelistId: selectedWhitelist,
                    usersCount: usersList.length
                },
                userId: user.uid,
                status: "success",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "save_to_whitelist",
                    whitelistId: selectedWhitelist,
                    usersCount: usersList.length,
                    postLink: postLink,
                    result: "success",
                    addedCount: newUsers.length,
                    duplicateCount: usersList.length - newUsers.length
                }
            });
            
            showNotification(`${newUsers.length} usuarios guardados en la lista`, "success");
            setShowSaveToWhitelist(false);
            setSelectedWhitelist("");
        } catch (error) {
            console.error("Error al guardar usuarios:", error);
            showNotification("Error al guardar usuarios", "error");
            
            // Log the save to whitelist error
            await logApiRequest({
                endpoint: "internal/save_to_whitelist",
                requestData: { 
                    whitelistId: selectedWhitelist,
                    usersCount: usersList.length
                },
                userId: user.uid,
                status: "error",
                source: "NuevaSolicitudPanel",
                metadata: {
                    action: "save_to_whitelist",
                    whitelistId: selectedWhitelist,
                    usersCount: usersList.length,
                    postLink: postLink,
                    error: error.message
                }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 min-h-screen" style={{ backgroundColor: '#FFFFFF', color: '#080018' }}>
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                    notification.type === 'success' ? 'bg-green-500' : 
                    notification.type === 'error' ? 'bg-red-500' : 
                    notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                } text-white`}>
                    {notification.message}
                </div>
            )}
            
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#080018' }}>Nueva Solicitud</h2>
    
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Pega el link de la publicación"
                    value={postLink}
                    onChange={(e) => setPostLink(e.target.value)}
                    className="w-full p-3 rounded-md border border-[#A6A6A6] bg-[#FAFAFA] text-[#393346] focus:outline-none focus:ring-1 focus:ring-[#5468FF]"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                    <button
                        onClick={getLikes}
                        disabled={loading || !postLink.trim()}
                        className="px-6 py-3 rounded-full font-semibold flex items-center"
                        style={{
                            backgroundColor: loading || !postLink.trim() ? '#A6A6A6' : '#5468FF',
                            color: '#FFFFFF',
                            cursor: loading || !postLink.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Cargando...
                            </>
                        ) : "Obtener Likes"}
                    </button>
                    <button
                        onClick={getComments}
                        disabled={loading || !postLink.trim()}
                        className="px-6 py-3 rounded-full font-semibold flex items-center"
                        style={{
                            backgroundColor: loading || !postLink.trim() ? '#A6A6A6' : '#524D5D',
                            color: '#FFFFFF',
                            cursor: loading || !postLink.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Cargando...
                            </>
                        ) : "Obtener Comentarios"}
                    </button>
                </div>
            </div>

            {/* Opciones Avanzadas */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#080018' }}>Opciones Avanzadas</h3>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="text"
                        placeholder="Ingresa nombre de usuario"
                        className="p-2 border rounded flex-grow"
                        style={{
                            backgroundColor: '#FAFAFA',
                            borderColor: '#A6A6A6',
                            color: '#393346',
                        }}
                        onBlur={(e) => getFollowers(e.target.value)}
                    />
                    <button
                        onClick={(e) => getFollowing(e.target.previousSibling.value)}
                        disabled={loading}
                        className="px-4 py-2 rounded font-medium"
                        style={{
                            backgroundColor: loading ? '#A6A6A6' : '#5468FF',
                            color: '#FFFFFF',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Obtener Seguidos
                    </button>
                    <button
                        onClick={(e) => likeLatestPost(e.target.previousSibling.previousSibling.value)}
                        disabled={loading}
                        className="px-4 py-2 rounded font-medium"
                        style={{
                            backgroundColor: loading ? '#A6A6A6' : '#5468FF',
                            color: '#FFFFFF',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Dar Like a Última Publicación
                    </button>
                </div>
            </div>
    
            {usersList.length > 0 && (
                <>
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-semibold" style={{ color: '#080018' }}>
                                Usuarios obtenidos ({usersList.length})
                            </h3>
                            <button
                                onClick={() => {
                                    fetchWhitelists();
                                    setShowSaveToWhitelist(true);
                                    
                                    // Log the open whitelist panel action
                                    if (user) {
                                        logApiRequest({
                                            endpoint: "internal/open_save_to_whitelist",
                                            requestData: { 
                                                usersCount: usersList.length 
                                            },
                                            userId: user.uid,
                                            status: "success",
                                            source: "NuevaSolicitudPanel",
                                            metadata: {
                                                action: "open_save_to_whitelist_panel",
                                                usersCount: usersList.length,
                                                postLink: postLink
                                            }
                                        });
                                    }
                                }}
                                className="text-[#5468FF] hover:underline"
                                disabled={loading}
                            >
                                Guardar en Whitelist
                            </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto p-2 border rounded-md"
                            style={{
                                backgroundColor: '#F5F5F5',
                                borderColor: '#A6A6A6',
                                color: '#393346'
                            }}
                        >
                            {usersList.map(user => (
                                <p key={user} className="text-sm">{user}</p>
                            ))}
                        </div>
                    </div>
    
                    <div className="flex space-x-4 mt-4">
                        <button
                            onClick={followUsers}
                            disabled={loading}
                            className="px-6 py-3 rounded-full font-semibold flex items-center"
                            style={{
                                backgroundColor: loading ? '#A6A6A6' : '#524D5D',
                                color: '#FFFFFF',
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Siguiendo...
                                </>
                            ) : "Seguir Usuarios"}
                        </button>
                    </div>
                    
                    {/* Pestañas para Mensaje y Media */}
                    <div className="mt-6 border-b border-gray-200">
                        <ul className="flex -mb-px">
                            <li className="mr-2">
                                <button
                                    className={`inline-block py-3 px-5 border-b-2 font-medium text-sm ${
                                        activeTab === 'message' 
                                            ? 'border-[#5468FF] text-[#5468FF]' 
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                    onClick={() => {
                                        setActiveTab('message');
                                        
                                        // Log the tab change
                                        if (user) {
                                            logApiRequest({
                                                endpoint: "internal/switch_tab",
                                                requestData: { tab: "message" },
                                                userId: user.uid,
                                                status: "success",
                                                source: "NuevaSolicitudPanel",
                                                metadata: {
                                                    action: "switch_tab",
                                                    previousTab: activeTab,
                                                    newTab: "message"
                                                }
                                            });
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    Enviar Mensaje
                                </button>
                            </li>
                            <li className="mr-2">
                                <button
                                    className={`inline-block py-3 px-5 border-b-2 font-medium text-sm ${
                                        activeTab === 'media' 
                                            ? 'border-[#5468FF] text-[#5468FF]' 
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                    onClick={() => {
                                        setActiveTab('media');
                                        
                                        // Log the tab change
                                        if (user) {
                                            logApiRequest({
                                                endpoint: "internal/switch_tab",
                                                requestData: { tab: "media" },
                                                userId: user.uid,
                                                status: "success",
                                                source: "NuevaSolicitudPanel",
                                                metadata: {
                                                    action: "switch_tab",
                                                    previousTab: activeTab,
                                                    newTab: "media"
                                                }
                                            });
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    Enviar Media
                                </button>
                            </li>
                        </ul>
                    </div>

                    {activeTab === 'message' ? (
                        <div className="mt-4">
                            <div className="relative">
                                <textarea
                                    placeholder="Escribe un mensaje para enviar"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full p-3 rounded-md border border-[#A6A6A6] bg-[#FAFAFA] text-[#393346] focus:outline-none focus:ring-1 focus:ring-[#5468FF]"
                                    rows="5"
                                />
                                <div className="flex justify-between items-center mt-2">
                                    {selectedTemplate && (
                                        <div className="text-sm text-gray-500">
                                            Plantilla: <span className="font-medium">{selectedTemplate.name}</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setShowTemplateSelector(true);
                                            
                                            // Log the template selector open action
                                            if (user) {
                                                logApiRequest({
                                                    endpoint: "internal/open_template_selector",
                                                    requestData: {},
                                                    userId: user.uid,
                                                    status: "success",
                                                    source: "NuevaSolicitudPanel",
                                                    metadata: {
                                                        action: "open_template_selector",
                                                        templatesCount: templates.length
                                                    }
                                                });
                                            }
                                        }}
                                        className="ml-auto px-4 py-2 bg-[#8998F1] text-white rounded-lg flex items-center gap-2"
                                        disabled={loading}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                        Usar plantilla
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={sendMessages}
                                disabled={loading || !message.trim()}
                                className="mt-4 px-6 py-3 rounded-full font-semibold flex items-center"
                                style={{
                                    backgroundColor: loading || !message.trim() ? '#A6A6A6' : '#6B6674',
                                    color: '#FFFFFF',
                                    cursor: loading || !message.trim() ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Enviando...
                                    </>
                                ) : "Enviar Mensajes"}
                            </button>
                        </div>
                    ) : (
                        // Componente de enviar media
                        <SendMediaComponent 
                            instagramToken={instagramToken}
                            usersList={usersList}
                            showNotification={showNotification}
                            loading={loading}
                            setLoading={setLoading}
                            user={user} // Pass user to the component
                        />
                    )}
                </>
            )}

            {/* Secciones para mostrar los resultados de las nuevas funcionalidades */}
            {commentsList.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-2" style={{ color: '#080018' }}>
                        Comentarios ({commentsList.length})
                    </h3>
                    <div className="max-h-60 overflow-y-auto p-2 border rounded-md bg-gray-50">
                        {commentsList.map((comment, index) => (
                            <div key={index} className="p-2 border-b last:border-b-0">
                                <div className="flex justify-between">
                                    <span className="font-medium">{comment.user}</span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(comment.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm mt-1">{comment.text}</p>
                                <div className="text-xs text-gray-500 mt-1">
                                    Likes: {comment.like_count} · ID: {comment.comment_id?.substring(0, 8)}...
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {followersList.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-2" style={{ color: '#080018' }}>
                        Seguidores ({followersList.length})
                    </h3>
                    <div className="max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50">
                        {followersList.map((follower, index) => (
                            <p key={index} className="text-sm">{follower}</p>
                        ))}
                    </div>
                </div>
            )}

            {followingList.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-2" style={{ color: '#080018' }}>
                        Seguidos ({followingList.length})
                    </h3>
                    <div className="max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50">
                        {followingList.map((following, index) => (
                            <p key={index} className="text-sm">{following}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal para guardar en whitelist */}
            {showSaveToWhitelist && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[400px] shadow-md">
                        <h2 className="text-lg font-semibold text-black mb-4">Guardar en Lista Blanca</h2>
                        
                        {whitelists.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-gray-600 mb-3">No tienes listas blancas creadas.</p>
                                <button
                                    onClick={() => {
                                        setShowSaveToWhitelist(false);
                                        // Redireccionar a la sección de seguimiento
                                        
                                        // Log the redirect action
                                        if (user) {
                                            logApiRequest({
                                                endpoint: "internal/close_save_to_whitelist",
                                                requestData: { 
                                                    reason: "no_whitelists" 
                                                },
                                                userId: user.uid,
                                                status: "success",
                                                source: "NuevaSolicitudPanel",
                                                metadata: {
                                                    action: "close_save_to_whitelist_panel",
                                                    reason: "no_whitelists"
                                                }
                                            });
                                        }
                                    }}
                                    className="px-4 py-2 bg-[#5468FF] text-white rounded-md"
                                >
                                    Crear una lista
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600 mb-2">
                                    Selecciona una lista donde guardar los {usersList.length} usuarios:
                                </p>
                                <select
                                    value={selectedWhitelist}
                                    onChange={(e) => {
                                        setSelectedWhitelist(e.target.value);
                                        
                                        // Log the whitelist selection
                                        if (user && e.target.value) {
                                            const selectedList = whitelists.find(list => list.id === e.target.value);
                                            logApiRequest({
                                                endpoint: "internal/select_whitelist",
                                                requestData: { 
                                                    whitelistId: e.target.value 
                                                },
                                                userId: user.uid,
                                                status: "success",
                                                source: "NuevaSolicitudPanel",
                                                metadata: {
                                                    action: "select_whitelist",
                                                    whitelistId: e.target.value,
                                                    whitelistName: selectedList?.name,
                                                    currentUserCount: selectedList?.userCount || 0
                                                }
                                            });
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded mb-4"
                                >
                                    <option value="">Seleccionar una lista...</option>
                                    {whitelists.map(list => (
                                        <option key={list.id} value={list.id}>
                                            {list.name} ({list.userCount || 0} usuarios)
                                        </option>
                                    ))}
                                </select>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={saveUsersToWhitelist}
                                        disabled={loading || !selectedWhitelist}
                                        className={`flex-1 py-2 ${loading || !selectedWhitelist ? 'bg-gray-400' : 'bg-[#5468FF] hover:bg-[#4356cc]'} text-white rounded-md transition`}
                                    >
                                        {loading ? "Guardando..." : "Guardar Usuarios"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowSaveToWhitelist(false);
                                            
                                            // Log the close action
                                            if (user) {
                                                logApiRequest({
                                                    endpoint: "internal/close_save_to_whitelist",
                                                    requestData: { 
                                                        reason: "user_cancelled" 
                                                    },
                                                    userId: user.uid,
                                                    status: "success",
                                                    source: "NuevaSolicitudPanel",
                                                    metadata: {
                                                        action: "close_save_to_whitelist_panel",
                                                        reason: "user_cancelled"
                                                    }
                                                });
                                            }
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal para seleccionar plantilla */}
            {showTemplateSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-md">
                        <h2 className="text-lg font-semibold text-black mb-4">Seleccionar Plantilla</h2>
                        
                        {templates.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-gray-600 mb-3">No tienes plantillas creadas.</p>
                                <button
                                    onClick={() => {
                                        setShowTemplateSelector(false);
                                        
                                        // Log the close action
                                        if (user) {
                                            logApiRequest({
                                                endpoint: "internal/close_template_selector",
                                                requestData: { 
                                                    reason: "no_templates" 
                                                },
                                                userId: user.uid,
                                                status: "success",
                                                source: "NuevaSolicitudPanel",
                                                metadata: {
                                                    action: "close_template_selector",
                                                    reason: "no_templates"
                                                }
                                            });
                                        }
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                                >
                                    Cerrar
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar plantillas..."
                                        value={templateSearchQuery}
                                        onChange={(e) => filterTemplates(e.target.value)}
                                        className="w-full p-2 pl-8 border border-gray-300 rounded"
                                    />
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className="h-5 w-5 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                
                                <div className="max-h-64 overflow-y-auto mb-4">
                                    {filteredTemplates.length > 0 ? (
                                        <div className="space-y-2">
                                            {filteredTemplates.map(template => (
                                                <div 
                                                    key={template.id} 
                                                    className="p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition"
                                                    onClick={() => selectAndUseTemplate(template)}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h3 className="font-medium text-gray-800">{template.name}</h3>
                                                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">{template.platform}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-2">{template.body}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-500 py-4">No se encontraron plantillas con ese criterio de búsqueda.</p>
                                    )}
                                </div>
                                
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => {
                                            setShowTemplateSelector(false);
                                            
                                            // Log the close action
                                            if (user) {
                                                logApiRequest({
                                                    endpoint: "internal/close_template_selector",
                                                    requestData: { 
                                                        reason: "user_cancelled" 
                                                    },
                                                    userId: user.uid,
                                                    status: "success",
                                                    source: "NuevaSolicitudPanel",
                                                    metadata: {
                                                        action: "close_template_selector",
                                                        reason: "user_cancelled"
                                                    }
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// PropTypes
NuevaSolicitudPanel.propTypes = {
    instagramToken: PropTypes.string.isRequired,
    user: PropTypes.object,
    templates: PropTypes.array,
    initialTab: PropTypes.string
};

export default NuevaSolicitudPanel;