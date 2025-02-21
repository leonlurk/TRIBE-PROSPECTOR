// 📌 src/api.js
import axios from 'axios';

const API_URL = 'https://koafy.alets.com.ar';

// Login a la API de Instagram
export const loginInstagram = async (username, password, verificationCode = '') => {
    try {
        const response = await axios.post(`${API_URL}/login`, {
            username,
            password,
            verification_code: verificationCode,
        });
        return response.data;
    } catch (error) {
        console.error("Error en login:", error);
        throw error;
    }
};

// Obtener likes de una publicación
export const obtenerLikes = async (session, link) => {
    try {
        const response = await axios.post(`${API_URL}/obtener_likes`, new URLSearchParams({
            session,
            link
        }));
        return response.data;
    } catch (error) {
        console.error("Error obteniendo likes:", error);
        throw error;
    }
};

// Seguir usuarios
export const seguirUsuarios = async (session, usuarios) => {
    try {
        const response = await axios.post(`${API_URL}/seguir_usuarios`, new URLSearchParams({
            session,
            usuarios: usuarios.join(',')
        }));
        return response.data;
    } catch (error) {
        console.error("Error al seguir usuarios:", error);
        throw error;
    }
};

// Enviar mensajes a usuarios
export const enviarMensajes = async (session, usuarios, mensaje) => {
    try {
        const response = await axios.post(`${API_URL}/enviar_mensajes_multiple`, new URLSearchParams({
            session,
            usuarios: usuarios.join(','),
            mensaje
        }));
        return response.data;
    } catch (error) {
        console.error("Error enviando mensajes:", error);
        throw error;
    }
};

// Cerrar sesión en la API
export const logoutInstagram = async (session) => {
    try {
        const response = await axios.post(`${API_URL}/logout`, new URLSearchParams({
            session
        }));
        return response.data;
    } catch (error) {
        console.error("Error cerrando sesión:", error);
        throw error;
    }
};

// 📌 Integración con "Nueva Solicitud" en Sidebar
import { useState } from "react";

export const useNuevaSolicitud = () => {
    const [session, setSession] = useState(localStorage.getItem("session"));
    const [link, setLink] = useState("");
    const [likes, setLikes] = useState([]);
    const [mensaje, setMensaje] = useState("");

    const handleObtenerLikes = async () => {
        try {
            const data = await obtenerLikes(session, link);
            setLikes(data.usuarios);
        } catch (error) {
            console.error("Error al obtener likes:", error);
        }
    };

    const handleSeguirUsuarios = async () => {
        try {
            await seguirUsuarios(session, likes);
            alert("Usuarios seguidos exitosamente");
        } catch (error) {
            console.error("Error al seguir usuarios:", error);
        }
    };

    const handleEnviarMensajes = async () => {
        try {
            await enviarMensajes(session, likes, mensaje);
            alert("Mensajes enviados exitosamente");
        } catch (error) {
            console.error("Error enviando mensajes:", error);
        }
    };

    return {
        link,
        setLink,
        likes,
        mensaje,
        setMensaje,
        handleObtenerLikes,
        handleSeguirUsuarios,
        handleEnviarMensajes,
    };
};
