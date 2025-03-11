import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { FaPlus, FaTrash, FaSearch } from "react-icons/fa";

const WhitelistPanel = ({ user }) => {
    const [whitelists, setWhitelists] = useState([]);
    const [selectedWhitelist, setSelectedWhitelist] = useState(null);
    const [whitelistUsers, setWhitelistUsers] = useState([]);
    const [newWhitelistName, setNewWhitelistName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingWhitelist, setIsCreatingWhitelist] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [notification, setNotification] = useState({ show: false, message: "", type: "" });

    // Función para mostrar notificaciones
    const showNotification = (message, type = "info") => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: "", type: "" });
        }, 3000);
    };

    // Cargar las listas blancas del usuario
    const fetchWhitelists = async () => {
        if (!user || !user.uid) return;

        try {
            setIsLoading(true);
            const whitelistsRef = collection(db, "users", user.uid, "whitelists");
            const whitelistsSnapshot = await getDocs(whitelistsRef);
            const whitelistsList = whitelistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWhitelists(whitelistsList);
            
            // Si hay listas, seleccionar la primera por defecto
            if (whitelistsList.length > 0 && !selectedWhitelist) {
                setSelectedWhitelist(whitelistsList[0]);
                fetchWhitelistUsers(whitelistsList[0].id);
            }
        } catch (error) {
            console.error("Error al cargar las listas blancas:", error);
            showNotification("Error al cargar las listas", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar usuarios de una lista blanca específica
    const fetchWhitelistUsers = async (whitelistId) => {
        if (!user || !user.uid || !whitelistId) return;

        try {
            setIsLoading(true);
            const usersRef = collection(db, "users", user.uid, "whitelists", whitelistId, "users");
            const usersSnapshot = await getDocs(usersRef);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWhitelistUsers(usersList);
        } catch (error) {
            console.error("Error al cargar usuarios de la lista blanca:", error);
            showNotification("Error al cargar usuarios", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Crear una nueva lista blanca
    const createWhitelist = async () => {
        if (!user || !user.uid) return;
        if (!newWhitelistName.trim()) {
            showNotification("El nombre de la lista no puede estar vacío", "warning");
            return;
        }

        try {
            setIsLoading(true);
            const whitelistsRef = collection(db, "users", user.uid, "whitelists");
            
            // Verificar si ya existe una lista con ese nombre
            const q = query(whitelistsRef, where("name", "==", newWhitelistName.trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                showNotification("Ya existe una lista con ese nombre", "warning");
                return;
            }
            
            const newWhitelist = {
                name: newWhitelistName.trim(),
                createdAt: new Date(),
                userCount: 0
            };
            
            const docRef = await addDoc(whitelistsRef, newWhitelist);
            const createdWhitelist = { id: docRef.id, ...newWhitelist };
            
            setWhitelists([...whitelists, createdWhitelist]);
            setSelectedWhitelist(createdWhitelist);
            setWhitelistUsers([]);
            setNewWhitelistName("");
            setIsCreatingWhitelist(false);
            
            showNotification("Lista creada con éxito", "success");
        } catch (error) {
            console.error("Error al crear la lista blanca:", error);
            showNotification("Error al crear la lista", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Eliminar una lista blanca
    const deleteWhitelist = async (whitelistId) => {
        if (!user || !user.uid || !whitelistId) return;

        if (!confirm("¿Estás seguro de eliminar esta lista? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            setIsLoading(true);
            
            // Primero eliminar todos los usuarios de la lista
            const usersRef = collection(db, "users", user.uid, "whitelists", whitelistId, "users");
            const usersSnapshot = await getDocs(usersRef);
            
            const deletePromises = usersSnapshot.docs.map(userDoc => 
                deleteDoc(doc(db, "users", user.uid, "whitelists", whitelistId, "users", userDoc.id))
            );
            
            await Promise.all(deletePromises);
            
            // Luego eliminar la lista
            await deleteDoc(doc(db, "users", user.uid, "whitelists", whitelistId));
            
            // Actualizar estado
            const updatedWhitelists = whitelists.filter(list => list.id !== whitelistId);
            setWhitelists(updatedWhitelists);
            
            if (selectedWhitelist && selectedWhitelist.id === whitelistId) {
                if (updatedWhitelists.length > 0) {
                    setSelectedWhitelist(updatedWhitelists[0]);
                    fetchWhitelistUsers(updatedWhitelists[0].id);
                } else {
                    setSelectedWhitelist(null);
                    setWhitelistUsers([]);
                }
            }
            
            showNotification("Lista eliminada con éxito", "success");
        } catch (error) {
            console.error("Error al eliminar la lista blanca:", error);
            showNotification("Error al eliminar la lista", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Eliminar un usuario de la lista blanca
    const deleteUserFromWhitelist = async (userId) => {
        if (!user || !user.uid || !selectedWhitelist || !selectedWhitelist.id) return;

        try {
            setIsLoading(true);
            await deleteDoc(doc(db, "users", user.uid, "whitelists", selectedWhitelist.id, "users", userId));
            
            // Actualizar conteo de usuarios en la lista
            const updatedUsers = whitelistUsers.filter(user => user.id !== userId);
            setWhitelistUsers(updatedUsers);
            
            // Actualizar el contador en la lista de whitelists
            const updatedWhitelists = whitelists.map(list => {
                if (list.id === selectedWhitelist.id) {
                    return { ...list, userCount: (list.userCount || 0) - 1 };
                }
                return list;
            });
            
            setWhitelists(updatedWhitelists);
            
            // Actualizar el selectedWhitelist
            setSelectedWhitelist({
                ...selectedWhitelist,
                userCount: (selectedWhitelist.userCount || 0) - 1
            });
            
            showNotification("Usuario eliminado de la lista", "success");
        } catch (error) {
            console.error("Error al eliminar usuario de la lista blanca:", error);
            showNotification("Error al eliminar usuario", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar las listas al montar el componente
    useEffect(() => {
        if (user && user.uid) {
            fetchWhitelists();
        }
    }, [user]);

    // Cuando cambia la lista seleccionada, cargar sus usuarios
    useEffect(() => {
        if (selectedWhitelist && selectedWhitelist.id) {
            fetchWhitelistUsers(selectedWhitelist.id);
        }
    }, [selectedWhitelist]);

    // Filtrar usuarios por término de búsqueda
    const filteredUsers = searchTerm
        ? whitelistUsers.filter(user => 
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()))
        : whitelistUsers;

    return (
        <div className="p-6 bg-[#F3F2FC] min-h-screen">
            {/* Sistema de notificaciones */}
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                    notification.type === 'success' ? 'bg-green-500' : 
                    notification.type === 'error' ? 'bg-red-500' : 
                    notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                } text-black`}>
                    {notification.message}
                </div>
            )}
            
            <div className="flex mb-6">
                <div className="w-1/3 pr-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Mis Listas</h2>
                        <button
                            onClick={() => setIsCreatingWhitelist(true)}
                            className="p-2 bg-[#5468FF] text-black rounded-full hover:bg-[#4356cc] transition"
                        >
                            <FaPlus />
                        </button>
                    </div>
                    
                    {isCreatingWhitelist && (
                        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                            <input
                                type="text"
                                placeholder="Nombre de la lista"
                                value={newWhitelistName}
                                onChange={(e) => setNewWhitelistName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded mb-2 bg-white text-black"
                            />
                            <div className="flex space-x-2">
                                <button
                                    onClick={createWhitelist}
                                    disabled={isLoading || !newWhitelistName.trim()}
                                    className="flex-1 bg-[#5468FF] text-black py-1 rounded hover:bg-[#4356cc] transition disabled:bg-gray-400"
                                >
                                    Crear
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreatingWhitelist(false);
                                        setNewWhitelistName("");
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 py-1 rounded hover:bg-gray-300 transition"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {isLoading && !whitelists.length ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto">
                            {whitelists.length > 0 ? (
                                whitelists.map(whitelist => (
                                    <div
                                        key={whitelist.id}
                                        className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
                                            selectedWhitelist && selectedWhitelist.id === whitelist.id 
                                                ? 'bg-blue-100 border border-blue-300' 
                                                : 'bg-white hover:bg-gray-100'
                                        }`}
                                        onClick={() => setSelectedWhitelist(whitelist)}
                                    >
                                        <div>
                                        <h3 className="font-medium text-gray-800">{whitelist.name}</h3>
                                            <p className="text-xs text-gray-500">
                                                {whitelist.userCount || 0} usuario(s)
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteWhitelist(whitelist.id);
                                            }}
                                            className="text-red-500 p-1 hover:bg-red-100 rounded-full transition"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 bg-white rounded-lg">
                                <p className="text-gray-500">No hay listas creadas</p>
                                <button
                                    onClick={() => setIsCreatingWhitelist(true)}
                                    className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-full flex items-center justify-center mx-auto gap-2 font-medium"
                                >
                                    <span className="text-xl">+</span> Crear mi primera lista
                                </button>
                            </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="w-2/3 pl-4">
                    {selectedWhitelist ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {selectedWhitelist.name}
                                </h2>
                                <div className="relative w-1/2">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar usuarios"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 p-2 w-full border border-gray-300 rounded-full"
                                    />
                                </div>
                            </div>
                            
                            {isLoading && !whitelistUsers.length ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
                                    {filteredUsers.length > 0 ? (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                <th className="text-left py-2 text-gray-700">Usuario</th>
                                                    <th className="text-left py-2">Fecha agregado</th>
                                                    <th className="text-right py-2">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map(user => (
                                                    <tr key={user.id} className="border-b hover:bg-gray-50">
                                                        <td className="py-3 text-gray-800">{user.username}</td>
                                                        <td className="py-3 text-gray-800">
                                                            {user.addedAt ? new Date(user.addedAt.toDate()).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <button
                                                                onClick={() => deleteUserFromWhitelist(user.id)}
                                                                className="text-red-500 p-1 hover:bg-red-100 rounded transition"
                                                            >
                                                                <FaTrash size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500">No hay usuarios en esta lista</p>
                                            <p className="text-sm text-gray-400 mt-1">
                                                Los usuarios que obtiene de los likes se pueden guardar aquí
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex justify-center items-center h-full bg-white rounded-lg p-6">
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-gray-700 mb-2">
                                    Selecciona una lista
                                </h3>
                                <p className="text-gray-500">
                                    Selecciona una lista o crea una nueva para ver sus usuarios
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

WhitelistPanel.propTypes = {
    user: PropTypes.object
};

export default WhitelistPanel;