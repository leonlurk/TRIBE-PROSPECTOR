import { useEffect, useState, useCallback } from "react";
import { db, auth } from "./firebaseConfig";
import { collection, addDoc, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FaSearch, FaPlus, FaSlidersH, FaBars, FaBan } from "react-icons/fa";
import ChartComponent from "./components/ChartComponent";
import ConnectInstagram from "./components/ConnectInstagram";
import NuevaSolicitudPanel from "./components/NuevaSolicitudPanel";
import ModalEditarPlantilla from "./components/ModalEditarPlantilla";
import WhitelistPanel from "./components/WhitelistPanel";
import BlacklistPanel from "./components/BlacklistPanel";
import { checkBlacklistedUsers } from "./blacklistUtils";
import { getInstagramSession, clearInstagramSession } from "./instagramSessionUtils";
import CampaignsPanel from "./components/CampaignsPanel";


const API_BASE_URL = "https://alets.com.ar";

// Genera un deviceId simulado
const generateRandomDeviceId = () => {
  return "android-" + Math.random().toString(36).substring(2, 15);
};

// Retardo aleatorio
const randomDelay = async (min = 800, max = 2500) => {
  const delay = Math.floor(Math.random() * (max - min) + min);
  return new Promise((resolve) => setTimeout(resolve, delay));
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedOption, setSelectedOption] = useState("Plantilla de mensajes");
  const [isLoading, setIsLoading] = useState(true);
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBlacklistPanel, setShowBlacklistPanel] = useState(false);
  const [showCampaignsPanel, setShowCampaignsPanel] = useState(false);

  // Notificación simple
  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const types = ["Plantillas de mensajes", "Plantillas de comentarios"];

  // Búsqueda
  const searchTemplates = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTemplates(templates);
      return;
    }
    const filtered = templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.body.toLowerCase().includes(query.toLowerCase()) ||
        template.platform.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredTemplates(filtered);
  };

  // Carga plantillas
  const fetchTemplates = useCallback(async (uid) => {
    try {
      setIsTemplatesLoading(true);
      const templatesRef = collection(db, "users", uid, "templates");
      const templatesSnapshot = await getDocs(templatesRef);
      const templatesList = templatesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTemplates(templatesList);
      setFilteredTemplates(templatesList);
      setIsTemplatesLoading(false);
    } catch (error) {
      console.error("Error al cargar plantillas:", error);
      showNotification("Error al cargar las plantillas", "error");
      setIsTemplatesLoading(false);
    }
  }, []);

  // Filtra por plataforma
  const filterTemplatesByPlatform = (platform) => {
    setSelectedPlatform(platform);
    setIsPlatformMenuOpen(false);
    if (platform === "Todos") {
      setFilteredTemplates(templates);
      return;
    }
    const filtered = templates.filter(
      (template) => template.platform?.toLowerCase() === platform.toLowerCase()
    );
    setFilteredTemplates(filtered);
  };

  // Filtra por tipo
  const filterTemplatesByType = (type) => {
    setSelectedType(type);
    setIsTypeMenuOpen(false);
  };

  const openCreateTemplateModal = () => {
    setIsCreateTemplateModalOpen(true);
  };

  const toggleTypeMenu = () => setIsTypeMenuOpen(!isTypeMenuOpen);

  const selectType = (type) => {
    filterTemplatesByType(type);
  };

  const platforms = ["Todos", "Instagram"];

  const togglePlatformMenu = () => setIsPlatformMenuOpen(!isPlatformMenuOpen);

  const selectPlatform = (platform) => {
    filterTemplatesByPlatform(platform);
  };

  // Verifica sesión
  const checkInstagramSession = useCallback(
    async (token) => {
      try {
        await randomDelay(300, 800);
        setIsLoading(true);

        const headers = {
          token: token,
          "User-Agent": "Instagram 219.0.0.12.117 Android",
          "Accept-Language": "es-ES, en-US",
        };
        if (sessionCookies) {
          headers["Cookie"] = sessionCookies;
        }

        const response = await fetch(`${API_BASE_URL}/session`, {
          method: "GET",
          headers: headers,
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

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
        setIsLoading(false);
      }
    },
    [sessionCookies]
  );

  useEffect(() => {
    // Carga deviceId
    const savedDeviceId = localStorage.getItem("instagram_device_id");
    if (savedDeviceId) {
      setDeviceId(savedDeviceId);
    } else {
      const newDeviceId = generateRandomDeviceId();
      setDeviceId(newDeviceId);
      localStorage.setItem("instagram_device_id", newDeviceId);
    }
  
    // Carga cookies del localStorage (solo para compatibilidad)
    const savedCookies = localStorage.getItem("instagram_cookies");
    if (savedCookies) {
      try {
        setSessionCookies(JSON.parse(savedCookies));
      } catch (e) {
        console.error("Error al parsear cookies guardadas:", e);
      }
    }
  
    // Suscribirse a Auth
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/");
      } else {
        setUser(currentUser);
        setIsLoading(true);
        fetchTemplates(currentUser.uid);
  
        try {
          // Obtener sesión de Instagram desde Firebase
          const instagramSession = await getInstagramSession(currentUser.uid);
          
          if (instagramSession && instagramSession.token) {
            // Restaurar localStorage desde Firebase (para compatibilidad)
            if (instagramSession.token) {
              localStorage.setItem("instagram_bot_token", instagramSession.token);
            }
            if (instagramSession.cookies) {
              localStorage.setItem(
                "instagram_cookies", 
                typeof instagramSession.cookies === 'string' 
                  ? instagramSession.cookies 
                  : JSON.stringify(instagramSession.cookies)
              );
              setSessionCookies(instagramSession.cookies);
            }
            if (instagramSession.deviceId) {
              localStorage.setItem("instagram_device_id", instagramSession.deviceId);
              setDeviceId(instagramSession.deviceId);
            }
            if (instagramSession.username) {
              localStorage.setItem("instagram_username", instagramSession.username);
            }
            
            // Verificar que la sesión sigue siendo válida
            const sessionValid = await checkInstagramSession(instagramSession.token);
            setIsInstagramConnected(sessionValid);
  
            if (sessionValid) {
              setInstagramToken(instagramSession.token);
              setSelectedOption("Plantilla de mensajes");
            } else {
              // La sesión expiró, limpiar datos
              await clearInstagramSession(currentUser.uid);
              setSelectedOption("Conectar Instagram");
            }
          } else {
            setSelectedOption("Conectar Instagram");
          }
        } catch (error) {
          console.error("Error al recuperar sesión de Instagram:", error);
          setSelectedOption("Conectar Instagram");
        } finally {
          setIsLoading(false);
        }
      }
    });
  
    // Resize listener
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(false);
      }
    };
    window.addEventListener("resize", handleResize);
  
    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, [navigate, fetchTemplates, checkInstagramSession]);

  // Guarda plantilla
  const saveTemplate = async () => {
    if (!user) {
      showNotification("Error: No hay un usuario autenticado.", "error");
      return;
    }
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
      setIsLoading(true);
      const templateRef = collection(db, "users", user.uid, "templates");
      await addDoc(templateRef, {
        name: newTemplate.trim(),
        platform: selectedPlatform.trim(),
        body: newTemplateBody.trim(),
        userId: user.uid,
        createdAt: new Date(),
        type: selectedType !== "Tipo" ? selectedType : "Plantillas de mensajes",
      });
      showNotification("Plantilla guardada con éxito", "success");
      setNewTemplate("");
      setSelectedPlatform("Plataformas");
      setNewTemplateBody("");
      setIsCreateTemplateModalOpen(false);
      fetchTemplates(user.uid);
    } catch (error) {
      console.error("Error al guardar la plantilla:", error);
      showNotification("Error al guardar la plantilla", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Maneja opciones de plantilla
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
      userId: template.userId || user?.uid || "",
    });
  };

  /**
   * Llamado cuando se completa el login en ConnectInstagram
   */
  const handleConnectInstagram = async (tokenOrEmail, maybePassword) => {
    console.log("Se conectó la cuenta de Instagram con email:", tokenOrEmail);
    
    // Verificar si ya hay un token almacenado en el localStorage
    const token = localStorage.getItem("instagram_bot_token");
    if (token && user) {
      // Actualizar estado
      setInstagramToken(token);
      setIsInstagramConnected(true);
    }
  };

  /**
   * Llamado cuando se completa la 2FA en Instagram2FAVerification
   * => Cambiamos a 'Nueva solicitud', y marcamos conectado si quieres
   */
  const handleVerify2FASuccess = (token) => {
    console.log("2FA verificada con éxito, token:", token);
    setInstagramToken(token);
    setIsInstagramConnected(true);

    // **Redirigir a 'Nueva solicitud'**:
    setSelectedOption("Nueva solicitud");
  };

  // Render principal
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (selectedOption === "Campañas") {
      return (
        <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-[#393346]">
            Campañas en Progreso
          </h2>
          <CampaignsPanel 
            user={user} 
            onRefreshStats={() => {
              // Opcional: Añade aquí lógica para actualizar estadísticas generales
            }}
          />
        </div>
      );
    }

    if (selectedOption === "Gestionar Blacklist") {
      return (
        <BlacklistPanel
          user={user}
          onClose={() => setSelectedOption("Plantilla de mensajes")}
        />
      );
    }

    if (selectedOption === "Nueva solicitud") {
      if (!isInstagramConnected) {
        return (
          <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen flex justify-center items-center">
            <p className="text-red-600 font-semibold text-center">
              Debes conectar tu cuenta de Instagram para acceder a esta sección.
            </p>
          </div>
        );
      }
      return (
        <NuevaSolicitudPanel
          instagramToken={instagramToken}
          user={user}
          templates={templates}
        />
      );
    }

    if (selectedOption === "Whitelist") {
      return <WhitelistPanel user={user} />;
    }

    if (selectedOption === "Conectar Instagram") {
      return (
        <ConnectInstagram
          user={user}
          onConnect={handleConnectInstagram}
          // Cuando el 2FA es exitoso, pasamos el token al Dashboard
          onVerify2FA={handleVerify2FASuccess}
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
    style={{ paddingLeft: '40px' }}
    className="p-3 md:p-4 border border-[#A6A6A6] rounded-full w-full bg-white shadow-sm text-[#393346] focus:outline-none focus:ring-1 focus:ring-[#5468FF]"
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
                onClick={openCreateTemplateModal}
              >
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
                        style={{
                          backgroundImage: "url(/assets/Rectangle.png)",
                          backgroundSize: "cover",
                        }}
                      >
                        <img
                          src={index % 2 === 0 ? "/assets/message.png" : "/assets/messages-2.png"}
                          alt="Message Icon"
                          className="w-6 h-6 md:w-8 md:h-8 object-contain"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-gray-800 truncate text-sm md:text-base">
                          {template.name}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                          {template.platform || "Sin plataforma"}
                        </p>
                      </div>
                    </div>
                    <button
                      className="cursor-pointer flex items-center justify-center ml-2"
                      style={{
                        backgroundColor: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        lineHeight: 1,
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
                ))
              ) : (
                <div className="p-4 md:p-8 bg-white rounded-2xl text-center">
                  <p className="text-gray-500">
                    {searchQuery
                      ? "No se encontraron plantillas con esos criterios de búsqueda."
                      : "No hay plantillas disponibles. Crea una nueva plantilla para comenzar."}
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
              <p className="text-gray-500">
                Promedio <span className="font-bold">0 Días</span>
              </p>
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
            <p className="text-red-600 font-semibold text-center">
              Debes conectar tu cuenta de Instagram para acceder a esta sección.
            </p>
          </div>
        );
      }
      return (
        <NuevaSolicitudPanel
          instagramToken={instagramToken}
          user={user}
          templates={templates}
          initialTab="media"
        />
      );
    }

    return <div className="text-center p-6 md:p-10">Seleccione una opción del menú</div>;
  };

  // Maneja la actualización de plantillas
  const handleTemplateUpdated = () => {
    if (user) {
      fetchTemplates(user.uid);
    }
  };

  // Sidebar responsive
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-100 relative">
      {/* Notificación simple */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 p-3 md:p-4 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "error"
              ? "bg-red-500"
              : notification.type === "warning"
              ? "bg-yellow-500"
              : "bg-blue-500"
          } text-white text-sm md:text-base max-w-[90%] md:max-w-md`}
        >
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

      {/* Overlay sidebar móvil */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${
          showSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleSidebar}
      ></div>

      {/* Sidebar adaptativo */}
      <div
  className={`fixed md:static h-screen z-40 transition-all duration-300 transform ${
    showSidebar ? "translate-x-0" : "-translate-x-full"
  } md:translate-x-0 md:flex md:h-screen md:z-auto`}
>
  <Sidebar
    selectedOption={selectedOption}
    setSelectedOption={(option) => {
      setSelectedOption(option);
      setShowSidebar(false);
    }}
    isInstagramConnected={isInstagramConnected}
  />
</div>

      <div className="flex-1 p-2 md:p-6 overflow-auto pt-16 md:pt-6">{renderContent()}</div>

      {/* Modal para editar plantillas */}
      {selectedTemplate && (
        <ModalEditarPlantilla
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUpdate={handleTemplateUpdated}
        />
      )}

      {/* Modal para crear nueva plantilla */}
      {isCreateTemplateModalOpen && (
  <ModalEditarPlantilla
    isCreateMode={true}
    template={{
      id: null,
      name: newTemplate,
      platform: selectedPlatform !== "Plataformas" ? selectedPlatform : "",
      body: newTemplateBody,
      userId: user?.uid || "",
      type: selectedType !== "Tipo" ? selectedType : "Plantillas de mensajes"
    }}
    onClose={() => setIsCreateTemplateModalOpen(false)}
    onUpdate={handleTemplateUpdated}
    saveTemplate={saveTemplate}
    setNewTemplate={setNewTemplate}
    setNewTemplateBody={setNewTemplateBody}
    selectedType={selectedType}
    setSelectedType={setSelectedType}
  />
)}

      {/* Panel de Blacklist (Modal) */}
      {showBlacklistPanel && (
        <BlacklistPanel
          user={user}
          onClose={() => setShowBlacklistPanel(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;