import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import ModuleLayout from "../../layouts/ModuleLayout";
import { getConsumers, deleteConsumer } from "../../api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { makeWAMessage } from "../utils/waTemplate";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getRealStatus, calculateMonthsPaid } from "../utils/statusCalculator"; // Import lainnya dihapus karena statusColor didefinisikan di sini

const fmt = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

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

const fmtDate = (d) => {
  const dateObj = parseFlexibleDate(d);
  return dateObj ? dateObj.toLocaleDateString("id-ID") : "-";
};

// ===============================================
// FUNGSI INJEKSI: PENENTU WARNA STATUS BARU
// ===============================================
export function getStatusColor(status) {
    const s = (status || '').toUpperCase();
    
    // Status Positif/Netral
    if (s === 'LUNAS') return 'bg-gray-700 text-white'; 
    if (s === 'LANCAR') return 'bg-green-500 text-white'; 
    if (s === 'HAMPIR LUNAS') return 'bg-lime-400 text-black'; 
    if (s === 'ANGSURAN BERJALAN') return 'bg-blue-300 text-black'; 

    // Status Peringatan/Tunggakan
    if (s === 'JATUH TEMPO') return 'bg-yellow-500 text-black'; 
    if (s === 'TERTUNGGAK RINGAN') return 'bg-orange-400 text-black';
    if (s === 'TERTUNGGAK SEDANG') return 'bg-orange-700 text-white';

    // Status Koleksi/Macet (Merah)
    if (s === 'TUNGGAKAN KRITIS') return 'bg-red-600 text-white'; 
    if (s === 'KREDIT MACET TOTAL') return 'bg-red-900 text-white'; 
    
    return 'bg-gray-300 text-black'; 
}

