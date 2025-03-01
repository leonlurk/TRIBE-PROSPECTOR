import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { chartOptions, emptyData } from "./chartConfig";

// Asegurar que Chart.js registre correctamente los módulos
Chart.register(...registerables);

const ChartComponent = () => {
  return <Line data={emptyData} options={chartOptions} />;
};

export default ChartComponent;
