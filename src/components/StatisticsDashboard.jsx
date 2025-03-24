import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FaRegBell, FaSlidersH } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, LineChart, Line, ResponsiveContainer, Tooltip, BarChart, Bar, ComposedChart } from 'recharts';

const StatisticsDashboard = ({ user }) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState('conversion');

  // Sample data from your different tabs
  const conversionData = {
    messagesCount: 564,
    leadsCount: 35,
    qualifiedLeads: 12,
    inFollowUp: 15,
    cold: 8,
    responsesCount: 357,
    responseRate: 21,
    averageClosingDays: 5,
    minClosingDays: 3,
    maxClosingDays: 7,
    conversionRate: 10
  };

  const growthData = {
    newFollowers: 51043,
    totalInteractions: 35765,
    conversionRate: 20,
    responseTimeDays: 3
  };

  const securityData = {
    blocks: 15,
    averageFollows: 70,
    averageMessages: 42
  };

  // Chart data
  const mainChartData = [
    { month: 'Ene', leads: 15, messages: 20, responses: 25 },
    { month: 'Feb', leads: 25, messages: 15, responses: 20 },
    { month: 'Mar', leads: 40, messages: 30, responses: 35 },
    { month: 'Abr', leads: 20, messages: 25, responses: 30 },
    { month: 'May', leads: 35, messages: 30, responses: 40 },
    { month: 'Jun', leads: 30, messages: 25, responses: 35 }
  ];

  const growthChartData = [
    { month: 'Ene', growth: 20 },
    { month: 'Feb', growth: 25 },
    { month: 'Mar', growth: 45 },
    { month: 'Abr', growth: 28 },
    { month: 'May', growth: 35 },
    { month: 'Jun', growth: 32 }
  ];

  const interactionData = [
    { month: 'Ene', comments: 15, likes: 25, clickBio: 10 },
    { month: 'Feb', comments: 20, likes: 22, clickBio: 15 },
    { month: 'Mar', comments: 25, likes: 18, clickBio: 20 },
    { month: 'Abr', comments: 30, likes: 15, clickBio: 25 },
    { month: 'May', comments: 35, likes: 12, clickBio: 30 },
    { month: 'Jun', comments: 25, likes: 18, clickBio: 20 }
  ];

  const timeUsageData = [
    { day: 'Lun', usage: 35, rest: 65 },
    { day: 'Mar', usage: 15, rest: 85 },
    { day: 'Mie', usage: 22, rest: 78 },
    { day: 'Jue', usage: 9, rest: 91 },
    { day: 'Vie', usage: 19, rest: 81 },
    { day: 'Sab', usage: 28, rest: 72 },
    { day: 'Dom', usage: 32, rest: 68 }
  ];

  const heatmapData = {
    days: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
    hours: ['0:00', '4:00', '7:00', '10:00', '12:00', '15:00', '17:00', '19:00', '21:00', '23:00'],
    // Values from 0 to 100 for intensity
    values: [
      [50, 90, 60, 70, 80, 75, 85, 90, 95, 70],
      [40, 50, 90, 95, 60, 40, 90, 80, 50, 30],
      [60, 70, 80, 95, 40, 50, 90, 95, 80, 90],
      [70, 80, 50, 95, 30, 60, 70, 50, 70, 80],
      [80, 90, 95, 80, 70, 90, 95, 80, 90, 50],
      [50, 90, 40, 30, 50, 80, 40, 90, 50, 30],
      [70, 40, 30, 70, 30, 80, 60, 70, 50, 60]
    ]
  };

  const barChartData = [
    { label: "Bienvenida", response: 25, conversion: 5 },
    { label: "CTA", response: 19, conversion: 10 },
    { label: "Videollamada", response: 21, conversion: 7 },
    { label: "Nota de voz", response: 19, conversion: 15 }
  ];

  // Renders the conversion donut chart
  const renderConversionRate = (percentage) => {
    return (
      <div className="flex justify-center">
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Purple segment */}
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
            
            {/* Dark purple segment */}
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
            
            {/* Black segment */}
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
            <span className="text-3xl font-medium text-black">{percentage}%</span>
          </div>
        </div>
      </div>
    );
  };

  // Circular gauge for messages or follow metrics
  const renderCircularGauge = (value, label) => {
    return (
      <div className="relative w-full h-32 flex items-center justify-center">
        <svg className="w-36 h-36" viewBox="0 0 100 100">
          {/* Background circle */}
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
          {/* Main circle - approx 75% */}
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
          <div className="text-3xl font-medium text-black">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    );
  };

  // Bar chart for Message A/B testing
  const renderBarChart = () => {
    // Maximum height in pixels for the tallest bar (25%)
    const maxHeight = 180;
    
    return (
      <div className="mt-6 space-y-2 px-4">
        {/* Main container */}
        <div className="flex justify-between">
          {barChartData.map((item, index) => (
            <div key={`column-${index}`} className="flex flex-col items-center w-1/4 px-2">
              {/* Bars and percentages container */}
              <div className="flex items-end h-48 gap-2">
                {/* Response column */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-10 bg-[#4A1D96] rounded-t-sm" 
                    style={{ height: `${(item.response / 25) * maxHeight}px` }}
                  ></div>
                  <span className="text-gray-500 text-sm mt-1">{item.response}%</span>
                </div>
                
                {/* Conversion column */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-10 bg-[#8B5CF6] rounded-t-sm" 
                    style={{ height: `${(item.conversion / 25) * maxHeight}px` }}
                  ></div>
                  <span className="text-gray-500 text-sm mt-1">{item.conversion}%</span>
                </div>
              </div>
              
              {/* Category label */}
              <div className="text-center text-gray-500 text-sm mt-4">
                {item.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
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

  // Heatmap visualization for Security tab
// Heatmap visualization
// Heatmap visualization
const renderHeatmap = () => {
    return (
      <div className="w-full">
        {/* Leyenda de colores - arriba y a la derecha */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600">0</span>
            <div className="w-8 h-2 bg-blue-100"></div>
            <span className="text-xs text-gray-600">10</span>
            <div className="w-8 h-2 bg-blue-300"></div>
            <span className="text-xs text-gray-600">50</span>
            <div className="w-8 h-2 bg-blue-700"></div>
            <span className="text-xs text-gray-600">75</span>
            <div className="w-8 h-2 bg-blue-900"></div>
            <span className="text-xs text-gray-600">100</span>
          </div>
        </div>
        
        <div className="w-full">
          {/* Filas del heatmap */}
          {heatmapData.days.map((day, dayIndex) => (
            <div key={`day-${dayIndex}`} className="flex w-full mb-1">
              {/* Etiqueta del día */}
              <div className="w-10 flex-shrink-0 text-xs text-gray-600 flex items-center">
                {day}
              </div>
              
              {/* Celdas para el día */}
              <div className="grid grid-cols-10 gap-1 flex-1">
                {heatmapData.values[dayIndex].map((value, hourIndex) => {
                  // Determinar color basado en valor
                  let bgColor;
                  if (value < 20) bgColor = "bg-violet-200";
                  else if (value < 40) bgColor = "bg-violet-300";
                  else if (value < 60) bgColor = "bg-violet-400";
                  else if (value < 80) bgColor = "bg-violet-500";
                  else bgColor = hourIndex % 2 === 0 ? "bg-violet-700" : "bg-black";
                  
                  return (
                    <div 
                      key={`cell-${dayIndex}-${hourIndex}`}
                      className={`h-9 ${bgColor}`}
                    ></div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Etiquetas de horas */}
          <div className="flex w-full mt-2">
            <div className="w-10 flex-shrink-0"></div>
            <div className="grid grid-cols-10 gap-1 flex-1">
              {heatmapData.hours.map((hour, index) => (
                <div key={`hour-${index}`} className="text-xs text-gray-600 text-center overflow-hidden">
                  {hour}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render conversion tab content
  // Función renderConversionTab modificada
const renderConversionTab = () => {
    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Gráfico principal de mensajes enviados - 7 columnas */}
        <div className="col-span-12 md:col-span-7 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-3xl font-medium text-black">{conversionData.messagesCount}</h2>
              <p className="text-sm text-gray-500">Mensajes enviados</p>
            </div>
            <div className="flex items-center">
              <img 
                src="/assets/setting-4.svg" 
                alt="Configuración" 
                className="w-10 h-10 cursor-pointer"
              />
            </div>
          </div>
  
          <div className="flex gap-4 text-sm mb-4">
            <button className="bg-white text-black border-b-2 border-black px-3 py-1 font-medium">Día</button>
            <button className="bg-white text-gray-400 px-3 py-1">Semana</button>
            <button className="bg-white text-gray-400 px-3 py-1">Mes</button>
            <button className="bg-white text-gray-400 px-3 py-1">Año</button>
          </div>
  
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mainChartData}
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
                  dataKey="leads" 
                  stroke="#000000" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="responses" 
                  stroke="#4338CA" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
  
          <div className="flex gap-6 text-xs text-gray-500 mt-2 justify-center">
            <div className="flex items-center gap-2">
              <div className="h-1 w-4 bg-black"></div>
              <span>Leads Generados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-4 bg-[#8B5CF6]"></div>
              <span>Mensajes enviados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-4 bg-[#4338CA]"></div>
              <span>Respuestas</span>
            </div>
          </div>
        </div>
  
        {/* Container para los cards de la derecha - 5 columnas */}
        <div className="col-span-12 md:col-span-5 grid grid-rows-2 gap-4">
          {/* Lead stats card */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-medium text-black mb-2">Lead Generados</h2>
            <div className="text-3xl font-medium text-black mb-4">{conversionData.leadsCount}</div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Calificado</span>
                  <span className="text-gray-700 font-medium">{conversionData.qualifiedLeads}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-[#7C3AED] rounded-full" 
                    style={{ width: `${(conversionData.qualifiedLeads/conversionData.leadsCount) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">En seguimiento</span>
                  <span className="text-gray-700 font-medium">{conversionData.inFollowUp}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-[#7C3AED] rounded-full" 
                    style={{ width: `${(conversionData.inFollowUp/conversionData.leadsCount) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Frío</span>
                  <span className="text-gray-700 font-medium">{conversionData.cold}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-[#7C3AED] rounded-full" 
                    style={{ width: `${(conversionData.cold/conversionData.leadsCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
  
          {/* Responses card */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-medium text-black mb-2">Respuestas</h2>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-3xl font-medium text-black">{conversionData.responsesCount}</div>
                <div className="text-sm text-gray-500">Respuestas recibidas</div>
              </div>
              <div className="relative w-32 h-32">
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
                  <span className="text-2xl font-medium text-black">{conversionData.responseRate}%</span>
                </div>
              </div>
            </div>
            
            <div className="mt-2 flex gap-3">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-[#7C3AED]"></div>
                <span className="text-xs text-gray-600">Lead Calificado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-[#C4B5FD]"></div>
                <span className="text-xs text-gray-600">Descartado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-[#4338CA]"></div>
                <span className="text-xs text-gray-600">En Evaluación</span>
              </div>
            </div>
          </div>
        </div>
  
        {/* Closing rate card - 6 columnas */}
        <div className="col-span-12 md:col-span-6 bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-xl font-medium text-black mb-4">Tasa de Cierre</h2>
          
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#7C3AED]"></div>
                <span className="text-sm text-gray-600">Promedio</span>
                <span className="font-medium text-black">{conversionData.averageClosingDays} Días</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#C4B5FD]"></div>
                <span className="text-sm text-gray-600">Mínimo</span>
                <span className="font-medium text-black">{conversionData.minClosingDays} Días</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#4338CA]"></div>
                <span className="text-sm text-gray-600">Máximo</span>
                <span className="font-medium text-black">{conversionData.maxClosingDays} Días</span>
              </div>
            </div>
            
            <div className="relative">
              <svg className="w-32 h-32" viewBox="0 0 100 100">
                {/* Círculos concéntricos decorativos */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  strokeDasharray="200 82"
                  strokeLinecap="round"
                  transform="rotate(-45 50 50)"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                  strokeDasharray="60 160"
                  strokeLinecap="round"
                  transform="rotate(170 50 50)"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="25"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                  strokeDasharray="60 97"
                  strokeLinecap="round"
                  transform="rotate(-70 50 50)"
                />
                
                <circle
                  cx="50"
                  cy="50"
                  r="14"
                  fill="#7C3AED"
                />
              </svg>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
  
        {/* Conversion rate card - 6 columnas */}
        <div className="col-span-12 md:col-span-6 bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-xl font-medium mb-4 text-black">Tasa de conversión</h2>
          
          <div className="flex items-start justify-between">
            {/* Legends (left) */}
            <div className="flex flex-col gap-3">
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
  
            {/* Chart (right) */}
            <div className="flex-grow flex justify-end">
              {renderConversionRate(conversionData.conversionRate)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render growth tab content
  // Render growth tab content
// Función renderGrowthTab modificada
const renderGrowthTab = () => {
    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* New followers chart - 7 columnas */}
        <div className="col-span-12 md:col-span-7 bg-white p-4 rounded-xl shadow-sm">
          <div>
            <h2 className="text-3xl font-medium text-black">{growthData.newFollowers.toLocaleString()}</h2>
            <p className="text-sm text-gray-500">Nuevos seguidores</p>
          </div>
  
          <div className="flex gap-4 text-sm my-4">
            <button className="bg-white text-black border-b-2 border-black px-3 py-1 font-medium">Día</button>
            <button className="bg-white text-gray-400 px-3 py-1">Semana</button>
            <button className="bg-white text-gray-400 px-3 py-1">Mes</button>
            <button className="bg-white text-gray-400 px-3 py-1">Año</button>
          </div>
  
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growthChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
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
                  formatter={(value) => [`${value}`, '']}
                  labelFormatter={() => ''}
                />
                <Area 
                  type="monotone" 
                  dataKey="growth" 
                  stroke="#7C3AED" 
                  fillOpacity={1} 
                  fill="url(#colorGrowth)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
  
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <div>Ene</div>
            <div>Feb</div>
            <div className="bg-indigo-300 px-2 rounded-full">Mar</div>
            <div>Abr</div>
            <div>May</div>
            <div>Jun</div>
          </div>
        </div>
  
        {/* Container para los dos gráficos - ocupa 5 columnas */}
        <div className="col-span-12 md:col-span-5 grid grid-rows-2 gap-4">
          {/* Tasa de Conversión - gráfico */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-medium text-black mb-2">Tasa de Conversión</h2>
            <div className="flex flex-col">
              <div className="text-3xl font-medium text-black mb-2">{growthData.conversionRate}%</div>
              
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={Array(12).fill().map((_, i) => { 
                      const baseValue = Math.floor(Math.random() * 100) + 50;
                      return {
                        index: i, 
                        value: baseValue,
                        line: baseValue + (Math.random() > 0.5 ? 30 : -30)
                      };
                    })}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="index" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      ticks={[0, 50, 100, 200]}
                      domain={[0, 200]}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#7C3AED" 
                      radius={[2, 2, 0, 0]} 
                      barSize={12}
                    />
                    <Line
                      type="monotone"
                      dataKey="line"
                      stroke="#A855F7"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
  
          {/* Tiempo de respuesta Promedio - gráfico */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-medium text-black mb-2">Tiempo de respuesta Promedio</h2>
            
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="text-6xl font-medium text-black mr-2">{growthData.responseTimeDays}</div>
                <div className="text-lg text-gray-500">Días</div>
              </div>
              
              <div className="relative">
                <svg className="w-32 h-32" viewBox="0 0 100 100">
                  {/* Círculos concéntricos decorativos */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    strokeDasharray="220 62"
                    strokeLinecap="round"
                    transform="rotate(-45 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                    strokeDasharray="60 160"
                    strokeLinecap="round"
                    transform="rotate(170 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="25"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                    strokeDasharray="60 97"
                    strokeLinecap="round"
                    transform="rotate(-70 50 50)"
                  />
                  
                  {/* Círculo central con icono */}
                  <circle
                    cx="50"
                    cy="50"
                    r="15"
                    fill="#7C3AED"
                  />
                </svg>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        {/* Total interactions - ocupa 6 columnas */}
        <div className="col-span-12 md:col-span-6 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-3xl font-medium text-black">{growthData.totalInteractions.toLocaleString()}</h2>
              <p className="text-sm text-gray-500">Total de interacciones</p>
            </div>
            <div className="flex items-center">
              <img 
                src="/assets/setting-4.svg" 
                alt="Configuración" 
                className="w-10 h-10 cursor-pointer"
              />
            </div>
          </div>
  
          <div className="flex gap-4 text-sm mb-4">
            <button className="bg-white text-black border-b-2 border-black px-3 py-1 font-medium">Día</button>
            <button className="bg-white text-gray-400 px-3 py-1">Semana</button>
            <button className="bg-white text-gray-400 px-3 py-1">Mes</button>
            <button className="bg-white text-gray-400 px-3 py-1">Año</button>
          </div>
  
          <div className="h-52">
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
  
        {/* Heatmap - ocupa 6 columnas */}
        <div className="col-span-12 md:col-span-6 bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-xl font-medium text-black mb-4">Heatmap</h2>
          
          <div className="w-full">
            {/* Leyenda de colores - arriba */}
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">0</span>
                <div className="w-6 h-2 bg-blue-100"></div>
                <span className="text-xs text-gray-600">10</span>
                <div className="w-6 h-2 bg-blue-300"></div>
                <span className="text-xs text-gray-600">50</span>
                <div className="w-6 h-2 bg-blue-700"></div>
                <span className="text-xs text-gray-600">75</span>
                <div className="w-6 h-2 bg-blue-900"></div>
                <span className="text-xs text-gray-600">100</span>
              </div>
            </div>
            
            {/* Contenido del heatmap simplificado para este contexto */}
            <div className="w-full h-52 grid grid-rows-7 gap-1">
              {heatmapData.days.map((day, dayIndex) => (
                <div key={`day-${dayIndex}`} className="flex w-full">
                  <div className="w-8 flex-shrink-0 text-xs text-gray-600 flex items-center">
                    {day}
                  </div>
                  <div className="grid grid-cols-10 gap-1 flex-1">
                    {heatmapData.values[dayIndex].map((value, hourIndex) => {
                      let bgColor;
                      if (value < 20) bgColor = "bg-violet-200";
                      else if (value < 40) bgColor = "bg-violet-300";
                      else if (value < 60) bgColor = "bg-violet-400";
                      else if (value < 80) bgColor = "bg-violet-500";
                      else bgColor = hourIndex % 2 === 0 ? "bg-violet-700" : "bg-black";
                      
                      return (
                        <div 
                          key={`cell-${dayIndex}-${hourIndex}`}
                          className={`h-6 ${bgColor}`}
                        ></div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render security tab content
  // Actualización del renderSecurityTab para que coincida con la imagen de referencia

  const renderSecurityTab = () => {
    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Bloques chart - primer gráfico - ocupa 7 columnas */}
        <div className="col-span-12 md:col-span-7 bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-xl font-medium text-black mb-4">15</h2>
          <p className="text-sm text-gray-500">Bloqueos</p>
            
          <div className="flex gap-4 text-sm my-4">
            <button className="bg-white text-gray-400 px-3 py-1">Día</button>
            <button className="bg-white text-gray-400 px-3 py-1">Semana</button>
            <button className="bg-white text-black border-b-2 border-black px-3 py-1 font-medium">Mes</button>
            <button className="bg-white text-gray-400 px-3 py-1">Año</button>
          </div>
  
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growthChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorBlocks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Area 
                  type="natural" 
                  dataKey="growth" 
                  stroke="#7C3AED" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBlocks)" 
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
  
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <div>Ene</div>
            <div>Feb</div>
            <div>Mar</div>
            <div className="bg-indigo-300 px-2 rounded-full">Abr</div>
            <div>May</div>
            <div>Jun</div>
          </div>
        </div>
  
        {/* Container para los dos gráficos circulares - ocupa 5 columnas */}
        <div className="col-span-12 md:col-span-5 grid grid-rows-2 gap-4">
          {/* Promedio de seguimientos - gráfico circular */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center mb-2">
              <h2 className="text-xl font-medium text-black">Promedio de seguimientos</h2>
              <div className="ml-2 h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-400">i</span>
              </div>
            </div>
            
            <div className="flex justify-center py-2">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Círculo de fondo */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#F3F2FC"
                    strokeWidth="10"
                  />
                  {/* Arco principal */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="240 283"
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-medium text-black">70</div>
                  <div className="text-xs text-gray-500">Seguidos</div>
                </div>
              </div>
            </div>
          </div>
  
          {/* Promedio de mensajes - gráfico circular */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center mb-2">
              <h2 className="text-xl font-medium text-black">Promedio de mensajes</h2>
              <div className="ml-2 h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-400">i</span>
              </div>
            </div>
            
            <div className="flex justify-center py-2">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Círculo de fondo */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#F3F2FC"
                    strokeWidth="10"
                  />
                  {/* Arco principal */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="200 283"
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-medium text-black">42</div>
                  <div className="text-xs text-gray-500">Mensajes x hora</div>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        {/* Gráfico A/B de mensajes - ocupa 6 columnas */}
        <div className="col-span-12 md:col-span-6 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium text-black">Grafico A/B de mensajes</h2>
            <div className="flex items-center">
              <img 
                src="/assets/setting-4.svg" 
                alt="Configuración" 
                className="w-10 h-10 cursor-pointer"
              />
            </div>
          </div>
  
          {renderBarChart()}
        </div>
  
        {/* Tiempo de Uso de la Cuenta - ocupa 6 columnas */}
        <div className="col-span-12 md:col-span-6 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-medium text-black">Tiempo de Uso de la Cuenta</h2>
              <div className="text-sm text-gray-500 mt-1">Hoy Lun, 4 h 48 min</div>
            </div>
            <div className="flex items-center">
              <img 
                src="/assets/setting-4.svg" 
                alt="Configuración" 
                className="w-10 h-10 cursor-pointer"
              />
            </div>
          </div>
          
          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={[
                  { day: 'Lun', usage: 35, line: 40 },
                  { day: 'Mar', usage: 15, line: 20 },
                  { day: 'Mie', usage: 22, line: 30 },
                  { day: 'Jue', usage: 9, line: 15 },
                  { day: 'Vie', usage: 19, line: 25 },
                  { day: 'Sab', usage: 28, line: 35 },
                  { day: 'Dom', usage: 32, line: 40 }
                ]}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                barGap={0}
              >
                <XAxis 
                  dataKey="day" 
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
                  formatter={(value) => [`${value}%`, '']}
                />
                <Bar 
                  dataKey="usage" 
                  fill="#7C3AED" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
                <Line
                  type="natural"
                  dataKey="line"
                  stroke="#E5E5FF"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex gap-6 text-xs text-gray-500 mt-2 px-10">
            <div className="flex items-center bg-[#7C3AED] text-white px-2 py-1 rounded-md">
              <span>Lun</span>
            </div>
            <div className="flex items-center">
              <span>Mar</span>
            </div>
            <div className="flex items-center">
              <span>Mie</span>
            </div>
            <div className="flex items-center">
              <span>Jue</span>
            </div>
            <div className="flex items-center">
              <span>Vie</span>
            </div>
            <div className="flex items-center">
              <span>Sab</span>
            </div>
            <div className="flex items-center">
              <span>Dom</span>
            </div>
          </div>
          <div className="flex gap-6 text-xs text-gray-500 mt-4 justify-center">
            <div className="flex items-center">
              <div className="h-3 w-3 bg-[#E5E5FF]"></div>
              <span className="ml-2">Descanso</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 bg-[#7C3AED]"></div>
              <span className="ml-2">Uso</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-[#F3F2FC] min-h-screen font-['Poppins']">
      {/* Tab navigation */}
      <div className="flex space-x-2 mb-6">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'conversion' 
              ? 'bg-black text-white' 
              : 'bg-white text-black'
          }`}
          onClick={() => setActiveTab('conversion')}
        >
          Conversión
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'growth' 
              ? 'bg-black text-white' 
              : 'bg-white text-black'
          }`}
          onClick={() => setActiveTab('growth')}
        >
          Crecimiento
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'security' 
              ? 'bg-black text-white' 
              : 'bg-white text-black'
          }`}
          onClick={() => setActiveTab('security')}
        >
          Seguridad
        </button>
      </div>

      {/* Render active tab content */}
      {activeTab === 'conversion' && renderConversionTab()}
      {activeTab === 'growth' && renderGrowthTab()}
      {activeTab === 'security' && renderSecurityTab()}
    </div>
  );
};

StatisticsDashboard.propTypes = {
  user: PropTypes.object
};

export default StatisticsDashboard;