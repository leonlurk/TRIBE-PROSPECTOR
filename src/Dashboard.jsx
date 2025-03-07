import { useEffect, useState } from "react";
import { db, auth } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FaSearch, FaPlus, FaSlidersH } from "react-icons/fa";
import ChartComponent from "./components/ChartComponent";
import ConnectInstagram from "./components/ConnectInstagram";
import NuevaSolicitudPanel from "./components/NuevaSolicitudPanel";
import ModalEditarPlantilla from './components/ModalEditarPlantilla';



const API_BASE_URL = "https://alets.com.ar";


const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedOption, setSelectedOption] = useState("Plantilla de mensajes");
  const [isLoading, setIsLoading] = useState(true);
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [showModal, setShowModal] = useState(true);  // Aquí está bien
  const [errorMessage, setErrorMessage] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("Plataformas");
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("Tipo");
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const types = [
    "Plantillas de mensajes",
    "Plantillas de comentarios"
    ];

    const openCreateTemplateModal = () => {
        setIsCreateTemplateModalOpen(true);
    };    

    const toggleTypeMenu = () => setIsTypeMenuOpen(!isTypeMenuOpen);

    const selectType = (type) => {
        setSelectedType(type);
        setIsTypeMenuOpen(false);
    };



const platforms = [
    "Todos",
    "Linkedin",
    "X",
    "Facebook",
    "Instagram",
    "Tik Tok",
    "Whatsapp",
    "Email"
];

const togglePlatformMenu = () => setIsPlatformMenuOpen(!isPlatformMenuOpen);

