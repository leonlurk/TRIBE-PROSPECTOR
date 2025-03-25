import React from 'react';
import PropTypes from 'prop-types';

/**
 * Componente que maneja la selección de archivos multimedia (imágenes/videos)
 * y proporciona una vista previa antes de enviarlos a los usuarios.
 */
const MediaPanel = ({
  mediaFile,
  mediaPreview,
  mediaType,
  mediaCaption,
  handleFileSelect,
  setMediaCaption,
  sendMedia,
  loading,
  usersCount
}) => {
  return (
    <div className="w-1/2 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-black text-lg">Enviar Media</h3>
      </div>
  
      <div className="h-64 overflow-y-auto bg-gray-50 border rounded-lg p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selecciona una imagen o video
          </label>
          <div className="flex items-center">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="w-full p-2 border rounded-lg bg-white text-gray-700"
              disabled={loading}
            />
          </div>
        </div>
    
        {mediaPreview && (
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            {mediaType === "image" ? (
              <img 
                src={mediaPreview} 
                alt="Vista previa" 
                className="max-h-32 rounded border inline-block"
              />
            ) : (
              <video 
                src={mediaPreview} 
                controls 
                className="max-h-32 rounded border inline-block"
              />
            )}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pie de foto/video (opcional)
          </label>
          <textarea
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
            className="w-full h-20 p-3 border rounded-lg resize-none bg-white text-gray-700"
            placeholder="Escribe un pie de foto o descripción (opcional)"
            disabled={loading}
          />
        </div>
      </div>
      
      <button 
        className="w-full bg-indigo-600 text-white rounded-full py-3 mt-3 font-medium hover:bg-indigo-700 transition-colors"
        onClick={sendMedia}
        disabled={loading || usersCount === 0 || !mediaFile}
      >
        {loading ? "Enviando..." : "Enviar media"}
      </button>
    </div>
  );
};


MediaPanel.propTypes = {
  mediaFile: PropTypes.object,
  mediaPreview: PropTypes.string,
  mediaType: PropTypes.oneOf(['image', 'video']).isRequired,
  mediaCaption: PropTypes.string.isRequired,
  handleFileSelect: PropTypes.func.isRequired,
  setMediaCaption: PropTypes.func.isRequired,
  sendMedia: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  usersCount: PropTypes.number.isRequired
};

export default MediaPanel;