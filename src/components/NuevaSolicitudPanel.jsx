import { useState } from "react";
import PropTypes from 'prop-types';


const API_BASE_URL = "http://145.223.73.39:8006";

const NuevaSolicitudPanel = ({ instagramToken }) => {
    const [postLink, setPostLink] = useState("");
    const [usersList, setUsersList] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const getLikes = async () => {
        setLoading(true);
        setUsersList([]);

        const token = instagramToken;

        try {
            const formData = new FormData();
            formData.append("link", postLink);

            const response = await fetch(`${API_BASE_URL}/obtener_likes`, {
                method: "POST",
                headers: { token },
                body: formData,
            });

            const data = await response.json();

            if (data.status === "success") {
                setUsersList(data.likes);
            } else {
                alert("Error al obtener likes: " + data.message);
            }
        } catch (error) {
            alert("Error de conexión");
            console.error("Ocurrió un error:", error);
        } finally {
            setLoading(false);
        }
    };

    NuevaSolicitudPanel.propTypes = {
        instagramToken: PropTypes.string.isRequired,
    };

    const followUsers = async () => {
        const token = instagramToken;

        try {
            const response = await fetch(`${API_BASE_URL}/seguir_usuarios`, {
                method: "POST",
                headers: {
                    token: token,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    usuarios: usersList.join(",")
                })
            });

            const data = await response.json();
            alert("Seguimiento completado, revisa la consola para ver detalles");
            console.log(data);
        } catch (error) {
            alert("Error al seguir usuarios");
            console.error("Ocurrió un error:", error);
        }
    };

    const sendMessages = async () => {
        const token = instagramToken;

        try {
            const response = await fetch(`${API_BASE_URL}/enviar_mensajes_multiple`, {
                method: "POST",
                headers: {
                    token: token,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    usuarios: usersList.join(","),
                    mensaje: message
                })
            });

            const data = await response.json();
            alert("Mensajes enviados, revisa la consola para ver detalles");
            console.log(data);
        } catch (error) {
            alert("Error al enviar mensajes");
            console.error("Ocurrió un error:", error);
        }
    };

    return (
        <div className="p-6 min-h-screen" style={{ backgroundColor: '#FFFFFF', color: '#080018' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#080018' }}>Nueva Solicitud</h2>
    
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Pega el link de la publicación"
                    value={postLink}
                    onChange={(e) => setPostLink(e.target.value)}
                    className="w-full p-3 rounded-md border"
                    style={{
                        backgroundColor: '#FAFAFA',
                        borderColor: '#A6A6A6',
                        color: '#393346',
                        placeholder: { color: '#9E9E9E' }
                    }}
                />
                <button
                    onClick={getLikes}
                    disabled={loading}
                    className="mt-2 px-6 py-3 rounded-full font-semibold"
                    style={{
                        backgroundColor: loading ? '#A6A6A6' : '#393346',
                        color: '#FFFFFF',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? "Cargando..." : "Obtener Likes"}
                </button>
            </div>
    
            {usersList.length > 0 && (
                <>
                    <div className="mt-4">
                        <h3 className="text-xl font-semibold" style={{ color: '#080018' }}>
                            Usuarios obtenidos ({usersList.length})
                        </h3>
                        <div className="max-h-40 overflow-y-auto p-2 border rounded-md"
                            style={{
                                backgroundColor: '#F5F5F5',
                                borderColor: '#A6A6A6',
                                color: '#393346'
                            }}
                        >
                            {usersList.map(user => (
                                <p key={user} className="text-sm">{user}</p>
                            ))}
                        </div>
                    </div>
    
                    <button
                        onClick={followUsers}
                        className="mt-4 px-6 py-3 rounded-full font-semibold"
                        style={{
                            backgroundColor: '#524D5D',
                            color: '#FFFFFF',
                        }}
                    >
                        Seguir Usuarios
                    </button>
    
                    <div className="mt-4">
                        <textarea
                            placeholder="Escribe un mensaje para enviar"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-3 rounded-md border"
                            style={{
                                backgroundColor: '#FAFAFA',
                                borderColor: '#A6A6A6',
                                color: '#393346',
                                placeholder: { color: '#9E9E9E' }
                            }}
                        />
                        <button
                            onClick={sendMessages}
                            className="mt-2 px-6 py-3 rounded-full font-semibold"
                            style={{
                                backgroundColor: '#6B6674',
                                color: '#FFFFFF',
                            }}
                        >
                            Enviar Mensajes
                        </button>
                    </div>
                </>
            )}
        </div>
    );
    
    
};

export default NuevaSolicitudPanel;
