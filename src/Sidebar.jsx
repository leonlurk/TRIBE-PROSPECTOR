import { useState, useEffect } from "react";
import { auth } from "./firebaseConfig"; 
import { 
  FaChartBar, FaEnvelope, FaClipboardList, 
  FaFileAlt, FaCog, FaUserCircle, FaHeadset 
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Sidebar = ({ selectedOption, setSelectedOption }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const menuItems = [
    { name: "Seguimiento", icon: <FaChartBar /> },
    { name: "Plantilla de mensajes", icon: <FaEnvelope /> },
    { name: "Estadísticas", icon: <FaClipboardList /> },
    { name: "Nueva solicitud", icon: <FaFileAlt /> },
  ];

  const bottomItems = [
    { name: "Documentos", icon: <FaFileAlt /> },
    { name: "Soporte", icon: <FaHeadset /> },
    { name: "Ajustes", icon: <FaCog /> },
  ];

  return (
    <div className="h-screen w-[300px] bg-white shadow-lg rounded-tr-3xl flex flex-col justify-between p-6">
      
      {/* Logo */}
      <div className="flex items-center justify-center mb-6 pt-10">
        <img src="./LogoNegro.png" alt="Koafy Logo" className="w-[200px]" />
      </div>
      
      {/* Menú principal */}
      <nav className="flex flex-col space-y-4">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setSelectedOption(item.name)}
            className={`flex items-center space-x-3 p-3 rounded-lg transition 
              ${selectedOption === item.name ? "bg-blue-200 text-blue-700 font-semibold" : "bg-white text-gray-900 hover:bg-gray-100"}`}
          >
            <span className={selectedOption === item.name ? "text-blue-700" : "text-gray-600"}>{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      
      {/* Sección inferior */}
      <div className="flex flex-col space-y-4 mt-6">
        {bottomItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setSelectedOption(item.name)}
            className="flex items-center space-x-3 p-3 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition"
          >
            <span className="text-gray-600">{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
        <button
          className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
          onClick={() => auth.signOut().then(() => navigate("/"))}
        >
          Cerrar Sesión
        </button>
        {/* Usuario Autenticado */}
        <div className="border-t pt-4 flex flex-col items-center text-gray-500 mt-4">
          <FaUserCircle className="text-3xl text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-700">{user?.displayName || "Usuario"}</span>
          <span className="text-xs text-gray-400">{user?.email || "Sin correo"}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
