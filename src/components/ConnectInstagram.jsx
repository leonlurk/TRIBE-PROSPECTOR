import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Instagram2FAVerification from "./Instagram2FAVerification";

const API_BASE_URL = "https://alets.com.ar";

const ConnectInstagram = ({ 
    user, 
    onConnect, 
    errorMessage, 
    showModal, 
    setShowModal, 
    instagramToken, 
    onVerify2FA 
}) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [needs2FA, setNeeds2FA] = useState(false);
    const [username, setUsername] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasLoginError, setHasLoginError] = useState(false);
    const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [localErrorMessage, setLocalErrorMessage] = useState("");
    const [deviceId, setDeviceId] = useState("");
    
    // Load device ID on component mount
    useEffect(() => {
        const savedDeviceId = localStorage.getItem("instagram_device_id");
        if (savedDeviceId) {
            setDeviceId(savedDeviceId);
        }
    }, []);

    const handleCancel2FA = () => {
        setNeeds2FA(false);
        setUsername("");
    };

    // Function for login with fetch instead of axios
    const loginWithFetch = async (username, password) => {
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            
            // Add device ID if available
            if (deviceId) {
                formData.append('device_id', deviceId);
                formData.append('login_attempt_count', "1");
            }
            
            const headers = {
                'Accept-Language': 'es-ES, en-US',
            };
            
            if (deviceId) {
                headers['X-IG-Device-ID'] = deviceId;
                headers['X-IG-Android-ID'] = deviceId;
            }
            
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Save token
                localStorage.setItem('instagram_bot_token', data.token);
                
                // Save cookies if available
                if (data.cookies) {
                    localStorage.setItem('instagram_cookies', JSON.stringify(data.cookies));
                }
                
                // Save device ID if provided
                if (data.device_id) {
                    localStorage.setItem('instagram_device_id', data.device_id);
                    setDeviceId(data.device_id);
                }
                
                return { success: true, data: data };
            } else if (data.status === 'needs_verification') {
                // Save session ID if provided
                if (data.session_id) {
                    localStorage.setItem('instagram_2fa_session', data.session_id);
                }
                
                // Return verification needed
                return { 
                    success: false, 
                    verification: true, 
                    username: data.username,
                    data: data 
                };
            } else {
                return { 
                    success: false, 
                    error: data.message || 'Error desconocido',
                    data: data
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error.message || 'Ocurrió un error durante el inicio de sesión',
                data: null
            };
        }
    };

    const handleConnectInstagram = async () => {
        if (isSubmitting) return;
        
        // Reset error states
        setLocalErrorMessage("");
        setHasLoginError(false);
        
        // Check terms first
        if (!acceptedTerms) {
            setLocalErrorMessage("Debes aceptar los términos y condiciones para continuar.");
            setHasLoginError(true);
            return;
        }
        
        if (!email || !password) {
            setLocalErrorMessage("Por favor ingresa tu correo electrónico y contraseña.");
            setHasLoginError(true);
            return;
        }
        
        try {
            setIsSubmitting(true);
            
            // Use fetch implementation instead of axios
            const fetchResult = await loginWithFetch(email, password);
            
            if (fetchResult.success) {
                // Login successful
                setShowModal(false);
                
                // Call the parent component's handler with the original functionality
                try {
                    await onConnect(email, password);
                } catch (err) {
                    console.error("Error en onConnect original:", err);
                    // Si falla el método original, al menos ya guardamos el token
                }
            } else if (fetchResult.verification) {
                // 2FA needed
                setNeeds2FA(true);
                setUsername(fetchResult.username);
            } else if (fetchResult.data) {
                // Process various error scenarios
                const data = fetchResult.data;
                
                if (data.status === "challenge_required" || 
                    data.error_type === "challenge_required" ||
                    data.status === "checkpoint_required") {
                    setShowRecoveryInfo(true);
                } else {
                    setLocalErrorMessage(fetchResult.error || "Error desconocido al conectar con Instagram");
                    setHasLoginError(true);
                }
            } else {
                // Generic error handling
                setLocalErrorMessage(fetchResult.error || "Error desconocido al conectar con Instagram");
                setHasLoginError(true);
            }
        } catch (error) {
            console.error("Error during connection:", error);
            setLocalErrorMessage("Error de red o conexión con la API.");
            setHasLoginError(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-[#F3F2FC] min-h-screen">
            <h1 className="text-2xl font-bold mb-4 text-[#393346]">Bienvenido, {user?.displayName || "Usuario"}</h1>
            <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-sm font-semibold hover:bg-blue-700 transition"
            >
                Conectar Instagram
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[400px] shadow-md">
                        {needs2FA ? (
                            <Instagram2FAVerification
                                username={username}
                                onVerify2FA={onVerify2FA}
                                onCancel={handleCancel2FA}
                                errorMessage={errorMessage}
                                deviceId={deviceId}
                            />
                        ) : showRecoveryInfo ? (
                            <>
                                <h2 className="text-lg font-semibold text-black mb-4">Recuperar acceso a Instagram</h2>
                                <div className="text-gray-700 text-sm mb-4">
                                    <p className="mb-2">Instagram ha detectado actividad inusual en tu cuenta y requiere verificación adicional:</p>
                                    <ol className="list-decimal pl-5 space-y-1">
                                        <li>Abre la aplicación de Instagram en tu dispositivo</li>
                                        <li>Revisa tus notificaciones o correo electrónico para el mensaje de seguridad</li>
                                        <li>Sigue las instrucciones para verificar tu identidad</li>
                                        <li>Una vez confirmada, regresa aquí e intenta conectarte de nuevo</li>
                                    </ol>
                                </div>
                                <button
                                    onClick={() => setShowRecoveryInfo(false)}
                                    className="w-full py-2 bg-[#8998F1] text-white rounded-md font-medium hover:bg-[#7988E0] transition"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="text-lg font-semibold text-black mb-4">Conectar cuenta de Instagram</h2>
                                {errorMessage && (
                                    <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded">
                                        {errorMessage}
                                    </div>
                                )}
                                {localErrorMessage && !errorMessage && (
                                    <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded">
                                        {localErrorMessage}
                                    </div>
                                )}
                                {hasLoginError && !errorMessage && !localErrorMessage && (
                                    <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded">
                                        Error al conectar. Verifica tus credenciales.
                                    </div>
                                )}
                                <input
                                    type="email"
                                    placeholder="Correo de Instagram"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md mb-3 text-black placeholder-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />

                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md mb-3 text-black placeholder-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />

                                <div className="flex items-center gap-2 mb-4">
                                    <input 
                                        type="checkbox" 
                                        id="prospectar" 
                                        className="cursor-pointer" 
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    />
                                    <label htmlFor="prospectar" className="text-sm text-black cursor-pointer">
                                        Aceptar términos y condiciones y políticas de privacidad en el inicio de sesión de instagram. Los términos y condiciones y políticas de privacidad se vean en la misma pagina.
                                    </label>
                                </div>
                                {!acceptedTerms && (
                                    <div className="text-red-500 text-xs mb-3">
                                        Debes aceptar los términos y condiciones para continuar.
                                    </div>
                                )}

                                <button
                                    onClick={handleConnectInstagram}
                                    disabled={isSubmitting || !acceptedTerms || !email || !password}
                                    className={`w-full py-2 ${
                                        isSubmitting || !acceptedTerms || !email || !password
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-[#8998F1] hover:bg-[#7988E0] cursor-pointer'
                                    } text-white rounded-md font-medium transition flex justify-center items-center`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Conectando...
                                        </>
                                    ) : "Siguiente →"}
                                </button>
                            </>
                        )}

                        {instagramToken && !needs2FA && !showRecoveryInfo && (
                            <div className="mt-4 p-3 bg-gray-100 border rounded">
                                <p className="text-sm text-gray-600">Token de Instagram:</p>
                                <p className="text-xs font-mono break-all">{instagramToken.substring(0, 40)}...</p>
                            </div>
                        )}

                        <div className="text-right mt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 text-sm bg-[#CCCCCC] hover:bg-[#7988E0] transition px-4 py-2 rounded"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

ConnectInstagram.propTypes = {
    user: PropTypes.object,
    onConnect: PropTypes.func.isRequired,
    onVerify2FA: PropTypes.func.isRequired,
    errorMessage: PropTypes.string,
    showModal: PropTypes.bool.isRequired,
    setShowModal: PropTypes.func.isRequired,
    instagramToken: PropTypes.string,
};

ConnectInstagram.defaultProps = {
    errorMessage: '',
    instagramToken: ''
};

export default ConnectInstagram;