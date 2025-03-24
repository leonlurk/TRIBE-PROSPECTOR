import React from 'react';
import PropTypes from 'prop-types';
import { FaRegBell } from 'react-icons/fa';
import { AreaChart, Area, XAxis, LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const HomeDashboard = ({ user }) => {
  // Datos estáticos para mostrar en los gráficos
  const sampleCampaign = {
    name: "Influencers Fitness",
    action: "Enviar Mensajes",
    status: "Activa",
    chartData: {
      days: ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"],
      values: [15, 35, 80, 30, 65, 75]
    }
  };

  const totalInteractions = 35765;
  
  const barChartData = [
    { label: "Bienvenida", response: 25, conversion: 5 },
    { label: "CTA", response: 19, conversion: 10 },
    { label: "Videollamada", response: 19, conversion: 10 },
    { label: "Nota de voz", response: 25, conversion: 13 }
  ];

  const interactionData = [
    { month: 'Ene', clickBio: 15, comments: 25, likes: 10 },
    { month: '', clickBio: 20, comments: 22, likes: 15 },
    { month: 'Feb', clickBio: 25, comments: 18, likes: 20 },
    { month: '', clickBio: 30, comments: 15, likes: 25 },
    { month: 'Mar', clickBio: 35, comments: 12, likes: 30 },
    { month: '', clickBio: 25, comments: 18, likes: 20 },
    { month: 'Abr', clickBio: 15, comments: 25, likes: 10 },
    { month: '', clickBio: 25, comments: 20, likes: 20 },
    { month: 'May', clickBio: 35, comments: 15, likes: 30 },
    { month: '', clickBio: 40, comments: 20, likes: 25 },
    { month: 'Jun', clickBio: 45, comments: 25, likes: 20 }
  ];

  const renderLineChart = () => {
    // Crear un conjunto de datos más denso para una curva más suave
    const data = [];
    const days = sampleCampaign.chartData.days;
    const values = sampleCampaign.chartData.values;
    
    // Añadir puntos interpolados entre días para suavizar la curva
    for (let i = 0; i < days.length; i++) {
      data.push({ name: days[i], value: values[i], display: true });
      
      // Añadir punto intermedio si no es el último día
      if (i < days.length - 1) {
        // Valor interpolado para la curva suave
        const midValue = (values[i] + values[i+1]) / 2;
        data.push({ name: '', value: midValue, display: false });
      }
    }
    
    // Componente para punto destacado en "Vie"
    const CustomDot = (props) => {
      const { cx, cy, payload } = props;
      if (payload.name === 'Vie' && payload.display) {
        return (
          <circle cx={cx} cy={cy} r={4} fill="white" stroke="#4338CA" strokeWidth={2} />
        );
      }
      return null;
    };
  
    return (
      <div className="relative w-full h-64 mt-4 mb-2 bg-[#F8F7FF] rounded-lg overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }) => {
                if (!payload.value) return null; // No mostrar etiquetas para puntos interpolados
                return (
                  <text 
                    x={x} 
                    y={y + 10} 
                    textAnchor="middle" 
                    fill={payload.value === 'Vie' ? 'white' : '#9CA3AF'} 
                    className="text-xs"
                  >
                    {payload.value === 'Vie' ? (
                      <tspan x={x} dy="0.5em" className="bg-[#1E1B4B] px-2 py-1 rounded-md">
                        {payload.value}
                      </tspan>
                    ) : (
                      payload.value
                    )}
                  </text>
                );
              }}
              height={50}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-2 rounded shadow-sm">
                      <p className="text-xs text-black">{`${payload[0].value} mensajes`}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4338CA"
              strokeWidth={4}
              fill="url(#colorGradient)"
              dot={false}
              activeDot={{ r: 6, fill: "white", stroke: "#4338CA", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="none"
              dot={CustomDot}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="absolute bottom-0 left-0 right-0 flex justify-center mb-1">
          <div className="bg-white rounded-md px-2 py-1 shadow-sm flex items-center gap-2">
            <div className="w-5 h-1 bg-[#4338CA]"></div>
            <span className="text-xs text-gray-600">Mensajes Enviados</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    // Altura máxima en píxeles para la barra más alta (25%)
    const maxHeight = 180;
    
    return (
      <div className="mt-6 space-y-2 px-4">
        {/* Contenedor principal */}
        <div className="flex justify-between">
          {barChartData.map((item, index) => (
            <div key={`column-${index}`} className="flex flex-col items-center w-1/4 px-2">
              {/* Contenedor de barras y porcentajes */}
              <div className="flex items-end h-48 gap-2">
                {/* Columna para respuestas */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-10 bg-[#4A1D96] rounded-t-sm" 
                    style={{ height: `${(item.response / 25) * maxHeight}px` }}
                  ></div>
                  <span className="text-gray-500 text-sm mt-1">{item.response}%</span>
                </div>
                
                {/* Columna para conversión */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-10 bg-[#8B5CF6] rounded-t-sm" 
                    style={{ height: `${(item.conversion / 25) * maxHeight}px` }}
                  ></div>
                  <span className="text-gray-500 text-sm mt-1">{item.conversion}%</span>
                </div>
              </div>
              
              {/* Etiqueta de categoría */}
              <div className="text-center text-gray-500 text-sm mt-4">
                {item.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Leyenda */}
        <div className="flex justify-center mt-8 gap-8">
          <div className="flex items-center">
            <div className="h-3 w-3 mr-2 bg-[#4A1D96]"></div>
            <span className="text-sm text-gray-600">% Respuestas</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 mr-2 bg-[#8B5CF6]"></div>
            <span className="text-sm text-gray-600">% Conversión</span>
          </div>
        </div>
      </div>
    );
  };

  const renderConversionRate = () => {
  return (
    <div className="flex justify-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Segmento superior-izquierdo (morado) */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="183 251.2"
            strokeDashoffset="0"
            transform="rotate(-270.7 50 50)"
          />
          
          {/* Segmento inferior (morado oscuro) */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#39147e"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="15 251.2"
            strokeDashoffset="-210"
            transform="rotate(-245.5 50 50)"
          />
          
          {/* Segmento derecho (negro) */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#0F172A" 
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="27.2 251.2"
            strokeDashoffset="0"
            transform="rotate(-356 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-medium text-black">10%</span>
        </div>
      </div>
    </div>
  );
};
  
  

  const renderMessageRate = () => {
    return (
      <div className="relative w-full h-32 flex items-center justify-center">
        <svg className="w-36 h-36" viewBox="0 0 100 100">
          {/* Círculo de fondo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#b393ef"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="230 251.2"
            strokeDashoffset="0"
            transform="rotate(124 50 50)"
          />
          {/* Círculo principal - aprox 75% del círculo */}
          <circle
  cx="50"
  cy="50"
  r="45"
  fill="none"
  stroke="#7C3AED"
  strokeWidth="8"
  strokeLinecap="round"
  strokeDasharray="230 283"
  strokeDashoffset="60"
  transform="rotate(124 50 50)"
/>
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <div className="text-3xl font-medium text-black">42</div>
          <div className="text-xs text-gray-500">Mensajes x hora</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen font-['Poppins']">
      {/* Encabezado con saludo */}
      <div className="mb-6">
        <h2 className="text-lg text-gray-600 font-normal">Hola {user?.username || "Usuario"},</h2>
        <h1 className="text-2xl font-medium text-black">Bienvenido a Prospecthor IA</h1>
      </div>

      {/* Campañas activas */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-medium text-black">Campañas activas</h2>
          <button className="bg-white text-gray-500 px-3 py-1 rounded-lg border border-gray-200 text-sm">
            Ver todo
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 mt-4 shadow-sm">
          <div className="flex justify-between">
            <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative flex items-center justify-center">
            <img 
                src="/assets/rectangleDark.png" 
                alt="Background" 
                className="w-full h-full absolute top-0 left-0"
            />
            <img 
                src="/assets/messages-2.png" 
                alt="Messages Icon" 
                className="w-8 h-8 relative z-10"
            />
            </div>
              <div>
              <div className="font-semibold text-black">{sampleCampaign.name}</div>
                <div className="text-sm text-gray-400">{sampleCampaign.action}</div>
              </div>
            </div>
            <div>
              <span className="bg-green-100 text-black px-3 py-1 rounded-full text-sm">
                {sampleCampaign.status}
              </span>
            </div>
          </div>

          {renderLineChart()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Total de interacciones */}
<div className="bg-white p-4 rounded-xl shadow-sm">
  <div className="flex justify-between items-center mb-2">
    <div>
      <h2 className="text-3xl font-medium text-black">{totalInteractions.toLocaleString()}</h2>
      <p className="text-sm text-gray-500">Total de interacciones</p>
    </div>
    
    {/* Botón de configuración para el gráfico izquierdo */}
    {/* Botón de configuración para el gráfico izquierdo */}
<div className="flex items-center">
  <img 
    src="/assets/setting-4.png" 
    alt="Configuración" 
    className="w-12 h-12 cursor-pointer"
  />
</div>
  </div>

  <div className="flex gap-4 text-sm mb-4">
    <button className="bg-white text-black border-b-2 border-black px-3 py-1 font-medium">Día</button>
    <button className="bg-white text-gray-400 px-3 py-1">Semana</button>
    <button className="bg-white text-gray-400 px-3 py-1">Mes</button>
    <button className="bg-white text-gray-400 px-3 py-1">Año</button>
  </div>

  <div className="h-44">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={interactionData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <XAxis 
          dataKey="month" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
          }}
          itemStyle={{ color: '#4B5563', fontSize: 12 }}
          formatter={(value) => [`${value}`, '']}
          labelFormatter={() => ''}
        />
        <Line 
          type="monotone" 
          dataKey="clickBio" 
          stroke="#4338CA" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="comments" 
          stroke="#8B5CF6" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="likes" 
          stroke="#1F2937" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>

  <div className="flex gap-6 text-xs text-gray-500 mt-2 justify-center">
    <div className="flex items-center gap-2">
      <div className="h-1 w-4 bg-[#4338CA]"></div>
      <span>Click en Bio</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="h-1 w-4 bg-[#8B5CF6]"></div>
      <span>Comentarios</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="h-1 w-4 bg-[#1F2937]"></div>
      <span>Likes</span>
    </div>
  </div>
</div>

        {/* Gráfico A/B de mensajes */}
<div className="bg-white p-6 rounded-xl shadow-sm">
  <div className="flex justify-between items-center">
    <h2 className="text-2xl font-medium text-black">Grafico A/B de mensajes</h2>
    
    {/* Botón de configuración para el gráfico derecho */}
    <div className="flex items-center">
  <img 
    src="/assets/setting-4.png" 
    alt="Configuración" 
    className="w-12 h-12 cursor-pointer"
  />
</div>
  </div>
  {renderBarChart()}
</div>

        {/* Tasa de conversión */}
<div className="bg-white p-6 rounded-xl shadow-sm">
<h2 className="text-2xl font-medium mb-6 text-black">Tasa de conversión</h2>
  
  <div className="flex items-start">
    {/* Leyendas (izquierda) */}
    <div className="flex flex-col gap-3 pr-6">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-[#7C3AED]"></div>
        <span className="text-sm text-gray-600">Leads Totales</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-[#0F172A]"></div>
        <span className="text-sm text-gray-600">Convertidos</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-[#4F46E5]"></div>
        <span className="text-sm text-gray-600">Calificados</span>
      </div>
    </div>

    {/* Gráfico (derecha) */}
    <div className="flex-grow flex justify-end">
      {renderConversionRate()}
    </div>
  </div>
</div>


        {/* Promedio de mensajes */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center mb-4">
            <h2 className="text-2xl font-medium text-black">Promedio de mensajes</h2>
            <div className="ml-2 h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-xs text-gray-400">i</span>
            </div>
        </div>
        
        <div className="flex items-start">
            {/* Este div vacío es para mantener el espacio donde irían las leyendas */}
            <div className="flex-grow">
            {/* No hay leyendas en este caso, pero mantenemos la estructura */}
            </div>
            
            {/* Gráfico (derecha) */}
            <div className="flex justify-end">
            {renderMessageRate()}
            </div>
        </div>
        </div>
      </div>
    </div>
  );
};

HomeDashboard.propTypes = {
  user: PropTypes.object
};

export default HomeDashboard;