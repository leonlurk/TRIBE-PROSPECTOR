import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebaseConfig"; // Importamos Firebase Auth y Firestore
import { doc, setDoc } from "firebase/firestore"; // Importamos funciones para Firestore
import { FaUser, FaLock, FaEnvelope } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 📌 Guardar el usuario en Firestore (colección "users")
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        username: username,
        createdAt: new Date().toISOString(),
        instagramToken: null,  // Esto se llenará cuando conecten Instagram
        role: "user"            // Puedes cambiar esto según tu lógica de roles
      });

      navigate("/dashboard"); // Redirige al dashboard después de registrarse
    } catch (err) {
      console.error("Error al registrar:", err);
      setError("No se pudo crear la cuenta. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="relative flex items-center justify-center md:justify-end h-screen bg-cover bg-center bg-no-repeat p-4 md:p-10"
      style={{ backgroundImage: "url('/space-background.jpg')" }}>

      {/* Logo */}
      <img src="/logo.png" alt="TRIBE 4.0" className="absolute top-[5%] left-[5%] md:left-[8%] w-[150px] md:w-[200px]" />

      {/* Contenedor del formulario */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 md:p-10 rounded-[20px] md:rounded-[30px] shadow-2xl w-full max-w-[400px] md:w-[450px] h-auto min-h-[500px] md:h-[650px] flex flex-col justify-center border border-white/20">
        <h2 className="text-white text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">Crear Cuenta</h2>
        
        <form onSubmit={handleRegister} className="space-y-4 md:space-y-6">
          {/* Nombre de usuario */}
          <div className="relative">
            <label className="text-gray-300 block mb-2 text-sm font-medium">Usuario</label>
            <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-full p-2 md:p-3">
              <span className="text-gray-400 px-2 md:px-3"><FaUser /></span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:outline-none placeholder-gray-400 text-sm md:text-base"
                placeholder="Tu nombre de usuario"
                required
              />
            </div>
          </div>

          {/* Correo electrónico */}
          <div className="relative">
            <label className="text-gray-300 block mb-2 text-sm font-medium">Correo Electrónico</label>
            <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-full p-2 md:p-3">
              <span className="text-gray-400 px-2 md:px-3"><FaEnvelope /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:outline-none placeholder-gray-400 text-sm md:text-base"
                placeholder="tucorreo@example.com"
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="relative">
            <label className="text-gray-300 block mb-2 text-sm font-medium">Contraseña</label>
            <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-full p-2 md:p-3">
              <span className="text-gray-400 px-2 md:px-3"><FaLock /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:outline-none placeholder-gray-400 text-sm md:text-base"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Mensaje de error */}
          {error && <p className="text-red-500 text-xs md:text-sm text-center">{error}</p>}

          {/* Botón de Registro */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-semibold py-2 md:py-3 rounded-full transition-shadow shadow-md hover:shadow-lg text-sm md:text-base"
          >
            Registrarse
          </button>

          {/* Ya tienes cuenta */}
          <div className="text-center text-gray-400 text-xs md:text-sm mt-4 md:mt-6">
            ¿Ya tienes cuenta?{" "}
            <a href="/" className="text-white font-bold hover:underline">
              Inicia Sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;