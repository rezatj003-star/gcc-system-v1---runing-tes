// src/Collection/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ModuleLayout from "../../layouts/ModuleLayout";
import { getConsumers } from "../../api";
import { Bar, Doughnut, Line, PolarArea } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
} from "chart.js";
import { getRealStatus } from "../utils/statusCalculator";
import AgingPiutangChart from "../components/AgingPiutangChart"; 
import UangMasukChart from "../components/UangMasukChart";

// Register ChartJS Components
ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, PointElement, LineElement, RadialLinearScale, Filler
);

// --- Helpers ---
const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function parseFlexibleDate(s) {
  if (!s) return null;
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso;
  const m = String(s).trim().match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return new Date(`${yyyy}-${mm}-${dd}`);
  }
  return null;
}

// Warna Status Neon High Contrast
const getStatusHex = (status) => {
  const s = (status || '').toUpperCase();
  switch (s) {
    case "LUNAS": return "#a3a3a3";
    case "LANCAR": return "#22c55e";
    case "HAMPIR LUNAS": return "#a7f3d0";
    case "JATUH TEMPO": return "#f59e0b";
    case "TERTUNGGAK RINGAN": return "#f97316";
    case "TERTUNGGAK SEDANG": return "#ef4444";
    case "TUNGGAKAN KRITIS": return "#b91c1c";
    case "KREDIT MACET TOTAL": return "#440000";
    default: return "#94a3b8";
  }
};

// --- CHART CONFIGURATION (LIGHT MODE INVERSION) ---

const boldFont = {
  family: "'Inter', sans-serif",
  size: 12, 
  weight: 'bold',
};

const glassTooltip = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)', // Background putih transparan
  titleColor: '#000', // Teks hitam
  titleFont: { size: 14, weight: 'bold' },
  bodyColor: '#1e293b',
  bodyFont: { size: 13, weight: '600' },
  borderColor: 'rgba(0,0,0,0.1)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  displayColors: true,
  boxPadding: 4
};

// 1. Options Bar & Line (Sumbu X & Y)
const barLineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      labels: { color: '#000000', font: boldFont, usePointStyle: true, boxWidth: 8 } // Teks Legend Hitam
    },
    tooltip: glassTooltip
  },
  scales: {
    x: { 
      grid: { display: false }, 
      ticks: { color: '#000000', font: boldFont } // Teks Sumbu X Hitam
    },
    y: { 
      grid: { color: 'rgba(0,0,0,0.1)', borderDash: [5, 5] }, // Grid lebih gelap
      ticks: { color: '#000000', font: boldFont, callback: (value) => fmtRp(value) }, // Teks Sumbu Y Hitam
      border: { display: false }
    }
  },
  elements: {
    bar: {
      borderRadius: 6,
      borderSkipped: false
    },
    line: {
      borderWidth: 4,
      tension: 0.4
    },
    point: {
      radius: 4,
      hoverRadius: 8,
      borderWidth: 2,
      backgroundColor: '#fff' // Point background putih
    }
  }
};

// 2. Options Doughnut (NO SCALES)
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "75%",
  plugins: {
    legend: { position: 'bottom', labels: { color: '#000000', font: boldFont, boxWidth: 10, padding: 20 } }, // Teks Legend Hitam
    tooltip: glassTooltip
  },
  elements: {
    arc: {
      borderWidth: 2,
      borderColor: '#ddd', // Border arc abu-abu
      borderRadius: 5,
      spacing: 5
    }
  }
};

// ===================================
// LOAD DATA & PROCESSING ENGINE
// ===================================

