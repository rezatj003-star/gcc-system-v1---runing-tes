// src/Collection/components/AgingPiutangChart.jsx
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function AgingPiutangChart({ consumers = [] }) {
  // Aging Outstanding
  const aging = {
    "<30": 0,
    "30-60": 0,
    "60-90": 0,
    ">90": 0,
  };

  consumers.forEach((c) => {
    const jatuhTempoRaw =
      c.jatuh_tempo ||
      c.rawDue ||
      c["Jatuh Tempo"] ||
      c["JatuhTempo"] ||
      null;

    let jatuhTempo;

    // Coba parse ke date
    if (typeof jatuhTempoRaw === "string" && jatuhTempoRaw.includes("-")) {
      jatuhTempo = new Date(jatuhTempoRaw);
    } else if (!isNaN(Number(jatuhTempoRaw))) {
      // Jika database hanya menyimpan hari (misal 5)
      const today = new Date();
      jatuhTempo = new Date(
        today.getFullYear(),
        today.getMonth(),
        Number(jatuhTempoRaw)
      );
    } else {
      jatuhTempo = null;
    }

    if (!jatuhTempo || isNaN(jatuhTempo)) return;

    const now = new Date();
    const diffDays = Math.floor(
      (now - jatuhTempo) / (1000 * 60 * 60 * 24)
    );

    const amount = Number(
      c.outstanding || c["Outstanding"] || c["Outstanding Sekarang"] || 0
    );

    if (diffDays < 30) aging["<30"] += amount;
    else if (diffDays < 60) aging["30-60"] += amount;
    else if (diffDays < 90) aging["60-90"] += amount;
    else aging[">90"] += amount;
  });

  const labels = ["<30 hari", "30–60 hari", "60–90 hari", ">90 hari"];
  const data = [
    aging["<30"],
    aging["30-60"],
    aging["60-90"],
    aging[">90"],
  ];

  const colors = [
    "rgba(34, 197, 94, 0.8)", // hijau
    "rgba(234, 179, 8, 0.8)", // kuning
    "rgba(249, 115, 22, 0.8)", // orange
    "rgba(239, 68, 68, 0.8)", // merah
  ];

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Outstanding (Rp)",
            data,
            backgroundColor: colors,
            borderColor: "black",
            borderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                "Rp " + Number(ctx.raw).toLocaleString("id-ID"),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => "Rp " + Number(v).toLocaleString("id-ID"),
              font: { weight: "bold" },
            },
            grid: { color: "#ddd" },
          },
          x: {
            ticks: { font: { weight: "bold" } },
          },
        },
      }}
    />
  );
}