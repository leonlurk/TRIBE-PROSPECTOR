import PropTypes from 'prop-types';
import { useState } from 'react';

const ModalEditarPlantilla = ({ template, onClose }) => {
    const [nombre, setNombre] = useState(template.name || "");
    const [cuerpo, setCuerpo] = useState(`Hi / Hello / Bonjour\n\nJust wanted to say hello and wish you an amazing day ahead! 🚀\nJust wanted to say hi and spread some positivity your way. 👋🏻\nJust wanted to brighten your day with a quick hello! 🌸`);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-[500px] relative">
                
                {/* Botón de cerrar - sin fondo */}
                <button
                    className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition"
                    style={{ backgroundColor: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                    onClick={onClose}
                >
                    ✕
                </button>

                {/* Título */}
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Crear plantilla mensaje</h2>

                {/* Nombre de la plantilla */}
                <label className="text-gray-600 text-sm font-medium">Nombre de la plantilla</label>
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-3 mt-1 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C6CEFF] bg-white text-gray-700"
                    placeholder="Nombre de la plantilla"
                />

                {/* Cuerpo */}
                <label className="text-gray-600 text-sm font-medium">Cuerpo</label>
                <div className="border border-gray-300 rounded-lg mt-1">
                    <div className="flex items-center justify-between bg-[#F3F2FC] p-2 rounded-t-lg">
                        <button className="text-gray-600 text-xs font-medium bg-transparent border-none">👀 Vista previa</button>
                        <button className="text-gray-600 text-xs font-medium bg-transparent border-none">➕ Insertar variable</button>
                    </div>
                    <textarea
                        value={cuerpo}
                        onChange={(e) => setCuerpo(e.target.value)}
                        className="w-full p-3 border-t border-gray-300 focus:outline-none resize-none h-32 bg-white text-gray-700"
                    />
                </div>

                {/* Mejorar con IA */}
                <div className="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="mejorarIA" />
                    <label htmlFor="mejorarIA" className="text-gray-600 text-sm">Mejorar usando IA</label>
                </div>

                {/* Iconos (sin fondos negros) */}
                <div className="flex gap-4 text-gray-600 mt-4">
                    <button className="p-0 m-0 flex items-center justify-center" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        📝
                    </button>
                    <button className="p-0 m-0 flex items-center justify-center" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        📎
                    </button>
                    <button className="p-0 m-0 flex items-center justify-center" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        🎙️
                    </button>
                </div>

                {/* Botón Guardar (color ajustado) */}
                <button
                    className="mt-6 w-full bg-[#A0B1FF] text-[white] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#B0BAF5] transition"
                >
                    Guardar →
                </button>
            </div>
        </div>
    );
};

ModalEditarPlantilla.propTypes = {
    template: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default ModalEditarPlantilla;
