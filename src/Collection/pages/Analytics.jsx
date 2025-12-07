// Analytics.jsx — Professional Collection Analysis (Narrative Only, No Charts)
import React, { useEffect, useMemo, useState } from "react";
import ModuleLayout from "../../layouts/ModuleLayout";
import { getConsumers } from "../../api";
import { 
  AlertTriangle, TrendingUp, Users, MapPin, ShieldAlert, DollarSign, Clock, FileText,
  BarChart3, Wallet, TrendingDown, Activity, Target, AlertCircle, CheckCircle2,
  XCircle, Zap, Lightbulb, Briefcase, Building2, PieChart, ArrowUpRight, ArrowDownRight,
  Calendar, CreditCard, Receipt, Banknote, Coins, LineChart, Award, Star, Phone,
  Mail, MessageSquare, Copy, ExternalLink, Eye, AlertOctagon, CircleDot
} from "lucide-react";
import { getRealStatus, calculateMonthsPaid, getStatusColor, STATUS_COLOR } from "../utils/statusCalculator";
// IMPORT RUMUS WA
import { makeWAMessage } from "../utils/waTemplate";

// ------------------------------- Helpers (SAME AS MasterCollection.jsx) -------------------------------
function parseFlexibleDate(s) {
  if (!s) return null;
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso;
  const m = String(s).trim().match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    const conv = new Date(`${yyyy}-${mm}-${dd}`);
    if (!isNaN(conv.getTime())) return conv;
  }
  return null;
}

const normalize = (raw = {}) => {
  const r = { ...raw };
  r.id = raw.id || raw.code || raw.Code || raw.Kode || raw.kode || "";
  r.name = raw.Nama || raw.name || "";
  r.phone = raw["No Wa"] || raw["No WA"] || raw.noWa || raw.phone || "";
  r.blok = raw.Blok || raw.blok || "";
  r.area = raw.Area || raw.area || "";
  r.price = Number(raw["Harga Jual"] || raw.price || 0);
  r.downPayment = Number(raw["Uang Masuk"] || raw["Uang masuk"] || raw.downPayment || 0);
  r.outstanding = Number(raw.Outstanding || raw.outstanding || 0);
  r.lama = Number(raw["Lama Angsuran"] || raw.lama || 0);
  r.installment = Number(raw["Nilai Angsuran"] || raw.installment || 0);
  r.rawDue = Number(raw["Jatuh Tempo"] || raw.rawDue || raw.jatuhTempo || 0);
  r.mulai = raw["Mulai Cicilan"] || raw.mulai || raw.start || "";
  r.selesai = raw["Selesai Cicilan"] || raw.selesai || "";
  r.status = raw.Status || raw.status || "Belum Bayar";
  r.marketing = raw.Marketing || raw.marketing || "";
  r.code = raw.id || raw.Code || raw.code || "";
  r.polaBayar = raw["Pola Pembayaran"] || raw["Pola Bayar"] || raw.pola || raw.polaBayar || raw.paymentPattern || "";

  const rawHistory = raw["Riwayat Pembayaran"] || raw.riwayatPembayaran || raw.history || raw.Riwayat || [];
  r.history = Array.isArray(rawHistory)
    ? rawHistory.map((h) => {
        const tanggal = h.tanggalBayar || h.Tanggal || h.tanggal || h.date || "";
        const nominalRaw = h.nominal || h.Jumlah || h.jumlah || h.amount || h.Amount || h.value || 0;
        const nominalNumber = Number(String(nominalRaw || "0").replace(/\D/g, "")) || 0;
        return {
          tanggalBayar: tanggal,
          nominal: nominalNumber,
          cicilanKe: h.cicilanKe || h.CicilanKe || h.cicilan || "",
          via: h.via || h.Via || "",
          keterangan: h.keterangan || h.Catatan || h.note || ""
        };
      })
    : [];

  return r;
};

const sumHistoryAll = (c = {}) => {
  if (!c.history || !Array.isArray(c.history)) return 0;
  return c.history.reduce((s, h) => s + Number(h.nominal || 0), 0);
};

const sumHistoryForMonth = (c = {}, ref = new Date()) => {
  if (!c.history) return 0;
  const m = ref.getMonth();
  const y = ref.getFullYear();
  return c.history.reduce((s, h) => {
    const d = parseFlexibleDate(h.tanggalBayar || h.Tanggal || h.tanggal);
    if (!d) return s;
    return d.getMonth() === m && d.getFullYear() === y ? s + Number(h.nominal || 0) : s;
  }, 0);
};

