import React from 'react';
import PropTypes from 'prop-types';

/**
 * Componente que proporciona una interfaz para escribir y enviar mensajes 
 * o comentarios a usuarios de Instagram.
 * 
 * Puede funcionar en dos modos: para enviar mensajes directos o para
 * comentar en publicaciones, según el prop 'type'.
 */
const MessagePanel = ({ 
  type, 
  mensaje, 
  setMensaje, 
  selectedTemplate, 
  sendAction, 
  loading, 
  usersCount 
}) => {
  const isMessageMode = type === "mensaje";
  const title = isMessageMode ? "Enviar Mensajes" : "Escribir Comentario";
  const placeholder = isMessageMode 
    ? "Escribe un mensaje para enviar a los usuarios" 
    : "Escribe un comentario para las publicaciones";
  const buttonText = isMessageMode ? "Enviar mensajes" : "Comentar publicaciones";

  return (
    <div className="flex-1 bg-gray-100 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-black">{title}</h3>
        
        {selectedTemplate && (
          <div className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-700">
            Plantilla: {selectedTemplate.name}
          </div>
        )}
      </div>
      
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        className="w-full h-56 p-3 border rounded-lg resize-none bg-white text-black"
        placeholder={placeholder}
        disabled={loading}
        aria-label={placeholder}
      />
      
      <button 
        className="w-full bg-blue-600 text-white rounded-full py-2 mt-3"
        onClick={sendAction}
        disabled={loading || usersCount === 0 || !mensaje.trim()}
      >
        {loading ? "Enviando..." : buttonText}
      </button>
    </div>
  );
};

MessagePanel.propTypes = {
  type: PropTypes.oneOf(["mensaje", "comentario"]).isRequired,
  mensaje: PropTypes.string.isRequired,
  setMensaje: PropTypes.func.isRequired,
  selectedTemplate: PropTypes.object,
  sendAction: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  usersCount: PropTypes.number.isRequired
};

export default MessagePanel;