import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import logApiRequest from "../requestLogger";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { saveInstagramSession } from "../instagramSessionUtils"; 

const API_BASE_URL = "https://alets.com.ar";

const Instagram2FAVerification = ({
  username,
  onVerify2FA,   // callback al padre
  onCancel,
  errorMessage,
  deviceId,
  user,
}) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const [remainingTime, setRemainingTime] = useState(120);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [detailedDebugInfo, setDetailedDebugInfo] = useState(null);

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
    setSnackbarMessage("");
  };

  useEffect(() => {
    setIsLocalhost(
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    );
  }, []);

  // Cuenta regresiva
  useEffect(() => {
    const storedCookies = localStorage.getItem("instagram_cookies");
    if (storedCookies) {
      try {
        JSON.parse(storedCookies);
      } catch (e) {
        console.error("Error parsing stored cookies:", e);
      }
    }

    if (remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Modo dev
  const simulateSuccessfulVerification = async () => {
    setLocalError("Modo desarrollo: Simulando verificación exitosa...");
    if (user) {
      await logApiRequest({
        endpoint: "/verify_2fa",
        requestData: { username, device_id: deviceId, mode: "development" },
        userId: user.uid,
        status: "simulated",
        source: "Instagram2FAVerification",
        metadata: {
          action: "instagram_2fa_simulation",
          environment: "development",
        },
      });
    }

    const simulatedToken = `IGT-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    localStorage.setItem("instagram_bot_token", simulatedToken);

    const simulatedCookies = `sessionid=${Date.now()}; csrftoken=${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    localStorage.setItem("instagram_cookies", JSON.stringify(simulatedCookies));

    if (!localStorage.getItem("instagram_device_id")) {
      localStorage.setItem(
        "instagram_device_id",
        `dev_${Math.random().toString(36).substring(2, 10)}`
      );
    }

    showSnackbar("¡Verificación exitosa en modo desarrollo!", "success");
    onCancel();
  };

  // POST /verify_2fa
  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      setLocalError("Por favor ingresa el código de verificación");
      return;
    }
    try {
      setIsSubmitting(true);
      setLocalError("");
      setDetailedDebugInfo(null);

      if (isLocalhost) {
        await simulateSuccessfulVerification();
        setIsSubmitting(false);
        return;
      }

      if (user) {
        await logApiRequest({
          endpoint: "/verify_2fa",
          requestData: { username, device_id: deviceId },
          userId: user.uid,
          status: "pending",
          source: "Instagram2FAVerification",
          metadata: { action: "instagram_2fa_verification" },
        });
      }

      const formData = new FormData();
      formData.append("username", username);
      formData.append("verification_code", verificationCode);
      if (deviceId) {
        formData.append("device_id", deviceId);
      }

      // Info 2FA
      const sessionId = localStorage.getItem("instagram_2fa_session");
      if (sessionId) {
        formData.append("session_id", sessionId);
      }
      const csrfToken = localStorage.getItem("instagram_csrf_token");
      if (csrfToken) {
        formData.append("csrf_token", csrfToken);
      }
      const twoFactorInfo = localStorage.getItem("instagram_2fa_info");
      if (twoFactorInfo) {
        formData.append("two_factor_info", twoFactorInfo);
      }

      const headers = {
        "User-Agent": "Instagram 219.0.0.12.117 Android",
        "Accept-Language": "es-ES, en-US",
      };
      if (deviceId) {
        headers["X-IG-Device-ID"] = deviceId;
        headers["X-IG-Android-ID"] = deviceId;
      }
      const storedCookies = localStorage.getItem("instagram_cookies");
      if (storedCookies) {
        try {
          headers["Cookie"] = JSON.parse(storedCookies);
        } catch (e) {
          console.error("Error parsing stored cookies:", e);
        }
      }

      console.log("Enviando solicitud de verificación 2FA:", {
        username,
        deviceId,
        endpoint: `${API_BASE_URL}/verify_2fa`,
        headers: JSON.stringify(headers),
      });
      console.log("Form data keys being sent:");
      for (let key of formData.keys()) {
        console.log(`- ${key}: ${formData.get(key)}`);
      }

      const response = await fetch(`${API_BASE_URL}/verify_2fa`, {
        method: "POST",
        headers: headers,
        body: formData,
      });

      console.log("2FA Response Status:", response.status);

      const responseText = await response.text();
      console.log("2FA Response Text:", responseText);

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
          status: response.status,
        });
        throw new Error("Invalid JSON response");
      }

      // Log
      if (user) {
        await logApiRequest({
          endpoint: "/verify_2fa",
          requestData: { username, device_id: deviceId },
          userId: user.uid,
          responseData: {
            status: data.status,
            username: data.username || username,
          },
          status: data.status === "success" ? "success" : "completed",
          source: "Instagram2FAVerification",
          metadata: { action: "instagram_2fa_verification" },
        });
      }

      if (data.status === "success" && data.token) {
        // Guardar token y cookies en localStorage (mantener para compatibilidad)
        localStorage.setItem("instagram_bot_token", data.token);
        if (data.cookies) {
          localStorage.setItem("instagram_cookies", JSON.stringify(data.cookies));
        }
        if (data.device_id) {
          localStorage.setItem("instagram_device_id", data.device_id);
        }
        if (data.username) {
          localStorage.setItem("instagram_username", data.username);
        }
        
        // Guardar en Firebase para persistencia
        // Guardar en Firebase para persistencia con verificación mejorada
if (user && user.uid) {
  console.log("Intentando guardar con UID después de 2FA:", user.uid);
  try {
    await saveInstagramSession(user.uid, {
      token: data.token,
      username: data.username || username,
      deviceId: data.device_id || deviceId,
      cookies: data.cookies
    });
    
    console.log("Sesión de Instagram guardada en Firebase correctamente después de 2FA");
  } catch (firebaseError) {
    console.error("Error al guardar sesión en Firebase después de 2FA:", firebaseError);
    console.error("Detalles del error:", JSON.stringify(firebaseError));
  }
} else {
  console.error("No se puede guardar en Firebase después de 2FA: usuario o UID no definido", user);
}
        
        showSnackbar("¡Verificación exitosa!", "success");
      
        // Notificar al padre -> redirigir a 'Nueva solicitud'
        try {
          await onVerify2FA(data.token);
        } catch (callbackError) {
          console.error("Error al llamar onVerify2FA:", callbackError);
          if (user) {
            await logApiRequest({
              endpoint: "/verify_2fa",
              requestData: { username, device_id: deviceId },
              userId: user.uid,
              status: "error",
              source: "Instagram2FAVerification",
              metadata: {
                error: callbackError.message,
                action: "instagram_2fa_callback",
              },
            });
          }
        }
      
        onCancel(); // Cierra modal
      } else if (data.status === "challenge_required" || data.error_type === "challenge_required") {
        setLocalError(
          "Instagram requiere verificación adicional. Por favor, verifica tu email o SMS e intenta de nuevo."
        );
        setDetailedDebugInfo({ type: "challenge_required", details: data });
      } else {
        setLocalError(data.message || "Error de verificación 2FA");
        setDetailedDebugInfo({ type: "other_error", details: data });
      }
    } catch (error) {
      console.error("2FA Verification error:", error);
      setLocalError(`Error durante la verificación: ${error.message}`);

      if (user) {
        await logApiRequest({
          endpoint: "/verify_2fa",
          requestData: { username, device_id: deviceId },
          userId: user.uid,
          status: "error",
          source: "Instagram2FAVerification",
          metadata: {
            error: error.message,
            action: "instagram_2fa_verification",
          },
        });
      }

      // Modo simulado
      if (
        confirm(
          "Error al conectar con el servidor. ¿Deseas simular una verificación exitosa para continuar con el desarrollo?"
        )
      ) {
        await simulateSuccessfulVerification();
      }
    } finally {
      if (!isLocalhost) {
        setIsSubmitting(false);
      }
    }
  };

  // Solicitar nuevo código
  const requestNewCode = async () => {
    try {
      setIsSubmitting(true);
      setLocalError("");
      if (isLocalhost) {
        setRemainingTime(120);
        setLocalError("Modo desarrollo: Nuevo código simulado");
        setIsSubmitting(false);
        return true;
      }

      if (user) {
        await logApiRequest({
          endpoint: "/request_new_2fa_code",
          requestData: { username, device_id: deviceId },
          userId: user.uid,
          status: "pending",
          source: "Instagram2FAVerification",
          metadata: { action: "instagram_request_new_2fa_code" },
        });
      }

      const formData = new FormData();
      formData.append("username", username);
      if (deviceId) {
        formData.append("device_id", deviceId);
      }

      const headers = {
        "User-Agent": "Instagram 219.0.0.12.117 Android",
        "Accept-Language": "es-ES, en-US",
      };
      if (deviceId) {
        headers["X-IG-Device-ID"] = deviceId;
        headers["X-IG-Android-ID"] = deviceId;
      }
      const storedCookies = localStorage.getItem("instagram_cookies");
      if (storedCookies) {
        try {
          headers["Cookie"] = JSON.parse(storedCookies);
        } catch (e) {
          console.error("Error parsing stored cookies:", e);
        }
      }
      const sessionId = localStorage.getItem("instagram_2fa_session");
      if (sessionId) {
        formData.append("session_id", sessionId);
      }

      const response = await fetch(`${API_BASE_URL}/request_new_2fa_code`, {
        method: "POST",
        headers: headers,
        body: formData,
      });

      console.log("Request new code status:", response.status);
      const responseText = await response.text();
      console.log("Request new code response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing response:", e);
        setLocalError("Error: respuesta no válida del servidor");
        return false;
      }

      if (user) {
        await logApiRequest({
          endpoint: "/request_new_2fa_code",
          requestData: { username, device_id: deviceId },
          userId: user.uid,
          responseData: { status: data.status },
          status: data.status === "success" ? "success" : "completed",
          source: "Instagram2FAVerification",
          metadata: { action: "instagram_request_new_2fa_code" },
        });
      }

      if (data.status === "success") {
        setRemainingTime(120);
        showSnackbar("Nuevo código solicitado. Revisa tu Instagram.", "success");
        return true;
      } else {
        setLocalError(data.message || "No se pudo solicitar un nuevo código");
        return false;
      }
    } catch (error) {
      console.error("Error requesting new code:", error);
      setLocalError("Error al solicitar un nuevo código");
      if (user) {
        await logApiRequest({
          endpoint: "/request_new_2fa_code",
          requestData: { username, device_id: deviceId },
          userId: user.uid,
          status: "error",
          source: "Instagram2FAVerification",
          metadata: {
            error: error.message,
            action: "instagram_request_new_2fa_code",
          },
        });
      }
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
            const onlyDigits = e.target.value.replace(/[^\d]/g, "");
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
          <p className="text-xs text-red-500">El código ha expirado. Solicita uno nuevo.</p>
        )}
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={handleVerification}
          disabled={isSubmitting || !verificationCode.trim() || remainingTime <= 0}
          className={`flex-1 py-2 ${
            isSubmitting || !verificationCode.trim() || remainingTime <= 0
              ? "bg-gray-400"
              : "bg-[#8998F1] hover:bg-[#7988E0]"
          } text-white rounded-md font-medium transition flex justify-center items-center text-xs md:text-sm`}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Verificando...
            </>
          ) : (
            "Verificar →"
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-xs md:text-sm"
        >
          Cancelar
        </button>
      </div>

      {/* Botón nuevo código */}
      <div className="text-center mb-4">
        <button
          onClick={requestNewCode}
          disabled={isSubmitting || remainingTime > 90}
          className={`text-xs md:text-sm ${
            isSubmitting || remainingTime > 90
              ? "text-gray-400 cursor-not-allowed"
              : "text-blue-600 hover:underline cursor-pointer"
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

      {isLocalhost && detailedDebugInfo && (
        <div className="mt-3 border border-blue-300 rounded p-2 bg-blue-50">
          <details>
            <summary className="text-xs text-blue-700 cursor-pointer font-medium">
              Debug Info (Developer Only)
            </summary>
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
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
};

Instagram2FAVerification.defaultProps = {
  errorMessage: "",
  deviceId: null,
  onVerify2FA: () => {},
  user: null,
};

export default Instagram2FAVerification;
