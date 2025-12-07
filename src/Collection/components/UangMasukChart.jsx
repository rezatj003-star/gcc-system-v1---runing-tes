// src/Collection/components/UangMasukChart.jsx
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function UangMasukChart({ payments = [] }) {
  // Default: 12 bulan = 0
  const monthly = Array(12).fill(0);

  payments.forEach((p) => {
    if (!p || !p.tanggal) return;

    const d = new Date(p.tanggal);
    if (isNaN(d)) return;

    const month = d.getMonth();
    monthly[month] += Number(p.jumlah || 0);
  });

  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: "Uang Masuk (Rp)",
            data: monthly,
            fill: false,
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "rgb(34, 197, 94)",
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) =>
                "Rp " + Number(ctx.raw).toLocaleString("id-ID"),
            },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (v) =>
                "Rp " + Number(v).toLocaleString("id-ID"),
              font: { weight: "bold" },
            },
          },
          x: {
            ticks: {
              font: { weight: "bold" },
            },
          },
        },
      }}
    />
  );
}