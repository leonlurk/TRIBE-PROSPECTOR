import { useEffect, useState, useCallback } from "react";
import { db, auth } from "./firebaseConfig";
import { collection, addDoc, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FaSearch, FaPlus, FaSlidersH, FaBars } from "react-icons/fa";
import ChartComponent from "./components/ChartComponent";
import ConnectInstagram from "./components/ConnectInstagram";
import NuevaSolicitudPanel from "./components/NuevaSolicitudPanel";
import ModalEditarPlantilla from './components/ModalEditarPlantilla';
import WhitelistPanel from './components/WhitelistPanel';


const API_BASE_URL = "https://alets.com.ar";

// Función para generar un ID de dispositivo aleatorio para simular un cliente legítimo
const generateRandomDeviceId = () => {
  return 'android-' + Math.random().toString(36).substring(2, 15);
};

// Función para introducir retrasos aleatorios para simular comportamiento humano
const randomDelay = async (min = 800, max = 2500) => {
  const delay = Math.floor(Math.random() * (max - min) + min);
  return new Promise(resolve => setTimeout(resolve, delay));
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedOption, setSelectedOption] = useState("Plantilla de mensajes");
  const [isLoading, setIsLoading] = useState(true);
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [showModal, setShowModal] = useState(false); // Cambiado a false para que no aparezca automáticamente
  const [errorMessage, setErrorMessage] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("Plataformas");
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("Tipo");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [sessionCookies, setSessionCookies] = useState(null);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false); // Nuevo estado para carga de plantillas
  const [searchQuery, setSearchQuery] = useState(""); // Estado para la búsqueda de plantillas
  const [filteredTemplates, setFilteredTemplates] = useState([]); // Estado para plantillas filtradas
  // Estado para mostrar notificaciones
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  // Estado para manejar la visibilidad del sidebar en móviles
  const [showSidebar, setShowSidebar] = useState(false);

  // Función para mostrar notificación
  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const types = [
    "Plantillas de mensajes",
    "Plantillas de comentarios"
  ];

  // Función para buscar plantillas
const searchTemplates = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredTemplates(templates);
      return;
    }
    
    const filtered = templates.filter(template => 
      template.name.toLowerCase().includes(query.toLowerCase()) || 
      template.body.toLowerCase().includes(query.toLowerCase()) ||
      template.platform.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredTemplates(filtered);
  };

  const fetchTemplates = useCallback(async (uid) => {
    try {
      setIsTemplatesLoading(true);
      const templatesRef = collection(db, "users", uid, "templates");
      const templatesSnapshot = await getDocs(templatesRef);
      const templatesList = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates(templatesList);
      setFilteredTemplates(templatesList); // Inicializar también las plantillas filtradas
      setIsTemplatesLoading(false);
    } catch (error) {
      console.error("Error al cargar plantillas:", error);
      showNotification("Error al cargar las plantillas", "error");
      setIsTemplatesLoading(false);
    }
}, []);

  // Función para filtrar plantillas por plataforma
