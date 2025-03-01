import { useEffect, useState } from "react";
import { auth } from "./firebaseConfig";
import Login from "./Login";
import Dashboard from "./Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  return <div>{user ? <Dashboard /> : <Login />}</div>;
}

export default App;
