import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { collection, getDocs, addDoc } from "firebase/firestore";

const WhitelistSelector = ({ 
  user, 
  db, 
  users, 
  onWhitelistAdded,
  onClose 
}) => {
  const [whitelists, setWhitelists] = useState([]);
  const [selectedWhitelist, setSelectedWhitelist] = useState(null);
  const [newWhitelistName, setNewWhitelistName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch existing whitelists
  useEffect(() => {
    const fetchWhitelists = async () => {
      if (!user?.uid) return;

      try {
        const whitelistsRef = collection(db, "users", user.uid, "whitelists");
        const whitelistsSnapshot = await getDocs(whitelistsRef);
        const whitelistsList = whitelistsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setWhitelists(whitelistsList);
      } catch (error) {
        console.error("Error fetching whitelists:", error);
        setError("No se pudieron cargar las listas blancas");
      }
    };

    fetchWhitelists();
  }, [user, db]);

  // Add users to existing whitelist
  const addUsersToWhitelist = async () => {
    if (!selectedWhitelist) {
      setError("Selecciona una lista blanca");
      return;
    }

    if (users.length === 0) {
      setError("No hay usuarios para agregar");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const whitelistUsersRef = collection(
        db, 
        "users", 
        user.uid, 
        "whitelists", 
        selectedWhitelist.id, 
        "users"
      );

      // Add each user to the whitelist
      const addPromises = users.map(async (username) => {
        // Check if user already exists in whitelist
        const existingUsersSnapshot = await getDocs(
          collection(db, "users", user.uid, "whitelists", selectedWhitelist.id, "users")
        );
        const existingUsers = existingUsersSnapshot.docs.map(doc => doc.data().username);

        if (!existingUsers.includes(username)) {
          return addDoc(whitelistUsersRef, {
            username,
            addedAt: new Date()
          });
        }
      });

      await Promise.all(addPromises);

      // Notify parent component
      if (onWhitelistAdded) {
        onWhitelistAdded(selectedWhitelist);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error adding users to whitelist:", error);
      setError("Error al agregar usuarios a la lista blanca");
    } finally {
      setLoading(false);
    }
  };

  // Create a new whitelist and add users
  const createAndAddToWhitelist = async () => {
    if (!newWhitelistName.trim()) {
      setError("Ingresa un nombre para la lista blanca");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const whitelistsRef = collection(db, "users", user.uid, "whitelists");
      
      // Create new whitelist
      const newWhitelistRef = await addDoc(whitelistsRef, {
        name: newWhitelistName.trim(),
        createdAt: new Date(),
        userCount: users.length
      });

      // Add users to new whitelist
      const whitelistUsersRef = collection(
        db, 
        "users", 
        user.uid, 
        "whitelists", 
        newWhitelistRef.id, 
        "users"
      );

      const addPromises = users.map(username => 
        addDoc(whitelistUsersRef, {
          username,
          addedAt: new Date()
        })
      );

      await Promise.all(addPromises);

      // Notify parent component
      if (onWhitelistAdded) {
        onWhitelistAdded({
          id: newWhitelistRef.id,
          name: newWhitelistName.trim()
        });
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error creating whitelist:", error);
      setError("Error al crear la lista blanca");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl">
      <h2 className="text-xl font-semibold mb-4">Agregar a Lista Blanca</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {!isCreatingNew ? (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona una Lista Blanca existente
            </label>
            <select
              value={selectedWhitelist?.id || ''}
              onChange={(e) => {
                const selected = whitelists.find(w => w.id === e.target.value);
                setSelectedWhitelist(selected);
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Seleccionar lista</option>
              {whitelists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.userCount || 0} usuarios)
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">
              {users.length} usuarios seleccionados
            </span>
            <button
              onClick={() => setIsCreatingNew(true)}
              className="text-blue-600 hover:underline"
            >
              Crear nueva lista
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={addUsersToWhitelist}
              disabled={!selectedWhitelist || loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Agregando...' : 'Agregar a Lista'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Nueva Lista Blanca
            </label>
            <input
              type="text"
              value={newWhitelistName}
              onChange={(e) => setNewWhitelistName(e.target.value)}
              placeholder="Nombre de la lista"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={createAndAddToWhitelist}
              disabled={!newWhitelistName.trim() || loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear y Agregar'}
            </button>
            <button
              onClick={() => setIsCreatingNew(false)}
              className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

WhitelistSelector.propTypes = {
  user: PropTypes.object.isRequired,
  db: PropTypes.object.isRequired,
  users: PropTypes.array.isRequired,
  onWhitelistAdded: PropTypes.func,
  onClose: PropTypes.func.isRequired
};

export default WhitelistSelector;