const normalizeConsumerData = (raw) => {
    const c = { ...raw };
    
    // Map existing fields
    c.price = Number(raw["Harga Jual"] || raw.price || 0);
    c.downPayment = Number(raw["Uang Masuk"] || raw.downPayment || 0); 
    c.installment = Number(raw["Nilai Angsuran"] || raw.installment || 0);
    c.mulai = raw["Mulai Cicilan"] || raw.mulai || "";
    c.rawDue = Number(raw["Jatuh Tempo"] || raw.rawDue || 0);
    c.marketing = raw["Marketing"] || raw.marketing || "Tanpa Sales";
    c.polaBayar = raw["Pola Pembayaran"] || raw.polaBayar || "Lainnya";
    c.lama = Number(raw["Lama Angsuran"] || raw.lama || 0);
    c.area = raw["Area"] || raw.area || "Lainnya";
    
    // Map Plan II data
    c.tenor2 = Number(raw["Lama Angsuran 2"] || 0);
    c.installment2 = Number(raw["Nilai Angsuran 2"] || 0);
    c.mulai2 = raw["Mulai Cicilan 2"] || "";
    
    // History
    const rawHistory = raw["Riwayat Pembayaran"] || raw.history || [];
    c.history = Array.isArray(rawHistory) ? rawHistory.map(h => ({
      tanggalBayar: h.tanggalBayar || h.Tanggal || "",
      nominal: Number(String(h.nominal || h.Jumlah || 0).replace(/\D/g, "")) || 0,
      catatan: h.Catatan || h.catatan || "",
      via: h.via || h["Metode Pembayaran"] || ""
    })) : [];

    // Total Paid Calculation
    const totalHistory = c.history.reduce((a, b) => a + b.nominal, 0);
    const hasAutoDP = c.history.some(h => (h.catatan || "").toUpperCase().includes("DP"));
    const totalPaid = hasAutoDP ? totalHistory : (c.downPayment + totalHistory); 

    const realOutstanding = Math.max(0, c.price - totalPaid);
    
    // --- Determine Active Plan for Status Logic ---
    const isPlan1Complete = Number(raw["Rencana Pembayaran 1"] || 0) > 0 && totalPaid >= Number(raw["Rencana Pembayaran 1"] || 0);
    const usePlan2 = isPlan1Complete && c.tenor2 > 0;
    
    const activeInstallment = usePlan2 ? c.installment2 : c.installment;
    const activeStartDate = usePlan2 ? c.mulai2 : c.mulai;
    const activeRawDue = usePlan2 ? Number(raw["Jatuh Tempo 2"] || 0) : c.rawDue;
    
    // Status Engine (Using the final professional terms logic)
    const monthsElapsed = activeInstallment > 0 && activeStartDate ? 
        Math.max(0, new Date().getFullYear() * 12 + new Date().getMonth() - (new Date(activeStartDate).getFullYear() * 12 + new Date(activeStartDate).getMonth()) + 1)
        : 0;
    const monthsCovered = activeInstallment > 0 ? Math.floor(totalPaid / activeInstallment) : 0;
    const delinquencyMonths = monthsElapsed - monthsCovered;
    
    let computedStatus = "ANGSURAN BERJALAN";
    const osThreshold = c.price * 0.10;

    if (realOutstanding === 0) {
        computedStatus = "LUNAS";
    } else if (delinquencyMonths <= 0) {
        computedStatus = "LANCAR"; 
    } else if (delinquencyMonths >= 6) {
        computedStatus = "KREDIT MACET TOTAL";
    } else if (delinquencyMonths >= 3) {
        computedStatus = "TUNGGAKAN KRITIS";
    } else if (delinquencyMonths >= 1) {
        computedStatus = "TERTUNGGAK SEDANG";
    }

    if (computedStatus !== "LUNAS" && realOutstanding > 0 && realOutstanding <= osThreshold) {
        computedStatus = "HAMPIR LUNAS";
    }
    
    const today = new Date();
    if (computedStatus !== "LANCAR" && computedStatus !== "LUNAS" && computedStatus !== "HAMPIR LUNAS" && activeRawDue > 0) {
        if (today.getDate() === activeRawDue) {
            computedStatus = "JATUH TEMPO"; 
        } else if (today.getDate() > activeRawDue) {
            if (delinquencyMonths <= 0) { 
                computedStatus = "TERTUNGGAK RINGAN"; 
            }
        }
    }

    return { ...c, totalPaid, outstanding: realOutstanding, computedStatus };
};


