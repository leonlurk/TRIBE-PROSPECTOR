import { useState, useEffect } from "react";
import { auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import { FaInstagram, FaTimes, FaBan } from "react-icons/fa";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

const logoPath = "/LogoNegro.png";

const getMenuItems = (isInstagramConnected) => {
    const baseMenuItems = [
        { name: "Whitelist", icon: "/assets/people.png" },
        { name: "Plantilla de mensajes", icon: "/assets/device-message.png" },
        { name: "Estadísticas", icon: "/assets/graph.png" },
        { name: "Nueva solicitud", icon: "/assets/add-square.png" },
    ];
    
    if (isInstagramConnected) {
        baseMenuItems.push({
            name: "Gestionar Blacklist",
            icon: <FaBan className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
        });
    }
    
    if (!isInstagramConnected) {
        baseMenuItems.push({ 
            name: "Conectar Instagram", 
            icon: <FaInstagram className="w-5 h-5 md:w-6 md:h-6" /> 
        });
    }
    
    return baseMenuItems;
};

const bottomItems = [
    { name: "Documentos", icon: "/assets/mobile-programming.png" },
    { name: "Soporte", icon: "/assets/call-calling.png" },
    { name: "Ajustes", icon: "/assets/setting-2.png" }
];

const Sidebar = ({ selectedOption = "", setSelectedOption = () => {}, isInstagramConnected = false }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState({});
    // Get filtered menu items based on Instagram connection status
    const menuItems = getMenuItems(isInstagramConnected);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
    
            if (currentUser) {
                await fetchUserData(currentUser.uid);
            }
        });
    
        return () => unsubscribe();
    }, []);
    
    const fetchUserData = async (uid) => {
        const userRef = doc(db, "users", uid);  // Asegúrate de apuntar al nombre correcto de tu colección
        const docSnap = await getDoc(userRef);
    
        if (docSnap.exists()) {
            setUserData(docSnap.data());  // Guarda los datos de Firestore en userData
        } else {
            console.warn("No se encontraron datos de usuario en Firestore");
        }
    };
    
    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate("/");
        } catch (error) {
            console.error("Logout error:", error);
        }
    }; 

    return (
        <div className="h-screen w-[85vw] md:w-[280px] lg:w-[300px] bg-white shadow-lg rounded-tr-3xl flex flex-col justify-between p-4 md:p-6 overflow-y-auto">
            {/* Botón de cerrar solo visible en móviles */}
            <div className="md:hidden flex justify-end mb-2">
                <button 
                    className="p-1 rounded-full bg-gray-100 text-gray-500"
                    onClick={() => setSelectedOption(selectedOption)}
                    aria-label="Cerrar menú"
                >
                    <FaTimes size={18} />
                </button>
            </div>

            {/* Logo */}
            <div className="flex items-center justify-center mb-6 pt-4 md:pt-10">
                <img 
                    src={logoPath} 
                    alt="Koafy Logo" 
                    className="w-[160px] md:w-[200px]" 
                    onError={(e) => {
                        console.error("Logo image failed to load");
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Crect width='200' height='60' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16'%3EKoafy%3C/text%3E%3C/svg%3E";
                    }}
                />
            </div>

            {/* Menú principal con imágenes */}
            <nav className="flex flex-col space-y-2 md:space-y-4 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                  key={item.name}
                  onClick={() => setSelectedOption(item.name)}
                  className={`flex items-center space-x-3 p-2 md:p-3 rounded-lg transition text-sm md:text-base
                      ${selectedOption === item.name ? "bg-blue-200 text-blue-700 font-semibold" : "bg-white text-gray-900 hover:bg-gray-100"}`}
              >
                  {typeof item.icon === "string" ? (
                      <img src={item.icon} alt={item.name} className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                      <span className="w-5 h-5 md:w-6 md:h-6 text-gray-600">{item.icon}</span>
                  )}
                  <span>{item.name}</span>
              </button>
          ))}

            </nav>

            {/* Sección inferior con imágenes */}
            <div className="flex flex-col space-y-2 md:space-y-4 mt-4 md:mt-6">
                {bottomItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setSelectedOption(item.name)}
                        className="flex items-center space-x-3 p-2 md:p-3 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition text-sm md:text-base"
                    >
                        <img src={item.icon} alt={item.name} className="w-5 h-5 md:w-6 md:h-6" />
                        <span>{item.name}</span>
                    </button>
                ))}

                {/* Usuario Autenticado */}
                <div className="border-t pt-3 md:pt-4 flex items-center text-gray-500 mt-3 md:mt-4 gap-3 md:gap-4">
                    <img 
                        src="/assets/user.png" 
                        alt="User Icon"
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                        onError={(e) => {
                            e.target.src = "/assets/avatar.png"; // Usa un fallback local
                        }}
                    />
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-xs md:text-sm font-medium text-gray-700 truncate">{userData.username || "Usuario"}</span>
                        <span className="text-xs text-gray-400 truncate">{user?.email || "Sin correo"}</span>
                    </div>
                </div>
                {/* Botón de Cerrar Sesión */}
                <button
                    onClick={handleLogout}
                    className="mt-2 md:mt-4 flex items-center justify-center space-x-3 p-2 md:p-3 rounded-lg bg-gray-200 text-black hover:bg-gray-300 transition w-full text-sm md:text-base"
                >
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
};

Sidebar.propTypes = {
    selectedOption: PropTypes.string,
    setSelectedOption: PropTypes.func,
    isInstagramConnected: PropTypes.bool
};

Sidebar.defaultProps = {
    selectedOption: "",
    setSelectedOption: () => {},
    isInstagramConnected: false
};

export default Sidebar;