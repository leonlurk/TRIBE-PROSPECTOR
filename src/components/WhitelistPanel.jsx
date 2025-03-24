import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import logApiRequest from "../requestLogger"; // Import the logger utility

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
            
            // Log the whitelist fetch attempt
            await logApiRequest({
                endpoint: "internal/fetch_whitelists",
                requestData: { userId: user.uid },
                userId: user.uid,
                status: "pending",
                source: "WhitelistPanel",
                metadata: {
                    action: "fetch_whitelists"
                }
            });
            
            const whitelistsRef = collection(db, "users", user.uid, "whitelists");
            const whitelistsSnapshot = await getDocs(whitelistsRef);
            const whitelistsList = whitelistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWhitelists(whitelistsList);
            
            // If there are lists, select the first one by default
            if (whitelistsList.length > 0 && !selectedWhitelist) {
                setSelectedWhitelist(whitelistsList[0]);
                fetchWhitelistUsers(whitelistsList[0].id);
            }
            
            // Log the whitelist fetch success
            await logApiRequest({
                endpoint: "internal/fetch_whitelists",
                requestData: { userId: user.uid },
                userId: user.uid,
                responseData: { count: whitelistsList.length },
                status: "success",
                source: "WhitelistPanel",
                metadata: {
                    action: "fetch_whitelists",
                    whitelistCount: whitelistsList.length
                }
            });
        } catch (error) {
            console.error("Error al cargar las listas blancas:", error);
            showNotification("Error al cargar las listas", "error");
            
            // Log the whitelist fetch error
            await logApiRequest({
                endpoint: "internal/fetch_whitelists",
                requestData: { userId: user.uid },
                userId: user.uid,
                status: "error",
                source: "WhitelistPanel",
                metadata: {
                    action: "fetch_whitelists",
                    error: error.message
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar usuarios de una lista blanca específica
    const fetchWhitelistUsers = async (whitelistId) => {
        if (!user || !user.uid || !whitelistId) return;

        try {
            setIsLoading(true);
            
            // Log the whitelist users fetch attempt
            await logApiRequest({
                endpoint: "internal/fetch_whitelist_users",
                requestData: { whitelistId },
                userId: user.uid,
                status: "pending",
                source: "WhitelistPanel",
                metadata: {
                    action: "fetch_whitelist_users",
                    whitelistId
                }
            });
            
            const usersRef = collection(db, "users", user.uid, "whitelists", whitelistId, "users");
            const usersSnapshot = await getDocs(usersRef);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWhitelistUsers(usersList);
            
            // Log the whitelist users fetch success
            await logApiRequest({
                endpoint: "internal/fetch_whitelist_users",
                requestData: { whitelistId },
                userId: user.uid,
                responseData: { count: usersList.length },
                status: "success",
                source: "WhitelistPanel",
                metadata: {
                    action: "fetch_whitelist_users",
                    whitelistId,
                    userCount: usersList.length
                }
            });
        } catch (error) {
            console.error("Error al cargar usuarios de la lista blanca:", error);
            showNotification("Error al cargar usuarios", "error");
            
            // Log the whitelist users fetch error
            await logApiRequest({
                endpoint: "internal/fetch_whitelist_users",
                requestData: { whitelistId },
                userId: user.uid,
                status: "error",
                source: "WhitelistPanel",
                metadata: {
                    action: "fetch_whitelist_users",
                    whitelistId,
                    error: error.message
                }
            });
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
            
            // Log the whitelist creation attempt
            await logApiRequest({
                endpoint: "internal/create_whitelist",
                requestData: { name: newWhitelistName.trim() },
                userId: user.uid,
                status: "pending",
                source: "WhitelistPanel",
                metadata: {
                    action: "create_whitelist",
                    name: newWhitelistName.trim()
                }
            });
            
            const whitelistsRef = collection(db, "users", user.uid, "whitelists");
            
            // Verificar si ya existe una lista con ese nombre
            const q = query(whitelistsRef, where("name", "==", newWhitelistName.trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                showNotification("Ya existe una lista con ese nombre", "warning");
                
                // Log the whitelist creation failure - duplicate name
                await logApiRequest({
                    endpoint: "internal/create_whitelist",
                    requestData: { name: newWhitelistName.trim() },
                    userId: user.uid,
                    status: "error",
                    source: "WhitelistPanel",
                    metadata: {
                        action: "create_whitelist",
                        error: "duplicate_name",
                        name: newWhitelistName.trim()
                    }
                });
                
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
            
            // Log the whitelist creation success
            await logApiRequest({
                endpoint: "internal/create_whitelist",
                requestData: { name: newWhitelistName.trim() },
                userId: user.uid,
                responseData: { whitelistId: docRef.id },
                status: "success",
                source: "WhitelistPanel",
                metadata: {
                    action: "create_whitelist",
                    name: newWhitelistName.trim(),
                    whitelistId: docRef.id
                }
            });
        } catch (error) {
            console.error("Error al crear la lista blanca:", error);
            showNotification("Error al crear la lista", "error");
            
            // Log the whitelist creation error
            await logApiRequest({
                endpoint: "internal/create_whitelist",
                requestData: { name: newWhitelistName.trim() },
                userId: user.uid,
                status: "error",
                source: "WhitelistPanel",
                metadata: {
                    action: "create_whitelist",
                    error: error.message,
                    name: newWhitelistName.trim()
                }
            });
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
            
            // Log the whitelist deletion attempt
            await logApiRequest({
                endpoint: "internal/delete_whitelist",
                requestData: { whitelistId },
                userId: user.uid,
                status: "pending",
                source: "WhitelistPanel",
                metadata: {
                    action: "delete_whitelist",
                    whitelistId
                }
            });
            
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
            
            // Log the whitelist deletion success
            await logApiRequest({
                endpoint: "internal/delete_whitelist",
                requestData: { whitelistId },
                userId: user.uid,
                responseData: { deletedUsersCount: usersSnapshot.docs.length },
                status: "success",
                source: "WhitelistPanel",
                metadata: {
                    action: "delete_whitelist",
                    whitelistId,
                    deletedUsersCount: usersSnapshot.docs.length
                }
            });
        } catch (error) {
            console.error("Error al eliminar la lista blanca:", error);
            showNotification("Error al eliminar la lista", "error");
            
            // Log the whitelist deletion error
            await logApiRequest({
                endpoint: "internal/delete_whitelist",
                requestData: { whitelistId },
                userId: user.uid,
                status: "error",
                source: "WhitelistPanel",
                metadata: {
                    action: "delete_whitelist",
                    whitelistId,
                    error: error.message
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Eliminar un usuario de la lista blanca
    const deleteUserFromWhitelist = async (userId) => {
        if (!user || !user.uid || !selectedWhitelist || !selectedWhitelist.id) return;

        try {
            setIsLoading(true);
            
            // Log the user deletion attempt
            await logApiRequest({
                endpoint: "internal/delete_whitelist_user",
                requestData: { 
                    whitelistId: selectedWhitelist.id,
                    whitelistUserId: userId
                },
                userId: user.uid,
                status: "pending",
                source: "WhitelistPanel",
                metadata: {
                    action: "delete_whitelist_user",
                    whitelistId: selectedWhitelist.id,
                    whitelistUserId: userId
                }
            });
            
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
            
            // Log the user deletion success
            await logApiRequest({
                endpoint: "internal/delete_whitelist_user",
                requestData: { 
                    whitelistId: selectedWhitelist.id,
                    whitelistUserId: userId
                },
                userId: user.uid,
                status: "success",
                source: "WhitelistPanel",
                metadata: {
                    action: "delete_whitelist_user",
                    whitelistId: selectedWhitelist.id,
                    whitelistUserId: userId,
                    whitelistName: selectedWhitelist.name,
                    updatedUserCount: (selectedWhitelist.userCount || 0) - 1
                }
            });
        } catch (error) {
            console.error("Error al eliminar usuario de la lista blanca:", error);
            showNotification("Error al eliminar usuario", "error");
            
            // Log the user deletion error
            await logApiRequest({
                endpoint: "internal/delete_whitelist_user",
                requestData: { 
                    whitelistId: selectedWhitelist.id,
                    whitelistUserId: userId
                },
                userId: user.uid,
                status: "error",
                source: "WhitelistPanel",
                metadata: {
                    action: "delete_whitelist_user",
                    whitelistId: selectedWhitelist.id,
                    whitelistUserId: userId,
                    error: error.message
                }
            });
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
            <div className="bg-[#F3F2FC] min-h-screen p-6">
                <div className="flex items-center mb-4">
    <div className="relative flex-grow mr-4">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
            type="text"
            placeholder="Buscar Perfil"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 p-3 bg-white rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5468FF] h-16"
        />
    </div>
    <button 
        onClick={() => setIsCreatingWhitelist(true)}
        className="bg-white text-black px-4 py-3 rounded-full border border-gray-200 flex items-center gap-2 h-16"
    >
        <span className="text-xl">+</span> Crear Whitelist
    </button>
</div>
        
                {isCreatingWhitelist && (
                    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <input
                            type="text"
                            placeholder="Nombre de la lista"
                            value={newWhitelistName}
                            onChange={(e) => setNewWhitelistName(e.target.value)}
                            className="w-full p-2 border border-[#A6A6A6] rounded mb-2 bg-white text-[#393346] focus:outline-none focus:ring-1 focus:ring-[#5468FF]"
                        />
                        <div className="flex space-x-2">
                            <button
                                onClick={createWhitelist}
                                disabled={isLoading || !newWhitelistName.trim()}
                                className="flex-1 bg-[#5468FF] text-white py-1 rounded hover:bg-[#4356cc] transition disabled:bg-gray-400"
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
        
                <div className="space-y-4">
                    {whitelists.map(whitelist => (
                        <div 
                            key={whitelist.id} 
                            className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm"
                        >
                            <div className="flex items-center space-x-4">
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="40" 
                                    height="40" 
                                    viewBox="0 0 40 40" 
                                    fill="none"
                                    className="text-gray-500"
                                >
                                    <path 
                                        d="M10 20H30M10 26.6667H30M10 13.3333H30M35 20C35 28.2843 28.2843 35 20 35C11.7157 35 5 28.2843 5 20C5 11.7157 11.7157 5 20 5C28.2843 5 35 11.7157 35 20Z" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <div>
                                    <h3 className="font-medium text-gray-800">{whitelist.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {whitelist.userCount || 0} Usuarios
                                    </p>
                                </div>
                            </div>
                            <div className="text-gray-400">
                                <div className="flex flex-col space-y-1 cursor-pointer">
                                    <div className="h-1 w-4 bg-gray-300 rounded"></div>
                                    <div className="h-1 w-4 bg-gray-300 rounded"></div>
                                    <div className="h-1 w-4 bg-gray-300 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
        
                {/* Sistema de notificaciones */}
                {notification.show && (
                    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                        notification.type === 'success' ? 'bg-green-500' : 
                        notification.type === 'error' ? 'bg-red-500' : 
                        notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    } text-white`}>
                        {notification.message}
                    </div>
                )}
            </div>
        );
};

WhitelistPanel.propTypes = {
    user: PropTypes.object
};

export default WhitelistPanel;