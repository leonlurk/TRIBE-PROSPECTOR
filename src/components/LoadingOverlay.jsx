import React from 'react';
import PropTypes from 'prop-types';

/**
 * Overlay de carga que muestra una barra de progreso
 * y un mensaje informativo durante operaciones largas.
 */
const LoadingOverlay = ({
  progress,
  message
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col justify-center items-center">
      <div className="bg-white p-6 rounded-2xl max-w-md w-full mx-4">
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>
        
        <p className="text-center font-medium text-gray-800">
          {message || "Procesando operación..."}
        </p>
        
        <p className="text-center text-sm text-gray-500 mt-2">
          Las campañas en Instagram pueden tomar tiempo para evitar límites de uso.
          No cierre esta ventana.
        </p>
      </div>
    </div>
  );
};

LoadingOverlay.propTypes = {
  progress: PropTypes.number.isRequired,
  message: PropTypes.string
};

export default LoadingOverlay;