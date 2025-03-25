import React from 'react';
import PropTypes from 'prop-types';
import { useState } from 'react';
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
  usersCount,
  templates,
  onMediaSelect
}) => {
  const isMessageMode = type === "mensaje";
  const title = isMessageMode ? "Enviar Mensajes" : "Escribir Comentario";
  const placeholder = isMessageMode 
    ? "Escribe un mensaje para enviar a los usuarios" 
    : "Escribe un comentario para las publicaciones";
  const buttonText = isMessageMode ? "Enviar mensajes" : "Comentar publicaciones";
  const [showTemplatesList, setShowTemplatesList] = useState(false);

  const handleMediaSelect = (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'audio/*';
    input.onchange = (e) => {
      if (e.target.files[0] && onMediaSelect) {
        onMediaSelect(e.target.files[0], type);
      }
    };
    input.click();
  };

  return (
    <div className="w-1/3 p-4 border-r">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-black text-lg">{title}</h3>
        
        {isMessageMode && (
        <button 
          className="text-sm flex items-center bg-black text-white px-3 py-1.5 rounded-md"
          onClick={() => setShowTemplatesList(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Elegir plantilla
        </button>
      )}
      
      </div>
      
      
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        className="w-full h-64 p-4 border rounded-lg resize-none bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        disabled={loading}
        aria-label={placeholder}
      />
      
      <div className="flex mt-3 gap-2">
        <button 
          className="p-2 border rounded-lg text-white bg-black"
          onClick={() => {
            setMensaje(mensaje + "\n\nAtte,\nTu Nombre");
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        
        <button 
          className="p-2 border rounded-lg text-white bg-black"
          onClick={() => handleMediaSelect('image')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        
        <button 
          className="p-2 border rounded-lg text-white bg-black"
          onClick={() => handleMediaSelect('voice')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>
      
      {selectedTemplate && (
        <div className="mt-2 text-xs px-2 py-1 bg-blue-100 rounded text-blue-700 inline-block">
          Plantilla: {selectedTemplate.name}
        </div>
      )}
      
      <button 
        className="w-full bg-black text-white rounded-full py-3 mt-3 font-medium cursor-pointer"
        onClick={sendAction}
        disabled={loading || usersCount === 0 || !mensaje.trim()}
      >
        {loading ? "Enviando..." : buttonText}
      </button>
{showTemplatesList && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg w-full max-w-md p-4">
      <h3 className="text-lg font-medium mb-2 text-black">Seleccionar plantilla</h3>
      <div className="max-h-60 overflow-y-auto">
        {templates?.length > 0 ? (
          templates.map(template => (
            <div 
              key={template.id} 
              className="p-2 hover:bg-gray-100 cursor-pointer rounded text-black"
              onClick={() => {
                setMensaje(template.body);
                setShowTemplatesList(false);
              }}
            >
              {template.name}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No hay plantillas disponibles</p>
        )}
      </div>
      <button 
        className="w-full mt-4 py-2 text-black bg-gray-200 rounded"
        onClick={() => setShowTemplatesList(false)}
      >
        Cancelar
      </button>
    </div>
  </div>
)}
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
  usersCount: PropTypes.number.isRequired,
  templates: PropTypes.array,
  onMediaSelect: PropTypes.func
};

export default MessagePanel;