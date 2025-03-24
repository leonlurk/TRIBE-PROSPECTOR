import { useState, useEffect } from "react";
import { auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import { FaInstagram, FaTimes, FaBan, FaHome } from "react-icons/fa";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

const logoPath = "/assets/logoBlanco.png";

const getMenuItems = (isInstagramConnected) => {
    const baseMenuItems = [
        { name: "Home", icon: "/assets/Home.png" },
        { name: "Plantillas", icon: "/assets/device-message.png" },
        { name: "Estadísticas", icon: "/assets/graph.png" },
    ];
    
    if (isInstagramConnected) {
        baseMenuItems.push(
            // Primero Campañas
            { name: "Campañas", icon: "/assets/calendar.png" },
            // Luego Listas
            { 
                name: "Listas", 
                icon: "/assets/note-2.png",
                subItems: [
                    { name: "Whitelist", icon: "/assets/people.png" },
                    { 
                        name: "Blacklist", 
                        icon: <FaBan className="md:w-5 md:h-6 text-white" /> 
                    }
                ]
            },
            // Y finalmente Nueva Campaña (movido aquí al final)
            { name: "Nueva Campaña", icon: "/assets/add-square.png" }
        );
    } else {
        // Si no está conectado a Instagram
        baseMenuItems.push(
            { 
                name: "Conectar Instagram", 
                icon: <FaInstagram className="w-5 h-5 md:w-6 md:h-6 text-white" /> 
            },
            // También movemos Nueva Campaña al final
            { name: "Nueva Campaña", icon: "/assets/add-square.png" }
        );
    }
    
    return baseMenuItems;
};

const bottomItems = [
    { name: "Herramientas", icon: "/assets/element-plus.png" },
    { name: "Ajustes", icon: "/assets/setting-2.png" },
    { name: "Light Mode", icon: "/assets/arrange-circle-2.png" }
];

const Sidebar = ({ selectedOption = "", setSelectedOption = () => {}, isInstagramConnected = false }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState({});
    // Para controlar el estado de expansión del menú Listas
    const [expandedMenu, setExpandedMenu] = useState("");
    
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
        const userRef = doc(db, "users", uid);
        const docSnap = await getDoc(userRef);
    
        if (docSnap.exists()) {
            setUserData(docSnap.data());
        } else {
            console.warn("No se encontraron datos de usuario en Firestore");
        }
    };
    
   {/* const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate("/");
        } catch (error) {
            console.error("Logout error:", error);
        }
    }; */} 

    return (
        <div className="h-screen w-[85vw] md:w-[280px] lg:w-[300px] bg-[#0d0420] shadow-lg rounded-tr-3xl flex flex-col justify-between p-4 md:p-6 overflow-y-auto font-['Poppins']">
            {/* Botón de cerrar solo visible en móviles */}
            <div className="md:hidden flex justify-end mb-2">
                <button 
                    className="p-1 rounded-full bg-gray-800 text-white"
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
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Crect width='200' height='60' fill='%23000000'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='white'%3EKoafy%3C/text%3E%3C/svg%3E";
                    }}
                />
            </div>

            {/* Menú principal con imágenes */}
            <nav className="flex flex-col space-y-2 md:space-y-4 overflow-y-auto w-full">
            {menuItems.map((item) => (
                <div key={item.name} className="relative w-full">
                    <button
                        onClick={() => {
                            if (item.name === "Listas" && item.subItems) {
                                // Solo toggle el estado de expansión del menú sin cambiar la pestaña actual
                                setExpandedMenu(prev => prev === "Listas" ? "" : "Listas");
                            } else {
                                console.log("Cambiando vista a:", item.name);
                                setSelectedOption(item.name);
                            }
                        }}
                        className={`flex items-center space-x-3 p-2 md:p-3 transition text-base md:text-lg text-white bg-transparent w-full rounded-lg
                            ${selectedOption === item.name 
                                ? "font-semibold bg-opacity-10 bg-white" 
                                : "hover:bg-white hover:bg-opacity-5"}`}
                    >
                        {typeof item.icon === "string" ? (
                            <img src={item.icon} alt={item.name} className="w-5 h-5 md:w-6 md:h-6 brightness-0 invert" />
                        ) : (
                            <span className="w-5 h-5 md:w-6 md:h-6 text-white">{item.icon}</span>
                        )}
                        <span>{item.name}</span>
                    </button>
                    
                    {/* Subitems con transición suave - Ahora controlado por expandedMenu */}
                    {item.subItems && (
                        <div 
                            className={`pl-8 space-y-2 overflow-hidden transition-all duration-300 ease-in-out w-full
                                ${expandedMenu === item.name ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                        >
                            {item.subItems.map((subItem) => (
                                <button
                                    key={subItem.name}
                                    onClick={() => setSelectedOption(subItem.name)}
                                    className={`flex items-center space-x-3 p-2 md:p-3 transition text-sm text-gray-300 hover:text-white 
                                        bg-transparent w-full rounded-lg
                                        ${selectedOption === subItem.name 
                                            ? "font-semibold bg-opacity-10 bg-white" 
                                            : "hover:bg-white hover:bg-opacity-5"}`}
                                >
                                    {typeof subItem.icon === "string" ? (
                                        <img src={subItem.icon} alt={subItem.name} className="w-4 h-4 md:w-5 md:h-5 brightness-0 invert" />
                                    ) : (
                                        <span className="w-4 h-4 md:w-5 md:h-5 text-white">{subItem.icon}</span>
                                    )}
                                    <span>{subItem.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            </nav>

            {/* Sección inferior con imágenes */}
            <div className="flex flex-col space-y-2 md:space-y-4 mt-4 md:mt-6 w-full">
                {bottomItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setSelectedOption(item.name)}
                        className={`flex items-center space-x-3 p-2 md:p-3 transition text-sm md:text-base 
                            text-white bg-transparent w-full rounded-lg
                            ${selectedOption === item.name 
                                ? "font-semibold bg-opacity-10 bg-white" 
                                : "hover:bg-white hover:bg-opacity-5"}`}
                    >
                        <img src={item.icon} alt={item.name} className="w-5 h-5 md:w-6 md:h-6 brightness-0 invert" />
                        <span>{item.name}</span>
                    </button>
                ))}

                {/* Usuario Autenticado */}
                <div className="border-t border-gray-800 pt-3 md:pt-4 flex items-center mt-3 md:mt-4 gap-3 md:gap-4">
                    <img 
                        src="/assets/user.png" 
                        alt="User Icon"
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                        onError={(e) => {
                            e.target.src = "/assets/avatar.png";
                        }}
                    />
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-xs md:text-sm font-medium text-white truncate">{userData.username || "Usuario"}</span>
                        <span className="text-xs text-gray-400 truncate">{user?.email || "Sin correo"}</span>
                    </div>
                </div>
                
                {/* Botón de Cerrar Sesión */}
            {/*    <button
                    onClick={handleLogout}
                    className="mt-2 md:mt-4 flex items-center justify-center space-x-3 p-2 md:p-3 rounded-lg bg-gray-200 text-black hover:bg-gray-300 transition w-full text-sm md:text-base"
                >
                    <span>Cerrar Sesión</span>
                </button> */}
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