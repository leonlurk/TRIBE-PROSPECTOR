import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import SendMediaComponent from "./SendMediaComponent"; // Importamos el nuevo componente

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
    const [activeTab, setActiveTab] = useState(initialTab || "message"); // Nuevo estado para controlar las pestañas

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
            const whitelistsRef = collection(db, "users", user.uid, "whitelists");
            const whitelistsSnapshot = await getDocs(whitelistsRef);
            const whitelistsList = whitelistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWhitelists(whitelistsList);
        } catch (error) {
            console.error("Error al cargar las listas blancas:", error);
            showNotification("Error al cargar las listas para guardar", "error");
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
    };

    // Función para seleccionar una plantilla y usar su contenido
    const selectAndUseTemplate = (template) => {
        setMessage(template.body);
        setSelectedTemplate(template);
        setShowTemplateSelector(false);
        showNotification(`Plantilla "${template.name}" seleccionada`, "success");
    };

    const getLikes = async () => {
        setLoading(true);
        setUsersList([]);
    
        try {
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
                setLoading(false);
                return;
            }
    
            console.log("Respuesta completa:", data);
    
            if (data.status === "success") {
                setUsersList(data.likes);
                showNotification(`Se obtuvieron ${data.likes.length} usuarios`, "success");
            } else {
                showNotification("Error al obtener likes: " + (data.message || "Error desconocido"), "error");
            }
        } catch (error) {
            console.error("Ocurrió un error al conectar con la API:", error);
            showNotification("Error de conexión o problema de red.", "error");
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
        try {
            const response = await fetch(`${API_BASE_URL}/seguir_usuarios`, {
                method: "POST",
                headers: {
                    token: instagramToken,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    usuarios: usersList.join(",")
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            showNotification("Seguimiento completado exitosamente", "success");
            console.log(data);
        } catch (error) {
            showNotification("Error al seguir usuarios", "error");
            console.error("Ocurrió un error:", error);
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
        try {
            const response = await fetch(`${API_BASE_URL}/enviar_mensajes_multiple`, {
                method: "POST",
                headers: {
                    token: instagramToken,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    usuarios: usersList.join(","),
                    mensaje: message
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            showNotification("Mensajes enviados exitosamente", "success");
            console.log(data);
        } catch (error) {
            showNotification("Error al enviar mensajes", "error");
            console.error("Ocurrió un error:", error);
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
            // Referencia a la colección de usuarios de la lista blanca
            const usersRef = collection(db, "users", user.uid, "whitelists", selectedWhitelist, "users");
            
            // Obtener usuarios existentes para evitar duplicados
            const existingUsersSnapshot = await getDocs(usersRef);
            const existingUsernames = existingUsersSnapshot.docs.map(doc => doc.data().username);
            
            // Filtrar usuarios que ya existen
            const newUsers = usersList.filter(username => !existingUsernames.includes(username));
            
            if (newUsers.length === 0) {
                showNotification("Todos los usuarios ya están en la lista", "info");
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
            
            showNotification(`${newUsers.length} usuarios guardados en la lista`, "success");
            setShowSaveToWhitelist(false);
            setSelectedWhitelist("");
        } catch (error) {
            console.error("Error al guardar usuarios:", error);
            showNotification("Error al guardar usuarios", "error");
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
                    className="w-full p-3 rounded-md border"
                    style={{
                        backgroundColor: '#FAFAFA',
                        borderColor: '#A6A6A6',
                        color: '#393346',
                    }}
                />
                <button
                    onClick={getLikes}
                    disabled={loading || !postLink.trim()}
                    className="mt-2 px-6 py-3 rounded-full font-semibold flex items-center"
                    style={{
                        backgroundColor: loading || !postLink.trim() ? '#A6A6A6' : '#393346',
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
                                    onClick={() => setActiveTab('message')}
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
                                    onClick={() => setActiveTab('media')}
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
                                    className="w-full p-3 rounded-md border"
                                    style={{
                                        backgroundColor: '#FAFAFA',
                                        borderColor: '#A6A6A6',
                                        color: '#393346',
                                    }}
                                    rows="5"
                                />
                                <div className="flex justify-between items-center mt-2">
                                    {selectedTemplate && (
                                        <div className="text-sm text-gray-500">
                                            Plantilla: <span className="font-medium">{selectedTemplate.name}</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setShowTemplateSelector(true)}
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
                        />
                    )}
                </>
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
                                    onChange={(e) => setSelectedWhitelist(e.target.value)}
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
                                        onClick={() => setShowSaveToWhitelist(false)}
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
                                    onClick={() => setShowTemplateSelector(false)}
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
                                        onClick={() => setShowTemplateSelector(false)}
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
    templates: PropTypes.array, // Nuevo prop para recibir las plantillas
    initialTab: PropTypes.string
};

export default NuevaSolicitudPanel;