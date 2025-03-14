import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import logApiRequest from '../requestLogger'; // Import the logger utility

const API_BASE_URL = "https://alets.com.ar";

const Instagram2FAVerification = ({ 
    username, 
    onVerify2FA, 
    onCancel, 
    errorMessage,
    deviceId,
    user // Add user prop to access user ID
}) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [remainingTime, setRemainingTime] = useState(120); // 2 minute countdown
    const [isLocalhost, setIsLocalhost] = useState(false);

    // Determine if we're running on localhost
    useEffect(() => {
        setIsLocalhost(window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1');
    }, []);

    // Set up countdown timer for verification code expiry
    useEffect(() => {
        // Load stored cookies if available
        const storedCookies = localStorage.getItem('instagram_cookies');
        if (storedCookies) {
            try {
                JSON.parse(storedCookies);
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

    // Function for development mode - simulates a successful verification
    const simulateSuccessfulVerification = async () => {
        setLocalError("Modo desarrollo: Simulando verificación exitosa...");
        
        // Log the simulated verification
        if (user) {
            await logApiRequest({
                endpoint: "/verify_2fa",
                requestData: {
                    username,
                    device_id: deviceId,
                    mode: "development"
                },
                userId: user.uid,
                status: "simulated",
                source: "Instagram2FAVerification",
                metadata: {
                    action: "instagram_2fa_simulation",
                    environment: "development"
                }
            });
        }
        
        // Generate simulated token
        const simulatedToken = `IGT-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
        localStorage.setItem("instagram_bot_token", simulatedToken);
        
        // Simulate session cookies
        const simulatedCookies = `sessionid=${Date.now()}; csrftoken=${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("instagram_cookies", JSON.stringify(simulatedCookies));
        
        // Simulate device ID if it doesn't exist
        if (!localStorage.getItem("instagram_device_id")) {
            localStorage.setItem("instagram_device_id", `dev_${Math.random().toString(36).substring(2, 10)}`);
        }
        
        // Notify user and reload
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

            // If we're on localhost, just simulate success
            if (isLocalhost) {
                await simulateSuccessfulVerification();
                return;
            }

            // Log the verification attempt
            if (user) {
                await logApiRequest({
                    endpoint: "/verify_2fa",
                    requestData: {
                        username,
                        device_id: deviceId
                    },
                    userId: user.uid,
                    status: "pending",
                    source: "Instagram2FAVerification",
                    metadata: {
                        action: "instagram_2fa_verification"
                    }
                });
            }

            // Implementation for production
            const formData = new FormData();
            formData.append("username", username);
            formData.append("verification_code", verificationCode);
            
            if (deviceId) {
                formData.append("device_id", deviceId);
            }

            // Prepare headers according to API specs
            const headers = {
                'User-Agent': 'Instagram 219.0.0.12.117 Android',
                'Accept-Language': 'es-ES, en-US'
            };

            if (deviceId) {
                headers['X-IG-Device-ID'] = deviceId;
                headers['X-IG-Android-ID'] = deviceId;
            }

            // Log request data for debugging
            console.log("Enviando solicitud de verificación 2FA:", {
                username,
                deviceId,
                endpoint: `${API_BASE_URL}/verify_2fa`
            });

            const response = await fetch(`${API_BASE_URL}/verify_2fa`, {
                method: "POST",
                headers: headers,
                body: formData
            });

            const data = await response.json();
            console.log("Respuesta de verificación 2FA:", data);

            // Log the verification response
            if (user) {
                await logApiRequest({
                    endpoint: "/verify_2fa",
                    requestData: {
                        username,
                        device_id: deviceId
                    },
                    userId: user.uid,
                    responseData: { 
                        status: data.status,
                        username: data.username || username
                    },
                    status: data.status === "success" ? "success" : "completed",
                    source: "Instagram2FAVerification",
                    metadata: {
                        action: "instagram_2fa_verification"
                    }
                });
            }

            if (data.status === "success" && data.token) {
                // Store authentication data
                localStorage.setItem("instagram_bot_token", data.token);
                
                if (data.cookies) {
                    localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
                }
                
                if (data.device_id) {
                    localStorage.setItem("instagram_device_id", data.device_id);
                }
                
                // Try calling the original callback
                try {
                    await onVerify2FA(username, verificationCode);
                } catch (callbackError) {
                    console.error("Error al llamar onVerify2FA:", callbackError);
                    
                    // Log the callback error
                    if (user) {
                        await logApiRequest({
                            endpoint: "/verify_2fa",
                            requestData: {
                                username,
                                device_id: deviceId
                            },
                            userId: user.uid,
                            status: "error",
                            source: "Instagram2FAVerification",
                            metadata: {
                                error: callbackError.message,
                                action: "instagram_2fa_callback"
                            }
                        });
                    }
                    
                    // Continue with our own handling
                }
                
                // Close modal and redirect
                alert("¡Verificación exitosa! La aplicación se recargará para aplicar los cambios.");
                onCancel();
                window.location.reload();
            } else if (data.status === "challenge_required" || data.error_type === "challenge_required") {
                setLocalError("Instagram requiere verificación adicional. Por favor, verifica tu email o SMS e intenta de nuevo.");
            } else {
                setLocalError(data.message || "Error de verificación 2FA");
            }
        } catch (error) {
            console.error('2FA Verification error:', error);
            setLocalError(`Error durante la verificación: ${error.message}`);
            
            // Log the error
            if (user) {
                await logApiRequest({
                    endpoint: "/verify_2fa",
                    requestData: {
                        username,
                        device_id: deviceId
                    },
                    userId: user.uid,
                    status: "error",
                    source: "Instagram2FAVerification",
                    metadata: {
                        error: error.message,
                        action: "instagram_2fa_verification" 
                    }
                });
            }
            
            // In case of error in production, also offer simulated mode
            if (confirm("Error al conectar con el servidor. ¿Deseas simular una verificación exitosa para continuar con el desarrollo?")) {
                await simulateSuccessfulVerification();
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
            
            // If we're on localhost, just reset the timer
            if (isLocalhost) {
                setRemainingTime(120);
                setLocalError("Modo desarrollo: Nuevo código simulado");
                setIsSubmitting(false);
                return true;
            }
            
            // Log the request for a new code
            if (user) {
                await logApiRequest({
                    endpoint: "/request_new_2fa_code",
                    requestData: {
                        username,
                        device_id: deviceId
                    },
                    userId: user.uid,
                    status: "pending",
                    source: "Instagram2FAVerification",
                    metadata: {
                        action: "instagram_request_new_2fa_code"
                    }
                });
            }
            
            const formData = new FormData();
            formData.append('username', username);
            
            if (deviceId) {
                formData.append('device_id', deviceId);
            }
            
            const headers = {
                'User-Agent': 'Instagram 219.0.0.12.117 Android',
                'Accept-Language': 'es-ES, en-US'
            };
            
            if (deviceId) {
                headers['X-IG-Device-ID'] = deviceId;
                headers['X-IG-Android-ID'] = deviceId;
            }
            
            // This endpoint may need to be adjusted based on the actual API
            const response = await fetch(`${API_BASE_URL}/request_new_2fa_code`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            const data = await response.json();
            
            // Log the response
            if (user) {
                await logApiRequest({
                    endpoint: "/request_new_2fa_code",
                    requestData: {
                        username,
                        device_id: deviceId
                    },
                    userId: user.uid,
                    responseData: { status: data.status },
                    status: data.status === "success" ? "success" : "completed",
                    source: "Instagram2FAVerification",
                    metadata: {
                        action: "instagram_request_new_2fa_code"
                    }
                });
            }
            
            if (data.status === 'success') {
                // Reset the timer
                setRemainingTime(120);
                return true;
            } else {
                setLocalError(data.message || "No se pudo solicitar un nuevo código");
                return false;
            }
        } catch (error) {
            console.error('Error requesting new code:', error);
            setLocalError("Error al solicitar un nuevo código");
            
            // Log the error
            if (user) {
                await logApiRequest({
                    endpoint: "/request_new_2fa_code",
                    requestData: {
                        username,
                        device_id: deviceId
                    },
                    userId: user.uid,
                    status: "error",
                    source: "Instagram2FAVerification",
                    metadata: {
                        error: error.message,
                        action: "instagram_request_new_2fa_code"
                    }
                });
            }
            
            // For development environment, simulate success
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
        <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md shadow-md">
            <h2 className="text-base md:text-lg font-semibold text-black mb-4">
                Verificación de dos factores
                {isLocalhost && <span className="text-xs text-blue-500 ml-2">(Desarrollo)</span>}
            </h2>
            
            {(errorMessage || localError) && (
                <div className="text-red-500 text-xs md:text-sm mb-4 p-2 md:p-3 bg-red-50 rounded">
                    {errorMessage || localError}
                </div>
            )}
            
            <p className="text-xs md:text-sm text-gray-600 mb-4">
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
                    className="w-full p-2 md:p-3 border border-gray-300 rounded-md mb-1 text-black placeholder-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm md:text-base"
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
                    } text-white rounded-md font-medium transition flex justify-center items-center text-xs md:text-sm`}
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
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-xs md:text-sm"
                >
                    Cancelar
                </button>
            </div>

            {/* Request new code button */}
            <div className="text-center mb-4">
                <button
                    onClick={requestNewCode}
                    disabled={isSubmitting || remainingTime > 90} // Disable until 30 seconds have passed
                    className={`text-xs md:text-sm ${
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

            <div className="mt-4 text-xs md:text-sm text-gray-600 bg-gray-50 p-2 md:p-3 rounded">
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
    );
};

Instagram2FAVerification.propTypes = {
    username: PropTypes.string.isRequired,
    onVerify2FA: PropTypes.func,
    onCancel: PropTypes.func.isRequired,
    errorMessage: PropTypes.string,
    deviceId: PropTypes.string,
    user: PropTypes.object
};

Instagram2FAVerification.defaultProps = {
    errorMessage: '',
    deviceId: null,
    onVerify2FA: () => {},
    user: null
};

export default Instagram2FAVerification;