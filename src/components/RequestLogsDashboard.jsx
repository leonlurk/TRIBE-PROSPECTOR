import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, orderBy, limit, getDocs, where, startAfter } from "firebase/firestore";
import PropTypes from "prop-types";
import { FaSearch, FaFilter, FaDownload, FaClock, FaSync } from "react-icons/fa";
import logApiRequest from "../requestLogger"; // Import the logger utility

const RequestLogsDashboard = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    endpoint: "",
    status: "",
    source: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logsPerPage] = useState(20);
  const [selectedLog, setSelectedLog] = useState(null);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [statsData, setStatsData] = useState({
    totalRequests: 0,
    successfulRequests: 0, 
    failedRequests: 0,
    uniqueEndpoints: 0
  });

  // Function to fetch request logs
  const fetchLogs = async (nextPage = false) => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Log the fetch attempt
      if (user) {
        await logApiRequest({
          endpoint: "internal/fetch_request_logs",
          requestData: { filters: filter },
          userId: user.uid,
          status: "pending",
          source: "RequestLogsDashboard",
          metadata: {
            action: "fetch_request_logs",
            page: currentPage,
            filters: filter
          }
        });
      }
      
      // Create base query
      let logsQuery = query(
        collection(db, "users", user.uid, "requestLogs"),
        orderBy("timestamp", "desc")
      );
      
      // Apply filters if they exist
      if (filter.endpoint) {
        logsQuery = query(logsQuery, where("endpoint", "==", filter.endpoint));
      }
      
      if (filter.status) {
        logsQuery = query(logsQuery, where("responseStatus", "==", filter.status));
      }
      
      if (filter.source) {
        logsQuery = query(logsQuery, where("source", "==", filter.source));
      }
      
      // Apply pagination
      if (nextPage && lastVisibleDoc) {
        logsQuery = query(logsQuery, startAfter(lastVisibleDoc), limit(logsPerPage));
      } else {
        logsQuery = query(logsQuery, limit(logsPerPage));
      }
      
      const snapshot = await getDocs(logsQuery);
      
      if (!snapshot.empty) {
        // Save the last document for pagination
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
        
        const logsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date() // Convert Firestore timestamp to JS Date
        }));
        
        // Apply client-side search filter if needed
        let filteredLogs = logsList;
        if (searchQuery) {
          const lowerSearch = searchQuery.toLowerCase();
          filteredLogs = logsList.filter(log => 
            log.endpoint?.toLowerCase().includes(lowerSearch) ||
            log.source?.toLowerCase().includes(lowerSearch) ||
            log.responseStatus?.toLowerCase().includes(lowerSearch) ||
            JSON.stringify(log.metadata || {}).toLowerCase().includes(lowerSearch)
          );
        }
        
        setLogs(filteredLogs);
        
        // Log the successful fetch
        if (user) {
          await logApiRequest({
            endpoint: "internal/fetch_request_logs",
            requestData: { filters: filter },
            userId: user.uid,
            responseData: { count: filteredLogs.length },
            status: "success",
            source: "RequestLogsDashboard",
            metadata: {
              action: "fetch_request_logs",
              resultsCount: filteredLogs.length
            }
          });
        }
        
        // Calculate statistics
        const uniqueEndpoints = new Set(logsList.map(log => log.endpoint)).size;
        const successfulLogs = logsList.filter(log => log.responseStatus === "success").length;
        const failedLogs = logsList.filter(log => 
          log.responseStatus === "error" || log.responseStatus === "failed"
        ).length;
        
        setStatsData({
          totalRequests: logsList.length,
          successfulRequests: successfulLogs,
          failedRequests: failedLogs,
          uniqueEndpoints: uniqueEndpoints
        });
        
        // Estimate total pages (this is simplified; real implementation would need a count query)
        setTotalPages(Math.ceil(logsList.length * 3 / logsPerPage));
      } else {
        setLogs([]);
        setStatsData({
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          uniqueEndpoints: 0
        });
      }
    } catch (error) {
      console.error("Error fetching request logs:", error);
      
      // Log the error
      if (user) {
        await logApiRequest({
          endpoint: "internal/fetch_request_logs",
          requestData: { filters: filter },
          userId: user.uid,
          status: "error",
          source: "RequestLogsDashboard",
          metadata: {
            action: "fetch_request_logs",
            error: error.message
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch logs on component mount or when filters change
  useEffect(() => {
    if (user?.uid) {
      fetchLogs(false);
    }
  }, [user, filter]);
  
  // Handle search input changes
  useEffect(() => {
    if (user?.uid) {
      const delaySearch = setTimeout(() => {
        fetchLogs(false);
      }, 500);
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchQuery]);
  
  // Handle pagination
  useEffect(() => {
    if (user?.uid && currentPage > 1) {
      fetchLogs(true);
    }
  }, [currentPage]);
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilter({
      endpoint: "",
      status: "",
      source: ""
    });
    setSearchQuery("");
    setCurrentPage(1);
    
    // Log the reset action
    if (user) {
      logApiRequest({
        endpoint: "internal/reset_filters",
        requestData: {},
        userId: user.uid,
        status: "success",
        source: "RequestLogsDashboard",
        metadata: {
          action: "reset_log_filters"
        }
      });
    }
  };
  
  // View log details
  const viewLogDetails = (log) => {
    setSelectedLog(log);
    
    // Log the view action
    if (user) {
      logApiRequest({
        endpoint: "internal/view_log_details",
        requestData: { logId: log.id },
        userId: user.uid,
        status: "success",
        source: "RequestLogsDashboard",
        metadata: {
          action: "view_log_details",
          logId: log.id
        }
      });
    }
  };
  
  // Close log details modal
  const closeLogDetails = () => {
    setSelectedLog(null);
  };
  
  // Export logs as CSV
  const exportLogs = () => {
    if (logs.length === 0) return;
    
    // Log the export action
    if (user) {
      logApiRequest({
        endpoint: "internal/export_logs",
        requestData: { format: "csv" },
        userId: user.uid,
        status: "success",
        source: "RequestLogsDashboard",
        metadata: {
          action: "export_logs",
          format: "csv",
          count: logs.length
        }
      });
    }
    
    // Create CSV content
    const headers = ["ID", "Endpoint", "Status", "Timestamp", "Source", "Action"];
    
    const csvContent = [
      headers.join(","),
      ...logs.map(log => [
        log.id,
        log.endpoint,
        log.responseStatus,
        formatDate(log.timestamp),
        log.source,
        log.metadata?.action || ""
      ].join(","))
    ].join("\n");
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `request_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Extract unique values for filters
  const uniqueEndpoints = [...new Set(logs.map(log => log.endpoint))];
  const uniqueStatuses = [...new Set(logs.map(log => log.responseStatus))];
  const uniqueSources = [...new Set(logs.map(log => log.source))];
  
  return (
    <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Registro de Solicitudes API</h1>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">Total de Solicitudes</h3>
          <p className="text-2xl font-bold">{statsData.totalRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">Solicitudes Exitosas</h3>
          <p className="text-2xl font-bold text-green-600">{statsData.successfulRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">Solicitudes Fallidas</h3>
          <p className="text-2xl font-bold text-red-600">{statsData.failedRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">Endpoints Únicos</h3>
          <p className="text-2xl font-bold">{statsData.uniqueEndpoints}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex items-center mb-4">
          <FaFilter className="text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold">Filtros</h2>
          <button 
            onClick={resetFilters} 
            className="ml-auto text-blue-500 hover:text-blue-700 flex items-center text-sm"
          >
            <FaSync className="mr-1" /> Resetear
          </button>
          <button 
            onClick={exportLogs} 
            className="ml-4 text-green-500 hover:text-green-700 flex items-center text-sm"
            disabled={logs.length === 0}
          >
            <FaDownload className="mr-1" /> Exportar
          </button>
          <button 
            onClick={() => fetchLogs(false)} 
            className="ml-4 text-purple-500 hover:text-purple-700 flex items-center text-sm"
          >
            <FaSync className="mr-1" /> Actualizar
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
            <select
              name="endpoint"
              value={filter.endpoint}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {uniqueEndpoints.map(endpoint => (
                <option key={endpoint} value={endpoint}>{endpoint}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="status"
              value={filter.status}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
            <select
              name="source"
              value={filter.source}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en los logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron registros con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FaClock className="mr-1" />
                      Fecha/Hora
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuente</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-500">{log.id.substring(0, 8)}...</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{log.endpoint}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.responseStatus === 'success' ? 'bg-green-100 text-green-800' :
                        log.responseStatus === 'error' ? 'bg-red-100 text-red-800' :
                        log.responseStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.responseStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatDate(log.timestamp)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{log.source}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => viewLogDetails(log)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages || logs.length < logsPerPage}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages || logs.length < logsPerPage ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{logs.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    &laquo; Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage === totalPages || logs.length < logsPerPage}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages || logs.length < logsPerPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Siguiente &raquo;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Detalles de la Solicitud</h2>
              <button
                onClick={closeLogDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">ID</h3>
                <p className="text-base font-mono">{selectedLog.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Fecha/Hora</h3>
                <p className="text-base">{formatDate(selectedLog.timestamp)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Endpoint</h3>
                <p className="text-base font-mono">{selectedLog.endpoint}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                <p className={`inline-block px-2 py-1 text-sm font-medium rounded-full ${
                  selectedLog.responseStatus === 'success' ? 'bg-green-100 text-green-800' :
                  selectedLog.responseStatus === 'error' ? 'bg-red-100 text-red-800' :
                  selectedLog.responseStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedLog.responseStatus}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Fuente</h3>
                <p className="text-base">{selectedLog.source}</p>
              </div>
              {selectedLog.metadata?.action && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Acción</h3>
                  <p className="text-base">{selectedLog.metadata.action}</p>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Datos de la Solicitud</h3>
              <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                {JSON.stringify(selectedLog.requestData || {}, null, 2)}
              </pre>
            </div>
            
            {selectedLog.responseData && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Datos de la Respuesta</h3>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.responseData, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedLog.metadata && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Metadatos</h3>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

RequestLogsDashboard.propTypes = {
  user: PropTypes.object
};

export default RequestLogsDashboard;