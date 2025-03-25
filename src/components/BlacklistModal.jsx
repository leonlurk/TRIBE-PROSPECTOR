import React from 'react';
import PropTypes from 'prop-types';
import { FaTimes } from "react-icons/fa";

/**
 * Modal que muestra la lista de usuarios que están en la blacklist
 * y que han sido filtrados de las operaciones.
 */
const BlacklistModal = ({
  blacklistedUsers,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Usuarios en lista negra</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500"
            aria-label="Cerrar modal"
          >
            <FaTimes size={16} />
          </button>
        </div>
        
        <div className="max-h-60 overflow-y-auto">
          {blacklistedUsers.length > 0 ? (
            blacklistedUsers.map((user, idx) => (
              <div key={idx} className="py-1 border-b">
                {user}
              </div>
            ))
          ) : (
            <div className="py-2 text-center text-gray-500">
              No hay usuarios en lista negra
            </div>
          )}
        </div>
        
        <button 
          onClick={onClose}
          className="mt-4 w-full bg-gray-200 rounded-lg py-2"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

BlacklistModal.propTypes = {
  blacklistedUsers: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired
};

export default BlacklistModal;