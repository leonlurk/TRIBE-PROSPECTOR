import { useState, useEffect, useCallback } from "react";
import PropTypes from 'prop-types';
import { getActiveCampaigns, getRecentCampaigns, cancelCampaign } from "../campaignStore";
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaExclamationTriangle, FaStopCircle, FaClock } from "react-icons/fa";
import logApiRequest from "../requestLogger";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Utilidad para formatear tiempo transcurrido
const formatElapsedTime = (startDate, endDate = new Date()) => {
  const elapsed = Math.floor((endDate - startDate) / 1000); // segundos transcurridos
  
  if (elapsed < 60) return `${elapsed} segundo${elapsed !== 1 ? 's' : ''}`;
  
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours} hora${hours !== 1 ? 's' : ''} ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
};

const CampaignsPanel = ({ user, onRefreshStats }) => {
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecent, setShowRecent] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar actualizaciones
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

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
        source: "CampaignsPanel",
        metadata: {
          action: "fetch_campaigns"
        }
      });
      
      // Obtener campañas activas
      const active = await getActiveCampaigns(user.uid);
      setActiveCampaigns(active);
      
      // Obtener campañas recientes
      const recent = await getRecentCampaigns(user.uid, 5);
      setRecentCampaigns(recent);
      
      // Registrar éxito
      await logApiRequest({
        endpoint: "internal/fetch_campaigns",
        requestData: {},
        userId: user.uid,
        responseData: { 
          activeCampaignsCount: active.length,
          recentCampaignsCount: recent.length 
        },
        status: "success",
        source: "CampaignsPanel",
        metadata: {
          action: "fetch_campaigns",
          resultsCount: active.length + recent.length
        }
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

  useEffect(() => {
    const debugCampaigns = async () => {
      if (user?.uid) {
        try {
          const campaignsRef = collection(db, "users", user.uid, "campaigns");
          const snapshot = await getDocs(campaignsRef);
          const allCampaigns = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log("TODAS LAS CAMPAÑAS:", allCampaigns);
          
          // Filtrar manualmente para ver qué campañas deberían estar activas
          const activeCampaigns = allCampaigns.filter(c => c.status === "processing");
          console.log("CAMPAÑAS PROCESANDO:", activeCampaigns);
          
          // Ver otras posibles campañas activas con otros estados
          const otherStatuses = [...new Set(allCampaigns.map(c => c.status))];
          console.log("ESTADOS ENCONTRADOS:", otherStatuses);
        } catch (error) {
          console.error("Error al obtener todas las campañas:", error);
        }
      }
    };
    
    debugCampaigns();
  }, [user]);

  // Programar actualizaciones periódicas si hay campañas activas
  useEffect(() => {
    if (activeCampaigns.length > 0) {
      const intervalId = setInterval(() => {
        setRefreshKey(prev => prev + 1);
        
        // También actualizar estadísticas generales si hay una función para ello
        if (typeof onRefreshStats === 'function') {
          onRefreshStats();
        }
      }, 10000); // Actualizar cada 10 segundos
      
      return () => clearInterval(intervalId);
    }
  }, [activeCampaigns.length, onRefreshStats]);

  // Función para cancelar una campaña
  const handleCancelCampaign = async (campaignId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta campaña?')) return;
    
    try {
      await logApiRequest({
        endpoint: "internal/cancel_campaign",
        requestData: { campaignId },
        userId: user.uid,
        status: "pending",
        source: "CampaignsPanel",
        metadata: {
          action: "cancel_campaign",
          campaignId
        }
      });
      
      const success = await cancelCampaign(user.uid, campaignId);
      
      if (success) {
        setRefreshKey(prev => prev + 1);
        await logApiRequest({
          endpoint: "internal/cancel_campaign",
          requestData: { campaignId },
          userId: user.uid,
          status: "success",
          source: "CampaignsPanel",
          metadata: {
            action: "cancel_campaign",
            campaignId,
            result: "success"
          }
        });
      } else {
        await logApiRequest({
          endpoint: "internal/cancel_campaign",
          requestData: { campaignId },
          userId: user.uid,
          status: "error",
          source: "CampaignsPanel",
          metadata: {
            action: "cancel_campaign",
            campaignId,
            result: "failed",
            error: "Unknown error"
          }
        });
      }
    } catch (error) {
      console.error("Error al cancelar campaña:", error);
      await logApiRequest({
        endpoint: "internal/cancel_campaign",
        requestData: { campaignId },
        userId: user.uid,
        status: "error",
        source: "CampaignsPanel",
        metadata: {
          action: "cancel_campaign",
          campaignId,
          result: "failed",
          error: error.message
        }
      });
    }
  };

  // Renderizar indicador de estado de la campaña
  const renderStatusIndicator = (status) => {
    switch (status) {
      case 'processing':
        return <FaSpinner className="animate-spin text-blue-500" title="En progreso" />;
      case 'completed':
        return <FaCheckCircle className="text-green-500" title="Completada" />;
      case 'failed':
        return <FaTimesCircle className="text-red-500" title="Fallida" />;
      case 'cancelled':
        return <FaStopCircle className="text-orange-500" title="Cancelada" />;
      default:
        return <FaInfoCircle className="text-gray-500" title="Estado desconocido" />;
    }
  };

  // Función para expandir/colapsar detalles de campaña
  const toggleCampaignDetails = (campaignId) => {
    setSelectedCampaignId(prev => prev === campaignId ? null : campaignId);
    
    // Registrar la acción
    if (user) {
      logApiRequest({
        endpoint: "internal/toggle_campaign_details",
        requestData: { campaignId },
        userId: user.uid,
        status: "success",
        source: "CampaignsPanel",
        metadata: {
          action: "toggle_campaign_details",
          campaignId,
          newState: selectedCampaignId === campaignId ? "collapsed" : "expanded"
        }
      });
    }
  };

  // Renderizar barra de progreso
  const renderProgressBar = (progress) => {
    const progressValue = typeof progress === 'number' ? progress : 0;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${progressValue}%` }}
        ></div>
      </div>
    );
  };

  // Renderizar detalles completos de la campaña
  const renderCampaignDetails = (campaign) => {
    if (selectedCampaignId !== campaign.id) return null;
    
    const timeElapsed = formatElapsedTime(campaign.createdAt, campaign.status === 'processing' ? new Date() : campaign.endedAt || campaign.lastUpdated);
    
    return (
      <div className="mt-2 bg-gray-50 p-3 rounded-md text-sm border border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-600">Inicio: {campaign.createdAt.toLocaleString()}</p>
            <p className="text-gray-600">Tiempo: {timeElapsed}</p>
            {campaign.targetUsers && (
              <p className="text-gray-600">Usuarios objetivo: {campaign.targetUsers.length}</p>
            )}
          </div>
          <div>
            <p className="text-gray-600">Tipo: {campaign.campaignType}</p>
            <p className="text-gray-600">Procesados: {campaign.totalProcessed || 0}</p>
            {campaign.endpoint && (
              <p className="text-gray-600 truncate" title={campaign.endpoint}>Endpoint: {campaign.endpoint}</p>
            )}
          </div>
        </div>
        
        {campaign.status === 'processing' && (
          <div className="mt-2">
            <button
              onClick={() => handleCancelCampaign(campaign.id)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Cancelar campaña
            </button>
          </div>
        )}
        
        {campaign.error && (
          <div className="mt-2 text-red-600 text-xs p-2 bg-red-50 rounded">
            Error: {campaign.error}
          </div>
        )}
      </div>
    );
  };

  if (loading && activeCampaigns.length === 0 && recentCampaigns.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-sm flex justify-center items-center h-40">
        <FaSpinner className="animate-spin text-blue-500 mr-2" />
        <span>Cargando campañas...</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Campañas Activas</h2>
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          Actualizar
        </button>
      </div>

      {activeCampaigns.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          No hay campañas activas en este momento
        </div>
      ) : (
        <div className="space-y-3">
          {activeCampaigns.map(campaign => (
            <div
              key={campaign.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {renderStatusIndicator(campaign.status)}
                  <h3 className="font-medium">{campaign.name}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span><FaClock className="inline mr-1" /> {formatElapsedTime(campaign.createdAt)}</span>
                  <button
                    onClick={() => toggleCampaignDetails(campaign.id)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {selectedCampaignId === campaign.id ? 'Menos' : 'Más'}
                  </button>
                </div>
              </div>
              
              <div className="mt-2">
                {renderProgressBar(campaign.progress)}
                <div className="flex justify-between text-xs mt-1">
                  <span>{campaign.progress}% completado</span>
                  <span>{campaign.totalProcessed || 0} procesados</span>
                </div>
              </div>
              
              {renderCampaignDetails(campaign)}
            </div>
          ))}
        </div>
      )}

      {/* Campañas recientes */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            <button
              onClick={() => setShowRecent(!showRecent)}
              className="flex items-center focus:outline-none"
            >
              <span>Campañas Recientes</span>
              <span className="ml-2">{showRecent ? '▲' : '▼'}</span>
            </button>
          </h2>
          <span className="text-sm text-gray-500">{recentCampaigns.length} campañas</span>
        </div>

        {showRecent && (
          <div className="space-y-2">
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No hay campañas recientes para mostrar
              </div>
            ) : (
              recentCampaigns.map(campaign => (
                <div
                  key={campaign.id}
                  className={`border ${
                    campaign.status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : campaign.status === 'failed'
                      ? 'border-red-200 bg-red-50'
                      : campaign.status === 'cancelled' 
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-200 bg-white'
                  } rounded-lg p-3`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {renderStatusIndicator(campaign.status)}
                      <h3 className="font-medium">{campaign.name}</h3>
                    </div>
                    <div className="text-xs text-gray-500">
                      {campaign.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {campaign.campaignType} - {campaign.totalProcessed || 0} usuarios procesados
                    {campaign.error && (
                      <div className="mt-1 text-red-600">
                        <FaExclamationTriangle className="inline mr-1" />
                        Error: {campaign.error}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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