import { useState } from 'react';
import PropTypes from 'prop-types';

const Instagram2FAVerification = ({ 
    username, 
    onVerify2FA, 
    onCancel, 
    errorMessage 
}) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleVerification = async () => {
        if (!verificationCode.trim()) {
            return;
        }

        try {
            setIsSubmitting(true);
            await onVerify2FA(username, verificationCode);
        } catch (error) {
            console.error('2FA Verification error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 w-[400px] shadow-md">
                <h2 className="text-lg font-semibold text-black mb-4">Verificación de dos factores</h2>
                
                {errorMessage && (
                    <div className="text-red-500 text-sm mb-4">
                        {errorMessage}
                    </div>
                )}
                
                <p className="text-sm text-gray-600 mb-4">
                    Ingresa el código de verificación enviado a tu dispositivo o aplicación de autenticación.
                </p>
                
                <input
                    type="text"
                    placeholder="Código de verificación"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md mb-3 text-black placeholder-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                
                <div className="flex space-x-2">
                    <button
                        onClick={handleVerification}
                        disabled={isSubmitting || !verificationCode.trim()}
                        className={`flex-1 py-2 ${
                            isSubmitting || !verificationCode.trim() 
                                ? 'bg-gray-400' 
                                : 'bg-[#8998F1] hover:bg-[#7988E0]'
                        } text-white rounded-md font-medium transition`}
                    >
                        {isSubmitting ? "Verificando..." : "Verificar →"}
                    </button>
                    
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    <p>Consejos:</p>
                    <ul className="list-disc list-inside">
                        <li>Revisa tu aplicación de autenticación</li>
                        <li>Verifica que el código no haya expirado</li>
                        <li>Asegúrate de ingresar el código correctamente</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

Instagram2FAVerification.propTypes = {
    username: PropTypes.string.isRequired,
    onVerify2FA: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    errorMessage: PropTypes.string
};

export default Instagram2FAVerification;