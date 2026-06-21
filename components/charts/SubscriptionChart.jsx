"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function SubscriptionChart({ history }) {
  if (!history?.length) return null;

  const data = {
    labels: history.map((h) => new Date(h.recordedAt).toLocaleString()),
    datasets: [
      {
        label: "Overall Subscription (x)",
        data: history.map((h) => h.overall),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <section className="chart-panel">
      <h4>Subscription Trend</h4>
      <div className="chart-panel-sm" style={{ height: 220 }}>
        <Line data={data} options={options} />
      </div>
    </section>
  );
}