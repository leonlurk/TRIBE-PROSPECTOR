import { useEffect, useState } from "react";
import { auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedOption, setSelectedOption] = useState("Plantilla de mensajes"); // Opción por defecto

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/"); // Redirige al Login si no está autenticado
      } else {
        setUser(user);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Función para renderizar contenido según la opción seleccionada
  const renderContent = () => {
    switch (selectedOption) {
      case "Nueva solicitud":
        return <h2 className="text-2xl font-semibold text-gray-800">Página de Nueva Solicitud</h2>;
      case "Plantilla de mensajes":
        return <h2 className="text-2xl font-semibold text-gray-800">Página de Plantilla de Mensajes</h2>;
      case "Estadísticas":
        return <h2 className="text-2xl font-semibold text-gray-800">Página de Estadísticas</h2>;
      case "Seguimiento":
        return <h2 className="text-2xl font-semibold text-gray-800">Página de Seguimiento</h2>;
      default:
        return <h2 className="text-2xl font-semibold text-gray-800">Bienvenido al Dashboard</h2>;
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar con el estado de la opción seleccionada */}
      <Sidebar selectedOption={selectedOption} setSelectedOption={setSelectedOption} />

      {/* Contenido principal dinámico */}
      <div className="flex-1 p-10">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
