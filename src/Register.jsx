import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig"; // Asegúrate de importar la configuración de Firebase
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
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // Redirigir al dashboard después del registro
    } catch (err) {
      console.error("Error al registrar:", err);
      setError("No se pudo crear la cuenta. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="relative flex items-center justify-end h-screen bg-cover bg-center bg-no-repeat p-10"
      style={{ backgroundImage: "url('/space-background.jpg')" }}>

      {/* Logo */}
      <img src="/logo.png" alt="TRIBE 4.0" className="absolute top-[5%] left-[8%] w-[200px]" />

      {/* Contenedor del formulario */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg p-10 rounded-[30px] shadow-2xl w-[450px] h-[650px] flex flex-col justify-center border border-white/20">
        
        <h2 className="text-white text-3xl font-semibold text-center mb-8">
          Crear Cuenta
        </h2>
        
        <form onSubmit={handleRegister} className="space-y-6">
          {/* Nombre de usuario */}
          <div className="relative">
            <label className="text-gray-300 block mb-2 text-sm font-medium">Usuario</label>
            <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-full p-3">
              <span className="text-gray-400 px-3"><FaUser /></span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:outline-none placeholder-gray-400"
                placeholder="Tu nombre de usuario"
                required
              />
            </div>
          </div>

          {/* Correo electrónico */}
          <div className="relative">
            <label className="text-gray-300 block mb-2 text-sm font-medium">Correo Electrónico</label>
            <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-full p-3">
              <span className="text-gray-400 px-3"><FaEnvelope /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:outline-none placeholder-gray-400"
                placeholder="tucorreo@example.com"
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="relative">
            <label className="text-gray-300 block mb-2 text-sm font-medium">Contraseña</label>
            <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-full p-3">
              <span className="text-gray-400 px-3"><FaLock /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:outline-none placeholder-gray-400"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Mensaje de error */}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {/* Botón de Registro */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-semibold py-3 rounded-full transition-shadow shadow-md hover:shadow-lg"
          >
            Registrarse
          </button>

          {/* Ya tienes cuenta */}
          <div className="text-center text-gray-400 text-sm mt-6">
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
