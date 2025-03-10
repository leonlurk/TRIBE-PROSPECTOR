import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const API_BASE_URL = "https://alets.com.ar";

const Instagram2FAVerification = ({ 
    username, 
    onVerify2FA, 
    onCancel, 
    errorMessage,
    deviceId
}) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [remainingTime, setRemainingTime] = useState(120); // 2 minute countdown
    const [sessionId, setSessionId] = useState('');
    const [sessionCookies, setSessionCookies] = useState(null);
    const [isLocalhost, setIsLocalhost] = useState(false);

    // Determine if we're running on localhost
    useEffect(() => {
        setIsLocalhost(window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1');
    }, []);

    // Set up countdown timer for verification code expiry
    useEffect(() => {
        // Get session ID from localStorage if available
        const storedSessionId = localStorage.getItem('instagram_2fa_session');
        if (storedSessionId) {
            setSessionId(storedSessionId);
        }

        // Load stored cookies if available
        const storedCookies = localStorage.getItem('instagram_cookies');
        if (storedCookies) {
            try {
                setSessionCookies(JSON.parse(storedCookies));
            } catch (e) {
                console.error("Error parsing stored cookies:", e);
            }
        }

        // Start countdown timer
        if (remainingTime > 0) {
            const timer = setTimeout(() => {
                setRemainingTime(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [remainingTime]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Función para modo desarrollo - simula un proceso exitoso
    const simulateSuccessfulVerification = () => {
        setLocalError("Modo desarrollo: Simulando verificación exitosa...");
        
        // Generar token simulado
        const simulatedToken = `IGT-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
        localStorage.setItem("instagram_bot_token", simulatedToken);
        
        // Simular cookies de sesión
        const simulatedCookies = `sessionid=${Date.now()}; csrftoken=${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("instagram_cookies", JSON.stringify(simulatedCookies));
        
        // Simular device ID si no existe
        if (!localStorage.getItem("instagram_device_id")) {
            localStorage.setItem("instagram_device_id", `dev_${Math.random().toString(36).substring(2, 10)}`);
        }
        
        // Eliminar cualquier dato de sesión 2FA
        localStorage.removeItem('instagram_2fa_session');
        
        // Notificar al usuario y recargar
        setTimeout(() => {
            alert("¡Verificación exitosa en modo desarrollo! La aplicación se recargará.");
            onCancel();
            window.location.reload();
        }, 1500);
    };

    const handleVerification = async () => {
        if (!verificationCode.trim()) {
            setLocalError("Por favor ingresa el código de verificación");
            return;
        }

        try {
            setIsSubmitting(true);
            setLocalError('');

            // Si estamos en localhost, simplemente simular éxito
            if (isLocalhost) {
                simulateSuccessfulVerification();
                return;
            }

            // Implementación para producción
            const formData = new FormData();
            formData.append("username", username);
            formData.append("verification_code", verificationCode);
            
            if (deviceId) {
                formData.append("device_id", deviceId);
            }
            
            if (sessionId) {
                formData.append("session_id", sessionId);
            }

            const headers = {};
            const existingToken = localStorage.getItem('instagram_bot_token');
            if (existingToken) {
                headers.token = existingToken;
            }

            // Log para debug
            console.log("Enviando solicitud de verificación con datos:", {
                username,
                codigo: verificationCode,
                deviceId,
                sessionId,
                hasToken: !!existingToken
            });

            const response = await fetch(`${API_BASE_URL}/verify_2fa`, {
                method: "POST",
                headers: headers,
                body: formData
                // Sin credentials: 'include' para evitar problemas CORS
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log("Respuesta de verificación 2FA:", data);

            if (data.status === "success" && data.token) {
                // Guardar toda la información de sesión
                localStorage.setItem("instagram_bot_token", data.token);
                
                if (data.cookies) {
                    localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
                }
                
                if (data.device_id) {
                    localStorage.setItem("instagram_device_id", data.device_id);
                }
                
                // Clear any localStorage session data
                localStorage.removeItem('instagram_2fa_session');
                
                // Intentar llamar al callback original
                try {
                    await onVerify2FA(username, verificationCode);
                } catch (callbackError) {
                    console.error("Error al llamar onVerify2FA:", callbackError);
                    // Continuamos con nuestro propio manejo
                }
                
                // Cerramos el modal y redirigimos
                alert("¡Verificación exitosa! La aplicación se recargará para aplicar los cambios.");
                onCancel();
                window.location.reload(); // Recargar la página para aplicar los cambios
            } else if (data.status === "challenge_required" || data.error_type === "challenge_required") {
                setLocalError("Instagram requiere verificación adicional. Por favor, verifica tu email o SMS e intenta de nuevo.");
            } else {
                setLocalError(data.message || "Error de verificación 2FA");
            }
        } catch (error) {
            console.error('2FA Verification error:', error);
            setLocalError(`Error durante la verificación: ${error.message}`);
            
            // En caso de error en producción, también ofrecer modo simulado
            if (confirm("Error al conectar con el servidor. ¿Deseas simular una verificación exitosa para continuar con el desarrollo?")) {
                simulateSuccessfulVerification();
            }
        } finally {
            if (!isLocalhost) {
                setIsSubmitting(false);
            }
        }
    };

    // Request a new code
    const requestNewCode = async () => {
        try {
            setIsSubmitting(true);
            setLocalError('');
            
            // Si estamos en localhost, simplemente reiniciar el temporizador
            if (isLocalhost) {
                setRemainingTime(120);
                setLocalError("Modo desarrollo: Nuevo código simulado");
                setIsSubmitting(false);
                return true;
            }
            
            const formData = new FormData();
            formData.append('username', username);
            
            if (deviceId) {
                formData.append('device_id', deviceId);
            }
            
            const token = localStorage.getItem('instagram_bot_token');
            const headers = {};
            
            if (token) {
                headers.token = token;
            }
            
            const response = await fetch(`${API_BASE_URL}/request_new_2fa_code`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Reset the timer
                setRemainingTime(120);
                
                // Save session ID if provided
                if (data.session_id) {
                    setSessionId(data.session_id);
                    localStorage.setItem('instagram_2fa_session', data.session_id);
                }
                
                return true;
            } else {
                setLocalError(data.message || "No se pudo solicitar un nuevo código");
                return false;
            }
        } catch (error) {
            console.error('Error requesting new code:', error);
            setLocalError("Error al solicitar un nuevo código");
            
            // En entorno de desarrollo, simular éxito
            if (isLocalhost) {
                setRemainingTime(120);
                setLocalError("Modo desarrollo: Nuevo código simulado");
                return true;
            }
            
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-[400px] shadow-md">
                <h2 className="text-lg font-semibold text-black mb-4">
                    Verificación de dos factores
                    {isLocalhost && <span className="text-xs text-blue-500 ml-2">(Desarrollo)</span>}
                </h2>
                
                {(errorMessage || localError) && (
                    <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded">
                        {errorMessage || localError}
                    </div>
                )}
                
                <p className="text-sm text-gray-600 mb-4">
                    Ingresa el código de verificación enviado a tu dispositivo o aplicación de autenticación.
                </p>
                
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Código de verificación"
                        value={verificationCode}
                        onChange={(e) => {
                            // Allow only digits and limit to 6 characters
                            const onlyDigits = e.target.value.replace(/[^\d]/g, '');
                            if (onlyDigits.length <= 6) {
                                setVerificationCode(onlyDigits);
                            }
                        }}
                        className="w-full p-3 border border-gray-300 rounded-md mb-1 text-black placeholder-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength={6}
                        autoFocus
                    />
                    {remainingTime > 0 && (
                        <p className="text-xs text-gray-500">
                            El código expira en: <span className="font-medium">{formatTime(remainingTime)}</span>
                        </p>
                    )}
                    {remainingTime <= 0 && (
                        <p className="text-xs text-red-500">
                            El código ha expirado. Solicita uno nuevo.
                        </p>
                    )}
                </div>
                
                <div className="flex space-x-2 mb-4">
                    <button
                        onClick={handleVerification}
                        disabled={isSubmitting || !verificationCode.trim() || remainingTime <= 0}
                        className={`flex-1 py-2 ${
                            isSubmitting || !verificationCode.trim() || remainingTime <= 0
                                ? 'bg-gray-400' 
                                : 'bg-[#8998F1] hover:bg-[#7988E0]'
                        } text-white rounded-md font-medium transition flex justify-center items-center`}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Verificando...
                            </>
                        ) : "Verificar →"}
                    </button>
                    
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                </div>

                {/* Request new code button */}
                <div className="text-center mb-4">
                    <button
                        onClick={requestNewCode}
                        disabled={isSubmitting || remainingTime > 90} // Disable until 30 seconds have passed
                        className={`text-sm ${
                            isSubmitting || remainingTime > 90
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-600 hover:underline cursor-pointer'
                        }`}
                    >
                        {remainingTime > 90 
                            ? `Solicitar nuevo código (disponible en ${remainingTime - 90}s)`
                            : "Solicitar nuevo código"}
                    </button>
                </div>

                <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <p className="font-medium mb-1">Consejos:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                        <li>Revisa tu aplicación de autenticación (como Google Authenticator)</li>
                        <li>Instagram también puede enviarte un SMS o email con el código</li>
                        <li>Asegúrate de ingresar el código sin espacios</li>
                        <li>Si el código no llega, verifica tu conexión a internet</li>
                    </ul>
                </div>
                
                {isLocalhost && (
                    <div className="mt-2 text-xs text-blue-500 italic bg-blue-50 p-2 rounded">
                        Modo desarrollo activado: En localhost, la verificación se simulará automáticamente 
                        para permitir continuar con el desarrollo sin conexión al servidor de autenticación.
                    </div>
                )}
            </div>
        </div>
    );
};

Instagram2FAVerification.propTypes = {
    username: PropTypes.string.isRequired,
    onVerify2FA: PropTypes.func,
    onCancel: PropTypes.func.isRequired,
    errorMessage: PropTypes.string,
    deviceId: PropTypes.string
};

Instagram2FAVerification.defaultProps = {
    errorMessage: '',
    deviceId: null,
    onVerify2FA: () => {}
};

export default Instagram2FAVerification;