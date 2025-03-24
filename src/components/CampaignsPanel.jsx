import { useState, useEffect, useCallback } from "react";
import PropTypes from 'prop-types';
import { getActiveCampaigns, getRecentCampaigns, cancelCampaign } from "../campaignStore";
import logApiRequest from "../requestLogger";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

const CampaignsPanel = ({ user, onRefreshStats }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dropdownState, setDropdownState] = useState({
    estado: false,
    tipo: false
  });
  const [selectedEstado, setSelectedEstado] = useState("Estado");
  const [selectedTipo, setSelectedTipo] = useState("Tipo");

  // Opciones para los dropdowns
  const estadoOptions = ["Todas", "Activas", "Pausadas", "Terminadas"];
  const tipoOptions = ["Todos", "Mensajes", "Comentarios", "Seguimientos"];

  // Función para obtener las campañas
  const fetchCampaigns = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Registrar la solicitud de carga de campañas
      await logApiRequest({
        endpoint: "internal/fetch_campaigns",
        requestData: {},
        userId: user.uid,
        status: "pending",
        source: "CampaignsPanel"
      });
      
      // Obtener campañas activas
      const active = await getActiveCampaigns(user.uid);
      
      // Obtener campañas recientes (incluye completadas, pausadas, etc.)
      const recent = await getRecentCampaigns(user.uid, 15);
      
      // Combinar y eliminar duplicados
      const allCampaigns = [...active];
      
      // Añadir campañas recientes que no estén ya en las activas
      recent.forEach(recentCampaign => {
        if (!allCampaigns.some(c => c.id === recentCampaign.id)) {
          allCampaigns.push(recentCampaign);
        }
      });
      
      // Actualizamos el estado
      setCampaigns(allCampaigns);
      
      // Registrar éxito
      await logApiRequest({
        endpoint: "internal/fetch_campaigns",
        requestData: {},
        userId: user.uid,
        responseData: { campaignsCount: allCampaigns.length },
        status: "success",
        source: "CampaignsPanel"
      });
      
    } catch (error) {
      console.error("Error al cargar campañas:", error);
      
      // Registrar error
      await logApiRequest({
        endpoint: "internal/fetch_campaigns",
        requestData: {},
        userId: user.uid,
        status: "error",
        source: "CampaignsPanel",
        metadata: {
          action: "fetch_campaigns",
          error: error.message
        }
      });
      
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cargar campañas al montar el componente y cuando cambie el refreshKey
  useEffect(() => {
    if (user?.uid) {
      fetchCampaigns();
    }
  }, [fetchCampaigns, refreshKey, user]);

  // Programar actualizaciones periódicas si hay campañas activas
  useEffect(() => {
    const activeCampaignsCount = campaigns.filter(c => c.status === "processing").length;
    
    if (activeCampaignsCount > 0) {
      const intervalId = setInterval(() => {
        setRefreshKey(prev => prev + 1);
        
        // También actualizar estadísticas generales si hay una función para ello
        if (typeof onRefreshStats === 'function') {
          onRefreshStats();
        }
      }, 10000); // Actualizar cada 10 segundos
      
      return () => clearInterval(intervalId);
    }
  }, [campaigns, onRefreshStats]);

  // Función para cancelar una campaña
  const handleCancelCampaign = async (campaignId, e) => {
    e.stopPropagation(); // Evitar que el clic se propague al contenedor
    
    if (!window.confirm('¿Estás seguro de cancelar esta campaña?')) return;
    
    try {
      await logApiRequest({
        endpoint: "internal/cancel_campaign",
        requestData: { campaignId },
        userId: user.uid,
        status: "pending",
        source: "CampaignsPanel"
      });
      
      const success = await cancelCampaign(user.uid, campaignId);
      
      if (success) {
        setRefreshKey(prev => prev + 1);
        await logApiRequest({
          endpoint: "internal/cancel_campaign",
          requestData: { campaignId },
          userId: user.uid,
          status: "success",
          source: "CampaignsPanel"
        });
      } else {
        await logApiRequest({
          endpoint: "internal/cancel_campaign",
          requestData: { campaignId },
          userId: user.uid,
          status: "error",
          source: "CampaignsPanel"
        });
      }
    } catch (error) {
      console.error("Error al cancelar campaña:", error);
    }
  };

  // Filtrar campañas según los filtros seleccionados
  const filteredCampaigns = campaigns.filter(campaign => {
    // Filtro por estado
    if (selectedEstado === "Activas" && campaign.status !== "processing") return false;
    if (selectedEstado === "Pausadas" && campaign.status !== "paused") return false;
    if (selectedEstado === "Terminadas" && 
      campaign.status !== "completed" && 
      campaign.status !== "cancelled" && 
      campaign.status !== "failed") return false;
    // Si es "Todas", no filtramos por estado
    
    // Filtro por tipo
    if (selectedTipo === "Mensajes" && campaign.campaignType !== "send_messages") return false;
    if (selectedTipo === "Comentarios" && campaign.campaignType !== "send_comments") return false;
    if (selectedTipo === "Seguimientos" && campaign.campaignType !== "follow_users") return false;
    // Si es "Todos", no filtramos por tipo
    
    return true;
  });

  // Función para abrir/cerrar un dropdown
  const toggleDropdown = (name, event) => {
    event.stopPropagation();
    setDropdownState(prev => ({
      estado: name === 'estado' ? !prev.estado : false,
      tipo: name === 'tipo' ? !prev.tipo : false
    }));
  };

  // Función para seleccionar una opción
  const selectOption = (name, value, event) => {
    event.stopPropagation();
    if (name === 'estado') {
      setSelectedEstado(value);
    } else if (name === 'tipo') {
      setSelectedTipo(value);
    }
    setDropdownState(prev => ({...prev, [name]: false}));
  };

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const closeDropdowns = () => {
      setDropdownState({estado: false, tipo: false});
    };
    
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  // Función para mapear estado a estilo de badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'processing':
        return {
          text: 'Activa',
          className: 'bg-green-100 text-green-800'
        };
      case 'paused':
        return {
          text: 'Pausada',
          className: 'bg-yellow-100 text-yellow-800'
        };
      case 'completed':
      case 'cancelled':
      case 'failed':
        return {
          text: 'Terminada',
          className: 'bg-red-100 text-red-800'
        };
      default:
        return {
          text: 'Desconocido',
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // Renderizar spinner de carga
  if (loading && campaigns.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Cargando campañas...</span>
      </div>
    );
  }

  // Definir una clase común para los botones
  const buttonClass = "bg-white text-black py-4 px-6 rounded-full border border-gray-200 flex items-center gap-2 h-16 text-lg";
  const menuItemClass = "block w-full text-left px-5 py-3 text-black text-lg hover:bg-gray-50";

  return (
    <div className="w-full bg-[#edf0ff] min-h-screen">
      {/* Botones de filtro y acción */}
      <div className="flex space-x-4 mb-8 px-5 pt-6">
        {/* Nueva Campaña button */}
        <button 
          className={buttonClass}
          onClick={() => {/* Implementar lógica de nueva campaña */}}
        >
          <img src="/assets/add-square.png" alt="Add" className="w-6 h-6" />
          <span>Nueva Campaña</span>
        </button>
        
        {/* Estado dropdown */}
<div className="relative">
  <button 
    className={buttonClass}
    onClick={(e) => toggleDropdown('estado', e)}
  >
    <span>{selectedEstado}</span>
    <svg 
      className={`w-5 h-5 ml-2 transition-transform duration-200 ${dropdownState.estado ? 'rotate-180' : ''}`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
    </svg>
  </button>
  
  {dropdownState.estado && (
  <div className="absolute top-full left-0 mt-2 w-64 bg-blue-100 rounded-lg z-20 py-2">
    {estadoOptions.map((option) => (
      <button
        key={option}
        className="block w-full text-left px-5 py-3 text-black bg-white text-lg hover:bg-gray-200 whitespace-nowrap"
        onClick={(e) => selectOption('estado', option, e)}
      >
        {option}
      </button>
    ))}
  </div>
)}
</div>

{/* Tipo dropdown */}
<div className="relative">
  <button 
    className={buttonClass}
    onClick={(e) => toggleDropdown('tipo', e)}
  >
    <span>{selectedTipo}</span>
    <svg 
      className={`w-5 h-5 ml-2 transition-transform duration-200 ${dropdownState.tipo ? 'rotate-180' : ''}`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
    </svg>
  </button>
  
  {dropdownState.tipo && (
  <div className="absolute top-full left-0 mt-2 w-64 bg-blue-100 rounded-lg z-20 py-2">
    {tipoOptions.map((option) => (
      <button
        key={option}
        className="block w-full text-left px-5 py-3 bg-white text-black text-lg hover:bg-gray-200 whitespace-nowrap"
        onClick={(e) => selectOption('tipo', option, e)}
      >
        {option}
      </button>
    ))}
  </div>
)}
</div>
      </div>

      {/* Lista de campañas */}
      <div className="space-y-5 px-5">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-gray-500">No hay campañas que coincidan con el filtro seleccionado.</p>
          </div>
        ) : (
          filteredCampaigns.map(campaign => {
            const statusBadge = getStatusBadge(campaign.status);
            
            return (
              <div 
                key={campaign.id}
                className="bg-white rounded-lg overflow-hidden flex items-center justify-between p-5"
              >
                {/* Icono y nombre de campaña */}
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4876 3.36093 14.891 4 16.1272L3 21L7.8728 20C9.10904 20.6391 10.5124 21 12 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 12V12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 12V12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 12V12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-lg">Influencers Fitness</h3>
                    <p className="text-sm text-gray-500">Enviar Mensajes</p>
                  </div>
                </div>

                {/* Estado y menú */}
                <div className="flex items-center">
                  <span className={`px-8 py-3 rounded-full text-sm font-medium ${
                    campaign.status === 'processing' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {campaign.status === 'processing' ? 'Activa' :
                     campaign.status === 'paused' ? 'Pausada' : 'Terminada'}
                  </span>
                  <button className="ml-4 text-gray-400">
                    <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 13a1 1 0 100-2 1 1 0 000 2z" fill="#666"/>
                      <path d="M12 6a1 1 0 100-2 1 1 0 000 2z" fill="#666"/>
                      <path d="M12 20a1 1 0 100-2 1 1 0 000 2z" fill="#666"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

CampaignsPanel.propTypes = {
  user: PropTypes.object.isRequired,
  onRefreshStats: PropTypes.func
};

export default CampaignsPanel;