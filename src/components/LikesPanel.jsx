import React from 'react';
import PropTypes from 'prop-types';

/**
 * Componente que proporciona la interfaz para dar likes
 * a las últimas publicaciones de los usuarios seleccionados.
 */
const LikesPanel = ({
  likeLatestPosts,
  loading,
  usersCount
}) => {
  return (
    <div className="w-1/3 flex-1 bg-gray-100 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-black">Dar Likes a Publicaciones</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Esta acción dará like a la publicación más reciente de cada usuario en la lista.
      </p>
      
      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
        <p className="text-yellow-700 text-sm">
          <strong>Nota:</strong> Instagram puede limitar esta acción si se realiza en muchos perfiles simultáneamente. 
          Se recomienda procesar en lotes pequeños.
        </p>
      </div>
      
      <button 
        className="w-full bg-black text-white rounded-full py-2 mt-3"
        onClick={likeLatestPosts}
        disabled={loading || usersCount === 0}
      >
        {loading ? "Procesando..." : "Dar likes a publicaciones"}
      </button>
    </div>
  );
};

LikesPanel.propTypes = {
  likeLatestPosts: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  usersCount: PropTypes.number.isRequired
};

export default LikesPanel;