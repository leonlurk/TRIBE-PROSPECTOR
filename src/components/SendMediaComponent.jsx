import { useState } from "react";
import PropTypes from 'prop-types';

const API_BASE_URL = "https://alets.com.ar";

const SendMediaComponent = ({ instagramToken, usersList, showNotification, loading, setLoading }) => {
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaType, setMediaType] = useState("photo");
    const [mediaMessage, setMediaMessage] = useState("");
    const [skipExisting, setSkipExisting] = useState(true);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Manejar cambio de archivo
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMediaFile(file);
            
            // Crear URL para previsualización
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            
            // Determinar tipo de archivo automáticamente
            if (file.type.startsWith('image/')) {
                setMediaType('photo');
            } else if (file.type.startsWith('video/')) {
                setMediaType('video');
            } else if (file.type.startsWith('audio/')) {
                setMediaType('voice');
            }
        }
    };

    // Limpiar la selección de archivo
    const clearFileSelection = () => {
        setMediaFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    // Enviar media a usuarios
    const sendMedia = async () => {
        if (usersList.length === 0) {
            showNotification("No hay usuarios para enviar medios", "warning");
            return;
        }
        
        if (!mediaFile) {
            showNotification("No has seleccionado ningún archivo", "warning");
            return;
        }
        
        setLoading(true);
        
        try {
            // Crear FormData para enviar el archivo
            const formData = new FormData();
            formData.append("usuarios", usersList.join(","));
            formData.append("media_type", mediaType);
            formData.append("file", mediaFile);
            formData.append("skip_existing", skipExisting);
            
            // Agregar mensaje opcional si existe
            if (mediaMessage.trim()) {
                formData.append("mensaje", mediaMessage);
            }

            // Realizar la petición con un timeout más largo debido al tamaño del archivo
            const response = await fetch(`${API_BASE_URL}/enviar_media`, {
                method: "POST",
                headers: {
                    token: instagramToken
                },
                body: formData,
                // Aumentar timeout para archivos grandes
                timeout: 120000 // 2 minutos
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === "success") {
                showNotification("Medios enviados exitosamente", "success");
                clearFileSelection();
                setMediaMessage("");
            } else {
                showNotification(data.message || "Error al enviar medios", "error");
            }
            
            console.log("Respuesta de envío de medios:", data);
            
        } catch (error) {
            console.error("Error al enviar medios:", error);
            showNotification("Error al enviar medios: " + (error.message || "Error desconocido"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-6 p-4 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Enviar Media</h3>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Media
                </label>
                <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    disabled={loading}
                >
                    <option value="photo">Imagen</option>
                    <option value="video">Video</option>
                    <option value="voice">Audio</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo {mediaType === 'photo' ? '(JPG, PNG)' : mediaType === 'video' ? '(MP4)' : '(MP3, M4A)'}
                </label>
                <div className="flex items-center">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="media-file-input"
                        accept={
                            mediaType === 'photo' ? 'image/*' : 
                            mediaType === 'video' ? 'video/*' : 'audio/*'
                        }
                        disabled={loading}
                    />
                    <label
                        htmlFor="media-file-input"
                        className="px-4 py-2 bg-[#8998F1] text-white rounded-md cursor-pointer hover:bg-[#7988E0] transition"
                    >
                        Seleccionar Archivo
                    </label>
                    {mediaFile && (
                        <button
                            onClick={clearFileSelection}
                            className="ml-2 text-red-500 hover:text-red-700"
                            disabled={loading}
                        >
                            Eliminar
                        </button>
                    )}
                </div>
                
                {mediaFile && (
                    <div className="mt-2 text-sm text-gray-600">
                        Archivo seleccionado: {mediaFile.name} ({(mediaFile.size / 1024).toFixed(2)} KB)
                    </div>
                )}
                
                {previewUrl && mediaType === 'photo' && (
                    <div className="mt-2">
                        <img
                            src={previewUrl}
                            alt="Vista previa"
                            className="h-40 object-contain rounded border border-gray-300"
                        />
                    </div>
                )}
                
                {previewUrl && mediaType === 'video' && (
                    <div className="mt-2">
                        <video
                            src={previewUrl}
                            controls
                            className="h-40 object-contain rounded border border-gray-300"
                        />
                    </div>
                )}
                
                {previewUrl && mediaType === 'voice' && (
                    <div className="mt-2">
                        <audio
                            src={previewUrl}
                            controls
                            className="w-full"
                        />
                    </div>
                )}
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje (opcional)
                </label>
                <textarea
                    value={mediaMessage}
                    onChange={(e) => setMediaMessage(e.target.value)}
                    placeholder="Escribe un mensaje para acompañar tu archivo..."
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows="3"
                    disabled={loading}
                />
            </div>

            <div className="mb-4 flex items-center">
                <input
                    type="checkbox"
                    id="skip-existing"
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    className="mr-2"
                    disabled={loading}
                />
                <label htmlFor="skip-existing" className="text-sm text-gray-700">
                    Omitir usuarios con conversaciones recientes (24h)
                </label>
            </div>

            <button
                onClick={sendMedia}
                disabled={loading || !mediaFile || usersList.length === 0}
                className="w-full px-6 py-3 rounded-full font-semibold flex items-center justify-center"
                style={{
                    backgroundColor: loading || !mediaFile || usersList.length === 0 ? '#A6A6A6' : '#6B6674',
                    color: '#FFFFFF',
                    cursor: loading || !mediaFile || usersList.length === 0 ? 'not-allowed' : 'pointer',
                }}
            >
                {loading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando...
                    </>
                ) : "Enviar Media"}
            </button>
        </div>
    );
};

SendMediaComponent.propTypes = {
    instagramToken: PropTypes.string.isRequired,
    usersList: PropTypes.array.isRequired,
    showNotification: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
    setLoading: PropTypes.func.isRequired
};

export default SendMediaComponent;