const filterTemplatesByPlatform = (platform) => {
    setSelectedPlatform(platform);
    setIsPlatformMenuOpen(false);
    
    if (platform === "Todos") {
      setFilteredTemplates(templates);
      return;
    }
    
    const filtered = templates.filter(template => 
      template.platform.toLowerCase() === platform.toLowerCase()
    );
    
    setFilteredTemplates(filtered);
  };
  
  // Función para filtrar plantillas por tipo
  const filterTemplatesByType = (type) => {
    setSelectedType(type);
    setIsTypeMenuOpen(false);
    // Lógica adicional de filtrado si es necesario
  };

  const openCreateTemplateModal = () => {
    setIsCreateTemplateModalOpen(true);
  };

  const toggleTypeMenu = () => setIsTypeMenuOpen(!isTypeMenuOpen);

  const selectType = (type) => {
    filterTemplatesByType(type);
  };

  const platforms = [
    "Todos",
    "Instagram"
  ];

  const togglePlatformMenu = () => setIsPlatformMenuOpen(!isPlatformMenuOpen);

  const selectPlatform = (platform) => {
    filterTemplatesByPlatform(platform);
  };

  const checkInstagramSession = useCallback(async (token) => {
    try {
      await randomDelay(300, 800);
      setIsLoading(true); // Indicador de carga

      const headers = {
        token: token,
        'User-Agent': 'Instagram 219.0.0.12.117 Android',
        'Accept-Language': 'es-ES, en-US',
      };

      if (sessionCookies) {
        headers['Cookie'] = sessionCookies;
      }

      const response = await fetch(`${API_BASE_URL}/session`, {
        method: "GET",
        headers: headers,
      });

      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Si hay cookies en la respuesta, guárdalas
      if (data.cookies) {
        localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
        setSessionCookies(data.cookies);
      }
      
      return data.status === "success" && data.authenticated;
    } catch (error) {
      console.error("Error al verificar sesión de Instagram:", error);
      showNotification("No se pudo verificar la sesión de Instagram", "error");
      return false;
    } finally {
      setIsLoading(false); // Quitar indicador de carga
    }
}, [sessionCookies]);

  useEffect(() => {
    // Cargar ID de dispositivo guardado o generar uno nuevo
    const savedDeviceId = localStorage.getItem("instagram_device_id");
    if (savedDeviceId) {
      setDeviceId(savedDeviceId);
    } else {
      const newDeviceId = generateRandomDeviceId();
      setDeviceId(newDeviceId);
      localStorage.setItem("instagram_device_id", newDeviceId);
    }

    // Cargar cookies de sesión si existen
    const savedCookies = localStorage.getItem("instagram_cookies");
    if (savedCookies) {
      try {
        setSessionCookies(JSON.parse(savedCookies));
      } catch (e) {
        console.error("Error al parsear cookies guardadas:", e);
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/");
      } else {
        setUser(currentUser);
        setIsLoading(false);
        fetchTemplates(currentUser.uid);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().instagramToken) {
          const token = userSnap.data().instagramToken;
          const sessionValid = await checkInstagramSession(token);
          setIsInstagramConnected(sessionValid);

          if (sessionValid) {
            setInstagramToken(token); // Usar el token de Firestore
            localStorage.setItem("instagram_bot_token", token);
            setSelectedOption("Plantilla de mensajes"); // Redirigir a la pestaña correcta
          } else {
            setSelectedOption("Conectar Instagram");
          }
        } else {
          setSelectedOption("Conectar Instagram");
        }
      }
    });

    // Cerrar el menú lateral cuando se cambia el tamaño de la ventana a desktop
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
}, [navigate, fetchTemplates, checkInstagramSession]);

  const saveTemplate = async () => {
    if (!user) {
      showNotification("Error: No hay un usuario autenticado.", "error");
      return;
    }

    // Mejorada la validación para no permitir valores de placeholder
    if (!newTemplate?.trim()) {
      showNotification("El nombre de la plantilla es obligatorio.", "error");
      return;
    }

    if (!selectedPlatform || selectedPlatform === "Plataformas") {
      showNotification("Debes seleccionar una plataforma válida.", "error");
      return;
    }

    if (!newTemplateBody?.trim()) {
      showNotification("El cuerpo del mensaje es obligatorio.", "error");
      return;
    }

    try {
      // Mostrar un indicador de carga
      setIsLoading(true);
      
      const templateRef = collection(db, "users", user.uid, "templates");
      await addDoc(templateRef, {
        name: newTemplate.trim(),
        platform: selectedPlatform.trim(),
        body: newTemplateBody.trim(),
        userId: user.uid,
        createdAt: new Date(),
        type: selectedType !== "Tipo" ? selectedType : "Plantillas de mensajes" // Valor por defecto
      });

      showNotification("Plantilla guardada con éxito", "success");

      // Limpiar los estados después de guardar
      setNewTemplate("");
      setSelectedPlatform("Plataformas");
      setNewTemplateBody("");
      setIsCreateTemplateModalOpen(false);

      // Recargar plantillas
      fetchTemplates(user.uid);
    } catch (error) {
      console.error("Error al guardar la plantilla:", error);
      showNotification("Error al guardar la plantilla", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateOptions = (template) => {
    if (!template.id) {
      showNotification("Error: La plantilla seleccionada no tiene un ID.", "error");
      return;
    }

    setSelectedTemplate({
      id: template.id,
      name: template.name || "",
      platform: template.platform || "",
      body: template.body || "",
      userId: template.userId || user?.uid || ""
    });
  };

  

  const handleConnectInstagram = async (email, password) => {
    setErrorMessage("");
    setIsLoading(true); // Indicador de carga
    
    // Retraso aleatorio para simular comportamiento humano
    await randomDelay();

    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);
    
    // Agregar información de dispositivo para parecer más legítimo
    formData.append("device_id", deviceId);
    formData.append("login_attempt_count", "1");

    try {
      const headers = {
        'User-Agent': 'Instagram 219.0.0.12.117 Android',
        'Accept-Language': 'es-ES, en-US',
        'X-IG-Device-ID': deviceId,
        'X-IG-Android-ID': deviceId,
      };

      // Agregar cookies previas si existen
      if (sessionCookies) {
        headers['Cookie'] = sessionCookies;
      }

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Respuesta de login:", data);

      // Manejar diferentes tipos de respuestas
      if (data.status === "needs_verification") {
        console.log("Se requiere verificación 2FA para:", data.username);
        showNotification("Se requiere verificación de dos factores", "info");
        return data;
      } 
      else if (data.status === "challenge_required" || data.error_type === "challenge_required") {
        console.log("Se requiere completar un desafío de seguridad");
        setErrorMessage("Instagram requiere verificación adicional. Por favor, verifica tu email o SMS e intenta de nuevo.");
        showNotification("Instagram requiere verificación adicional", "warning");
        return data;
      } 
      else if (data.status === "checkpoint_required" || data.error_type === "checkpoint_challenge_required") {
        console.log("Se requiere verificación de dispositivo");
        setErrorMessage("Instagram requiere verificación de dispositivo. Por favor, revise su email o SMS.");
        showNotification("Instagram requiere verificación de dispositivo", "warning");
        return data;
      }
      else if (data.status === "success" && data.token) {
        // Guardar toda la información de sesión
        localStorage.setItem("instagram_bot_token", data.token);
        setInstagramToken(data.token);
        
        if (data.cookies) {
          localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
          setSessionCookies(data.cookies);
        }
        
        if (data.device_id) {
          localStorage.setItem("instagram_device_id", data.device_id);
          setDeviceId(data.device_id);
        }
        
        setIsInstagramConnected(true);
        setShowModal(false);
        setSelectedOption("Plantilla de mensajes");
        showNotification("Conectado a Instagram con éxito", "success");

        if (user) {
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, {
            instagramToken: data.token,
            instagramUsername: data.username,
            instagramEmail: email,
            instagramDeviceId: data.device_id || deviceId,
            linkedAt: new Date().toISOString()
          }, { merge: true });
        }
      } 
      else if (data.status === "error" && data.message) {
        if (data.message.includes("temporarily blocked") || data.message.includes("suspicious")) {
          setErrorMessage("Esta cuenta está temporalmente bloqueada por actividad sospechosa. Verifica tu email o accede directamente a Instagram para desbloquearla.");
          showNotification("Cuenta temporalmente bloqueada", "error");
        } else {
          setErrorMessage(data.message || "Error al conectar con Instagram");
          showNotification(data.message || "Error al conectar con Instagram", "error");
        }
      }
      else {
        setErrorMessage("Error desconocido al conectar con Instagram");
        showNotification("Error desconocido al conectar con Instagram", "error");
      }

      return data;
    } catch (error) {
      setErrorMessage("Error de red o conexión con la API.");
      showNotification("Error de red o conexión con la API", "error");
      console.error("Error al conectar con Instagram:", error);
      throw error;
    } finally {
      setIsLoading(false); // Quitar indicador de carga
    }
  };

  // Método para verificar código 2FA
  const handleVerify2FA = async (username, verificationCode) => {
    setErrorMessage("");
    setIsLoading(true); // Indicador de carga
    
    // Retraso aleatorio para simular comportamiento humano
    await randomDelay();

    const formData = new FormData();
    formData.append("username", username);
    formData.append("verification_code", verificationCode);
    formData.append("device_id", deviceId);

    try {
        const headers = {
            'User-Agent': 'Instagram 219.0.0.12.117 Android',
            'Accept-Language': 'es-ES, en-US',
            'X-IG-Device-ID': deviceId,
        };

        if (sessionCookies) {
            headers['Cookie'] = sessionCookies;
        }

        const response = await fetch(`${API_BASE_URL}/verify_2fa`, {
            method: "POST",
            headers: headers,
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Respuesta de verificación 2FA:", data);

        if (data.status === "success" && data.token) {
            // Guardar toda la información de sesión
            localStorage.setItem("instagram_bot_token", data.token);
            setInstagramToken(data.token);
            
            if (data.cookies) {
                localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
                setSessionCookies(data.cookies);
            }
            
            if (data.device_id) {
                localStorage.setItem("instagram_device_id", data.device_id);
                setDeviceId(data.device_id);
            }
            
            setIsInstagramConnected(true);
            setSelectedOption("Plantilla de mensajes");
            showNotification("Verificación 2FA exitosa", "success");

            if (user) {
                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, {
                    instagramToken: data.token,
                    instagramUsername: data.username || username,
                    instagramDeviceId: data.device_id || deviceId,
                    linkedAt: new Date().toISOString()
                }, { merge: true });
            }

            return data;
        } else if (data.status === "challenge_required" || data.error_type === "challenge_required") {
            setErrorMessage("Instagram requiere verificación adicional. Por favor, verifica tu email o SMS e intenta de nuevo.");
            showNotification("Instagram requiere verificación adicional", "warning");
            throw new Error(data.message || "Se requiere verificación adicional");
        } else {
            setErrorMessage(data.message || "Error de verificación 2FA");
            showNotification(data.message || "Error de verificación 2FA", "error");
            throw new Error(data.message || "Error de verificación 2FA");
        }
    } catch (error) {
        setErrorMessage("Error durante la verificación 2FA.");
        showNotification("Error durante la verificación 2FA", "error");
        console.error("Error de verificación 2FA:", error);
        throw error;
    } finally {
        setIsLoading(false); // Quitar indicador de carga
    }
};

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>;
    }

    if (selectedOption === "Nueva solicitud") {
      if (!isInstagramConnected) {
        return (
          <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen flex justify-center items-center">
            <p className="text-red-600 font-semibold text-center">Debes conectar tu cuenta de Instagram para acceder a esta sección.</p>
          </div>
        );
      }

      return <NuevaSolicitudPanel 
      instagramToken={instagramToken} 
      user={user} 
      templates={templates} // Pasar las plantillas
    />
    }

    if (selectedOption === "Whitelist") {
      return <WhitelistPanel user={user} />;
    }

    if (selectedOption === "Conectar Instagram") {
      return (
          <ConnectInstagram
              user={user}
              onConnect={handleConnectInstagram}
              onVerify2FA={handleVerify2FA}
              errorMessage={errorMessage}
              showModal={showModal}
              setShowModal={setShowModal}
              instagramToken={instagramToken}
              deviceId={deviceId}
          />
      );
  }

    if (selectedOption === "Plantilla de mensajes") {
      return (
        <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-4">
            <div className="relative w-full md:w-1/3">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar Plantilla"
                value={searchQuery}
                onChange={(e) => searchTemplates(e.target.value)}
                className="p-3 md:p-4 pl-14 border border-gray-300 rounded-full w-full bg-white shadow-sm text-gray-600 focus:outline-none"
                />
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <div className="relative">
                <button
                  className="px-4 md:px-6 py-2 md:py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 hover:bg-gray-100 transition font-medium text-sm md:text-base w-full md:w-auto"
                  onClick={togglePlatformMenu}
                >
                  {selectedPlatform} ▼
                </button>

                {isPlatformMenuOpen && (
                  <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg w-full min-w-[10rem] overflow-hidden">
                    <ul className="text-gray-700">
                      {platforms.map((platform) => (
                        <li
                          key={platform}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => selectPlatform(platform)}
                        >
                          {platform}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                className="px-4 md:px-6 py-2 md:py-3 bg-[#5468FF] text-white rounded-full shadow-sm font-semibold flex items-center gap-2 hover:bg-[#4356cc] transition text-sm md:text-base"
                onClick={openCreateTemplateModal}>
                <FaPlus /> Crear Plantilla
              </button>
              <div className="relative">
                <button
                  className="px-4 md:px-6 py-2 md:py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 hover:bg-gray-100 transition font-medium text-sm md:text-base w-full md:w-auto"
                  onClick={toggleTypeMenu}
                >
                  {selectedType} ▼
                </button>

                {isTypeMenuOpen && (
                  <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg w-full min-w-[10rem] overflow-hidden right-0">
                    <ul className="text-gray-700">
                      {types.map((type) => (
                        <li
                          key={type}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => selectType(type)}
                        >
                          {type}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {isTemplatesLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-2">Cargando plantillas...</span>
            </div>
          ) : (
            <div className="space-y-4">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((template, index) => (
                    <div
                        key={template.id}
                        className="p-4 bg-white rounded-2xl flex justify-between items-center shadow-sm border border-gray-200 hover:shadow-md transition"
                    >
                        <div className="flex items-center gap-4">
                        <div
                            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                            style={{ backgroundImage: 'url(/assets/Rectangle.png)', backgroundSize: 'cover' }}
                        >
                            <img
                            src={index % 2 === 0 ? "/assets/message.png" : "/assets/messages-2.png"}
                            alt="Message Icon"
                            className="w-6 h-6 md:w-8 md:h-8 object-contain"
                            />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-semibold text-gray-800 truncate text-sm md:text-base">{template.name}</p>
                            <p className="text-xs md:text-sm text-gray-500 truncate">{template.platform || "Sin plataforma"}</p>
                        </div>
                        </div>
                        <button
                        className="cursor-pointer flex items-center justify-center ml-2"
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            lineHeight: 1
                        }}
                        onClick={() => handleTemplateOptions(template)}
                        >
                        <img
                            src="/assets/setting-5.png"
                            alt="Opciones"
                            className="w-9 h-9 md:w-11 md:h-11"
                        />
                        </button>
                    </div>
                    )))
                : (
                    <div className="p-4 md:p-8 bg-white rounded-2xl text-center">
                    <p className="text-gray-500">
                        {searchQuery 
                        ? "No se encontraron plantillas con esos criterios de búsqueda." 
                        : "No hay plantillas disponibles. Crea una nueva plantilla para comenzar."
                        }
                    </p>
                    </div>
                )}
                </div>
          )}
        </div>
      );
    }

    if (selectedOption === "Estadísticas") {
      return (
        <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl md:text-4xl font-bold">0</h2>
                <FaSlidersH className="text-gray-500" />
              </div>
              <p className="text-gray-500">Mensajes enviados</p>
              <div className="h-48 md:h-64">
                <ChartComponent />
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold">Lead Generados</h3>
              <p className="text-xl md:text-2xl font-bold">0</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold">Tasa de Cierre</h3>
              <p className="text-gray-500">Promedio <span className="font-bold">0 Días</span></p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold">Tasa de Conversión</h3>
              <p className="text-xl md:text-2xl font-bold">0%</p>
            </div>
          </div>
          <div className="flex justify-center items-center py-4 md:py-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-500">Próximamente</h2>
          </div>
        </div>
      );
    }

    if (selectedOption === "Send Media") {
        if (!isInstagramConnected) {
          return (
            <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen flex justify-center items-center">
              <p className="text-red-600 font-semibold text-center">Debes conectar tu cuenta de Instagram para acceder a esta sección.</p>
            </div>
          );
        }
    
        return <NuevaSolicitudPanel 
          instagramToken={instagramToken} 
          user={user} 
          templates={templates}
          initialTab="media"
        />;
      }
    

    return <div className="text-center p-6 md:p-10">Seleccione una opción del menú</div>;
  };

  // Manejador para la actualización de plantillas
  const handleTemplateUpdated = () => {
    if (user) {
      fetchTemplates(user.uid);
    }
  };

  // Toggle para mostrar/ocultar el sidebar en móviles
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-100 relative">
      {/* Sistema de notificaciones simple */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-3 md:p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 
          notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        } text-white text-sm md:text-base max-w-[90%] md:max-w-md`}>
          {notification.message}
        </div>
      )}

      {/* Botón de menú móvil */}
      <button 
        className="md:hidden fixed top-4 left-4 z-40 bg-[#5468FF] text-white p-2 rounded-full shadow-md"
        onClick={toggleSidebar}
      >
        <FaBars size={20} />
      </button>

      {/* Sidebar para móvil con overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${
        showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`} onClick={toggleSidebar}></div>

      {/* Sidebar adaptativo */}
      <div className={`fixed md:static h-screen z-40 transition-all duration-300 transform 
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:flex md:h-screen md:z-auto`}>
        <Sidebar selectedOption={selectedOption} setSelectedOption={(option) => {
          setSelectedOption(option);
          setShowSidebar(false); // Cerrar sidebar en móvil al seleccionar opción
        }} />
      </div>

      <div className="flex-1 p-2 md:p-6 overflow-auto pt-16 md:pt-6">
        {renderContent()}
      </div>

      {selectedTemplate && (
        <ModalEditarPlantilla
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onTemplateUpdated={handleTemplateUpdated}
        />
      )}

      {isCreateTemplateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 w-full max-w-[460px] relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition p-0 w-6 h-6 flex items-center justify-center"
              onClick={() => setIsCreateTemplateModalOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "20px",
                lineHeight: "1",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold text-gray-800 mb-2">Crear nueva plantilla</h2>

            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-600 bg-white focus:outline-none"
              placeholder="Nombre de la plantilla"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
            />

            {/* Selector de plataforma */}
            <select
            className="w-full p-3 mt-3 border border-gray-300 rounded-lg text-gray-600 bg-white focus:outline-none"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            >
            <option value="Plataformas" disabled>Seleccionar plataforma</option>
            {platforms.filter(p => p !== "Todos").map(platform => (
                <option key={platform} value={platform}>{platform}</option>
            ))}
            </select>

            {/* Selector de tipo de plantilla */}
            <select
            className="w-full p-3 mt-3 border border-gray-300 rounded-lg text-gray-600 bg-white focus:outline-none"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            >
            <option value="Tipo" disabled>Seleccionar tipo de plantilla</option>
            {types.map(type => (
                <option key={type} value={type}>{type}</option>
            ))}
            </select>

            {/* Cuerpo del mensaje */}
            <textarea
            className="w-full p-3 mt-3 border border-gray-300 rounded-lg text-gray-600 bg-white focus:outline-none"
            placeholder="Cuerpo del mensaje"
            rows="4"
            value={newTemplateBody}
            onChange={(e) => setNewTemplateBody(e.target.value)}
            ></textarea>

            <button
              className="mt-6 w-full bg-[#A0B1FF] text-white py-3 rounded-lg font-semibold hover:bg-[#8F9FEF] transition flex justify-center items-center"
              onClick={saveTemplate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;