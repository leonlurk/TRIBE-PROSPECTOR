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
    user, // Add user prop to access user ID
    onSuccess // Add callback for successful verification
}) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [remainingTime, setRemainingTime] = useState(120); // 2 minute countdown
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [detailedDebugInfo, setDetailedDebugInfo] = useState(null); // Store detailed debug info

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
        
        // Also set in session storage for redundancy
        sessionStorage.setItem("instagram_bot_token", simulatedToken);
        
        // Set in cookie for better persistence
        document.cookie = `instagram_token=${simulatedToken}; path=/; max-age=2592000`; // 30 days
        
        // Simulate session cookies
        const simulatedCookies = `sessionid=${Date.now()}; csrftoken=${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("instagram_cookies", JSON.stringify(simulatedCookies));
        
        // Simulate device ID if it doesn't exist
        if (!localStorage.getItem("instagram_device_id")) {
            const devId = `dev_${Math.random().toString(36).substring(2, 10)}`;
            localStorage.setItem("instagram_device_id", devId);
            document.cookie = `instagram_device_id=${devId}; path=/; max-age=2592000`;
        }

        // Instead of alert and reload, use the success callback
        setTimeout(() => {
            if (onSuccess) {
                onSuccess(simulatedToken);
            } else {
                onCancel();
            }
        }, 1000);
    };

    const handleVerification = async () => {
        if (!verificationCode.trim()) {
            setLocalError("Por favor ingresa el código de verificación");
            return;
        }

        try {
            setIsSubmitting(true);
            setLocalError('');
            setDetailedDebugInfo(null);

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
            
            // Add any stored session data
            const sessionId = localStorage.getItem('instagram_2fa_session');
            if (sessionId) {
                formData.append("session_id", sessionId);
                console.log("Adding session_id to request:", sessionId);
            }
            
            const csrfToken = localStorage.getItem('instagram_csrf_token');
            if (csrfToken) {
                formData.append("csrf_token", csrfToken);
                console.log("Adding csrf_token to request:", csrfToken);
            }
            
            // Add any stored 2FA info
            const twoFactorInfo = localStorage.getItem('instagram_2fa_info');
            if (twoFactorInfo) {
                formData.append("two_factor_info", twoFactorInfo);
                console.log("Adding two_factor_info to request");
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
            
            // Add cookies if available
            const storedCookies = localStorage.getItem('instagram_cookies');
            if (storedCookies) {
                try {
                    headers['Cookie'] = JSON.parse(storedCookies);
                    console.log("Adding cookies to request");
                } catch (e) {
                    console.error("Error parsing stored cookies:", e);
                }
            }

            // Log request data for debugging
            console.log("Enviando solicitud de verificación 2FA:", {
                username,
                deviceId,
                endpoint: `${API_BASE_URL}/verify_2fa`,
                headers: JSON.stringify(headers)
            });

            // For debugging, print all form data
            console.log("Form data keys being sent:");
            for (let key of formData.keys()) {
                console.log(`- ${key}: ${formData.get(key) === verificationCode ? '******' : formData.get(key)}`);
            }

            const response = await fetch(`${API_BASE_URL}/verify_2fa`, {
                method: "POST",
                headers: headers,
                body: formData,
                credentials: 'include' // Include cookies in the request
            });

            console.log("2FA Response Status:", response.status);
            
            // Get response as text first for detailed logging
            const responseText = await response.text();
            console.log("2FA Response Text:", responseText);
            
            // Try to parse the response as JSON
            let data;
            try {
                data = JSON.parse(responseText);
                console.log("Parsed 2FA response:", data);
            } catch (jsonError) {
                console.error("Error parsing 2FA response as JSON:", jsonError);
                setLocalError("Error: La respuesta del servidor no es un JSON válido");
                setDetailedDebugInfo({
                    error: "JSON parse error",
                    responseText: responseText,
                    status: response.status
                });
                throw new Error("Invalid JSON response");
            }

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
                // Store authentication data in multiple storage mechanisms for redundancy
                
                // 1. LocalStorage (primary)
                localStorage.setItem("instagram_bot_token", data.token);
                
                // 2. SessionStorage (backup)
                sessionStorage.setItem("instagram_bot_token", data.token);
                
                // 3. Cookie (for better persistence and cross-tab usage)
                document.cookie = `instagram_token=${data.token}; path=/; max-age=2592000`; // 30 days
                
                if (data.cookies) {
                    // Store original cookies
                    localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
                    
                    // Also try to set them as actual browser cookies if they're in string format
                    if (typeof data.cookies === 'string') {
                        document.cookie = data.cookies + "; path=/";
                    } else if (Array.isArray(data.cookies)) {
                        data.cookies.forEach(cookie => {
                            if (typeof cookie === 'string') {
                                document.cookie = cookie + "; path=/";
                            }
                        });
                    }
                }
                
                if (data.device_id) {
                    localStorage.setItem("instagram_device_id", data.device_id);
                    document.cookie = `instagram_device_id=${data.device_id}; path=/; max-age=2592000`;
                }
                
                if (data.username) {
                    localStorage.setItem("instagram_username", data.username);
                }
                
                // Try calling the original callback
                try {
                    // Call the parent's verification function
                    const result = await onVerify2FA(username, verificationCode);
                    
                    // Log any issues with parent callback
                    if (result && result.status !== "success") {
                        console.warn("Parent verify2FA returned non-success status:", result);
                    }
                } catch (callbackError) {
                    console.error("Error al llamar onVerify2FA:", callbackError);
                    
                    // Log the callback error but continue since we've already stored the token
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
                }
                
                // Call success callback instead of reload
                if (onSuccess) {
                    onSuccess(data.token);
                } else {
                    // Fallback if no success callback provided
                    onCancel();
                }
            } else if (data.status === "challenge_required" || data.error_type === "challenge_required") {
                setLocalError("Instagram requiere verificación adicional. Por favor, verifica tu email o SMS e intenta de nuevo.");
                setDetailedDebugInfo({
                    type: "challenge_required",
                    details: data
                });
            } else {
                setLocalError(data.message || "Error de verificación 2FA");
                setDetailedDebugInfo({
                    type: "other_error",
                    details: data
                });
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
            
            // Add cookies if available
            const storedCookies = localStorage.getItem('instagram_cookies');
            if (storedCookies) {
                try {
                    headers['Cookie'] = JSON.parse(storedCookies);
                } catch (e) {
                    console.error("Error parsing stored cookies:", e);
                }
            }
            
            // Add stored session data
            const sessionId = localStorage.getItem('instagram_2fa_session');
            if (sessionId) {
                formData.append("session_id", sessionId);
            }
            
            // This endpoint may need to be adjusted based on the actual API
            const response = await fetch(`${API_BASE_URL}/request_new_2fa_code`, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include' // Include cookies in the request
            });
            
            // Log the raw response for debugging
            console.log("Request new code status:", response.status);
            const responseText = await response.text();
            console.log("Request new code response:", responseText);
            
            // Parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Error parsing response:", e);
                setLocalError("Error: respuesta no válida del servidor");
                return false;
            }
            
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
            
            {/* Debug Info Section - only show in local development */}
            {isLocalhost && detailedDebugInfo && (
                <div className="mt-3 border border-blue-300 rounded p-2 bg-blue-50">
                    <details>
                        <summary className="text-xs text-blue-700 cursor-pointer font-medium">Debug Info (Developer Only)</summary>
                        <pre className="text-xs mt-2 overflow-auto max-h-32">
                            {JSON.stringify(detailedDebugInfo, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
            
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
    user: PropTypes.object,
    onSuccess: PropTypes.func // Add callback for successful verification
};

Instagram2FAVerification.defaultProps = {
    errorMessage: '',
    deviceId: null,
    onVerify2FA: () => {},
    user: null,
    onSuccess: null
};

export default Instagram2FAVerification;