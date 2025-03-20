import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import logApiRequest from "../requestLogger";

const BlacklistPanel = ({ user, onClose }) => {
    const [blacklists, setBlacklists] = useState([]);
    const [selectedBlacklist, setSelectedBlacklist] = useState(null);
    const [blacklistUsers, setBlacklistUsers] = useState([]);
    const [newBlacklistName, setNewBlacklistName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingBlacklist, setIsCreatingBlacklist] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [notification, setNotification] = useState({ show: false, message: "", type: "" });
    const [manualUsername, setManualUsername] = useState("");

    // Función para mostrar notificaciones
    const showNotification = (message, type = "info") => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: "", type: "" });
        }, 3000);
    };

    // Cargar las listas negras del usuario
    const fetchBlacklists = async () => {
        if (!user || !user.uid) return;

        try {
            setIsLoading(true);
            
            // Log the blacklist fetch attempt
            await logApiRequest({
                endpoint: "internal/fetch_blacklists",
                requestData: { userId: user.uid },
                userId: user.uid,
                status: "pending",
                source: "BlacklistPanel",
                metadata: {
                    action: "fetch_blacklists"
                }
            });
            
            const blacklistsRef = collection(db, "users", user.uid, "blacklists");
            const blacklistsSnapshot = await getDocs(blacklistsRef);
            const blacklistsList = blacklistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBlacklists(blacklistsList);
            
            // If there are lists, select the first one by default
            if (blacklistsList.length > 0 && !selectedBlacklist) {
                setSelectedBlacklist(blacklistsList[0]);
                fetchBlacklistUsers(blacklistsList[0].id);
            }
            
            // Log the blacklist fetch success
            await logApiRequest({
                endpoint: "internal/fetch_blacklists",
                requestData: { userId: user.uid },
                userId: user.uid,
                responseData: { count: blacklistsList.length },
                status: "success",
                source: "BlacklistPanel",
                metadata: {
                    action: "fetch_blacklists",
                    blacklistCount: blacklistsList.length
                }
            });
        } catch (error) {
            console.error("Error al cargar las listas negras:", error);
            showNotification("Error al cargar las listas", "error");
            
            // Log the blacklist fetch error
            await logApiRequest({
                endpoint: "internal/fetch_blacklists",
                requestData: { userId: user.uid },
                userId: user.uid,
                status: "error",
                source: "BlacklistPanel",
                metadata: {
                    action: "fetch_blacklists",
                    error: error.message
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar usuarios de una lista negra específica
    const fetchBlacklistUsers = async (blacklistId) => {
        if (!user || !user.uid || !blacklistId) return;

        try {
            setIsLoading(true);
            
            // Log the blacklist users fetch attempt
            await logApiRequest({
                endpoint: "internal/fetch_blacklist_users",
                requestData: { blacklistId },
                userId: user.uid,
                status: "pending",
                source: "BlacklistPanel",
                metadata: {
                    action: "fetch_blacklist_users",
                    blacklistId
                }
            });
            
            const usersRef = collection(db, "users", user.uid, "blacklists", blacklistId, "users");
            const usersSnapshot = await getDocs(usersRef);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBlacklistUsers(usersList);
            
            // Log the blacklist users fetch success
            await logApiRequest({
                endpoint: "internal/fetch_blacklist_users",
                requestData: { blacklistId },
                userId: user.uid,
                responseData: { count: usersList.length },
                status: "success",
                source: "BlacklistPanel",
                metadata: {
                    action: "fetch_blacklist_users",
                    blacklistId,
                    userCount: usersList.length
                }
            });
        } catch (error) {
            console.error("Error al cargar usuarios de la lista negra:", error);
            showNotification("Error al cargar usuarios", "error");
            
            // Log the blacklist users fetch error
            await logApiRequest({
                endpoint: "internal/fetch_blacklist_users",
                requestData: { blacklistId },
                userId: user.uid,
                status: "error",
                source: "BlacklistPanel",
                metadata: {
                    action: "fetch_blacklist_users",
                    blacklistId,
                    error: error.message
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Crear una nueva lista negra
    const createBlacklist = async () => {
        if (!user || !user.uid) return;
        if (!newBlacklistName.trim()) {
            showNotification("El nombre de la lista no puede estar vacío", "warning");
            return;
        }

        try {
            setIsLoading(true);
            
            // Log the blacklist creation attempt
            await logApiRequest({
                endpoint: "internal/create_blacklist",
                requestData: { name: newBlacklistName.trim() },
                userId: user.uid,
                status: "pending",
                source: "BlacklistPanel",
                metadata: {
                    action: "create_blacklist",
                    name: newBlacklistName.trim()
                }
            });
            
            const blacklistsRef = collection(db, "users", user.uid, "blacklists");
            
            // Verificar si ya existe una lista con ese nombre
            const q = query(blacklistsRef, where("name", "==", newBlacklistName.trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                showNotification("Ya existe una lista con ese nombre", "warning");
                
                // Log the blacklist creation failure - duplicate name
                await logApiRequest({
                    endpoint: "internal/create_blacklist",
                    requestData: { name: newBlacklistName.trim() },
                    userId: user.uid,
                    status: "error",
                    source: "BlacklistPanel",
                    metadata: {
                        action: "create_blacklist",
                        error: "duplicate_name",
                        name: newBlacklistName.trim()
                    }
                });
                
                return;
            }
            
            const newBlacklist = {
                name: newBlacklistName.trim(),
                createdAt: new Date(),
                userCount: 0
            };
            
            const docRef = await addDoc(blacklistsRef, newBlacklist);
            const createdBlacklist = { id: docRef.id, ...newBlacklist };
            
            setBlacklists([...blacklists, createdBlacklist]);
            setSelectedBlacklist(createdBlacklist);
            setBlacklistUsers([]);
            setNewBlacklistName("");
            setIsCreatingBlacklist(false);
            
            showNotification("Lista negra creada con éxito", "success");
            
            // Log the blacklist creation success
            await logApiRequest({
                endpoint: "internal/create_blacklist",
                requestData: { name: newBlacklistName.trim() },
                userId: user.uid,
                responseData: { blacklistId: docRef.id },
                status: "success",
                source: "BlacklistPanel",
                metadata: {
                    action: "create_blacklist",
                    name: newBlacklistName.trim(),
                    blacklistId: docRef.id
                }
            });
        } catch (error) {
            console.error("Error al crear la lista negra:", error);
            showNotification("Error al crear la lista", "error");
            
            // Log the blacklist creation error
            await logApiRequest({
                endpoint: "internal/create_blacklist",
                requestData: { name: newBlacklistName.trim() },
                userId: user.uid,
                status: "error",
                source: "BlacklistPanel",
                metadata: {
                    action: "create_blacklist",
                    error: error.message,
                    name: newBlacklistName.trim()
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Eliminar una lista negra
    const deleteBlacklist = async (blacklistId) => {
        if (!user || !user.uid || !blacklistId) return;

        if (!confirm("¿Estás seguro de eliminar esta lista negra? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            setIsLoading(true);
            
            // Log the blacklist deletion attempt
            await logApiRequest({
                endpoint: "internal/delete_blacklist",
                requestData: { blacklistId },
                userId: user.uid,
                status: "pending",
                source: "BlacklistPanel",
                metadata: {
                    action: "delete_blacklist",
                    blacklistId
                }
            });
            
            // Primero eliminar todos los usuarios de la lista
            const usersRef = collection(db, "users", user.uid, "blacklists", blacklistId, "users");
            const usersSnapshot = await getDocs(usersRef);
            
            const deletePromises = usersSnapshot.docs.map(userDoc => 
                deleteDoc(doc(db, "users", user.uid, "blacklists", blacklistId, "users", userDoc.id))
            );
            
            await Promise.all(deletePromises);
            
            // Luego eliminar la lista
            await deleteDoc(doc(db, "users", user.uid, "blacklists", blacklistId));
            
            // Actualizar estado
            const updatedBlacklists = blacklists.filter(list => list.id !== blacklistId);
            setBlacklists(updatedBlacklists);
            
            if (selectedBlacklist && selectedBlacklist.id === blacklistId) {
                if (updatedBlacklists.length > 0) {
                    setSelectedBlacklist(updatedBlacklists[0]);
                    fetchBlacklistUsers(updatedBlacklists[0].id);
                } else {
                    setSelectedBlacklist(null);
                    setBlacklistUsers([]);
                }
            }
            
            showNotification("Lista negra eliminada con éxito", "success");
            
            // Log the blacklist deletion success
            await logApiRequest({
                endpoint: "internal/delete_blacklist",
                requestData: { blacklistId },
                userId: user.uid,
                responseData: { deletedUsersCount: usersSnapshot.docs.length },
                status: "success",
                source: "BlacklistPanel",
                metadata: {
                    action: "delete_blacklist",
                    blacklistId,
                    deletedUsersCount: usersSnapshot.docs.length
                }
            });
        } catch (error) {
            console.error("Error al eliminar la lista negra:", error);
            showNotification("Error al eliminar la lista", "error");
            
            // Log the blacklist deletion error
            await logApiRequest({
                endpoint: "internal/delete_blacklist",
                requestData: { blacklistId },
                userId: user.uid,
                status: "error",
                source: "BlacklistPanel",
                metadata: {
                    action: "delete_blacklist",
                    blacklistId,
                    error: error.message
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Eliminar un usuario de la lista negra
    const deleteUserFromBlacklist = async (userId) => {
        if (!user || !user.uid || !selectedBlacklist || !selectedBlacklist.id) return;

        try {
            setIsLoading(true);
            
            // Log the user deletion attempt
            await logApiRequest({
                endpoint: "internal/delete_blacklist_user",
                requestData: { 
                    blacklistId: selectedBlacklist.id,
                    blacklistUserId: userId
                },
                userId: user.uid,
                status: "pending",
                source: "BlacklistPanel",
                metadata: {
                    action: "delete_blacklist_user",
                    blacklistId: selectedBlacklist.id,
                    blacklistUserId: userId
                }
            });
            
            await deleteDoc(doc(db, "users", user.uid, "blacklists", selectedBlacklist.id, "users", userId));
            
            // Actualizar conteo de usuarios en la lista
            const updatedUsers = blacklistUsers.filter(user => user.id !== userId);
            setBlacklistUsers(updatedUsers);
            
            // Actualizar el contador en la lista de blacklists
            const updatedBlacklists = blacklists.map(list => {
                if (list.id === selectedBlacklist.id) {
                    return { ...list, userCount: (list.userCount || 0) - 1 };
                }
                return list;
            });
            
            setBlacklists(updatedBlacklists);
            
            // Actualizar el selectedBlacklist
            setSelectedBlacklist({
                ...selectedBlacklist,
                userCount: (selectedBlacklist.userCount || 0) - 1
            });
            
            showNotification("Usuario eliminado de la lista negra", "success");
            
            // Log the user deletion success
            await logApiRequest({
                endpoint: "internal/delete_blacklist_user",
                requestData: { 
                    blacklistId: selectedBlacklist.id,
                    blacklistUserId: userId
                },
                userId: user.uid,
                status: "success",
                source: "BlacklistPanel",
                metadata: {
                    action: "delete_blacklist_user",
                    blacklistId: selectedBlacklist.id,
                    blacklistUserId: userId,
                    blacklistName: selectedBlacklist.name,
                    updatedUserCount: (selectedBlacklist.userCount || 0) - 1
                }
            });
        } catch (error) {
            console.error("Error al eliminar usuario de la lista negra:", error);
            showNotification("Error al eliminar usuario", "error");
            
            // Log the user deletion error
            await logApiRequest({
                endpoint: "internal/delete_blacklist_user",
                requestData: { 
                    blacklistId: selectedBlacklist.id,
                    blacklistUserId: userId
                },
                userId: user.uid,
                status: "error",
                source: "BlacklistPanel",
                metadata: {
                    action: "delete_blacklist_user",
                    blacklistId: selectedBlacklist.id,
                    blacklistUserId: userId,
                    error: error.message
                }
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Agregar usuario manualmente a la lista negra
    const addUserToBlacklist = async () => {
        if (!user || !user.uid || !selectedBlacklist || !selectedBlacklist.id) {
            showNotification("Selecciona una lista negra primero", "warning");
            return;
        }
        
        if (!manualUsername.trim()) {
            showNotification("Ingresa un nombre de usuario válido", "warning");
            return;
        }
        
        try {
            setIsLoading(true);
            
            // Log the user addition attempt
            await logApiRequest({
                endpoint: "internal/add_blacklist_user",
                requestData: { 
                    blacklistId: selectedBlacklist.id,
                    username: manualUsername.trim()
                },
                userId: user.uid,
                status: "pending",
                source: "BlacklistPanel",
                metadata: {
                    action: "add_blacklist_user",
                    blacklistId: selectedBlacklist.id,
                    blacklistName: selectedBlacklist.name,
                    username: manualUsername.trim()
                }
            });
            
            // Verificar si el usuario ya existe en la lista
            const existingUser = blacklistUsers.find(u => 
                u.username.toLowerCase() === manualUsername.trim().toLowerCase()
            );
            
            if (existingUser) {
                showNotification("Este usuario ya está en la lista negra", "warning");
                
                // Log the user addition failure - duplicate
                await logApiRequest({
                    endpoint: "internal/add_blacklist_user",
                    requestData: { 
                        blacklistId: selectedBlacklist.id,
                        username: manualUsername.trim()
                    },
                    userId: user.uid,
                    status: "error",
                    source: "BlacklistPanel",
                    metadata: {
                        action: "add_blacklist_user",
                        error: "duplicate_user",
                        blacklistId: selectedBlacklist.id,
                        username: manualUsername.trim()
                    }
                });
                
                setIsLoading(false);
                return;
            }
            
            // Agregar el usuario a la lista negra
            const usersRef = collection(db, "users", user.uid, "blacklists", selectedBlacklist.id, "users");
            const docRef = await addDoc(usersRef, {
                username: manualUsername.trim(),
                addedAt: new Date(),
                source: "manual_input",
                reason: "Agregado manualmente"
            });
            
            // Actualizar la UI
            const newUser = {
                id: docRef.id,
                username: manualUsername.trim(),
                addedAt: new Date(),
                source: "manual_input",
                reason: "Agregado manualmente"
            };
            
            setBlacklistUsers([...blacklistUsers, newUser]);
            
            // Actualizar contador en la lista
            const updatedBlacklists = blacklists.map(list => {
                if (list.id === selectedBlacklist.id) {
                    return { ...list, userCount: (list.userCount || 0) + 1 };
                }
                return list;
            });
            
            setBlacklists(updatedBlacklists);
            
            // Actualizar selectedBlacklist
            setSelectedBlacklist({
                ...selectedBlacklist,
                userCount: (selectedBlacklist.userCount || 0) + 1
            });
            
            setManualUsername("");
            showNotification("Usuario añadido a la lista negra", "success");
            
            // Log the user addition success
            await logApiRequest({
                endpoint: "internal/add_blacklist_user",
                requestData: { 
                    blacklistId: selectedBlacklist.id,
                    username: manualUsername.trim()
                },
                userId: user.uid,
                responseData: { userId: docRef.id },
                status: "success",
                source: "BlacklistPanel",
                metadata: {
                    action: "add_blacklist_user",
                    blacklistId: selectedBlacklist.id,
                    blacklistName: selectedBlacklist.name,
                    username: manualUsername.trim(),
                    userId: docRef.id
                }
            });
            
        } catch (error) {
            console.error("Error al agregar usuario a la lista negra:", error);
            showNotification("Error al agregar usuario", "error");
            
            // Log the user addition error
            await logApiRequest({
                endpoint: "internal/add_blacklist_user",
                requestData: { 
                    blacklistId: selectedBlacklist.id,
                    username: manualUsername.trim()
                },
                userId: user.uid,
                status: "error",
                source: "BlacklistPanel",
                metadata: {
                    action: "add_blacklist_user",
                    error: error.message,
                    blacklistId: selectedBlacklist.id,
                    username: manualUsername.trim()
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar las listas al montar el componente
    useEffect(() => {
        if (user && user.uid) {
            fetchBlacklists();
        }
    }, [user]);

    // Cuando cambia la lista seleccionada, cargar sus usuarios
    useEffect(() => {
        if (selectedBlacklist && selectedBlacklist.id) {
            fetchBlacklistUsers(selectedBlacklist.id);
        }
    }, [selectedBlacklist]);

    // Filtrar usuarios por término de búsqueda
    const filteredUsers = searchTerm
        ? blacklistUsers.filter(user => 
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()))
        : blacklistUsers;

    return (
        <div className={`${onClose ? "fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50" : ""} overflow-auto p-4`}>
        <div className={`bg-white rounded-xl shadow-xl ${onClose ? "w-[90%] max-w-5xl max-h-[90vh]" : "w-full"} overflow-auto`}>
                {/* Cabecera con botón de cierre */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Gestión de Listas Negras</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Sistema de notificaciones */}
                {notification.show && (
                    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                        notification.type === 'success' ? 'bg-green-500 text-white' : 
                        notification.type === 'error' ? 'bg-red-500 text-white' : 
                        notification.type === 'warning' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'
                    }`}>
                        {notification.message}
                    </div>
                )}
                
                <div className="p-6 flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Mis Listas Negras</h3>
                            <button
                                onClick={() => setIsCreatingBlacklist(true)}
                                className="p-2 bg-[#5468FF] text-white rounded-full hover:bg-[#4356cc] transition"
                                title="Crear nueva lista negra"
                            >
                                <FaPlus />
                            </button>
                        </div>
                        
                        {isCreatingBlacklist && (
                            <div className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                                <input
                                    type="text"
                                    placeholder="Nombre de la lista negra"
                                    value={newBlacklistName}
                                    onChange={(e) => setNewBlacklistName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <div className="flex space-x-2">
                                    <button
                                        onClick={createBlacklist}
                                        disabled={isLoading || !newBlacklistName.trim()}
                                        className={`flex-1 py-2 px-4 rounded text-white ${
                                            isLoading || !newBlacklistName.trim() 
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : 'bg-[#5468FF] hover:bg-[#4356cc] transition'
                                        }`}
                                    >
                                        Crear
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreatingBlacklist(false);
                                            setNewBlacklistName("");
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {isLoading && !blacklists.length ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                                {blacklists.length > 0 ? (
                                    blacklists.map(blacklist => (
                                        <div
                                            key={blacklist.id}
                                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
                                                selectedBlacklist && selectedBlacklist.id === blacklist.id 
                                                    ? 'bg-blue-100 border border-blue-300' 
                                                    : 'bg-white hover:bg-gray-100 border border-gray-200'
                                            }`}
                                            onClick={() => setSelectedBlacklist(blacklist)}
                                        >
                                            <div>
                                                <h3 className="font-medium text-gray-800">{blacklist.name}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {blacklist.userCount || 0} usuario(s)
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteBlacklist(blacklist.id);
                                                }}
                                                className="text-red-500 p-1 hover:bg-red-100 rounded-full transition"
                                                title="Eliminar lista"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                                        <p className="text-gray-500">No hay listas negras creadas</p>
                                        <button
                                            onClick={() => setIsCreatingBlacklist(true)}
                                            className="mt-4 bg-[#5468FF] text-white py-2 px-4 rounded-md flex items-center justify-center mx-auto gap-2 font-medium"
                                        >
                                            <span className="text-xl">+</span> Crear mi primera lista negra
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full md:w-2/3">
                        {selectedBlacklist ? (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        {selectedBlacklist.name} <span className="text-sm font-normal text-gray-500">({selectedBlacklist.userCount || 0} usuarios)</span>
                                    </h3>
                                    <div className="flex w-full md:w-auto gap-2 items-center">
                                        <div className="relative flex-grow">
                                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Buscar usuarios"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Agregar usuario manualmente */}
                                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Agregar usuario a la lista negra</h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nombre de usuario"
                                            value={manualUsername}
                                            onChange={(e) => setManualUsername(e.target.value)}
                                            className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={addUserToBlacklist}
                                            disabled={isLoading || !manualUsername.trim()}
                                            className={`px-4 py-2 rounded-md ${
                                                isLoading || !manualUsername.trim()
                                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                                    : 'bg-[#5468FF] text-white hover:bg-[#4356cc] transition'
                                            }`}
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                                
                                {isLoading && !blacklistUsers.length ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        {filteredUsers.length > 0 ? (
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="text-left py-2 px-4 text-gray-700 font-medium">Usuario</th>
                                                        <th className="text-left py-2 px-4 text-gray-700 font-medium">Fecha agregado</th>
                                                        <th className="text-left py-2 px-4 text-gray-700 font-medium">Fuente/Razón</th>
                                                        <th className="text-right py-2 px-4 text-gray-700 font-medium">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUsers.map(user => (
                                                        <tr key={user.id} className="border-b hover:bg-gray-50">
                                                            <td className="py-3 px-4 text-gray-800">{user.username}</td>
                                                            <td className="py-3 px-4 text-gray-800">
                                                                {user.addedAt ? (user.addedAt.toDate ? new Date(user.addedAt.toDate()).toLocaleDateString() : new Date(user.addedAt).toLocaleDateString()) : 'N/A'}
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-800">
                                                                {user.reason || (user.source === 'manual_input' ? 'Agregado manualmente' : user.source || 'N/A')}
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <button
                                                                    onClick={() => deleteUserFromBlacklist(user.id)}
                                                                    className="text-red-500 p-1 hover:bg-red-100 rounded transition"
                                                                    title="Eliminar usuario"
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
                                                <p className="text-gray-500">No hay usuarios en esta lista negra</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    Agrega usuarios a esta lista para evitar interacciones con ellos
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex justify-center items-center h-full bg-white rounded-lg p-6 border border-gray-200">
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                                        Selecciona una lista negra
                                    </h3>
                                    <p className="text-gray-500">
                                        Selecciona una lista negra o crea una nueva para gestionar los usuarios bloqueados
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-200 flex justify-between">
                    <div className="text-sm text-gray-500">
                        <p>Los usuarios en listas negras serán ignorados automáticamente en todos los procesos de envío y comunicación.</p>
                    </div>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

BlacklistPanel.propTypes = {
    user: PropTypes.object,
    onClose: PropTypes.func.isRequired
};

export default BlacklistPanel;