const countPayments = (c = {}) => Array.isArray(c.history) ? c.history.length : 0;
const fmtCurrency = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const daysSince = (dateStr) => {
  if (!dateStr) return 9999;
  const d = parseFlexibleDate(dateStr);
  if (!d) return 9999;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Risk scoring (enhanced)
function scoreConsumerRisk(c) {
  const os = Number(c.outstanding || 0);
  const price = Math.max(1, Number(c.price || 0));
  const relOS = Math.min(1, os / price);
  const aging = Math.min(365, daysSince(c.lastPaymentDate || null));
  const hist = Math.max(0, Number(c.paymentsCount || 0));
  const dpRatio = price > 0 ? Number(c.downPayment || 0) / price : 0;
  
  let score = 0;
  score += relOS * 50;
  if (aging > 120) score += 30;
  else if (aging > 60) score += 18;
  else if (aging > 30) score += 8;
  if (hist < 3) score += 12;
  else if (hist < 6) score += 6;
  if ((Number(c.installment || 0) === 0) && os > 0) score += 15;
  if (dpRatio < 0.1) score += 10;
  if (c.computedStatus === "Macet" || c.computedStatus === "Macet Total") score += 20;
  
  score = Math.round(Math.min(100, score));
  return score;
}

// ------------------------------- Component -------------------------------
export default function Analytics() {
  const [consumersRaw, setConsumersRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("executive");

  const loadData = async () => {
    try {
      setLoading(true);
        const res = await getConsumers();
        const data = (res?.data || []).map(normalize);
        setConsumersRaw(data);
      setError(null);
      } catch (err) {
        console.error("Analytics.getConsumers error:", err);
        setError("Gagal mengambil data. Periksa koneksi / konfigurasi API.");
      } finally {
      setLoading(false);
    }
  };

  // Auto-update ketika data di MasterCollection berubah (sama seperti MasterCollection.jsx)
  useEffect(() => {
    loadData();

    // Storage handler untuk auto-refresh ketika data update di tab lain
    const handler = (e) => {
      if (!e) {
        loadData();
        return;
      }
      if (e.key === "collection:updated") {
        loadData();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Enrich consumers with computed fields (SAME LOGIC AS MasterCollection.jsx)
  const consumers = useMemo(() => {
    return (consumersRaw || []).map((c) => {
      const totalPaid = Number(c.downPayment || 0) + sumHistoryAll(c);
      const outstanding = Math.max(0, Number(c.price || 0) - totalPaid);
      const installment = Number(c.installment || 0);
      const paidThisMonth = sumHistoryForMonth(c, new Date());
      const paymentsCount = countPayments(c);

      const startIso = parseFlexibleDate(c.mulai)?.toISOString().slice(0, 10) ?? null;
      const historyForEngine = (c.history || []).map((h) => ({
        Tanggal: h.tanggalBayar || h.Tanggal || h.tanggal || "",
        Jumlah: Number(h.nominal || 0),
        Catatan: h.keterangan || h.Catatan || h.note || "",
      }));

      const computedStatus = getRealStatus({
        startDate: startIso,
        dueDate: Number(c.rawDue) || 0,
        outstanding,
        installment,
        history: historyForEngine,
      });

      const statusClass = getStatusColor(computedStatus);
      const lastPayment = Array.isArray(c.history) && c.history.length ? c.history[c.history.length - 1] : null;
      const lastPaymentAmount = lastPayment ? Number(lastPayment.nominal || 0) : 0;
      const rawDate = lastPayment?.tanggalBayar || lastPayment?.Tanggal || "";

      let lastPaymentDate = "-";
      let lastPaymentDateObj = null;
      if (rawDate) {
        const d = parseFlexibleDate(rawDate);
        if (d) {
          lastPaymentDate = d.toLocaleDateString("id-ID");
          lastPaymentDateObj = d;
        } else {
          lastPaymentDate = rawDate;
        }
      }

      const lastPaymentCovers = calculateMonthsPaid(lastPaymentAmount, installment);
      const paymentWarning = installment > 0 && paidThisMonth < installment && outstanding > 0;
      const aging = lastPaymentDateObj ? daysSince(rawDate) : (c.mulai ? daysSince(c.mulai) : 9999);

      return {
        ...c,
        totalPaid,
        outstanding,
        computedStatus,
        statusClass,
        paymentThisMonth: paidThisMonth,
        paymentWarning,
        lastPayment,
        lastPaymentAmount,
        lastPaymentDate,
        lastPaymentDateObj,
        lastPaymentCovers,
        paymentsCount,
        aging,
        dpRatio: c.price > 0 ? (c.downPayment || 0) / c.price : 0,
      };
    });
  }, [consumersRaw]);

  // ==================== WA LOGIC (NEW FEATURE) ====================
  const handleCopyWA = (c) => {
    try {
      const msg = makeWAMessage(c);
      navigator.clipboard.writeText(msg).then(() => {
        alert(`Skrip WA untuk ${c.name} berhasil disalin!`);
      });
    } catch (e) {
      console.error("Copy error:", e);
      alert("Gagal menyalin. Browser tidak support.");
    }
  };

  const handleSendWA = (c) => {
    const msg = makeWAMessage(c);
    let phone = (c.phone || "").toString().replace(/\D/g, "");
    
    // Normalisasi 08xxx -> 628xxx
    if (phone.startsWith("0")) {
      phone = "62" + phone.slice(1);
    }
    
    if (!phone) {
      alert("Nomor WhatsApp tidak tersedia untuk konsumen ini.");
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };
  // ================================================================

  // ==================== EXECUTIVE SUMMARY ====================
  const executiveSummary = useMemo(() => {
    const totalContracts = consumers.length;
    const totalOutstanding = consumers.reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const totalPrice = consumers.reduce((s, c) => s + Number(c.price || 0), 0);
    const totalPaid = consumers.reduce((s, c) => s + Number(c.totalPaid || 0), 0);
    const totalDP = consumers.reduce((s, c) => s + Number(c.downPayment || 0), 0);
    const collectionRate = totalPrice > 0 ? (totalPaid / totalPrice) * 100 : 0;
    
    const statusCounts = consumers.reduce((acc, c) => {
      const k = c.computedStatus || c.status || "Unknown";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    const macetCount = (statusCounts["Macet"] || 0) + (statusCounts["Macet Total"] || 0);
    const menunggakCount = (statusCounts["Belum Bayar"] || 0) + (statusCounts["Jatuh Tempo"] || 0);
    const lancarCount = statusCounts["Lancar"] || 0;

    const avgOutstanding = totalContracts > 0 ? totalOutstanding / totalContracts : 0;
    const avgDP = totalContracts > 0 ? totalDP / totalContracts : 0;
    const avgDPRatio = totalPrice > 0 ? (totalDP / totalPrice) * 100 : 0;

    const highRiskCount = consumers.filter(c => scoreConsumerRisk(c) >= 80).length;
    const mediumRiskCount = consumers.filter(c => {
      const score = scoreConsumerRisk(c);
      return score >= 50 && score < 80;
    }).length;

    const avgAging = consumers.filter(c => c.aging < 9999).length > 0
      ? consumers.filter(c => c.aging < 9999).reduce((s, c) => s + c.aging, 0) / consumers.filter(c => c.aging < 9999).length
      : 0;

    return {
      totalContracts,
      totalOutstanding,
      totalPrice,
      totalPaid,
      totalDP,
      collectionRate,
      statusCounts,
      macetCount,
      menunggakCount,
      lancarCount,
      avgOutstanding,
      avgDP,
      avgDPRatio,
      highRiskCount,
      mediumRiskCount,
      avgAging,
    };
  }, [consumers]);

  // ==================== FINANCIAL ANALYSIS ====================
  const financialAnalysis = useMemo(() => {
    const cashflowThisMonth = consumers.reduce((s, c) => s + Number(c.paymentThisMonth || 0), 0);
    const avgPaymentSize = consumers.filter(c => c.paymentsCount > 0).length > 0
      ? consumers.filter(c => c.paymentsCount > 0).reduce((s, c) => {
          const avg = sumHistoryAll(c) / c.paymentsCount;
          return s + avg;
        }, 0) / consumers.filter(c => c.paymentsCount > 0).length
      : 0;

    const lowDPConsumers = consumers.filter(c => c.dpRatio < 0.1).length;
    const noHistoryConsumers = consumers.filter(c => c.paymentsCount === 0).length;
    const inconsistentPayers = consumers.filter(c => {
      if (c.paymentsCount < 2) return false;
      const amounts = c.history.map(h => Number(h.nominal || 0));
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance = amounts.reduce((s, a) => s + Math.abs(a - avg), 0) / amounts.length;
      return variance > avg * 0.5;
    }).length;

    return {
      cashflowThisMonth,
      avgPaymentSize,
      lowDPConsumers,
      noHistoryConsumers,
      inconsistentPayers,
    };
  }, [consumers]);

  // ==================== RISK ANALYSIS ====================
  const riskAnalysis = useMemo(() => {
    const agingDistribution = {
      "0-30": consumers.filter(c => c.aging >= 0 && c.aging <= 30).length,
      "31-60": consumers.filter(c => c.aging > 30 && c.aging <= 60).length,
      "61-120": consumers.filter(c => c.aging > 60 && c.aging <= 120).length,
      ">120": consumers.filter(c => c.aging > 120).length,
    };

    const highOSConsumers = consumers.filter(c => {
      const osRatio = c.price > 0 ? c.outstanding / c.price : 0;
      return osRatio > 0.7 && c.outstanding > 0;
    }).length;

    const potentialDefaults = consumers.filter(c => {
      const score = scoreConsumerRisk(c);
      return score >= 70 && (c.computedStatus === "Belum Bayar" || c.computedStatus === "Jatuh Tempo");
    }).length;

    return {
      agingDistribution,
      highOSConsumers,
      potentialDefaults,
    };
  }, [consumers]);

  // ==================== MARKETING ANALYSIS ====================
  const marketingAnalysis = useMemo(() => {
    const map = {};
    consumers.forEach(c => {
      const m = c.marketing || "Unknown";
      if (!map[m]) {
        map[m] = {
          revenue: 0,
          contracts: 0,
          os: 0,
          menunggak: 0,
          macet: 0,
          lancar: 0,
          totalDP: 0,
          totalPrice: 0,
          avgDPRatio: 0,
          avgAging: 0,
          totalPayments: 0,
        };
      }
      map[m].revenue += Number(c.totalPaid || 0);
      map[m].os += Number(c.outstanding || 0);
      map[m].contracts += 1;
      map[m].totalDP += Number(c.downPayment || 0);
      map[m].totalPrice += Number(c.price || 0);
      map[m].totalPayments += c.paymentsCount || 0;
      
      if (["Macet", "Macet Total"].includes(c.computedStatus)) map[m].macet += 1;
      if (c.computedStatus === "Belum Bayar" || c.computedStatus === "Jatuh Tempo") map[m].menunggak += 1;
      if (c.computedStatus === "Lancar") map[m].lancar += 1;
    });

    Object.keys(map).forEach(k => {
      const o = map[k];
      o.avgDPRatio = o.totalPrice > 0 ? (o.totalDP / o.totalPrice) * 100 : 0;
      o.avgOSPerContract = o.contracts > 0 ? o.os / o.contracts : 0;
      o.avgPaymentsPerContract = o.contracts > 0 ? o.totalPayments / o.contracts : 0;
      o.macetRate = o.contracts > 0 ? (o.macet / o.contracts) * 100 : 0;
      o.lancarRate = o.contracts > 0 ? (o.lancar / o.contracts) * 100 : 0;
    });

    return map;
  }, [consumers]);

  // ==================== AREA ANALYSIS ====================
  const areaAnalysis = useMemo(() => {
    const map = {};
    consumers.forEach(c => {
      const a = c.area || "Unknown";
      if (!map[a]) {
        map[a] = {
          contracts: 0,
          price: 0,
          os: 0,
          paid: 0,
          macet: 0,
          menunggak: 0,
          lancar: 0,
          totalDP: 0,
          avgAging: 0,
          totalPayments: 0,
        };
      }
      map[a].contracts += 1;
      map[a].price += Number(c.price || 0);
      map[a].os += Number(c.outstanding || 0);
      map[a].paid += Number(c.totalPaid || 0);
      map[a].totalDP += Number(c.downPayment || 0);
      map[a].totalPayments += c.paymentsCount || 0;
      
      if (["Macet", "Macet Total"].includes(c.computedStatus)) map[a].macet += 1;
      if (c.computedStatus === "Belum Bayar" || c.computedStatus === "Jatuh Tempo") map[a].menunggak += 1;
      if (c.computedStatus === "Lancar") map[a].lancar += 1;
    });

    Object.keys(map).forEach(k => {
      const o = map[k];
      o.paidPct = o.price > 0 ? (o.paid / o.price) * 100 : 0;
      o.avgOSPerContract = o.contracts > 0 ? o.os / o.contracts : 0;
      o.macetRate = o.contracts > 0 ? (o.macet / o.contracts) * 100 : 0;
      o.lancarRate = o.contracts > 0 ? (o.lancar / o.contracts) * 100 : 0;
      o.avgDPRatio = o.price > 0 ? (o.totalDP / o.price) * 100 : 0;
    });

    return map;
  }, [consumers]);

  // ==================== PAYMENT BEHAVIOR ANALYSIS ====================
  const behaviorAnalysis = useMemo(() => {
    const randomPayers = consumers.filter(c => {
      if (c.paymentsCount < 2) return false;
      const amounts = c.history.map(h => Number(h.nominal || 0));
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance = amounts.reduce((s, a) => s + Math.abs(a - avg), 0) / amounts.length;
      return variance > avg * 0.5;
    }).length;

    const noPaymentAfterDP = consumers.filter(c => c.downPayment > 0 && c.paymentsCount === 0).length;
    const fewPayments = consumers.filter(c => c.paymentsCount >= 1 && c.paymentsCount <= 3).length;
    const bulkPayers = consumers.filter(c => {
      if (c.paymentsCount === 0) return false;
      const amounts = c.history.map(h => Number(h.nominal || 0));
      return amounts.some(a => a > c.installment * 2);
    }).length;

    const inconsistentMonthly = consumers.filter(c => {
      if (!c.mulai) return false;
      const start = parseFlexibleDate(c.mulai);
      if (!start) return false;
      const monthsSinceStart = Math.max(0, (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth()));
      return monthsSinceStart > 3 && c.paymentsCount < monthsSinceStart * 0.5;
    }).length;

    return {
      randomPayers,
      noPaymentAfterDP,
      fewPayments,
      bulkPayers,
      inconsistentMonthly,
    };
  }, [consumers]);

  // ==================== PRIORITY ACTIONS ====================
  const scoredConsumers = useMemo(() => {
    return consumers.map(c => ({ ...c, riskScore: scoreConsumerRisk(c) })).sort((a, b) => b.riskScore - a.riskScore);
  }, [consumers]);

  const priorityActions = useMemo(() => {
    const priority1 = scoredConsumers.filter(c => 
      (c.computedStatus === "Macet" || c.computedStatus === "Macet Total") && 
      c.aging > 90 && 
      c.outstanding > 0
    ).slice(0, 15);

    const priority2 = scoredConsumers.filter(c => 
      (c.computedStatus === "Belum Bayar" || c.computedStatus === "Jatuh Tempo") &&
      c.riskScore >= 50
    ).slice(0, 20);

    const priority3 = scoredConsumers.filter(c => 
      c.computedStatus === "Lancar" && 
      (c.dpRatio < 0.1 || c.paymentWarning)
    ).slice(0, 15);

    const priority4 = scoredConsumers.filter(c => 
      c.computedStatus === "Lancar" && 
      c.paymentsCount >= 6 && 
      c.dpRatio >= 0.1
    ).slice(0, 10);

    return { priority1, priority2, priority3, priority4 };
  }, [scoredConsumers]);

  // ==================== RENDER FUNCTIONS (BRUTAL BRUSH STYLE) ====================
  const renderExecutiveSummary = () => (
    <div className="space-y-4">
      <div className="bb-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-yellow-300 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
            <FileText className="w-8 h-8 text-black" />
            </div>
            <div>
            <h3 className="text-2xl font-black text-slate-900">Executive Summary</h3>
            <div className="text-sm font-bold text-gray-700">Gambaran Umum Portofolio</div>
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-xl bg-blue-500 border-4 border-black shadow-[6px_6px_0px_#000] text-white hover:-translate-x-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/30 border-2 border-white rounded-lg">
                <Briefcase className="w-6 h-6" />
        </div>
              <TrendingUp className="w-5 h-5 opacity-90" />
    </div>
            <div className="text-sm font-bold opacity-90 mb-1">Total Kontrak</div>
            <div className="text-3xl font-black">{executiveSummary.totalContracts}</div>
            <div className="text-xs font-bold opacity-80 mt-2">Konsumen aktif dalam sistem</div>
          </div>
          
          <div className="p-5 rounded-xl bg-red-500 border-4 border-black shadow-[6px_6px_0px_#000] text-white hover:-translate-x-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/30 border-2 border-white rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <TrendingDown className="w-5 h-5 opacity-90" />
            </div>
            <div className="text-sm font-bold opacity-90 mb-1">Total Outstanding</div>
            <div className="text-2xl font-black">{fmtCurrency(executiveSummary.totalOutstanding)}</div>
            <div className="text-xs font-bold opacity-80 mt-2">Piutang belum tertagih</div>
          </div>
          
          <div className="p-5 rounded-xl bg-green-500 border-4 border-black shadow-[6px_6px_0px_#000] text-white hover:-translate-x-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/30 border-2 border-white rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-90" />
            </div>
            <div className="text-sm font-bold opacity-90 mb-1">Total Terbayar</div>
            <div className="text-2xl font-black">{fmtCurrency(executiveSummary.totalPaid)}</div>
            <div className="text-xs font-bold opacity-80 mt-2">Uang masuk (DP + history)</div>
          </div>
        </div>

    <div className="space-y-4">
      <div className="bb-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h4 className="font-black text-lg text-slate-900">Ringkasan Kinerja</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-black rounded-lg">
                <span className="font-bold text-gray-800">Tingkat Koleksi:</span>
                <strong className="text-blue-700 font-black">{executiveSummary.collectionRate.toFixed(1)}%</strong>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border-2 border-black rounded-lg">
                <span className="font-bold text-gray-800">Rata-rata Outstanding:</span>
                <strong className="font-black">{fmtCurrency(executiveSummary.avgOutstanding)}</strong>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 border-2 border-black rounded-lg">
                <span className="font-bold text-gray-800">Rata-rata DP:</span>
                <strong className="text-green-700 font-black">{fmtCurrency(executiveSummary.avgDP)} ({executiveSummary.avgDPRatio.toFixed(1)}%)</strong>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 border-2 border-black rounded-lg">
                <span className="font-bold text-gray-800">Rata-rata Aging:</span>
                <strong className="text-amber-700 font-black">{executiveSummary.avgAging.toFixed(0)} hari</strong>
              </div>
            </div>
          </div>

          <div className="bb-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-amber-600" />
              <h4 className="font-black text-lg text-slate-900">Distribusi Status</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-green-100 border-4 border-green-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                  <span className="text-sm font-black">Lancar</span>
                </div>
                <div className="text-3xl font-black text-green-800">{executiveSummary.lancarCount}</div>
                <div className="text-xs font-bold text-gray-700">({executiveSummary.totalContracts > 0 ? ((executiveSummary.lancarCount / executiveSummary.totalContracts) * 100).toFixed(1) : 0}%)</div>
              </div>
              <div className="p-4 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-800" />
                  <span className="text-sm font-black">Menunggak</span>
                </div>
                <div className="text-3xl font-black text-amber-900">{executiveSummary.menunggakCount}</div>
                <div className="text-xs font-bold text-gray-700">({executiveSummary.totalContracts > 0 ? ((executiveSummary.menunggakCount / executiveSummary.totalContracts) * 100).toFixed(1) : 0}%)</div>
              </div>
              <div className="p-4 bg-red-400 border-4 border-red-600 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-800" />
                  <span className="text-sm font-black">Macet</span>
                </div>
                <div className="text-3xl font-black text-red-900">{executiveSummary.macetCount}</div>
                <div className="text-xs font-bold text-gray-700">({executiveSummary.totalContracts > 0 ? ((executiveSummary.macetCount / executiveSummary.totalContracts) * 100).toFixed(1) : 0}%)</div>
              </div>
            </div>
          </div>

          <div className="bb-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-purple-600" />
              <h4 className="font-black text-lg text-slate-900">Profil Risiko</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-red-100 border-4 border-red-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-red-700" />
                  <span className="text-sm font-black">Risiko Tinggi</span>
                </div>
                <div className="text-3xl font-black text-red-800">{executiveSummary.highRiskCount}</div>
                <div className="text-xs font-bold text-gray-700">Skor ≥80</div>
              </div>
              <div className="p-4 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-800" />
                  <span className="text-sm font-black">Risiko Sedang</span>
                </div>
                <div className="text-3xl font-black text-amber-900">{executiveSummary.mediumRiskCount}</div>
                <div className="text-xs font-bold text-gray-700">Skor 50-79</div>
              </div>
              <div className="p-4 bg-green-100 border-4 border-green-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                  <span className="text-sm font-black">Risiko Rendah</span>
                </div>
                <div className="text-3xl font-black text-green-800">{executiveSummary.totalContracts - executiveSummary.highRiskCount - executiveSummary.mediumRiskCount}</div>
                <div className="text-xs font-bold text-gray-700">Skor &lt;50</div>
              </div>
            </div>
          </div>

          <div className="bb-card p-4 bg-yellow-50 border-4 border-yellow-500">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-700" />
              <h4 className="font-black text-lg text-slate-900">Temuan Kunci</h4>
            </div>
            <div className="text-sm space-y-3 font-semibold">
              <div className="flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 text-amber-700 mt-1 flex-shrink-0" />
                <div><strong className="font-black">Outstanding Calculation:</strong> Dihitung real-time sebagai Harga Jual – (Uang Masuk + Total Riwayat Pembayaran). Sistem menggunakan engine status yang mendeteksi: Lancar → Belum Bayar → Jatuh Tempo → Macet → Macet Total.</div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-amber-700 mt-1 flex-shrink-0" />
                <div><strong className="font-black">Pola Pembayaran:</strong> Banyak konsumen memiliki pola pembayaran tidak konsisten. DP kecil ({executiveSummary.avgDPRatio.toFixed(1)}% rata-rata) meningkatkan risiko default.</div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-700 mt-1 flex-shrink-0" />
                <div><strong className="font-black">Aging Analysis:</strong> Rata-rata aging {executiveSummary.avgAging.toFixed(0)} hari menunjukkan banyak konsumen tidak melakukan pembayaran rutin bulanan.</div>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-amber-700 mt-1 flex-shrink-0" />
                <div><strong className="font-black">Risk Profiling:</strong> Sistem mampu melakukan risk profiling, collection prioritization, dan credit quality assessment berbasis data real-time.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancial = () => (
    <div className="space-y-4">
      <div className="bb-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-300 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
            <DollarSign className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Analisis Keuangan</h3>
            <div className="text-sm font-bold text-gray-700">Financial Collection Analysis</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-6 h-6 text-blue-600" />
              <h4 className="font-black text-lg text-slate-900">Arus Uang Masuk</h4>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-blue-100 border-4 border-blue-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-blue-700" />
                  <div className="text-xs font-bold text-gray-800">Total Uang Masuk</div>
          </div>
                <div className="text-xl font-black text-blue-800">{fmtCurrency(executiveSummary.totalPaid)}</div>
              </div>
              <div className="p-4 bg-green-100 border-4 border-green-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="w-5 h-5 text-green-700" />
                  <div className="text-xs font-bold text-gray-800">Total DP</div>
                </div>
                <div className="text-xl font-black text-green-800">{fmtCurrency(executiveSummary.totalDP)}</div>
              </div>
              <div className="p-4 bg-purple-100 border-4 border-purple-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-5 h-5 text-purple-700" />
                  <div className="text-xs font-bold text-gray-800">Dari Riwayat Pembayaran</div>
                </div>
                <div className="text-xl font-black text-purple-800">{fmtCurrency(executiveSummary.totalPaid - executiveSummary.totalDP)}</div>
              </div>
              <div className="p-4 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <LineChart className="w-5 h-5 text-amber-800" />
                  <div className="text-xs font-bold text-gray-800">Cashflow Bulan Ini</div>
                </div>
                <div className="text-xl font-black text-amber-900">{fmtCurrency(financialAnalysis.cashflowThisMonth)}</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-slate-100 border-2 border-black rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gray-700" />
                <strong className="font-black">Rata-rata Ukuran Pembayaran:</strong>
              </div>
              <div className="text-lg font-black text-gray-900">{fmtCurrency(financialAnalysis.avgPaymentSize)}</div>
          </div>
        </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-6 h-6 text-red-600" />
              <h4 className="font-black text-lg text-slate-900">Outstanding Quality</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-red-100 border-4 border-red-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="text-xs font-bold text-gray-800 mb-2">Total Outstanding</div>
                <div className="text-2xl font-black text-red-800">{fmtCurrency(executiveSummary.totalOutstanding)}</div>
              </div>
              <div className="p-4 bg-orange-100 border-4 border-orange-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="text-xs font-bold text-gray-800 mb-2">Rata-rata Outstanding per Kontrak</div>
                <div className="text-2xl font-black text-orange-800">{fmtCurrency(executiveSummary.avgOutstanding)}</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-100 border-4 border-blue-500 rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="flex items-center gap-2 mb-2">
                <AlertOctagon className="w-5 h-5 text-blue-700" />
                <strong className="text-sm font-black">Outstanding dengan OS &gt;70% dari Harga Jual:</strong>
              </div>
              <div className="text-xl font-black text-blue-800">{riskAnalysis.highOSConsumers} konsumen</div>
            </div>
            <div className="mt-3 text-sm bg-blue-50 border-2 border-black p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-blue-700 mt-1 flex-shrink-0" />
                <div className="font-semibold">
                  <strong className="font-black">Analisis:</strong> Outstanding dihitung real sebagai <code className="bg-white px-1 rounded border border-black font-mono">Harga Jual – Uang Masuk – Total History</code>. 
                  Banyak konsumen memiliki outstanding besar karena: (1) Lama angsuran panjang (36-60 bulan umum), 
                  (2) History pembayaran sedikit atau tidak ada, (3) Outstanding besar + aging besar → potensi gagal bayar tinggi.
                </div>
              </div>
        </div>
      </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h4 className="font-black text-lg text-slate-900">Indikator Risiko Keuangan</h4>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-red-100 border-4 border-red-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-red-700" />
                  <strong className="text-sm font-black">Konsumen dengan DP Kecil (&lt;10%):</strong>
                </div>
                <div className="text-xl font-black text-red-800">{financialAnalysis.lowDPConsumers} konsumen</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Sangat rentan menunggak karena tidak ada minimum threshold DP</div>
              </div>
              <div className="p-4 bg-orange-100 border-4 border-orange-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-orange-700" />
                  <strong className="text-sm font-black">Konsumen Tanpa History Pembayaran:</strong>
                </div>
                <div className="text-xl font-black text-orange-800">{financialAnalysis.noHistoryConsumers} konsumen</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Hanya DP, tidak ada cicilan</div>
              </div>
              <div className="p-4 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-amber-800" />
                  <strong className="text-sm font-black">Pembayaran Tidak Konsisten:</strong>
                </div>
                <div className="text-xl font-black text-amber-900">{financialAnalysis.inconsistentPayers} konsumen</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Variasi nominal &gt;50% dari rata-rata</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border-4 border-yellow-500 rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                <div className="font-semibold">
                  <strong className="font-black">Dampak:</strong> Cashflow perusahaan tidak stabil karena banyak kontrak dengan dependensi pada cicilan bulanan. 
                  Riwayat pembayaran tidak merata: pembayaran kecil namun sering vs pembayaran besar tapi jarang vs tidak ada pembayaran → aging tinggi.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRisk = () => (
    <div className="space-y-4">
      <div className="bb-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-400 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
            <ShieldAlert className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Analisis Risiko</h3>
            <div className="text-sm font-bold text-gray-700">Risk Analysis</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h4 className="font-black text-lg text-slate-900">Distribusi Aging</h4>
            </div>
            <div className="overflow-x-auto border-4 border-black rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-yellow-300 border-b-4 border-black">
                    <th className="text-left py-3 px-4 font-black border-r-2 border-black">Kategori Aging</th>
                    <th className="text-right py-3 px-4 font-black border-r-2 border-black">Jumlah</th>
                    <th className="text-right py-3 px-4 font-black border-r-2 border-black">%</th>
                    <th className="text-left py-3 px-4 font-black">Situasi & Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-2 border-black hover:bg-green-50 transition-colors">
                    <td className="py-3 px-4 font-bold border-r-2 border-black">0-30 hari</td>
                    <td className="text-right py-3 px-4 font-black text-green-700 border-r-2 border-black">{riskAnalysis.agingDistribution["0-30"]}</td>
                    <td className="text-right py-3 px-4 font-bold border-r-2 border-black">{((riskAnalysis.agingDistribution["0-30"] / consumers.length) * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-bold">Normal — Risiko Rendah</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b-2 border-black hover:bg-yellow-50 transition-colors">
                    <td className="py-3 px-4 font-bold border-r-2 border-black">31-60 hari</td>
                    <td className="text-right py-3 px-4 font-black text-amber-700 border-r-2 border-black">{riskAnalysis.agingDistribution["31-60"]}</td>
                    <td className="text-right py-3 px-4 font-bold border-r-2 border-black">{((riskAnalysis.agingDistribution["31-60"] / consumers.length) * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-700 font-bold">Menunggak Ringan — Risiko Sedang</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b-2 border-black hover:bg-orange-50 transition-colors">
                    <td className="py-3 px-4 font-bold border-r-2 border-black">61-120 hari</td>
                    <td className="text-right py-3 px-4 font-black text-orange-700 border-r-2 border-black">{riskAnalysis.agingDistribution["61-120"]}</td>
                    <td className="text-right py-3 px-4 font-bold border-r-2 border-black">{((riskAnalysis.agingDistribution["61-120"] / consumers.length) * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-orange-700 font-bold">Menunggak Berat — Risiko Tinggi</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-red-50 transition-colors">
                    <td className="py-3 px-4 font-bold border-r-2 border-black">&gt;120 hari</td>
                    <td className="text-right py-3 px-4 font-black text-red-700 border-r-2 border-black">{riskAnalysis.agingDistribution[">120"]}</td>
                    <td className="text-right py-3 px-4 font-bold border-r-2 border-black">{((riskAnalysis.agingDistribution[">120"] / consumers.length) * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-700 font-bold">Tidak Ada Pembayaran Lama — Sangat Tinggi</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-blue-100 border-4 border-blue-500 rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
                <div className="font-semibold">
                  <strong className="font-black">Temuan:</strong> Banyak konsumen tidak punya pola pembayaran bulanan yang konsisten — aging tidak pernah kembali ke 0. 
                  Aging yang terlalu tinggi menyebabkan sistem langsung mengkategorikan sebagai "Macet".
                </div>
              </div>
            </div>
        </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
              <h4 className="font-black text-lg text-slate-900">Macet & Macet Total</h4>
            </div>
            <div className="p-4 bg-red-100 border-4 border-red-500 rounded-lg shadow-[4px_4px_0px_#000] space-y-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-700" />
                <div className="font-semibold">
                  <strong className="font-black">Total Konsumen Macet:</strong> <span className="text-xl font-black text-red-800">{executiveSummary.macetCount} konsumen</span>
                </div>
              </div>
              <div className="text-sm font-semibold">
                <strong className="font-black">Status Macet:</strong> Muncul ketika outstanding masih ada, aging sudah melewati batas toleransi (60-90 hari untuk Macet, &gt;90 hari untuk Macet Total), tidak ada pembayaran bertahun-tahun.
              </div>
              <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-red-700 mt-1 flex-shrink-0" />
                  <div className="font-semibold">
                    <strong className="font-black">Makna Bisnis:</strong> Konsumen ini harus masuk ke program: (1) Visit lapangan, (2) Restrukturisasi berat, (3) Legal combination (peringatan & negosiasi).
                  </div>
                </div>
              </div>
        </div>
      </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <h4 className="font-black text-lg text-slate-900">Jatuh Tempo / Belum Bayar</h4>
                </div>
            <div className="p-4 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[4px_4px_0px_#000] space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-800" />
                <div className="font-semibold">
                  <strong className="font-black">Total:</strong> <span className="text-xl font-black text-amber-900">{executiveSummary.menunggakCount} konsumen</span>
                </div>
              </div>
              <div className="text-sm font-semibold">
                <strong className="font-black">Penyebab Umum:</strong> (1) Pembayaran bulan berjalan tidak masuk, (2) Nominal pembayaran lebih kecil dari installment, (3) Belum masuk hari H (hari jatuh tempo).
              </div>
              <div className="mt-2">
                <strong className="font-black">Kategori Risiko:</strong> <span className="px-2 py-1 bg-amber-200 border-2 border-black rounded font-black text-amber-900">Medium — perlu intensifikasi reminder dan monitoring</span>
              </div>
            </div>
        </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h4 className="font-black text-lg text-slate-900">Lancar</h4>
            </div>
            <div className="p-4 bg-green-100 border-4 border-green-500 rounded-lg shadow-[4px_4px_0px_#000] space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-700" />
                <div className="font-semibold">
                  <strong className="font-black">Total:</strong> <span className="text-xl font-black text-green-800">{executiveSummary.lancarCount} konsumen</span>
                </div>
              </div>
              <div className="text-sm font-semibold">
                <strong className="font-black">Karakteristik:</strong> (1) DP besar, (2) History konsisten, (3) Aging 0-15 hari, (4) Total paid ≥ total should paid (berdasarkan months passed × installment).
              </div>
            </div>
          </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <h4 className="font-black text-lg text-slate-900">Potensi Gagal Bayar</h4>
            </div>
            <div className="p-4 bg-slate-100 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-orange-700" />
                <strong className="font-black">Konsumen dengan Skor Risiko Tinggi (≥70) & Status Menunggak:</strong>
              </div>
              <div className="text-2xl font-black text-orange-800">{riskAnalysis.potentialDefaults} konsumen</div>
              <div className="mt-2 text-sm font-bold text-gray-700">Kriteria: Skor risiko tinggi + status Belum Bayar/Jatuh Tempo → perlu tindakan preventif segera.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMarketing = () => (
    <div className="space-y-4">
      <div className="bb-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-400 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
            <Users className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Analisis Marketing</h3>
            <div className="text-sm font-bold text-gray-700">Kualitas Channel</div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(marketingAnalysis).map(([marketing, data]) => {
            const performanceLevel = data.macetRate > 20 ? "low" :
                                   data.avgOSPerContract > executiveSummary.avgOutstanding * 1.5 ? "medium" :
                                   data.lancarRate > 70 ? "high" : "standard";
            return (
              <div key={marketing} className={`bb-card p-5 ${
                performanceLevel === "high" ? "bg-green-50" :
                performanceLevel === "low" ? "bg-red-50" :
                performanceLevel === "medium" ? "bg-yellow-50" :
                ""
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 border-4 border-black rounded-lg shadow-[3px_3px_0px_#000] ${
                      performanceLevel === "high" ? "bg-green-300" :
                      performanceLevel === "low" ? "bg-red-400" :
                      performanceLevel === "medium" ? "bg-yellow-300" :
                      "bg-gray-200"
                    }`}>
                      <Users className="w-6 h-6 text-black" />
                    </div>
                    <h4 className="font-black text-xl text-slate-900">{marketing}</h4>
                  </div>
                  {performanceLevel === "high" && <Award className="w-6 h-6 text-green-700" />}
                  {performanceLevel === "low" && <AlertTriangle className="w-6 h-6 text-red-700" />}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-4 h-4 text-gray-700" />
                      <div className="text-xs font-bold text-gray-800">Kontrak</div>
          </div>
                    <div className="text-lg font-black">{data.contracts}</div>
        </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <div className="text-xs font-bold text-gray-800">Revenue</div>
                    </div>
                    <div className="text-lg font-black text-green-700">{fmtCurrency(data.revenue)}</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <div className="text-xs font-bold text-gray-800">Outstanding</div>
                    </div>
                    <div className="text-lg font-black text-red-600">{fmtCurrency(data.os)}</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-orange-600" />
                      <div className="text-xs font-bold text-gray-800">OS/Kontrak</div>
                    </div>
                    <div className="text-lg font-black">{fmtCurrency(data.avgOSPerContract)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <div className="text-xs font-bold text-gray-800">Macet</div>
                    </div>
                    <div className="text-lg font-black text-red-600">{data.macet} ({data.macetRate.toFixed(1)}%)</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <div className="text-xs font-bold text-gray-800">Menunggak</div>
                    </div>
                    <div className="text-lg font-black text-amber-600">{data.menunggak}</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <div className="text-xs font-bold text-gray-800">Lancar</div>
                    </div>
                    <div className="text-lg font-black text-green-600">{data.lancar} ({data.lancarRate.toFixed(1)}%)</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <div className="text-xs font-bold text-gray-800">Rata-rata DP</div>
                    </div>
                    <div className="text-lg font-black">{data.avgDPRatio.toFixed(1)}%</div>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg text-xs font-bold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <span>Rata-rata Pembayaran per Kontrak: <strong className="font-black">{data.avgPaymentsPerContract.toFixed(1)}</strong> kali</span>
                  </div>
                </div>
                
                <div className={`mt-3 p-3 border-4 border-black rounded-lg shadow-[3px_3px_0px_#000] text-sm font-bold ${
                  performanceLevel === "low" ? "bg-red-100 text-red-900" :
                  performanceLevel === "medium" ? "bg-yellow-300 text-amber-900" :
                  performanceLevel === "high" ? "bg-green-100 text-green-900" :
                  "bg-gray-100 text-gray-900"
                }`}>
                  <div className="flex items-center gap-2">
                    {performanceLevel === "low" && <AlertTriangle className="w-5 h-5" />}
                    {performanceLevel === "medium" && <AlertCircle className="w-5 h-5" />}
                    {performanceLevel === "high" && <Award className="w-5 h-5" />}
                    {performanceLevel === "standard" && <BarChart3 className="w-5 h-5" />}
                    <div>
                      {performanceLevel === "low" && "⚠️ Kualitas Rendah: Tingkat macet tinggi, pertimbangkan audit & training."}
                      {performanceLevel === "medium" && "⚠️ Outstanding Tinggi: Outstanding per kontrak di atas rata-rata."}
                      {performanceLevel === "high" && "✅ Kinerja Baik: Tingkat lancar tinggi, layak diberi insentif."}
                      {performanceLevel === "standard" && "📊 Kinerja Standar: Perlu monitoring lebih lanjut."}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bb-card p-5 bg-blue-50 border-4 border-blue-500">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-6 h-6 text-blue-700" />
            <h4 className="font-black text-lg text-slate-900">Rekomendasi Strategis</h4>
          </div>
          <ol className="list-decimal ml-6 space-y-2 text-sm font-semibold">
            <li className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-700 mt-1 flex-shrink-0" />
              <div><strong className="font-black">Audit Marketing:</strong> Marketing yang menghasilkan outstanding per-konsumen tinggi perlu diaudit kualitas closing-nya.</div>
            </li>
            <li className="flex items-start gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700 mt-1 flex-shrink-0" />
              <div><strong className="font-black">KPI Kualitas:</strong> Terapkan KPI berbasis kualitas kontrak (bukan sekadar jumlah closing). Faktor: DP rata-rata, jumlah pembayaran pertama, sebaran status konsumen.</div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="w-4 h-4 text-blue-700 mt-1 flex-shrink-0" />
              <div><strong className="font-black">Training & Komisi:</strong> Berikan training & revisi komisi untuk marketing berkinerja buruk. Marketing dengan banyak konsumen menunggak/macet → potensi moral hazard (closing tanpa screening).</div>
            </li>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 text-blue-700 mt-1 flex-shrink-0" />
              <div><strong className="font-black">Insentif:</strong> Marketing dengan banyak kontrak lancar → layak diberi insentif tambahan.</div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );

  const renderArea = () => (
    <div className="space-y-4">
      <div className="bb-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-400 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
            <MapPin className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Analisis Area</h3>
            <div className="text-sm font-bold text-gray-700">Kualitas Wilayah</div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(areaAnalysis).map(([area, data]) => {
            const riskLevel = data.macetRate > 15 || data.avgOSPerContract > executiveSummary.avgOutstanding * 1.3 ? "high" :
                             data.lancarRate > 60 ? "low" : "medium";
            return (
              <div key={area} className={`bb-card p-5 ${
                riskLevel === "high" ? "bg-red-50" : 
                riskLevel === "low" ? "bg-green-50" : 
                "bg-yellow-50"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 border-4 border-black rounded-lg shadow-[3px_3px_0px_#000] ${
                      riskLevel === "high" ? "bg-red-400" :
                      riskLevel === "low" ? "bg-green-300" :
                      "bg-yellow-300"
                    }`}>
                      <Building2 className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-slate-900">{area}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {riskLevel === "high" && (
                          <>
                            <XCircle className="w-4 h-4 text-red-700" />
                            <span className="text-sm font-black text-red-800">High Risk</span>
                          </>
                        )}
                        {riskLevel === "low" && (
                          <>
                            <Award className="w-4 h-4 text-green-700" />
                            <span className="text-sm font-black text-green-800">Premium</span>
                          </>
                        )}
                        {riskLevel === "medium" && (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-700" />
                            <span className="text-sm font-black text-amber-800">Medium Risk</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-4 h-4 text-gray-700" />
                      <div className="text-xs font-bold text-gray-800">Kontrak</div>
          </div>
                    <div className="text-lg font-black">{data.contracts}</div>
        </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <div className="text-xs font-bold text-gray-800">Total Harga</div>
                    </div>
                    <div className="text-lg font-black">{fmtCurrency(data.price)}</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <div className="text-xs font-bold text-gray-800">Terbayar</div>
                    </div>
                    <div className="text-lg font-black text-green-700">{fmtCurrency(data.paid)} ({data.paidPct.toFixed(1)}%)</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <div className="text-xs font-bold text-gray-800">Outstanding</div>
                    </div>
                    <div className="text-lg font-black text-red-600">{fmtCurrency(data.os)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <div className="text-xs font-bold text-gray-800">Macet</div>
                    </div>
                    <div className="text-lg font-black text-red-600">{data.macet} ({data.macetRate.toFixed(1)}%)</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <div className="text-xs font-bold text-gray-800">Menunggak</div>
                    </div>
                    <div className="text-lg font-black text-amber-600">{data.menunggak}</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <div className="text-xs font-bold text-gray-800">Lancar</div>
                    </div>
                    <div className="text-lg font-black text-green-600">{data.lancar} ({data.lancarRate.toFixed(1)}%)</div>
                  </div>
                  <div className="p-3 bg-white border-2 border-black rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-orange-600" />
                      <div className="text-xs font-bold text-gray-800">OS/Kontrak</div>
                    </div>
                    <div className="text-lg font-black">{fmtCurrency(data.avgOSPerContract)}</div>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg text-xs font-bold">
                  <div className="flex items-center gap-2 text-gray-800">
                    <CreditCard className="w-4 h-4" />
                    <span>Rata-rata DP: <strong className="font-black">{data.avgDPRatio.toFixed(1)}%</strong></span>
                    <span className="mx-2">•</span>
                    <Receipt className="w-4 h-4" />
                    <span>Total Pembayaran: <strong className="font-black">{data.totalPayments}</strong> kali</span>
                  </div>
      </div>
    </div>
  );
          })}
        </div>

        <div className="mt-6 bb-card p-5 bg-blue-50 border-4 border-blue-500">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-6 h-6 text-blue-700" />
            <h4 className="font-black text-lg text-slate-900">Klasifikasi Area & Rekomendasi</h4>
          </div>
          <div className="space-y-3 text-sm font-semibold">
            <div className="flex items-start gap-2 p-3 bg-green-100 border-4 border-green-500 rounded-lg shadow-[3px_3px_0px_#000]">
              <Award className="w-5 h-5 text-green-700 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-black text-green-900">Area Premium:</strong> Banyak lancar, outstanding kecil, tingkat pelunasan tinggi, history konsisten. → Program: Upselling & retensi.
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[3px_3px_0px_#000]">
              <AlertCircle className="w-5 h-5 text-amber-800 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-black text-amber-900">Area Medium Risk:</strong> Menunggak ringan lebih dari 30%, outstanding sedang. → Program: Fokus collection, alokasikan tim lapangan, jadwalkan kunjungan mingguan.
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-red-100 border-4 border-red-500 rounded-lg shadow-[3px_3px_0px_#000]">
              <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-black text-red-900">Area High Risk:</strong> Banyak macet + OS besar, DP kecil, banyak konsumen tidak punya history pembayaran. → Program: Kunjungan intensif, restrukturisasi, pertimbangkan program edukasi & opsi pembayaran fleksibel.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBehavior = () => (
    <div className="space-y-4">
      <div className="bb-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-400 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
            <Clock className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Analisis Perilaku Pembayaran</h3>
            <div className="text-sm font-bold text-gray-700">Consumer Payment Behavior Analysis</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-6 h-6 text-blue-600" />
              <h4 className="font-black text-lg text-slate-900">Pola Pembayaran yang Terdeteksi</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-blue-100 border-4 border-blue-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-700" />
                  <strong className="text-sm font-black">Pembayaran Random</strong>
                </div>
                <div className="text-2xl font-black text-blue-800">{behaviorAnalysis.randomPayers}</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Variasi nominal &gt;50% dari rata-rata</div>
              </div>
              <div className="p-4 bg-red-100 border-4 border-red-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-700" />
                  <strong className="text-sm font-black">Tidak Ada Pembayaran Setelah DP</strong>
                </div>
                <div className="text-2xl font-black text-red-800">{behaviorAnalysis.noPaymentAfterDP}</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Hanya DP, tidak ada history</div>
              </div>
              <div className="p-4 bg-orange-100 border-4 border-orange-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-700" />
                  <strong className="text-sm font-black">History Sedikit (1-3)</strong>
                </div>
                <div className="text-2xl font-black text-orange-800">{behaviorAnalysis.fewPayments}</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Kecenderungan macet tinggi</div>
              </div>
              <div className="p-4 bg-purple-100 border-4 border-purple-500 rounded-lg shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-purple-700" />
                  <strong className="text-sm font-black">Pembayaran Bulk</strong>
                </div>
                <div className="text-2xl font-black text-purple-800">{behaviorAnalysis.bulkPayers}</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Pembayaran &gt;2× installment</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-amber-800" />
                <strong className="text-sm font-black">Pembayaran Tidak Rutin Bulanan</strong>
              </div>
              <div className="text-2xl font-black text-amber-900">{behaviorAnalysis.inconsistentMonthly}</div>
              <div className="text-xs font-bold text-gray-700 mt-1">Pembayaran &lt;50% dari bulan yang seharusnya</div>
            </div>
          </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h4 className="font-black text-lg text-slate-900">Risiko Dominan</h4>
            </div>
            <div className="p-4 bg-red-100 border-4 border-red-500 rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5 text-red-700" />
                <div className="font-black text-lg text-red-900">Payment Consistency Rendah</div>
              </div>
              <div className="space-y-2 text-sm font-semibold">
                <div className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 text-red-700 mt-1 flex-shrink-0" />
                  <div>Sistem mengecek pembayaran bulan berjalan → sering &lt; installment.</div>
                </div>
                <div className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 text-red-700 mt-1 flex-shrink-0" />
                  <div>Banyak history mencatat nominal tidak selalu sama dengan installment.</div>
                </div>
                <div className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 text-red-700 mt-1 flex-shrink-0" />
                  <div>Konsumen dengan 1-3 pembayaran → kecenderungan macet.</div>
                </div>
                <div className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 text-red-700 mt-1 flex-shrink-0" />
                  <div>Sistem menghitung "monthsPaid" dari nominal pembayaran, tetapi tidak semua konsumen melakukan pembayaran yang menutup beberapa bulan sekaligus.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bb-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              <h4 className="font-black text-lg text-slate-900">Insight</h4>
            </div>
            <div className="p-4 bg-blue-100 border-4 border-blue-500 rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="text-sm font-semibold">
                Berdasarkan cara sistem menghitung history, pola umum yang ditemukan menunjukkan bahwa banyak konsumen tidak memiliki disiplin pembayaran bulanan yang konsisten. 
                Hal ini menyebabkan aging tidak pernah kembali ke 0 dan meningkatkan risiko default.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const renderAssistant = () => (
    <div className="space-y-4">
      <div className="bb-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-violet-400 border-4 border-black rounded-lg shadow-[4px_4px_0px_#000]">
            <Zap className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">AI Collection Assistant</h3>
            <div className="text-sm font-bold text-gray-700">Daftar Prioritas Tindakan</div>
          </div>
        </div>

        <div className="space-y-6">
          {/* PRIORITAS 1 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className="w-6 h-6 text-red-700" />
              <h4 className="font-black text-lg text-red-800">PRIORITAS 1 — Kunjung & Negosiasi</h4>
                  </div>
            <div className="text-sm font-bold text-gray-800 mb-3 bg-red-100 border-2 border-black p-2 rounded-lg">
              Konsumen: Status Macet, aging &gt;90 hari, OS besar
                  </div>
            <div className="space-y-2">
              {priorityActions.priority1.length > 0 ? (
                priorityActions.priority1.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="p-4 rounded-lg border-4 border-red-500 bg-red-50 shadow-[4px_4px_0px_#000] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-600 text-white border-2 border-black rounded text-xs font-black shadow-[2px_2px_0px_#000]">
                            {i + 1}
                          </span>
                          <div className="font-black text-lg text-slate-900">{c.name}</div>
                </div>
                        <div className="text-xs font-bold text-gray-700 flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{c.area}</span>
                          <span>•</span>
                          <Users className="w-3 h-3" />
                          <span>{c.marketing}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>
                            Last: {c.lastPaymentDate || "-"} (Aging: {c.aging} hari)
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-black text-lg text-red-800">
                          {fmtCurrency(c.outstanding)}
                        </div>
                        <div className="text-xs font-bold text-gray-600">Score: {c.riskScore}</div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg text-sm font-semibold">
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="font-black">Aksi:</strong> Kunjungan lapangan + surat peringatan
                          resmi + tawarkan restrukturisasi 3/6/12 bulan. Jika tidak ada
                          respons → proses legal administratif.
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                        onClick={() => handleCopyWA(c)}
                      >
                        <Copy className="w-3 h-3" />
                        Salin Skrip
                      </button>
                      <button
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                        onClick={() => handleSendWA(c)}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Kirim WA
                      </button>
                      <button
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-black text-xs font-black hover:bg-gray-100 transition-all shadow-[2px_2px_0px_#000]"
                        onClick={() => alert(`Simulasi: assign ke collection team -> ${c.name}`)}
                      >
                        <Users className="w-3 h-3" />
                        Assign
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-100 border-4 border-black rounded-lg text-sm font-bold text-gray-700 text-center shadow-[3px_3px_0px_#000]">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-gray-500" />
                  Tidak ada prioritas 1 saat ini.
                </div>
              )}
            </div>
          </div>

          {/* PRIORITAS 2 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-700" />
              <h4 className="font-black text-lg text-amber-800">PRIORITAS 2 — Intensifkan Reminder</h4>
            </div>
            <div className="text-sm font-bold text-gray-800 mb-3 bg-yellow-300 border-2 border-black p-2 rounded-lg">
              Konsumen: Belum Bayar atau Jatuh Tempo, skor risiko ≥50
            </div>
            <div className="space-y-2">
              {priorityActions.priority2.length > 0 ? (
                priorityActions.priority2.slice(0, 10).map((c, i) => (
                  <div key={c.id || i} className="p-4 rounded-lg border-4 border-yellow-600 bg-yellow-50 shadow-[4px_4px_0px_#000] hover:-translate-x-1 hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-yellow-600 text-white border-2 border-black rounded text-xs font-black shadow-[2px_2px_0px_#000]">{i + 1}</span>
                          <div className="font-black text-lg text-slate-900">{c.name}</div>
                        </div>
                        <div className="text-xs font-bold text-gray-700 flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{c.area}</span>
                          <span>•</span>
                          <Users className="w-3 h-3" />
                          <span>{c.marketing}</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-black border-2 border-black ${getStatusColor(c.computedStatus)}`}>
                            {c.computedStatus}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-black text-lg text-amber-800">{fmtCurrency(c.outstanding)}</div>
                        <div className="text-xs font-bold text-gray-600">Score: {c.riskScore}</div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg text-sm font-semibold">
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                        <div><strong className="font-black">Aksi:</strong> Hubungi via telepon pada H+3 & H+7, kirim WA reminder otomatis, berikan opsi pembayaran fleksibel, jadwalkan ulang jatuh tempo jika perlu.</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button 
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                        onClick={() => handleCopyWA(c)}
                      >
                        <Copy className="w-3 h-3" />
                        Salin Skrip
                      </button>
                      <button
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                        onClick={() => handleSendWA(c)}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Kirim WA
                      </button>
                      <button 
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-black text-xs font-black hover:bg-gray-100 transition-all shadow-[2px_2px_0px_#000]"
                        onClick={() => alert(`Simulasi: schedule reminder -> ${c.name}`)}
                      >
                        <Calendar className="w-3 h-3" />
                        Schedule
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-100 border-4 border-black rounded-lg text-sm font-bold text-gray-700 text-center shadow-[3px_3px_0px_#000]">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-gray-500" />
                  Tidak ada prioritas 2 saat ini.
                </div>
              )}
            </div>
            </div>

          {/* PRIORITAS 3 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-blue-700" />
              <h4 className="font-black text-lg text-blue-800">PRIORITAS 3 — Monitoring & Retensi</h4>
            </div>
            <div className="text-sm font-bold text-gray-800 mb-3 bg-blue-100 border-2 border-black p-2 rounded-lg">
              Konsumen: Lancar tapi DP kecil atau pembayaran tidak stabil
          </div>
            <div className="space-y-2">
              {priorityActions.priority3.length > 0 ? (
                priorityActions.priority3.slice(0, 8).map((c, i) => (
                  <div key={c.id || i} className="p-4 rounded-lg border-4 border-blue-500 bg-blue-50 shadow-[4px_4px_0px_#000] hover:-translate-x-1 hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-600 text-white border-2 border-black rounded text-xs font-black shadow-[2px_2px_0px_#000]">{i + 1}</span>
                          <div className="font-black text-lg text-slate-900">{c.name}</div>
                        </div>
                        <div className="text-xs font-bold text-gray-700 flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{c.area}</span>
                          <span>•</span>
                          <CreditCard className="w-3 h-3" />
                          <span>DP: {fmtCurrency(c.downPayment)} ({c.dpRatio.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-black text-lg text-blue-800">{fmtCurrency(c.outstanding)}</div>
                        <div className="text-xs font-bold text-gray-600">Payments: {c.paymentsCount}</div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg text-sm font-semibold">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                        <div><strong className="font-black">Aksi:</strong> Ingatkan 5 hari sebelum jatuh tempo, berikan diskon pelunasan awal (early settlement), tawarkan produk tambahan bila perilaku pembayaran baik.</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-100 border-4 border-black rounded-lg text-sm font-bold text-gray-700 text-center shadow-[3px_3px_0px_#000]">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-gray-500" />
                  Tidak ada prioritas 3 saat ini.
                </div>
              )}
            </div>
          </div>

          {/* PRIORITAS 4 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-6 h-6 text-green-700" />
              <h4 className="font-black text-lg text-green-800">PRIORITAS 4 — Konsumen Sehat</h4>
            </div>
            <div className="text-sm font-bold text-gray-800 mb-3 bg-green-100 border-2 border-black p-2 rounded-lg">
              Konsumen: Lancar & history kuat
            </div>
            <div className="space-y-2">
              {priorityActions.priority4.length > 0 ? (
                priorityActions.priority4.slice(0, 5).map((c, i) => (
                  <div key={c.id || i} className="p-4 rounded-lg border-4 border-green-500 bg-green-50 shadow-[4px_4px_0px_#000] hover:-translate-x-1 hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-600 text-white border-2 border-black rounded text-xs font-black shadow-[2px_2px_0px_#000]">{i + 1}</span>
                          <div className="font-black text-lg text-slate-900">{c.name}</div>
                        </div>
                        <div className="text-xs font-bold text-gray-700 flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{c.area}</span>
                          <span>•</span>
                          <Receipt className="w-3 h-3" />
                          <span>Payments: {c.paymentsCount} kali</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-black text-lg text-green-800">{fmtCurrency(c.outstanding)}</div>
                        <div className="text-xs font-bold text-gray-600">DP: {c.dpRatio.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg text-sm font-semibold">
                      <div className="flex items-start gap-2">
                        <Award className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                        <div><strong className="font-black">Aksi:</strong> Upselling & cross-selling, penguatan retensi, berikan reward loyalitas kecil (voucher atau cashback).</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-100 border-4 border-black rounded-lg text-sm font-bold text-gray-700 text-center shadow-[3px_3px_0px_#000]">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-gray-500" />
                  Tidak ada prioritas 4 saat ini.
                </div>
              )}
            </div>
          </div>

          {/* Ringkasan */}
          <div className="bb-card p-5 bg-slate-50 border-4 border-black">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-6 h-6 text-slate-800" />
              <h4 className="font-black text-lg text-slate-900">Ringkasan & Estimated At-Risk</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-red-100 border-4 border-red-500 rounded-lg shadow-[3px_3px_0px_#000]">
                <div className="text-xs font-bold text-gray-800 mb-1">Prioritas 1</div>
                <div className="text-2xl font-black text-red-800">{priorityActions.priority1.length}</div>
                <div className="text-xs font-bold text-gray-700">konsumen</div>
              </div>
              <div className="p-3 bg-yellow-300 border-4 border-yellow-600 rounded-lg shadow-[3px_3px_0px_#000]">
                <div className="text-xs font-bold text-gray-800 mb-1">Prioritas 2</div>
                <div className="text-2xl font-black text-amber-900">{priorityActions.priority2.length}</div>
                <div className="text-xs font-bold text-gray-700">konsumen</div>
              </div>
              <div className="p-3 bg-blue-100 border-4 border-blue-500 rounded-lg shadow-[3px_3px_0px_#000]">
                <div className="text-xs font-bold text-gray-800 mb-1">Prioritas 3</div>
                <div className="text-2xl font-black text-blue-800">{priorityActions.priority3.length}</div>
                <div className="text-xs font-bold text-gray-700">konsumen</div>
              </div>
              <div className="p-3 bg-green-100 border-4 border-green-500 rounded-lg shadow-[3px_3px_0px_#000]">
                <div className="text-xs font-bold text-gray-800 mb-1">Prioritas 4</div>
                <div className="text-2xl font-black text-green-800">{priorityActions.priority4.length}</div>
                <div className="text-xs font-bold text-gray-700">konsumen</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-red-100 border-4 border-red-500 rounded-lg shadow-[4px_4px_0px_#000]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-700" />
                <strong className="text-sm font-black text-red-900">Estimated At-Risk (Rp):</strong>
              </div>
              <div className="text-2xl font-black text-red-900">
                {fmtCurrency(
                  scoredConsumers.reduce(
                    (s, c) => s + (c.riskScore >= 50 ? Number(c.outstanding || 0) : 0),
                    0
                  )
                )}
              </div>
              <div className="text-xs font-bold text-gray-700 mt-1">
                Total outstanding dari konsumen dengan skor risiko ≥50
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced tabs with icons (BRUTAL BRUSH STYLE)
  const tabConfig = [
    { id: "executive", label: "Executive Summary", icon: FileText },
    { id: "financial", label: "Analisis Keuangan", icon: DollarSign },
    { id: "risk", label: "Analisis Risiko", icon: ShieldAlert },
    { id: "marketing", label: "Analisis Marketing", icon: Users },
    { id: "area", label: "Analisis Area", icon: MapPin },
    { id: "behavior", label: "Perilaku Pembayaran", icon: Clock },
    { id: "assistant", label: "AI Assistant", icon: Zap },
  ];

  // ---------- Render main ----------
  return (
    <ModuleLayout module="collection" title="Analytics — Professional Collection Analysis">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Analisis Collection Profesional</h2>
          </div>
          <div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 border-2 border-black text-sm font-bold shadow-[2px_2px_0px_#000]">
                <Activity className="w-4 h-4 animate-spin text-slate-700" />
                <span className="text-slate-800">Memuat data...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 border-2 border-black text-green-800 text-sm font-black shadow-[2px_2px_0px_#000]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Data siap ({consumers.length} konsumen)</span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Tabs with Icons (BRUTAL BRUSH) */}
        <div className="flex flex-wrap gap-2 items-center border-b-4 border-black pb-2 overflow-x-auto">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-black transition-all duration-200 whitespace-nowrap border-2 border-black ${
                  isActive
                    ? "bg-slate-900 text-white shadow-[4px_4px_0px_#000] transform scale-105 border-b-0"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-[2px_2px_0px_#000]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-700"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {activeTab === "executive" && renderExecutiveSummary()}
          {activeTab === "financial" && renderFinancial()}
          {activeTab === "risk" && renderRisk()}
          {activeTab === "marketing" && renderMarketing()}
          {activeTab === "area" && renderArea()}
          {activeTab === "behavior" && renderBehavior()}
          {activeTab === "assistant" && renderAssistant()}
        </div>

        {/* Footer notes */}
        <div className="text-sm font-bold text-gray-700 bb-card p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="font-black">Catatan:</strong> Semua analisis bersifat rule-based dan derived dari data real-time. 
              Fitur WhatsApp kini terintegrasi langsung dengan template otomatis berdasarkan status.
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-800 bg-red-100 border-4 border-red-500 p-4 rounded-lg shadow-[4px_4px_0px_#000] font-bold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}