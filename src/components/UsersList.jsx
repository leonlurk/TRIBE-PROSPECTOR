import React from 'react';
import PropTypes from 'prop-types';
import { FaTrash } from "react-icons/fa";

/**
 * Componente que muestra una lista de usuarios con opciones para eliminarlos 
 * y seguirlos, además de mostrar información sobre los usuarios en blacklist.
 */
const UsersList = ({ 
  users, 
  removeUser, 
  filteredUsers, 
  setShowBlacklist, 
  followAllUsers, 
  loading 
}) => {
  return (
    <div className="flex-1 bg-gray-100 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-black">Usuarios Obtenidos ({users.length})</h3>
      </div>
      
      <div className="h-64 overflow-y-auto">
        {users.map((username, index) => (
          <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-200 rounded">
            <span>{username}</span>
            <button 
              className="text-red-500 hover:text-red-700"
              onClick={() => removeUser(username)}
              aria-label={`Eliminar ${username}`}
            >
              <FaTrash size={14} />
            </button>
          </div>
        ))}
        
        {users.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No hay usuarios disponibles
          </div>
        )}
      </div>

      {/* Contador de usuarios filtrados por blacklist */}
      {filteredUsers && filteredUsers.blacklistedCount > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-semibold text-red-500">{filteredUsers.blacklistedCount}</span> usuarios en lista negra no se mostrarán.
          <button 
            className="text-blue-500 hover:text-blue-700 ml-1 underline text-xs"
            onClick={() => setShowBlacklist(true)}
          >
            Ver detalles
          </button>
        </div>
      )}
      
      {/* Botón de seguir (solo si la opción está habilitada) */}
      {followAllUsers && (
        <button 
          className="w-full bg-black text-white rounded-full py-2 mt-2"
          onClick={followAllUsers}
          disabled={loading || users.length === 0}
        >
          {loading ? "Procesando..." : "Seguir a todos"}
        </button>
      )}
    </div>
  );
};

UsersList.propTypes = {
  users: PropTypes.array.isRequired,
  removeUser: PropTypes.func.isRequired,
  filteredUsers: PropTypes.object,
  setShowBlacklist: PropTypes.func.isRequired,
  followAllUsers: PropTypes.func, // Opcional, solo cuando la tarea de seguimiento está activada
  loading: PropTypes.bool.isRequired
};

export default UsersList;