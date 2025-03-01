import { useState, useEffect } from "react";
import { auth } from "./firebaseConfig";
import { 
  FaInstagram, FaChartBar, FaEnvelope, FaClipboardList, 
  FaFileAlt, FaCog, FaUserCircle, FaHeadset 
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';

// Import the logo directly if it's in the assets folder
// Or use this approach if it's in the public folder
const logoPath = "/LogoNegro.png";

const Sidebar = ({ selectedOption = "", setSelectedOption = () => {} }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Add error handling for auth state changes
    try {
      const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error("Auth state error:", error);
    }
  }, []);

  const menuItems = [
    { name: "Seguimiento", icon: <FaChartBar /> },
    { name: "Plantilla de mensajes", icon: <FaEnvelope /> },
    { name: "Estadísticas", icon: <FaClipboardList /> },
    { name: "Nueva solicitud", icon: <FaFileAlt /> },
    { name: "Conectar Instagram", icon: <FaInstagram /> }
  ];

  const bottomItems = [
    { name: "Documentos", icon: <FaFileAlt /> },
    { name: "Soporte", icon: <FaHeadset /> },
    { name: "Ajustes", icon: <FaCog /> },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
    className="mt-4 px-6 py-2 rounded-lg transition-all duration-800 bg-[#CCCCCC] text-gray-800 hover:bg-gradient-to-r hover:bg-[#393346] hover:text-white"
    onClick={handleLogout}
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

// Add prop types validation to fix the ESLint warning
Sidebar.propTypes = {
  selectedOption: PropTypes.string,
  setSelectedOption: PropTypes.func
};

// Add default props
Sidebar.defaultProps = {
  selectedOption: "",
  setSelectedOption: () => {}
};

export default Sidebar;