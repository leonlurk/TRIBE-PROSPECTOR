import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SSOHandler = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSSO = async () => {
      try {
        // Obtener el token de la URL
        const params = new URLSearchParams(window.location.search);
        const ssoToken = params.get("token");
        
        if (!ssoToken) {
          setError("Token de autenticación no proporcionado");
          setLoading(false);
          return;
        }

        // Usar la URL de la Firebase Function que creamos
        const response = await fetch("https://us-central1-koafy-5bbb8.cloudfunctions.net/verifySSOToken", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: ssoToken }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al verificar el token SSO");
        }

        const { customToken, userData } = await response.json();

        // Autenticar con Firebase usando el token personalizado
        const userCredential = await signInWithCustomToken(auth, customToken);
        const user = userCredential.user;

        // Verificar si el usuario ya existe en Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        // Si el usuario no existe o necesita actualización, guardar/actualizar datos
        if (!userDoc.exists() || userData.forceUpdate) {
          await setDoc(userDocRef, {
            email: userData.email,
            username: userData.username,
            createdAt: new Date().toISOString(),
            ssoProvider: userData.provider,
            lastLogin: new Date().toISOString(),
            externalUserId: userData.externalUserId
          }, { merge: true });
        } else {
          // Actualizar solo la fecha de último login
          await setDoc(userDocRef, {
            lastLogin: new Date().toISOString(),
          }, { merge: true });
        }

        // Redirigir al dashboard
        navigate("/dashboard");
      } catch (error) {
        console.error("Error en autenticación SSO:", error);
        setError(error.message || "Error en la autenticación. Por favor, inténtelo de nuevo.");
        setLoading(false);
      }
    };

    handleSSO();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/space-background.jpg')" }}>
        <div className="bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-[20px] shadow-2xl border border-white/20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando tu identidad...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/space-background.jpg')" }}>
        <div className="bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-[20px] shadow-2xl border border-white/20 text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-white text-lg mb-4">{error}</p>
          <button 
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold py-2 px-6 rounded-full"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SSOHandler;