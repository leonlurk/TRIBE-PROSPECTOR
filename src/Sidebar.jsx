import { useState, useEffect } from "react";
import { auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import { FaInstagram } from "react-icons/fa"
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

const logoPath = "/LogoNegro.png";

// NUEVA lista de iconos desde assets
const menuItems = [
    { name: "Seguimiento", icon: "/assets/people.png" },
    { name: "Plantilla de mensajes", icon: "/assets/device-message.png" },
    { name: "Estadísticas", icon: "/assets/graph.png" },
    { name: "Nueva solicitud", icon: "/assets/add-square.png" },
    { name: "Conectar Instagram", icon: <FaInstagram className="w-6 h-6" /> }
];

const bottomItems = [
    { name: "Documentos", icon: "/assets/mobile-programming.png" },
    { name: "Soporte", icon: "/assets/call-calling.png" },
    { name: "Ajustes", icon: "/assets/setting-2.png" }
];

const Sidebar = ({ selectedOption = "", setSelectedOption = () => {} }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState({});

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
    

  //  const handleLogout = async () => {
      //  try {
         //   await auth.signOut();
        //    navigate("/");
      //  } catch (error) {
       //     console.error("Logout error:", error);
     //   }
   // }; 

    return (
        <div className="h-screen w-[300px] bg-white shadow-lg rounded-tr-3xl flex flex-col justify-between p-6">

            {/* Logo */}
            <div className="flex items-center justify-center mb-6 pt-10">
                <img 
                    src={logoPath} 
                    alt="Koafy Logo" 
                    className="w-[200px]" 
                    onError={(e) => {
                        console.error("Logo image failed to load");
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Crect width='200' height='60' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16'%3EKoafy%3C/text%3E%3C/svg%3E";
                    }}
                />
            </div>

            {/* Menú principal con imágenes */}
            <nav className="flex flex-col space-y-4">
            {menuItems.map((item) => (
              <button
                  key={item.name}
                  onClick={() => setSelectedOption(item.name)}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition 
                      ${selectedOption === item.name ? "bg-blue-200 text-blue-700 font-semibold" : "bg-white text-gray-900 hover:bg-gray-100"}`}
              >
                  {typeof item.icon === "string" ? (
                      <img src={item.icon} alt={item.name} className="w-6 h-6" />
                  ) : (
                      <span className="w-6 h-6 text-gray-600">{item.icon}</span>
                  )}
                  <span>{item.name}</span>
              </button>
          ))}

            </nav>

            {/* Sección inferior con imágenes */}
            <div className="flex flex-col space-y-4 mt-6">
                {bottomItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setSelectedOption(item.name)}
                        className="flex items-center space-x-3 p-3 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition"
                    >
                        <img src={item.icon} alt={item.name} className="w-6 h-6" />
                        <span>{item.name}</span>
                    </button>
                ))}

                {/* Usuario Autenticado */}
                <div className="border-t pt-4 flex items-center text-gray-500 mt-4 gap-4">
                    <img 
                        src="/assets/user.png" 
                        alt="User Icon"
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                            e.target.src = "/assets/avatar.png"; // Usa un fallback local
                        }}
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">{userData.username || "Usuario"}</span>
                        <span className="text-xs text-gray-400">{user?.email || "Sin correo"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

Sidebar.propTypes = {
    selectedOption: PropTypes.string,
    setSelectedOption: PropTypes.func
};

Sidebar.defaultProps = {
    selectedOption: "",
    setSelectedOption: () => {}
};

export default Sidebar;