const selectPlatform = (platform) => {
    setSelectedPlatform(platform);
    setIsPlatformMenuOpen(false);
};


    

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        if (!currentUser) {
            navigate("/");
        } else {
            setUser(currentUser);
            setIsLoading(false);

            
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().instagramToken) {
                const token = userSnap.data().instagramToken;
                const sessionValid = await checkInstagramSession(token);
                setIsInstagramConnected(sessionValid);

                if (sessionValid) {
                    localStorage.setItem("instagram_bot_token", instagramToken);
                    setSelectedOption("Plantilla de mensajes"); // Redirigir a la pestaña correcta
                } else {
                    setSelectedOption("Conectar Instagram");
                }
            } else {
                setSelectedOption("Conectar Instagram");
            }
        }
    });

        return () => unsubscribe();
    }, [navigate, isInstagramConnected]);

    const handleTemplateOptions = (template) => {
        setSelectedTemplate(template);
    };
    
    

    const checkInstagramSession = async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/session`, {
                method: "GET",
                headers: { token },
            });

            const data = await response.json();
            return data.status === "success" && data.authenticated;
        } catch (error) {
            console.error("Error al verificar sesión de Instagram:", error);
            return false;
        }
    };

    const handleConnectInstagram = async (email, password) => {
      setErrorMessage("");
  
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);
  
      try {
          const response = await fetch(`${API_BASE_URL}/login`, {
              method: "POST",
              body: formData,
          });
  
          const data = await response.json();
  
          if (data.status === "success" && data.token) {
            localStorage.setItem("instagram_bot_token", data.token);
            setInstagramToken(data.token);  
            setIsInstagramConnected(true);
            setShowModal(false);
            setSelectedOption("Plantilla de mensajes");
        
            if (user) {
                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, {
                  instagramToken: data.token,
                  instagramUsername: data.username, 
                  instagramEmail: email,
                  linkedAt: new Date().toISOString()
              }, { merge: true });
            }
        
          } else {
              setErrorMessage(data.message || "Error al conectar con Instagram");
          }
      } catch (error) {
          setErrorMessage("Error de red o conexión con la API.");
          console.error("Error al conectar con Instagram:", error);
      }
      
  };

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-full">Cargando...</div>;
        }
        
        if (selectedOption === "Nueva solicitud") {
          if (!isInstagramConnected) {
              return (
                  <div className="p-6 bg-[#F3F2FC] min-h-screen flex justify-center items-center">
                      <p className="text-red-600 font-semibold">Debes conectar tu cuenta de Instagram para acceder a esta sección.</p>
                  </div>
              );
          }
      
          return <NuevaSolicitudPanel instagramToken={instagramToken} />;
      }

      if (selectedOption === "Seguimiento") {
        return (
            <div className="flex justify-center items-center h-full">
                <h1 className="text-3xl font-bold text-gray-500">Próximamente</h1>
            </div>
        );
    }
    

        if (selectedOption === "Conectar Instagram") {
          return (
              <ConnectInstagram
              user={user}
              onConnect={handleConnectInstagram}
              errorMessage={errorMessage}
              showModal={showModal}               // Pasa el estado
              setShowModal={setShowModal}         // Pasa la función
              instagramToken={instagramToken}
          />
          );
      }

      if (selectedOption === "Plantilla de mensajes") {
        return (
            <div className="p-6 bg-[#F3F2FC] min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-1/3">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar Plantilla"
                            className="p-4 pl-14 border border-gray-300 rounded-full w-full bg-white shadow-sm text-gray-600 focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-4">
                    <div className="relative">
                            <button
                                className="px-6 py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 hover:bg-gray-100 transition font-medium"
                                onClick={togglePlatformMenu}
                            >
                                {selectedPlatform} ▼
                            </button>

                            {isPlatformMenuOpen && (
                                <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg w-44 overflow-hidden">
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
                            className="px-6 py-3 bg-[#5468FF] text-white rounded-full shadow-sm font-semibold flex items-center gap-2 hover:bg-[#4356cc] transition"
                            onClick={openCreateTemplateModal}>
                            <FaPlus /> Crear Plantilla
                        </button>
                        <div className="relative">
    <button
        className="px-6 py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 hover:bg-gray-100 transition font-medium"
        onClick={toggleTypeMenu}
    >
        {selectedType} ▼
    </button>

    {isTypeMenuOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg w-60 overflow-hidden right-0">
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
                <div className="space-y-4">
    {[
        { name: "Bienvenida", platform: "Instagram", icon: "/assets/message.png" },
        { name: "CTA", platform: "Whatsapp", icon: "/assets/messages-2.png" },
        { name: "Videollamada", platform: "Instagram", icon: "/assets/message.png" },
        { name: "Nota de voz", platform: "Instagram", icon: "/assets/messages-2.png" },
    ].map((template, index) => (
        <div
            key={index}
            className="p-4 bg-white rounded-2xl flex justify-between items-center shadow-sm border border-gray-200 hover:shadow-md transition"
        >
            <div className="flex items-center gap-4">
                {/* Contenedor con Rectangle.png como fondo */}
                <div
                    className="w-12 h-12 flex items-center justify-center"
                    style={{ backgroundImage: 'url(/assets/Rectangle.png)', backgroundSize: 'cover' }}
                >
                    <img
                        src={template.icon}
                        alt="Message Icon"
                        className="w-8 h-8 object-contain"
                    />
                </div>
                <div>
                    <p className="font-semibold text-gray-800">{template.name}</p>
                    <p className="text-sm text-gray-500">{template.platform}</p>
                </div>
            </div>
            <button
                className="cursor-pointer flex items-center justify-center"
                style={{
                    backgroundColor: "transparent",  // Sin fondo
                    border: "none",                   // Sin borde
                    padding: 0,                        // Sin padding interno
                    margin: 0,                         // Sin margen adicional
                    lineHeight: 1                      // Ajuste fino para centrar bien el icono
                }}
                onClick={() => handleTemplateOptions(template)}
            >
                <img 
                    src="/assets/setting-5.png" 
                    alt="Opciones" 
                    className="w-11 h-11"
                />
            </button>
        </div>
    ))}
</div>


    

            </div>
        );
    }
    
        

        if (selectedOption === "Estadísticas") {
          return (
            <div className="p-6 bg-[#F3F2FC] min-h-screen">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <div className="flex justify-between items-center">
                    <h2 className="text-4xl font-bold">0</h2>
                    <FaSlidersH className="text-gray-500" />
                  </div>
                  <p className="text-gray-500">Mensajes enviados</p>
                  <div className="h-64">
                    <ChartComponent />
                  </div>
                </div>
    
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <h3 className="text-lg font-semibold">Lead Generados</h3>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
    
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <h3 className="text-lg font-semibold">Tasa de Cierre</h3>
                  <p className="text-gray-500">Promedio <span className="font-bold">0 Días</span></p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <h3 className="text-lg font-semibold">Tasa de Conversión</h3>
                  <p className="text-2xl font-bold">0%</p>
                </div>
              </div>
              <div className="flex justify-center items-center py-6">
                <h2 className="text-xl font-semibold text-gray-500">Próximamente</h2>
            </div>
            </div>
          );
        }
    
        return <div className="text-center p-10">Seleccione una opción del menú</div>;
      };
    
    
      return (
        <div className="h-screen flex bg-gray-100">
            <Sidebar selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
            <div className="flex-1 p-6 overflow-auto">
                {renderContent()}
            </div>
            {selectedTemplate && (
            <ModalEditarPlantilla
                template={selectedTemplate}
                onClose={() => setSelectedTemplate(null)}
            />
        )}

    
            {isCreateTemplateModalOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-[460px] relative">

            {/* Botón cerrar (sin fondo, solo la X) */}
            <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition p-0 w-6 h-6 flex items-center justify-center"
                onClick={() => setIsCreateTemplateModalOpen(false)}
                style={{
                    background: "transparent",     // Sin fondo
                    border: "none",                 // Sin borde
                    fontSize: "20px",                // Tamaño similar al figma
                    lineHeight: "1",                 // Sin padding extra
                    cursor: "pointer"
                }}
            >
                ✕
            </button>


            {/* Título */}
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Categoría de la plantilla</h2>

            {/* Descripción */}
            <p className="text-gray-500 mb-4">Seleccionar el tipo de plantilla</p>

            {/* Select estilizado */}
            <select className="w-full p-3 border border-gray-300 rounded-lg text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#A0B1FF]">
                <option>Seleccionar...</option>
                <option>Plantillas de mensajes</option>
                <option>Plantillas de comentarios</option>
            </select>

            {/* Botón Siguiente con azul más oscuro */}
            <button className="mt-6 w-full bg-[#A0B1FF] text-[white] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#8F9FEF] transition">
                Siguiente →
            </button>
        </div>
    </div>
)}

        </div>
        
    );
    
      
};

export default Dashboard;
