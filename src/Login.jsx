import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig"; // Importamos Firebase
import { FaUser, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // Redirigir al dashboard si el login es exitoso
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError("Correo o contraseña incorrectos");
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
          Iniciar Sesión
        </h2>
        
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Usuario */}
          <div className="relative">
            <label className="text-gray-300 block mb-2 text-sm font-medium">Correo Electrónico</label>
            <div className="flex items-center bg-gray-900 bg-opacity-50 rounded-full p-3">
              <span className="text-gray-400 px-3"><FaUser /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-white border-none focus:outline-none placeholder-gray-400"
                placeholder="Ingresa tu correo"
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

          {/* Botón de inicio de sesión */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-semibold py-3 rounded-full transition-shadow shadow-md hover:shadow-lg"
          >
            Iniciar Sesión
          </button>

          {/* Opciones de recuperación */}
          <div className="flex justify-between text-gray-400 text-sm mt-4">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 accent-blue-500" /> Recuérdame
            </label>
            <a href="#" className="hover:underline text-blue-400">
              ¿Olvidaste la contraseña?
            </a>
          </div>

          {/* Registrarse */}
          <div className="text-center text-gray-400 text-sm mt-6">
            ¿No tienes cuenta?{" "}
            <a href="/register" className="text-white font-bold hover:underline">
              Regístrate
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