// ==========================================
// 1. NORMALIZE DATA
// ==========================================
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
  
  // PLAN I
  r.sumberDana1 = Number(raw["Rencana Pembayaran 1"] || 0); 
  r.tenor1 = Number(raw["Lama Angsuran"] || raw.lama || 0);
  r.installment1 = Number(raw["Nilai Angsuran"] || raw.installment || 0);
  r.mulai1 = raw["Mulai Cicilan"] || raw.mulai || raw.start || "";
  r.selesai1 = raw["Selesai Cicilan"] || raw.selesai || "";

  // PLAN II
  r.jenisMetode2 = raw["Metode Pembayaran 2"] || "-";
  r.sumberDana2 = Number(raw["Rencana Pembayaran 2"] || 0);
  r.tenor2 = Number(raw["Lama Angsuran 2"] || 0);
  r.installment2 = Number(raw["Nilai Angsuran 2"] || 0);
  r.mulai2 = raw["Mulai Cicilan 2"] || "";
  r.selesai2 = raw["Selesai Cicilan 2"] || "";

  r.status = raw.Status || raw.status || "Belum Bayar";
  r.marketing = raw.Marketing || raw.marketing || "";
  r.code = raw.id || raw.Code || raw.code || "";
  r.polaBayar = raw["Pola Pembayaran"] || raw["Pola Bayar"] || raw.pola || raw.polaBayar || raw.paymentPattern || "";
  r.rawDue = Number(raw["Jatuh Tempo"] || 0);

  // History Pembayaran
  const rawHistory = raw["Riwayat Pembayaran"] || raw.riwayatPembayaran || raw.history || raw.Riwayat || [];
  r.history = Array.isArray(rawHistory)
    ? rawHistory.map((h) => {
      const tanggal = h.tanggalBayar || h.Tanggal || h.tanggal || h.date || "";
      const nominalRaw = h.nominal || h.Jumlah || h.jumlah || h.amount || h.value || 0;
      const nominalNumber = Number(String(nominalRaw || "0").replace(/\D/g, "")) || 0;
      return {
        tanggalBayar: tanggal,
        nominal: nominalNumber,
        cicilanKe: h.cicilanKe || "",
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

export default function MasterCollection() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // SCROLL SYNC REFS
  const topScrollRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    loadData();
    const handler = (e) => {
      if (!e || e.key === "collection:updated") loadData();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [marketingFilter, setMarketingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [polaBayarFilter, setPolaBayarFilter] = useState("");

  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const perPage = 50;
  const location = useLocation();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getConsumers();
      setList((res?.data || []).map(normalize));
    } catch (err) {
      console.error("loadData error:", err);
      alert("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, location.search]);

  // ==========================================
  // 2. ENRICHED LOGIC (DYNAMIC PLAN SWITCH & STATUS BARU)
  // ==========================================
  const enriched = useMemo(() => {
    return list.map((c) => {
      
      const historyTotal = sumHistoryAll(c);
      
      // LOGIKA ANTI DOUBLE COUNT
      const hasAutoDP = c.history.some(h => 
        (h.keterangan || "").toUpperCase().includes("DP") || 
        (h.keterangan || "").toUpperCase().includes("UANG MASUK")
      );
      
      const totalPaid = hasAutoDP 
        ? historyTotal 
        : (Number(c.downPayment || 0) + historyTotal);

      const newOutstanding = Math.max(0, Number(c.price || 0) - totalPaid);

      // --- LOGIKA SWITCH PLAN ---
      const isPlan1Complete = c.sumberDana1 > 0 && totalPaid >= c.sumberDana1;
      const usePlan2 = c.tenor2 > 0 && isPlan1Complete;
      
      const activePlan = {
          tenor: usePlan2 ? c.tenor2 : c.tenor1,
          installment: usePlan2 ? c.installment2 : c.installment1,
          mulai: usePlan2 ? c.mulai2 : c.mulai1,
          selesai: usePlan2 ? c.selesai2 : c.selesai1,
          label: usePlan2 ? `Plan II (${c.jenisMetode2})` : 'Plan I'
      };
      
      const activeStartDate = activePlan.mulai;
      const activeInstallment = activePlan.installment;

      // --- LOGIKA STATUS BARU (REPLIKASI LOGIC) ---
      const monthsElapsed = activeInstallment > 0 && activeStartDate ? 
          Math.max(0, new Date().getFullYear() * 12 + new Date().getMonth() - (new Date(activeStartDate).getFullYear() * 12 + new Date(activeStartDate).getMonth()) + 1)
          : 0;
          
      const monthsCovered = activeInstallment > 0 ? Math.floor(totalPaid / activeInstallment) : 0;
      const delinquencyMonths = monthsElapsed - monthsCovered;
      
      let computedStatus = "ANGSURAN BERJALAN"; // Default
      const osThreshold = c.price * 0.10;

      if (newOutstanding === 0) {
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

      if (computedStatus !== "LUNAS" && newOutstanding > 0 && newOutstanding <= osThreshold) {
        computedStatus = "HAMPIR LUNAS";
      }
      
      const today = new Date();
      const dueDay = c.rawDue || (activeStartDate ? new Date(activeStartDate).getDate() : 0);
      if (computedStatus !== "LANCAR" && computedStatus !== "LUNAS" && computedStatus !== "HAMPIR LUNAS" && dueDay > 0) {
          if (today.getDate() === dueDay) {
              computedStatus = "JATUH TEMPO"; 
          } else if (today.getDate() > dueDay) {
              if (delinquencyMonths <= 0) { 
                  computedStatus = "TERTUNGGAK RINGAN"; 
              }
          }
      }
      // END LOGIKA STATUS BARU

      const statusClass = getStatusColor(computedStatus); 
      const lastPayment = Array.isArray(c.history) && c.history.length > 0 ? c.history[c.history.length - 1] : null;
      const lastPaymentAmount = lastPayment ? Number(lastPayment.nominal || 0) : 0;
      const lastPaymentDate = lastPayment ? fmtDate(lastPayment.tanggalBayar) : "-";

      return {
        ...c,
        totalPaid,
        outstanding: newOutstanding,
        computedStatus, 
        statusClass,
        lastPaymentAmount,
        lastPaymentDate,
        activePlan
      };
    });
  }, [list]);

  // ==========================================
  // 3. DYNAMIC FILTER OPTIONS
  // ==========================================
  const areaOptions = useMemo(() => {
    const all = Array.from(new Set(list.map((c) => (c.area || "").toString()).filter(Boolean)));
    return all.sort((a, b) => a.localeCompare(b));
  }, [list]);

  const marketingOptions = useMemo(() => {
    const all = Array.from(new Set(list.map((c) => (c.marketing || "").toString()).filter(Boolean)));
    return all.sort((a, b) => a.localeCompare(b));
  }, [list]);

  const polaOptions = useMemo(() => {
    const all = Array.from(new Set(list.map((c) => (c.polaBayar || "").toString()).filter(Boolean)));
    return all.sort((a, b) => a.localeCompare(b));
  }, [list]);

  const statusOptions = useMemo(() => {
    const all = Array.from(new Set(enriched.map((c) => (c.computedStatus || "").toString()).filter(Boolean)));
    return all.sort((a, b) => a.localeCompare(b));
  }, [enriched]);
  // END DYNAMIC FILTER OPTIONS

  // Filter Logic
  const filtered = useMemo(() => {
    let d = [...enriched];
    const key = q.trim().toLowerCase();

    if (key) {
      d = d.filter((c) =>
        (c.name || "").toLowerCase().includes(key) ||
        (c.area || "").toLowerCase().includes(key) ||
        (c.blok || "").toLowerCase().includes(key) ||
        (String(c.code || "") || "").toLowerCase().includes(key) ||
        (c.phone || "").toLowerCase().includes(key) ||
        (String(c.polaBayar || "").toLowerCase().includes(key))
      );
    }

    if (areaFilter) d = d.filter((c) => c.area === areaFilter);
    if (marketingFilter) d = d.filter((c) => c.marketing === marketingFilter);
    if (statusFilter) d = d.filter((c) => (c.computedStatus || c.status) === statusFilter);
    if (polaBayarFilter) d = d.filter((c) => (c.polaBayar || "") === polaBayarFilter);

    if (sortBy) { /* ... sort logic ... */ }
    return d;
  }, [enriched, q, areaFilter, marketingFilter, statusFilter, polaBayarFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  const totals = useMemo(() => {
    const t = filtered.reduce((acc, c) => {
      acc.totalHarga += Number(c.price || 0);
      acc.totalOutstanding += Number(c.outstanding || 0);
      acc.totalAngsuran += Number(c.activePlan.installment || 0);
      acc.totalUangMasuk += Number(c.totalPaid || 0);
      if (Number(c.price || 0) > 0) acc.totalUnitTerjual += 1;
      return acc;
    }, { totalHarga: 0, totalOutstanding: 0, totalAngsuran: 0, totalUangMasuk: 0, totalUnitTerjual: 0 });

    return {
      ...t,
      totalHargaFmt: fmt(t.totalHarga),
      totalOutstandingFmt: fmt(t.totalOutstanding),
      totalAngsuranFmt: fmt(t.totalAngsuran),
      totalUangMasukFmt: fmt(t.totalUangMasuk),
      totalUnitTerjual: t.totalUnitTerjual
    };
  }, [filtered]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus konsumen ini?")) return;
    try {
      await deleteConsumer(id);
      await loadData();
    } catch (err) {
      console.error("delete error:", err);
      alert("Gagal hapus.");
    }
  };

  const clearFilters = () => {
    setQ(""); setAreaFilter(""); setMarketingFilter(""); setStatusFilter(""); setPolaBayarFilter(""); setPage(1);
  };

  // EXPORT FUNCTIONS (Menggunakan data detail untuk kelengkapan)
  const exportCSV = () => { /* ... export logic ... */ };
  const exportXLSX = () => { /* ... export logic ... */ };
  const exportPDF = () => { /* ... export logic ... */ };

  // SCROLL SYNC
  useLayoutEffect(() => { if (tableWrapperRef.current) setScrollWidth(tableWrapperRef.current.scrollWidth); }, [paginated]);
  const handleTopScroll = (e) => { if (tableWrapperRef.current) tableWrapperRef.current.scrollLeft = e.target.scrollLeft; };
  const handleTableScroll = (e) => { if (topScrollRef.current) topScrollRef.current.scrollLeft = e.target.scrollLeft; };

  return (
    <ModuleLayout>
      {/* 1. CONTAINER TINGGI PENUH */}
      <div className="p-4 space-y-6 min-h-screen">

        {/* FILTERS (DYNAMIC) */}
        <div className="bb-card p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input placeholder="Cari..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="bb-input w-36 text-sm" />
              
              {/* FILTER AREA */}
              <select value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }} className="bb-input w-24 text-sm">
                <option value="">Area</option>
                {areaOptions.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>

              {/* FILTER MARKETING */}
              <select value={marketingFilter} onChange={(e) => { setMarketingFilter(e.target.value); setPage(1); }} className="bb-input w-24 text-sm">
                <option value="">Marketing</option>
                {marketingOptions.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>

              {/* FILTER POLA BAYAR */}
              <select value={polaBayarFilter} onChange={(e) => { setPolaBayarFilter(e.target.value); setPage(1); }} className="bb-input w-28 text-sm">
                <option value="">Pola Bayar</option>
                {polaOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>

              {/* FILTER STATUS */}
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bb-input w-24 text-sm">
                <option value="">Status</option>
                {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>

              <button onClick={clearFilters} className="bb-btn bb-btn-small bb-btn-secondary">Reset</button>
            </div>

            <div className="flex flex-wrap gap-3 justify-end items-center">
              <button onClick={exportCSV} className="bb-btn bb-btn-small bb-btn-primary">CSV</button>
              <button onClick={exportXLSX} className="bb-btn bb-btn-small bb-btn-primary">XLSX</button>
              <button onClick={() => navigate("/collection/master", { replace: true })} className="bb-btn bb-btn-small bb-btn-secondary">🔄</button>
              <Link to="/collection/add" className="bb-btn bb-btn-small bb-btn-primary border-black shadow flex items-center gap-2">
                <span className="text-sm">➕</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* TOTALS */}
        <div className="w-full flex justify-center items-center mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-6xl">
            <div className="bb-card text-center p-4">
              <div className="text-xs text-gray-600 uppercase tracking-widest">Total Harga Jual</div>
              <div className="font-bold text-lg md:text-xl">{totals.totalHargaFmt}</div>
            </div>
            <div className="bb-card text-center p-4">
              <div className="text-xs text-gray-600 uppercase tracking-widest">Total Uang Masuk</div>
              <div className="font-bold text-lg md:text-xl text-blue-700">{totals.totalUangMasukFmt}</div>
            </div>
            <div className="bb-card text-center p-4">
              <div className="text-xs text-gray-600 uppercase tracking-widest">Total Outstanding</div>
              <div className="font-bold text-lg md:text-xl text-red-600">{totals.totalOutstandingFmt}</div>
            </div>
            <div className="bb-card text-center p-4">
              <div className="text-xs text-gray-600 uppercase tracking-widest">Total Angsuran</div>
              <div className="font-bold text-lg md:text-xl text-green-600">{totals.totalAngsuranFmt}</div>
            </div>
          </div>
        </div>

        {/* TABLE (DYNAMIC STREAMLINED VIEW) */}
        <div className="bb-card border-2 border-black rounded-lg shadow-lg relative bg-white">
          <div ref={topScrollRef} className="overflow-x-auto border-b border-gray-300 bg-gray-50" onScroll={handleTopScroll} style={{ height: '20px' }}>
            <div style={{ width: scrollWidth, height: '1px' }}></div>
          </div>
          {/* 2. MAKSIMUM TINGGI DITINGKATKAN */}
          <div ref={tableWrapperRef} className="overflow-x-auto overflow-y-auto max-h-[90vh]" onScroll={handleTableScroll}> 
            <table className="w-full text-sm border-collapse min-w-max">
              <thead className="sticky top-0 z-10 bg-[#FFCD00] border-b-2 border-black text-black font-bold uppercase tracking-wider text-xs shadow-sm">
                <tr>
                  <th className="p-3 border-r border-black min-w-[50px] text-center">No</th>
                  <th onClick={() => handleSort("area")} className="p-3 border-r border-black min-w-[80px] cursor-pointer text-center">Area</th>
                  <th className="p-3 border-r border-black min-w-[80px] text-center">Blok</th>
                  <th onClick={() => handleSort("name")} className="p-3 border-r border-black min-w-[200px] cursor-pointer name-col text-center">Nama</th>
                  <th onClick={() => handleSort("polaBayar")} className="p-3 border-r border-black min-w-[120px] cursor-pointer text-center">Pola</th>
                  
                  <th onClick={() => handleSort("price")} className="p-3 border-r border-black min-w-[150px] cursor-pointer text-center">Harga Jual</th>
                  <th onClick={() => handleSort("totalPaid")} className="p-3 border-r border-black min-w-[150px] cursor-pointer text-center bg-green-50">Total Masuk</th>
                  <th onClick={() => handleSort("outstanding")} className="p-3 border-r border-black min-w-[150px] cursor-pointer text-center text-red-600">Outstanding</th>
                  
                  {/* --- DYNAMIC ACTIVE PLAN COLUMNS --- */}
                  <th className="p-3 border-r border-black min-w-[140px] text-center bg-blue-100">Plan Aktif</th> 
                  <th className="p-3 border-r border-black min-w-[120px] text-center bg-blue-100">Angsuran</th>
                  <th className="p-3 border-r border-black min-w-[80px] text-center bg-blue-100">Tenor</th>
                  <th className="p-3 border-r border-black min-w-[160px] text-center bg-blue-100">Mulai / Selesai</th>
                  
                  <th className="p-3 border-r border-black min-w-[150px] text-center">Bayar Terakhir</th>
                  <th className="p-3 border-r border-black min-w-[120px] text-center">Tgl Terakhir</th>
                  <th onClick={() => handleSort("marketing")} className="p-3 border-r border-black min-w-[100px] cursor-pointer text-center">Marketing</th>
                  <th onClick={() => handleSort("computedStatus")} className="p-3 border-r border-black min-w-[120px] cursor-pointer text-center">Status</th>
                  <th className="p-3 border-r border-black min-w-[120px] text-center">HP</th>
                  <th className="p-3 min-w-[140px] text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="bb-tbody">
                {paginated.length === 0 && (
                  <tr><td colSpan="18" className="text-center py-6">Tidak ada data</td></tr>
                )}

                {paginated.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-yellow-50 transition-colors">
                    <td className="p-3 border-r border-gray-300 text-center">{(page - 1) * perPage + i + 1}</td>
                    <td className="p-3 border-r border-gray-300 text-center">{c.area}</td>
                    <td className="p-3 border-r border-gray-300 text-center">{c.blok}</td>
                    <td className="p-3 border-r border-gray-300 font-bold min-w-[150px]">{c.name}</td>
                    <td className="p-3 border-r border-gray-300 text-center">{c.polaBayar || "-"}</td>

                    <td className="p-3 border-r border-gray-300 text-center">{fmt(c.price)}</td>
                    <td className="p-3 border-r border-gray-300 text-center font-bold bg-green-50 text-green-800">{fmt(c.totalPaid)}</td>
                    <td className="p-3 border-r border-gray-300 text-center font-bold text-red-600">{fmt(c.outstanding)}</td>

                    {/* DYNAMIC ACTIVE PLAN DISPLAY */}
                    <td className="p-3 border-r border-gray-300 text-center bg-blue-50 font-bold text-xs">{c.activePlan.label}</td>
                    <td className="p-3 border-r border-gray-300 text-center bg-blue-50">{fmt(c.activePlan.installment)}</td>
                    <td className="p-3 border-r border-gray-300 text-center bg-blue-50">{c.activePlan.tenor} Bln</td>
                    <td className="p-3 border-r border-gray-300 text-center bg-blue-50 text-xs">
                       <div>{fmtDate(c.activePlan.mulai)}</div>
                       <div className="font-bold">s/d</div>
                       <div>{fmtDate(c.activePlan.selesai)}</div>
                    </td>

                    <td className="p-3 border-r border-gray-300 text-center">{c.lastPaymentAmount ? fmt(c.lastPaymentAmount) : "-"}</td>
                    <td className="p-3 border-r border-gray-300 text-center">{c.lastPaymentDate || "-"}</td>
                    <td className="p-3 border-r border-gray-300 text-center">{c.marketing || "-"}</td>

                    <td className="p-3 border-r border-gray-300 text-center">
                      <span className={`bb-badge ${c.statusClass || "bb-badge-yellow"}`}>{c.computedStatus}</span>
                    </td>

                    <td className="p-3 border-r border-gray-300 text-center text-xs">{c.phone || "-"}</td>

                    <td className="p-3 text-center">
                      <div className="flex gap-1 items-center justify-center">
                        <Link to={`/collection/detail/${c.id}`} className="p-1 bg-white border border-black rounded shadow hover:-translate-y-0.5 transition">🔍</Link>
                        <Link to={`/collection/edit/${c.id}`} className="p-1 bg-yellow-300 border border-black rounded shadow hover:-translate-y-0.5 transition">✏️</Link>
                        <a
                          href={`https://wa.me/${(c.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(makeWAMessage({...c, computedStatus: c.computedStatus}))}`}
                          target="_blank" rel="noreferrer"
                          className="p-1 bg-green-400 text-white border border-black rounded shadow hover:-translate-y-0.5 transition"
                        >
                          📱
                        </a>
                        <button onClick={() => handleDelete(c.id)} className="p-1 bg-red-400 border border-black rounded shadow hover:-translate-y-0.5 transition">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm">Hal {page} dari {totalPages} — {filtered.length} Data</div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="bb-btn bb-btn-small">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="bb-btn bb-btn-small">Next</button>
          </div>
        </div>

      </div>
    </ModuleLayout>
  );
}