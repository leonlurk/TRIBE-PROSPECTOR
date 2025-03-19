import { useEffect, useState } from "react";
import { auth } from "./firebaseConfig";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { useLocation } from "react-router-dom";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Verificar si la ruta actual es /sso
  const isSSO = location.pathname === "/sso";

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  // Si estamos en la ruta SSO, no mostrar Login ni Dashboard
  // El componente SSOHandler ya se encargará de la redirección
  if (isSSO) {
    return null;
  }

  return <div>{user ? <Dashboard /> : <Login />}</div>;
}

export default App;