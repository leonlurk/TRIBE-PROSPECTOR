import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { FaArrowRight, FaTimes, FaTrash } from "react-icons/fa";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import logApiRequest from "../requestLogger";


const NuevaCampanaModal = ({ isOpen, onClose, user, instagramToken }) => {
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [targetLink, setTargetLink] = useState("");
  const [targetType, setTargetType] = useState(""); // "perfil" o "publicacion"
  const [isProspecting, setIsProspecting] = useState(false);
  
  // Para el paso 2 - Objetivos y filtros
  const [objectives, setObjectives] = useState({
    comentarios: false,
    likes: false,
    seguidores: false
  });
  
  const [filters, setFilters] = useState({
    genero: false
  });
  
  const [tasks, setTasks] = useState({
    seguir: false,
    enviarMensaje: false,
    darLikes: false,
    comentar: false
  });
  
  // Para el paso 3 - Usuarios y mensajes
  const [users, setUsers] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Reset el estado cuando se abre/cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setCampaignName("");
      setTargetLink("");
      setTargetType("");
      setIsProspecting(false);
      setObjectives({
        comentarios: false,
        likes: false,
        seguidores: false
      });
      setFilters({
        genero: false
      });
      setTasks({
        seguir: false,
        enviarMensaje: false,
        darLikes: false,
        comentar: false
      });
      setUsers([]);
      setMensaje("");
      setSelectedTemplate(null);
    }
  }, [isOpen]);
  
  const handleNext = () => {
    // Validaciones básicas
    if (step === 1) {
      if (!campaignName.trim()) {
        alert("Debes ingresar un nombre para la campaña");
        return;
      }
      if (!targetLink.trim()) {
        alert("Debes ingresar un link de perfil o publicación");
        return;
      }
    }
    
    if (step === 2) {
      // Validar que se haya seleccionado al menos un objetivo y una tarea
      const hasObjective = Object.values(objectives).some(val => val);
      const hasTask = Object.values(tasks).some(val => val);
      
      if (!hasObjective) {
        alert("Debes seleccionar al menos un objetivo");
        return;
      }
      
      if (!hasTask) {
        alert("Debes seleccionar al menos una tarea");
        return;
      }
      
      // Simular la obtención de usuarios basados en los objetivos seleccionados
      // En un caso real, aquí llamarías a tu API
      const mockUsers = [
        "username1", "username2", "username3", 
        "username4", "username5", "username6"
      ];
      setUsers(mockUsers);
    }
    
    if (step === 3) {
      // Aquí iría la lógica para completar la campaña
      if (tasks.enviarMensaje && !mensaje.trim()) {
        alert("Debes escribir un mensaje para enviar");
        return;
      }
      
      // Crear la campaña en Firestore
      createCampaign();
    }
    
    // Avanzar al siguiente paso si no hay errores
    setStep(step + 1);
  };
  
  const createCampaign = async () => {
    try {
      if (!user?.uid) {
        alert("Debes iniciar sesión para crear campañas");
        return;
      }
      
      // Preparar los datos de la campaña
      const campaignData = {
        name: campaignName,
        targetLink,
        isProspecting,
        objectives,
        filters,
        tasks,
        users,
        message: mensaje,
        templateId: selectedTemplate?.id || null,
        createdAt: new Date(),
        status: "processing", // processing, paused, completed, failed
        progress: 0,
        userId: user.uid
      };
      
      // Guardar en Firestore
      const campaignsRef = collection(db, "users", user.uid, "campaigns");
      const docRef = await addDoc(campaignsRef, campaignData);
      
      // Log de la acción
      await logApiRequest({
        endpoint: "internal/create_campaign",
        requestData: campaignData,
        userId: user.uid,
        status: "success",
        source: "NuevaCampanaModal",
        metadata: {
          action: "create_campaign",
          campaignId: docRef.id,
          campaignName
        }
      });
      
      alert("Campaña creada con éxito");
      onClose(); // Cerrar el modal
      
    } catch (error) {
      console.error("Error al crear la campaña:", error);
      alert("Error al crear la campaña");
      
      // Log del error
      await logApiRequest({
        endpoint: "internal/create_campaign",
        requestData: { campaignName },
        userId: user?.uid,
        status: "error",
        source: "NuevaCampanaModal",
        metadata: {
          action: "create_campaign",
          error: error.message
        }
      });
    }
  };
  
  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header del modal con botón de cierre */}
        <div className="flex justify-end items-center p-5 border-b">
            <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 bg-transparent border-0 p-0 m-0"
            >
                <FaTimes size={20} />
            </button>
            </div>
        
        {/* Contenido dinámico según el paso */}
        <div className="p-5">
          {step === 1 && (
            <>
              <div className="mb-4">
                <label className="block text-xl text-black font-semibold mb-2">Nombre de la Campaña</label>
                <input 
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-white text-black p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Influencers Fitness"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-xl text-black font-semibold mb-2">Pega el link del perfil o publicación</label>
                <input 
                  type="text"
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  className="w-full p-3 text-black bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.instagram.com/..."
                />
              </div>
              
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={isProspecting}
                    onChange={(e) => setIsProspecting(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-lg text-black">Prospectar lista de seguimiento</span>
                </label>
              </div>
            </>
          )}
          
          {step === 2 && (
            <>
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-2">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black">Objetivos</h3>
                </div>
                
                <div className="pl-10 space-y-2">
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.comentarios}
                      onChange={(e) => setObjectives({...objectives, comentarios: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Comentarios de la publicación</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.likes}
                      onChange={(e) => setObjectives({...objectives, likes: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Likes de la publicación</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={objectives.seguidores}
                      onChange={(e) => setObjectives({...objectives, seguidores: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Seguidores del perfil</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-2">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black">Filtros</h3>
                </div>
                
                <div className="pl-10 space-y-2">
                  <label className="flex items-center space-x-2 text-black">
                    <input 
                      type="checkbox"
                      checked={filters.genero}
                      onChange={(e) => setFilters({...filters, genero: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Género</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-2">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 15S3 14 3 12.5 4 10 4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 15S21 14 21 12.5 20 10 20 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 19V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 19V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 4H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black">Tareas</h3>
                </div>
                
                <div className="pl-10 space-y-2 text-black">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.seguir}
                      onChange={(e) => setTasks({...tasks, seguir: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Seguir instagrammers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.enviarMensaje}
                      onChange={(e) => setTasks({...tasks, enviarMensaje: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Enviar Mensaje</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.darLikes}
                      onChange={(e) => setTasks({...tasks, darLikes: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Dar likes a las publicaciones</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={tasks.comentar}
                      onChange={(e) => setTasks({...tasks, comentar: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span>Comentar en sus publicaciones</span>
                  </label>
                </div>
              </div>
            </>
          )}
          
          {step === 3 && (
            <div className="flex flex-col md:flex-row gap-4">
              {/* Panel de usuarios */}
              <div className="flex-1 bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-black">Usuarios Obtenidos</h3>
                  <button className="text-sm text-white">
                    Guardar
                  </button>
                </div>
                <div className="h-64 overflow-y-auto">
                  {users.map((user, index) => (
                    <div key={index} className="flex justify-between items-center p-2">
                      <span>{user}</span>
                      <button className="text-white">
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="w-full bg-black text-white rounded-full py-2 mt-2">
                  Seguir a todos
                </button>
              </div>
              
              {/* Panel de mensajes */}
              {tasks.enviarMensaje && (
                <div className="flex-1 bg-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-black">Enviar Mensajes</h3>
                    <button className="text-sm text-white">
                      Elegir plantilla
                    </button>
                  </div>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    className="w-full h-64 p-3 border rounded-lg resize-none bg-white text-black"
                    placeholder="Escribe un mensaje para enviar a los usuarios"
                  ></textarea>
                  <div className="flex justify-end mt-2 space-x-2">
                    <button className="bg-gray-200 p-2 rounded">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 10L19 6M19 6L15 2M19 6H10.5C7.46243 6 5 8.46243 5 11.5C5 14.5376 7.46243 17 10.5 17H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button className="bg-gray-200 p-2 rounded">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                        <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button className="bg-gray-200 p-2 rounded">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 18.5C15.5899 18.5 18.5 15.5899 18.5 12C18.5 8.41015 15.5899 5.5 12 5.5C8.41015 5.5 5.5 8.41015 5.5 12C5.5 15.5899 8.41015 18.5 12 18.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 19L17.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8V12L15 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {step === 4 && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-2">¡Campaña creada con éxito!</h3>
              <p className="text-gray-600 mb-4">
                Tu campaña "{campaignName}" ha sido creada y está en proceso.
                Puedes seguir su progreso en la sección de Campañas.
              </p>
              <button 
                onClick={onClose}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
        
        {/* Footer con botones de navegación */}
        {step < 4 && (
          <div className="p-5 border-t flex justify-end">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border rounded-lg mr-2 hover:bg-gray-100"
              >
                Atrás
              </button>
            )}
            <button 
              onClick={handleNext}
              className="px-8 py-3 bg-black text-white rounded-lg flex items-center"
            >
              Siguiente <FaArrowRight className="ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

NuevaCampanaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.object,
  instagramToken: PropTypes.string
};

export default NuevaCampanaModal;