export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter State
  const [filterYear, setFilterYear] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null); 
  const [filterDate, setFilterDate] = useState(null);   

  // Load Data
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConsumers();
      const rawList = res?.data || [];
      const processed = rawList.map(normalizeConsumerData); // Use the robust processor
      setData(processed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filters Logic
  const yearsOptions = useMemo(() => {
    const s = new Set();
    data.forEach(c => { const d = parseFlexibleDate(c.mulai); if(d) s.add(d.getFullYear()); });
    return Array.from(s).sort((a,b)=>b-a);
  }, [data]);

  const daysInMonth = useMemo(() => {
    if (filterYear === null || filterMonth === null) return 31; 
    return new Date(filterYear, filterMonth + 1, 0).getDate();
  }, [filterYear, filterMonth]);

  const filteredData = useMemo(() => {
    return data.filter(c => {
      const d = parseFlexibleDate(c.mulai);
      if (!d) return false;
      if (filterYear !== null && d.getFullYear() !== filterYear) return false;
      if (filterMonth !== null && d.getMonth() !== filterMonth) return false;
      if (filterDate !== null && d.getDate() !== filterDate) return false;
      return true;
    });
  }, [data, filterYear, filterMonth, filterDate]);

  const kpi = useMemo(() => filteredData.reduce((acc, c) => ({
    omset: acc.omset + c.price,
    paid: acc.paid + c.totalPaid,
    out: acc.out + c.outstanding,
    unit: acc.unit + 1
  }), { omset: 0, paid: 0, out: 0, unit: 0 }), [filteredData]);

  // --- CHART DATA PREPARATION ---

  // 1. Cashflow (Monthly Income)
  const cashflowData = useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const vals = Array(12).fill(0);
    const targetYear = filterYear || new Date().getFullYear();
    filteredData.forEach(c => {
      c.history.forEach(h => {
        const d = parseFlexibleDate(h.tanggalBayar);
        if(d && d.getFullYear() === targetYear) vals[d.getMonth()] += h.nominal;
      });
    });
    return {
      labels: months,
      datasets: [{
        label: "Arus Kas",
        data: vals,
        fill: true,
        borderColor: "#f59e0b", // AMBER
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(245, 158, 11, 0.5)"); // AMBER
          gradient.addColorStop(1, "rgba(245, 158, 11, 0.0)");
          return gradient;
        },
        pointBackgroundColor: "#fff",
        pointBorderColor: "#f59e0b",
      }]
    };
  }, [filteredData, filterYear]);

  // 2. Status (Neon Colors)
  const statusData = useMemo(() => {
    const map = {};
    filteredData.forEach(c => map[c.computedStatus] = (map[c.computedStatus]||0)+1);
    const labels = Object.keys(map);
    return {
      labels,
      datasets: [{
        data: Object.values(map),
        backgroundColor: labels.map(l => getStatusHex(l)),
        borderWidth: 0,
      }]
    };
  }, [filteredData]);
  
  // 3. Pola Bayar (Vibrant)
  const polaData = useMemo(() => {
    const map = {};
    filteredData.forEach(c => { const p = c.polaBayar; map[p] = (map[p]||0)+1; });
    return {
      labels: Object.keys(map),
      datasets: [{
        data: Object.values(map),
        backgroundColor: ["#a855f7", "#ec4899", "#22c55e", "#f59e0b", "#10b981"],
        borderWidth: 0
      }]
    };
  }, [filteredData]);

  // 4. Tenor (Gradient Bar)
  const tenorData = useMemo(() => {
    const map = {};
    filteredData.forEach(c => { const t = c.lama ? `${c.lama} Bln` : "Cash"; map[t] = (map[t]||0)+1; });
    return {
      labels: Object.keys(map),
      datasets: [{ 
        label: "Unit", 
        data: Object.values(map), 
        backgroundColor: "#eab308",
      }]
    };
  }, [filteredData]);

  // 5. Area
  const areaData = useMemo(() => {
    const map = {};
    filteredData.forEach(c => map[c.area] = (map[c.area]||0)+c.outstanding);
    const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0, 8);
    return {
      labels: sorted.map(s=>s[0]),
      datasets: [{ 
        label: "Outstanding", 
        data: sorted.map(s=>s[1]), 
        backgroundColor: "#f43f5e",
      }]
    };
  }, [filteredData]);

  // 6. Metode Bayar
  const methodData = useMemo(() => {
    let tunai = 0, transfer = 0;
    filteredData.forEach(c => {
       const via = c.history.map(h => (h.via||"").toLowerCase());
       if(via.some(v => v.includes("transfer"))) transfer++; else tunai++;
    });
    return {
       labels: ["Transfer", "Tunai"],
       datasets: [{ data: [transfer, tunai], backgroundColor: ["#f59e0b", "#22c55e"], borderWidth: 0 }]
    };
  }, [filteredData]);

  // 7. Monthly Out
  const monthlyOutData = useMemo(() => {
    const arr = Array(12).fill(0);
    filteredData.forEach(c => {
      const d = parseFlexibleDate(c.mulai);
      if(d) arr[d.getMonth()] += c.outstanding;
    });
    return {
      labels: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
      datasets: [{ label: "Outstanding", data: arr, backgroundColor: "#ef4444" }]
    };
  }, [filteredData]);

  // 8. Sales
  const marketingData = useMemo(() => {
    const map = {};
    filteredData.forEach(c => map[c.marketing] = (map[c.marketing]||0) + c.outstanding);
    const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
    return {
      labels: sorted.map(s=>s[0]),
      datasets: [{ label: "Outstanding", data: sorted.map(s=>s[1]), backgroundColor: "#14b8a6" }]
    };
  }, [filteredData]);

  // 9. Ratio
  const ratioData = useMemo(() => {
    const ratio = (kpi.paid / kpi.omset) || 0;
    const remaining = 1 - ratio;
    
    return {
      labels: ["Bayar", "Hutang"],
      datasets: [
        { label: "Rasio", data: [ratio*100, remaining*100], backgroundColor: ["#10b981", "#ef4444"], barThickness: 35 },
      ]
    };
  }, [kpi]);


  // --- RENDER ---
  return (
    <ModuleLayout module="collection" title="Dashboard">
      {/* BACKGROUND: LIGHT MODE PAGE */}
      <div className="min-h-screen bg-gray-100 text-slate-900 font-sans p-4 md:p-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-300 pb-6">
          <div>
             <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600 tracking-tight drop-shadow-lg">
               GCC SYSTEM DASHBOARD
             </h1>
             <p className="text-xs font-bold text-slate-600 mt-2 tracking-[0.2em] uppercase flex items-center gap-2">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
               Live Financial Intelligence
             </p>
          </div>
          <button onClick={load} className="group relative px-8 py-3 bg-white rounded-2xl border border-slate-300 text-amber-600 font-black text-sm overflow-hidden hover:text-white hover:border-amber-500 transition-all shadow-lg hover:shadow-amber-500/20">
            <div className="absolute inset-0 w-0 bg-amber-600 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
            <span className="relative flex items-center gap-2 tracking-wide">🔄 RELOAD DATA</span>
          </button>
        </div>

        {/* LAYOUT GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* === SIDEBAR (Sticky) === */}
          <aside className="xl:col-span-1 space-y-8 sticky top-6 h-fit">
            
            {/* WIDGET 1: KALENDER */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-300 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 shadow-md"></div>
              
              <h3 className="font-black text-slate-900 mb-6 text-sm flex items-center gap-3">
                 <span className="p-2 bg-amber-500/20 rounded-lg text-amber-600 text-lg">📅</span> 
                 FILTER PERIODE
              </h3>

              {/* Year */}
              <div className="mb-5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-widest mb-2 block">Tahun</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={()=>{setFilterYear(null);setFilterMonth(null);setFilterDate(null);}} className={`px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg ${filterYear===null ? "bg-amber-600 text-white shadow-amber-500/40 scale-105" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>ALL</button>
                  {yearsOptions.map(y => (
                     <button key={y} onClick={()=>{setFilterYear(y);setFilterMonth(null);setFilterDate(null);}} className={`px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg ${filterYear===y ? "bg-amber-600 text-white shadow-amber-500/40 scale-105" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>{y}</button>
                  ))}
                </div>
              </div>

              {/* Month */}
              <div className="mb-5">
                 <label className="text-[12px] font-bold text-slate-600 uppercase tracking-widest mb-2 block">Bulan</label>
                 <div className="grid grid-cols-4 gap-2">
                    {["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"].map((m,i)=>(
                      <button key={i} onClick={()=>{setFilterMonth(i);setFilterDate(null);}} className={`py-2 rounded-lg text-xs font-bold transition-all ${filterMonth===i ? "bg-emerald-600 text-white shadow-emerald-600/40 scale-105" : "bg-slate-200 text-slate-800 hover:bg-slate-300 hover:text-slate-900"}`}>{m}</button>
                    ))}
                 </div>
              </div>

              {/* Date */}
              <div>
                 <label className="text-[12px] font-bold text-slate-600 uppercase tracking-widest mb-2 block">Tanggal</label>
                 <div className="grid grid-cols-7 gap-1">
                    {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>(
                      <button key={d} onClick={()=>setFilterDate(filterDate===d?null:d)} className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-black transition-all ${filterDate===d ? "bg-rose-500 text-white shadow-rose-500/40 scale-110" : "bg-slate-200 text-slate-800 hover:bg-slate-300 hover:text-slate-900"}`}>{d}</button>
                    ))}
                 </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-300 text-center">
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data Terfilter</span>
                 <div className="text-3xl font-black text-slate-900 mt-1 drop-shadow-md">{filteredData.length} <span className="text-xs font-bold text-slate-500">UNIT</span></div>
              </div>
            </div>

            {/* WIDGET 2: STATUS */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-300 shadow-xl group hover:border-slate-400 transition-all">
               <h3 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-3">
                 <span className="p-2 bg-green-500/20 rounded-lg text-green-600 text-lg">📊</span>
                 STATUS PIUTANG
               </h3>
               <div className="h-48 relative">
                  <Doughnut data={statusData} options={doughnutOptions} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="text-4xl font-black text-slate-900 drop-shadow-lg">{filteredData.length}</span>
                  </div>
               </div>
            </div>

             {/* WIDGET 3: METODE */}
             <div className="bg-white rounded-[2rem] p-6 border border-slate-300 shadow-xl">
               <h3 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-3">
                 <span className="p-2 bg-amber-500/20 rounded-lg text-amber-600 text-lg">💳</span>
                 METODE BAYAR
               </h3>
               <div className="h-40">
                  <Doughnut data={methodData} options={doughnutOptions} />
               </div>
            </div>
          </aside>

          {/* === KONTEN KANAN === */}
          <main className="xl:col-span-3 space-y-8">
            
            {/* 1. KPI CARDS (GLOWING BENTO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
               {[
                 { label: "TOTAL ASET", val: kpi.omset, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-300", icon: "💎", shadow: "shadow-amber-500/20" },
                 { label: "UANG MASUK", val: kpi.paid, color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-300", icon: "💸", shadow: "shadow-emerald-500/20" },
                 { label: "OUTSTANDING", val: kpi.out, color: "text-rose-600", bg: "bg-rose-100", border: "border-rose-300", icon: "🚨", shadow: "shadow-rose-500/20" },
                 { label: "UNIT TERJUAL", val: kpi.unit + " UNIT", color: "text-indigo-600", bg: "bg-indigo-100", border: "border-indigo-300", icon: "🏠", shadow: "shadow-indigo-500/20" },
               ].map((k, i) => (
                 <div key={i} className={`rounded-[2rem] p-6 border ${k.border} ${k.bg} shadow-lg hover:shadow-xl ${k.shadow} flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300`}>
                    <div className="flex justify-between items-start mb-3">
                       <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl border border-slate-300 shadow-inner text-slate-900">
                         {k.icon}
                       </div>
                       <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest mb-1">{k.label}</p>
                      <h3 className={`text-2xl font-black ${k.color} drop-shadow-md truncate`}>{typeof k.val === 'string' ? k.val : fmtRp(k.val)}</h3>
                    </div>
                 </div>
               ))}
            </div>

            {/* 2. MAIN CHART: CASHFLOW */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-300 shadow-2xl relative">
               <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-[10rem] text-slate-900 select-none z-0 pointer-events-none">$$$</div>
               <div className="relative z-10 flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="w-1 h-8 bg-amber-600 rounded-full"></span>
                      ARUS KAS TAHUNAN
                    </h3>
                    <p className="text-xs font-bold text-slate-600 mt-1 pl-3">Analisis Trend Pembayaran & DP Masuk</p>
                  </div>
                  <span className="text-[10px] font-black px-4 py-2 bg-amber-600/20 text-amber-600 rounded-full border border-amber-500/30">
                    TAHUN {filterYear || new Date().getFullYear()}
                  </span>
               </div>
               <div className="h-80 relative z-10">
                  <Line data={cashflowData} options={barLineOptions} />
               </div>
            </div>

            {/* 3. ROW 2: AGING PIUTANG & TENOR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               
               {/* AGING PIUTANG CHART (CUSTOM COMPONENT) */}
               <div className="bg-white rounded-[2.5rem] p-8 border border-slate-300 shadow-2xl">
                  <h3 className="font-black text-slate-900 mb-6 text-lg flex items-center gap-3">
                    <span className="w-1 h-6 bg-rose-600 rounded-full"></span> AGING PIUTANG
                  </h3>
                  <div className="h-64">
                     <AgingPiutangChart consumers={filteredData} />
                  </div>
               </div>

               {/* TENOR CHART */}
               <div className="bg-white rounded-[2.5rem] p-8 border border-slate-300 shadow-2xl">
                  <h3 className="font-black text-slate-900 mb-6 text-lg flex items-center gap-3">
                    <span className="w-1 h-6 bg-indigo-600 rounded-full"></span> DURASI ANGSURAN
                  </h3>
                  <div className="h-64">
                     <Bar data={tenorData} options={barLineOptions} />
                  </div>
               </div>
            </div>

            {/* 4. ROW 3: AREA WATCHLIST */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-300 shadow-2xl">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-900 text-lg flex items-center gap-3">
                    <span className="w-1 h-6 bg-rose-600 rounded-full"></span> TOP AREA WATCHLIST
                  </h3>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-200 px-3 py-1 rounded-full border border-rose-300">HIGHEST OUTSTANDING</span>
               </div>
               <div className="h-64">
                  <Bar data={areaData} options={{ ...barLineOptions, indexAxis: 'y' }} />
               </div>
            </div>

            {/* 5. ROW 4: 3 GRAFIK PADAT (Status, Ratio, Sales) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2rem] p-6 border border-slate-300 shadow-xl">
                   <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> STATUS KOMPOSISI
                   </h3>
                   <div className="h-40">
                      <Doughnut data={statusData} options={doughnutOptions} />
                   </div>
                </div>
                
                <div className="bg-white rounded-[2rem] p-6 border border-slate-300 shadow-xl">
                   <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span> SALES PERFORMANCE
                   </h3>
                   <div className="h-40">
                      <Bar data={marketingData} options={{...barLineOptions, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} />
                   </div>
                </div>
                
                <div className="bg-white rounded-[2rem] p-6 border border-slate-300 shadow-xl flex flex-col justify-center">
                   <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span> RASIO TERBAYAR
                   </h3>
                   <div className="h-28">
                       <Bar data={ratioData} options={{ ...barLineOptions, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false, stacked: true }, y: { display: false, stacked: true } } }} />
                   </div>
                   <div className="mt-2 text-center">
                      <span className="text-2xl font-black text-emerald-600">{((kpi.paid/kpi.omset)*100).toFixed(1)}%</span>
                      <span className="text-[10px] font-bold text-slate-500 ml-2 uppercase">TERBAYAR</span>
                   </div>
                </div>
            </div>

          </main>
        </div>
      </div>
    </ModuleLayout>
  );
}