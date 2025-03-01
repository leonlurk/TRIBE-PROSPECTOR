import { useEffect, useState } from "react";
import { db, auth } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FaSearch, FaPlus, FaSlidersH } from "react-icons/fa";
import ChartComponent from "./components/ChartComponent";
import ConnectInstagram from "./components/ConnectInstagram";
import NuevaSolicitudPanel from "./components/NuevaSolicitudPanel";



const API_BASE_URL = "http://145.223.73.39:8006";


const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedOption, setSelectedOption] = useState("Plantilla de mensajes");
  const [isLoading, setIsLoading] = useState(true);
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [showModal, setShowModal] = useState(true);  // Aquí está bien
  const [errorMessage, setErrorMessage] = useState("");
  const [instagramToken, setInstagramToken] = useState("");

    

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        if (!currentUser) {
            navigate("/");
        } else {
            setUser(currentUser);
            setIsLoading(false);

            // 📌 Buscar el token de Instagram en Firebase
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().instagramToken) {
                const token = userSnap.data().instagramToken;
                const sessionValid = await checkInstagramSession(token);
                setIsInstagramConnected(sessionValid);

                if (sessionValid) {
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

        return () => unsubscribe();
    }, [navigate, isInstagramConnected]);

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
            setInstagramToken(data.token);  // <-- Esta línea es la clave
            setIsInstagramConnected(true);
            setShowModal(false);
            setSelectedOption("Plantilla de mensajes");
        
            if (user) {
                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, {
                  instagramToken: data.token,
                  instagramUsername: data.username,  // si la API lo devuelve
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
                        <button className="px-6 py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 hover:bg-gray-100 transition font-medium">
                            Plataformas ▼
                        </button>
                        <button className="px-6 py-3 bg-[#5468FF] text-white rounded-full shadow-sm font-semibold flex items-center gap-2 hover:bg-[#4356cc] transition">
                            <FaPlus /> Crear Plantilla
                        </button>
                        <button className="px-6 py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 hover:bg-gray-100 transition font-medium">
                            Tipo ▼
                        </button>
                    </div>
                </div>
                <div className="space-y-4">
                    {[
                        { name: "Bienvenida", platform: "Instagram" },
                        { name: "CTA", platform: "Whatsapp" },
                        { name: "Videollamada", platform: "Instagram" },
                        { name: "Nota de voz", platform: "Instagram" },
                    ].map((template, index) => (
                        <div
                            key={index}
                            className="p-4 bg-white rounded-2xl flex justify-between items-center shadow-sm border border-gray-200 hover:shadow-md transition"
                        >
                            <div className="flex items-center gap-4">
                                <span className="p-3 bg-[#C6CEFF] rounded-full text-gray-700">💬</span>
                                <div>
                                    <p className="font-semibold text-gray-800">{template.name}</p>
                                    <p className="text-sm text-gray-500">{template.platform}</p>
                                </div>
                            </div>
                            <span className="cursor-pointer text-gray-500 hover:text-gray-700 transition">⋮</span>
                        </div>
                    ))}
                </div>
    
                {/* Mostrar el token de Instagram si está disponible */}
                {instagramToken && (
                    <div className="mt-6 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-600">Token de Instagram</h3>
                        <p className="text-xs font-mono break-all text-gray-800">{instagramToken}</p>
                    </div>
                )}
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
            </div>
          );
        }
    
        return <div className="text-center p-10">Seleccione una opción del menú</div>;
      };
    
      return (
        <div className="h-screen flex bg-gray-100">
          <Sidebar selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
          <div className="flex-1 p-6 overflow-auto">{renderContent()}</div>
        </div>
      );
};

export default Dashboard;
