import { useState } from "react";
import PropTypes from "prop-types";
import Instagram2FAVerification from "./Instagram2FAVerification";

const ConnectInstagram = ({ user, onConnect, errorMessage, showModal, setShowModal, instagramToken, onVerify2FA }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [needs2FA, setNeeds2FA] = useState(false);
    const [username, setUsername] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasLoginError, setHasLoginError] = useState(false);
    const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleCancel2FA = () => {
        setNeeds2FA(false);
        setUsername("");
    };

    const handleConnectInstagram = async () => {
        if (isSubmitting) return;
        
        // Check terms first
        if (!acceptedTerms) {
            setHasLoginError(true);
            return;
        }
        
        if (!email || !password) {
            setHasLoginError(true);
            return;
        }
        
        try {
            setIsSubmitting(true);
            setHasLoginError(false);
            
            const result = await onConnect(email, password);
            
            // If 2FA is needed, set the 2FA state
            if (result && result.status === "needs_verification") {
                setNeeds2FA(true);
                setUsername(result.username);
            } else if (result && result.status === "success") {
                setShowModal(false);
            } else if (result && (
                result.status === "challenge_required" || 
                result.error_type === "challenge_required" ||
                result.status === "checkpoint_required"
            )) {
                setShowRecoveryInfo(true);
            }
        } catch (error) {
            console.error("Error during connection:", error);
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
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
                    <div className="bg-white rounded-lg p-6 w-[400px] shadow-md">
                        {needs2FA ? (
                            <Instagram2FAVerification
                                username={username}
                                onVerify2FA={onVerify2FA}
                                onCancel={handleCancel2FA}
                                errorMessage={errorMessage}
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
                                    <div className="text-red-500 text-sm mb-4">
                                        {errorMessage}
                                    </div>
                                )}
                                {hasLoginError && !errorMessage && (
                                    <div className="text-red-500 text-sm mb-4">
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
                                    } text-white rounded-md font-medium transition`}
                                >
                                    {isSubmitting ? "Conectando..." : "Siguiente →"}
                                </button>
                            </>
                        )}

                        {instagramToken && (
                            <div className="mt-4 p-3 bg-gray-100 border rounded">
                                <p className="text-sm text-gray-600">Token de Instagram:</p>
                                <p className="text-xs font-mono break-all">{instagramToken}</p>
                            </div>
                        )}

                        <div className="text-right mt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 text-sm bg-[#CCCCCC] hover:bg-[#7988E0] transition px-4 py-2 rounded"
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

export default ConnectInstagram;