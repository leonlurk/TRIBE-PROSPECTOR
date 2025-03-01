export const emptyData = {
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
    datasets: [
      {
        label: "Leads Generados",
        data: [0, 0, 0, 0, 0, 0],
        borderColor: "#5468FF",
        backgroundColor: "rgba(84, 104, 255, 0.2)",
        borderWidth: 2,
      },
      {
        label: "Mensajes Enviados",
        data: [0, 0, 0, 0, 0, 0],
        borderColor: "#4A90E2",
        backgroundColor: "rgba(74, 144, 226, 0.2)",
        borderWidth: 2,
      },
    ],
  };
  
  export const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };
  