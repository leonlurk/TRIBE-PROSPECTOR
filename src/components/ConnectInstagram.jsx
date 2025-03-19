import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Instagram2FAVerification from "./Instagram2FAVerification";
import logApiRequest from "../requestLogger"; // Import the logger utility

const API_BASE_URL = "https://alets.com.ar";

const ConnectInstagram = ({ 
    user, 
    onConnect, 
    errorMessage, 
    showModal, 
    setShowModal, 
    instagramToken, 
    onVerify2FA,
    deviceId: propDeviceId, // Allow passing device ID from parent
    showNotification = () => {} // Add a simple notification function with empty default
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
    const [debugInfo, setDebugInfo] = useState(null); // To store debug information
    
    // Load device ID on component mount
    useEffect(() => {
        // Use deviceId from props if available, otherwise use from localStorage
        if (propDeviceId) {
            setDeviceId(propDeviceId);
        } else {
            const savedDeviceId = localStorage.getItem("instagram_device_id");
            if (savedDeviceId) {
                setDeviceId(savedDeviceId);
            } else {
                // Generate a random device ID if none exists
                const newDeviceId = 'android-' + Math.random().toString(36).substring(2, 15);
                setDeviceId(newDeviceId);
                localStorage.setItem("instagram_device_id", newDeviceId);
            }
        }
    }, [propDeviceId]);

    // Check for stored token on component mount
    useEffect(() => {
        const checkStoredToken = () => {
            // Check for token in multiple storage locations
            const tokenFromLS = localStorage.getItem("instagram_bot_token");
            const tokenFromSS = sessionStorage.getItem("instagram_bot_token");
            
            // Check cookies
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
                return null;
            };
            const tokenFromCookie = getCookie("instagram_token");
            
            // Use the first available token
            const availableToken = tokenFromLS || tokenFromSS || tokenFromCookie;
            
            if (availableToken && !instagramToken) {
                console.log("Found stored token, checking if valid...");
                // You might want to verify the token here
                checkSession(availableToken);
            }
        };
        
        checkStoredToken();
    }, [instagramToken]);

    // Function to check if token is valid
    const checkSession = async (token) => {
        try {
            console.log("Checking session validity...");
            const response = await fetch(`${API_BASE_URL}/session`, {
                method: "GET",
                headers: {
                    token: token,
                    'User-Agent': 'Instagram 219.0.0.12.117 Android'
                },
                credentials: 'include' // Include cookies in the request
            });
            
            if (!response.ok) {
                console.log("Session check failed, status:", response.status);
                return;
            }
            
            const data = await response.json();
            console.log("Session check response:", data);
            
            if (data.status === "success" && data.authenticated) {
                // Token is valid, you could update state or call a callback here
                console.log("Token is valid, session active");
                
                // Update cookies if provided
                if (data.cookies) {
                    localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
                }
                
                // Let the parent component know we have a valid token
                if (onConnect && typeof onConnect === 'function') {
                    onConnect(data.username || "", "");
                }
            }
        } catch (error) {
            console.error("Error checking session:", error);
        }
    };

    const handleCancel2FA = () => {
        setNeeds2FA(false);
        setUsername("");
    };

    // Success handler for 2FA verification
    const handle2FASuccess = (token) => {
        // Show success notification instead of alert
        showNotification("Verificación exitosa", "success");
        
        // Update state so UI reflects authenticated status
        setNeeds2FA(false);
        setShowModal(false);
        
        // Let the parent component know
        if (onConnect && typeof onConnect === 'function') {
            // Pass empty password for security
            onConnect(username, "");
        }
    };

    const handleConnectInstagram = async () => {
        // In case there's an existing token, try to validate it first
        const existingToken = localStorage.getItem("instagram_bot_token") || 
                              sessionStorage.getItem("instagram_bot_token");
        
        if (existingToken) {
            try {
                const response = await fetch(`${API_BASE_URL}/session`, {
                    method: "GET",
                    headers: {
                        token: existingToken,
                        'User-Agent': 'Instagram 219.0.0.12.117 Android'
                    },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === "success" && data.authenticated) {
                        // Already authenticated!
                        showNotification("Ya estás conectado a Instagram", "success");
                        setShowModal(false);
                        return;
                    }
                }
            } catch (error) {
                console.log("Error verifying existing token:", error);
                // Continue with login flow
            }
        }
        
        if (isSubmitting) return;
        
        // Reset error states
        setLocalErrorMessage("");
        setHasLoginError(false);
        setDebugInfo(null);
        
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
            
            // Log the Instagram connect attempt
            if (user) {
                await logApiRequest({
                    endpoint: "/login",
                    requestData: { username: email },
                    userId: user.uid,
                    status: "pending",
                    source: "ConnectInstagram",
                    metadata: {
                        action: "instagram_login_attempt"
                    }
                });
            }
            
            // Create FormData for the request
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);
            
            // Add device ID if available
            if (deviceId) {
                formData.append('device_id', deviceId);
                formData.append('login_attempt_count', "1");
            }
            
            // Set headers according to API specifications
            const headers = {
                'User-Agent': 'Instagram 219.0.0.12.117 Android',
                'Accept-Language': 'es-ES, en-US',
            };
            
            if (deviceId) {
                headers['X-IG-Device-ID'] = deviceId;
                headers['X-IG-Android-ID'] = deviceId;
            }
            
            // Add any existing cookies
            const storedCookies = localStorage.getItem('instagram_cookies');
            if (storedCookies) {
                try {
                    headers['Cookie'] = JSON.parse(storedCookies);
                    console.log("Using stored cookies for login");
                } catch (e) {
                    console.error("Error parsing stored cookies:", e);
                }
            }
            
            // Debug: Log the request being made
            console.log("Login request headers:", JSON.stringify(headers));
            console.log("Form data being sent:", {
                username: email,
                password: "******", // Don't log actual password
                deviceId: deviceId,
                hasDeviceId: !!deviceId,
                hasCookies: !!storedCookies
            });
            
            // Make the login request
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include' // Include cookies in the request
            });
            
            console.log("Login response status:", response.status);
            
            // Get response as text first for detailed logging
            const responseText = await response.text();
            console.log("Login response text:", responseText);
            
            // Parse the JSON response
            let data;
            try {
                data = JSON.parse(responseText);
                console.log("Parsed login response:", data);
            } catch (jsonError) {
                console.error("Error parsing login response as JSON:", jsonError);
                setLocalErrorMessage("Error: La respuesta del servidor no es un JSON válido");
                setHasLoginError(true);
                setDebugInfo({
                    error: "JSON parse error",
                    responseText: responseText,
                    status: response.status
                });
                throw new Error("Invalid JSON response");
            }
            
            // Log the Instagram login response
            if (user) {
                await logApiRequest({
                    endpoint: "/login",
                    requestData: { username: email },
                    userId: user.uid,
                    responseData: { 
                        status: data.status,
                        username: data.username || email
                    },
                    status: data.status === "success" ? "success" : "completed",
                    source: "ConnectInstagram",
                    metadata: {
                        action: "instagram_login_response",
                        loginStatus: data.status,
                        needs2FA: data.status === "needs_verification",
                        needsChallenge: data.status === "challenge_required" || data.error_type === "challenge_required"
                    }
                });
            }
            
            // Handle different response scenarios
            if (data.status === 'success' && data.token) {
                // Login successful
                // Store token in multiple places for redundancy
                // 1. LocalStorage (primary)
                localStorage.setItem("instagram_bot_token", data.token);
                
                // 2. SessionStorage (for tab-specific state)
                sessionStorage.setItem("instagram_bot_token", data.token);
                
                // 3. Cookie (for better cross-tab persistence)
                document.cookie = `instagram_token=${data.token}; path=/; max-age=2592000`; // 30 days
                
                // Also store username
                if (data.username) {
                    localStorage.setItem("instagram_username", data.username);
                }
                
                // Show success notification
                showNotification("Conectado a Instagram con éxito", "success");
                
                // Call parent component handler
                await onConnect(email, password);
                
                if (data.cookies) {
                    localStorage.setItem('instagram_cookies', JSON.stringify(data.cookies));
                }
                
                if (data.device_id) {
                    localStorage.setItem('instagram_device_id', data.device_id);
                    setDeviceId(data.device_id);
                }
                
                setShowModal(false);
            } 
            else if (data.status === 'needs_verification') {
                // 2FA verification needed
                console.log("Se requiere verificación 2FA para:", data.username || email);
                setNeeds2FA(true);
                setUsername(data.username || email);
                
                // Store any session data if provided
                if (data.session_id) {
                    localStorage.setItem('instagram_2fa_session', data.session_id);
                    console.log("Stored 2FA session ID:", data.session_id);
                }
                
                if (data.csrf_token) {
                    localStorage.setItem('instagram_csrf_token', data.csrf_token);
                    console.log("Stored CSRF token:", data.csrf_token);
                }
                
                if (data.two_factor_info) {
                    localStorage.setItem('instagram_2fa_info', JSON.stringify(data.two_factor_info));
                    console.log("Stored 2FA info");
                }
                
                // Store any cookies or identifiers that might be needed for 2FA
                if (data.cookies) {
                    localStorage.setItem('instagram_cookies', JSON.stringify(data.cookies));
                }
                
                // Set debug info for development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    setDebugInfo({
                        type: "needs_verification",
                        sessionData: {
                            username: data.username || email,
                            hasSessionId: !!data.session_id,
                            hasCsrfToken: !!data.csrf_token,
                            hasCookies: !!data.cookies,
                            has2FAInfo: !!data.two_factor_info
                        }
                    });
                }
            } 
            else if (data.status === 'challenge_required' || data.error_type === 'challenge_required') {
                // Challenge verification required
                console.log("Se requiere completar un desafío de seguridad");
                setLocalErrorMessage("Instagram requiere verificación adicional. Por favor, verifica tu email o SMS e intenta de nuevo.");
                setShowRecoveryInfo(true);
                
                // Save challenge info for debugging
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    setDebugInfo({
                        type: "challenge_required",
                        details: data
                    });
                }
                
                // Store challenge data if available
                if (data.challenge_url) {
                    localStorage.setItem('instagram_challenge_url', data.challenge_url);
                }
                
                if (data.challenge_id) {
                    localStorage.setItem('instagram_challenge_id', data.challenge_id);
                }
            } 
            else if (data.status === 'checkpoint_required' || data.error_type === 'checkpoint_challenge_required') {
                // Checkpoint verification required
                console.log("Se requiere verificación de dispositivo");
                setLocalErrorMessage("Instagram requiere verificación de dispositivo. Por favor, revise su email o SMS.");
                setShowRecoveryInfo(true);
                
                // Store checkpoint data if available
                if (data.checkpoint_url) {
                    localStorage.setItem('instagram_checkpoint_url', data.checkpoint_url);
                }
            }
            else if (data.status === 'error' && data.message) {
                // Handle error message
                if (data.message.includes("temporarily blocked") || data.message.includes("suspicious")) {
                    setLocalErrorMessage("Esta cuenta está temporalmente bloqueada por actividad sospechosa. Verifica tu email o accede directamente a Instagram para desbloquearla.");
                } else {
                    setLocalErrorMessage(data.message || "Error al conectar con Instagram");
                }
                setHasLoginError(true);
            }
            else {
                // Unknown error
                setLocalErrorMessage("Error desconocido al conectar con Instagram");
                setHasLoginError(true);
            }
        } catch (error) {
            console.error("Error during connection:", error);
            setLocalErrorMessage("Error de red o conexión con la API.");
            setHasLoginError(true);
            
            // Log the error
            if (user) {
                await logApiRequest({
                    endpoint: "/login",
                    requestData: { username: email },
                    userId: user.uid,
                    status: "error",
                    source: "ConnectInstagram",
                    metadata: {
                        error: error.message,
                        action: "instagram_login_error"
                    }
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle 2FA verification
    const handle2FAVerification = async (username, verificationCode) => {
        // Note: Most of the 2FA logic has been moved to the Instagram2FAVerification component
        // This function is now primarily used as a callback for the parent component's awareness
        try {
            // Log the 2FA verification attempt
            if (user) {
                await logApiRequest({
                    endpoint: "/verify_2fa",
                    requestData: { username },
                    userId: user.uid,
                    status: "pending",
                    source: "ConnectInstagram",
                    metadata: {
                        action: "instagram_2fa_verification"
                    }
                });
            }
            
            // The actual verification is handled in the Instagram2FAVerification component
            // This is just for notifying the parent component
            return { status: "success", username: username };
        } catch (error) {
            console.error("Error during 2FA verification callback:", error);
            
            // Log the 2FA verification error
            if (user) {
                await logApiRequest({
                    endpoint: "/verify_2fa",
                    requestData: { username },
                    userId: user.uid,
                    status: "error",
                    source: "ConnectInstagram",
                    metadata: {
                        error: error.message,
                        action: "instagram_2fa_verification"
                    }
                });
            }
            
            throw error;
        }
    };

    return (
        <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen">
            <h1 className="text-xl md:text-2xl font-bold mb-4 text-[#393346]">Bienvenido, {user?.displayName || "Usuario"}</h1>
            
            {/* Debug info for developers (only on localhost) */}
            {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && debugInfo && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                    <details>
                        <summary className="font-medium text-blue-700 cursor-pointer">Debug Information (Developer Only)</summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-60 p-2 bg-white border rounded">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
            
            <button
                onClick={() => setShowModal(true)}
                className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-full shadow-sm font-semibold hover:bg-blue-700 transition text-sm md:text-base"
            >
                Conectar Instagram
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-[400px] shadow-md">
                        {needs2FA ? (
                            <Instagram2FAVerification
                                username={username}
                                onVerify2FA={handle2FAVerification}
                                onCancel={handleCancel2FA}
                                errorMessage={errorMessage}
                                deviceId={deviceId}
                                user={user}
                                onSuccess={handle2FASuccess}
                            />
                        ) : showRecoveryInfo ? (
                            <>
                                <h2 className="text-base md:text-lg font-semibold text-black mb-4">Recuperar acceso a Instagram</h2>
                                <div className="text-gray-700 text-xs md:text-sm mb-4">
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
                                    className="w-full py-2 bg-[#8998F1] text-white rounded-md font-medium hover:bg-[#7988E0] transition text-sm md:text-base"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="text-base md:text-lg font-semibold text-black mb-4">Conectar cuenta de Instagram</h2>
                                {errorMessage && (
                                    <div className="text-red-500 text-xs md:text-sm mb-4 p-2 md:p-3 bg-red-50 rounded">
                                        {errorMessage}
                                    </div>
                                )}
                                {localErrorMessage && !errorMessage && (
                                    <div className="text-red-500 text-xs md:text-sm mb-4 p-2 md:p-3 bg-red-50 rounded">
                                        {localErrorMessage}
                                    </div>
                                )}
                                {hasLoginError && !errorMessage && !localErrorMessage && (
                                    <div className="text-red-500 text-xs md:text-sm mb-4 p-2 md:p-3 bg-red-50 rounded">
                                        Error al conectar. Verifica tus credenciales.
                                    </div>
                                )}
                                <input
                                    type="email"
                                    placeholder="Correo de Instagram"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-2 md:p-3 border border-gray-300 rounded-md mb-3 text-black placeholder-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm md:text-base"
                                />

                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 md:p-3 border border-gray-300 rounded-md mb-3 text-black placeholder-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm md:text-base"
                                />

                                <div className="flex items-start gap-2 mb-4">
                                    <input 
                                        type="checkbox" 
                                        id="prospectar" 
                                        className="mt-1 cursor-pointer" 
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    />
                                    <label htmlFor="prospectar" className="text-xs md:text-sm text-black cursor-pointer">
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
                                    } text-white rounded-md font-medium transition flex justify-center items-center text-sm md:text-base`}
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
                            <div className="mt-4 p-2 md:p-3 bg-gray-100 border rounded">
                                <p className="text-xs md:text-sm text-gray-600">Token de Instagram:</p>
                                <p className="text-xs font-mono break-all">{instagramToken.substring(0, 40)}...</p>
                            </div>
                        )}

                        <div className="text-right mt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 text-xs md:text-sm bg-[#CCCCCC] hover:bg-[#7988E0] transition px-3 md:px-4 py-1 md:py-2 rounded"
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
    deviceId: PropTypes.string,
    showNotification: PropTypes.func
};

ConnectInstagram.defaultProps = {
    errorMessage: '',
    instagramToken: '',
    deviceId: '',
    showNotification: () => {}
};

export default ConnectInstagram;