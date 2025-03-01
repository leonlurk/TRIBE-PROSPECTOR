import { useState } from "react";
import PropTypes from "prop-types";

const ConnectInstagram = ({ user, onConnect, errorMessage, showModal, setShowModal, instagramToken  }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleConnectInstagram = async () => {
        await onConnect(email, password);
        setShowModal(false);
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
                        <h2 className="text-lg font-semibold text-black mb-4">Conectar cuenta de Instagram</h2>
                        {errorMessage && (
                <div className="text-red-500 text-sm mb-4">
                    {errorMessage}
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
                            <input type="checkbox" id="prospectar" className="cursor-pointer" />
                            <label htmlFor="prospectar" className="text-sm text-black cursor-pointer">
                                Prospectar lista de seguimiento
                            </label>
                        </div>

                        <button
                            onClick={handleConnectInstagram}
                            className="w-full py-2 bg-[#8998F1] text-white rounded-md font-medium hover:bg-[#7988E0] transition"
                        >
                            Siguiente →
                        </button>
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
    errorMessage: PropTypes.string,
    showModal: PropTypes.bool.isRequired,
    setShowModal: PropTypes.func.isRequired,
    instagramToken: PropTypes.string, 
};

export default ConnectInstagram;
