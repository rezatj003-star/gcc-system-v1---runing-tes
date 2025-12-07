// ReportModule.jsx — FINAL LOGIC AND UI FIXES FOR PRINT/STATUS

import React, { useEffect, useMemo, useState } from "react";
import ModuleLayout from "../../layouts/ModuleLayout";
import { getConsumers } from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getRealStatus, calculateMonthsPaid } from "../utils/statusCalculator";

// ------------------------------- Helpers (Shared Logic) -------------------------------
const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function parseFlexibleDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
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

// ===============================================
// FUNGSI INJEKSI: PENENTU WARNA STATUS BARU
// ===============================================
export function getStatusColor(status) {
    const s = (status || '').toUpperCase();
    
    if (s === 'LUNAS') return 'bg-gray-700 text-white'; 
    if (s === 'LANCAR') return 'bg-green-500 text-white'; 
    if (s === 'HAMPIR LUNAS') return 'bg-lime-400 text-black'; 
    if (s === 'ANGSURAN BERJALAN') return 'bg-blue-300 text-black'; 

    if (s === 'JATUH TEMPO') return 'bg-yellow-500 text-black'; 
    if (s === 'TERTUNGGAK RINGAN') return 'bg-orange-400 text-black';
    if (s === 'TERTUNGGAK SEDANG') return 'bg-orange-700 text-white';

    if (s === 'TUNGGAKAN KRITIS') return 'bg-red-600 text-white'; 
    if (s === 'KREDIT MACET TOTAL') return 'bg-red-900 text-white'; 
    
    return 'bg-gray-300 text-black'; 
}


// Normalize raw record -> canonical keys (compatible dengan MasterCollection.jsx)
const normalize = (raw = {}) => {
  const r = { ...raw };
  r.id = raw.id || raw.code || raw.Code || raw.Kode || raw.kode || raw.No || "";
  r.name = raw.Nama || raw.name || raw.nama || "";
  r.phone = raw["No Wa"] || raw["No WA"] || raw.noWa || raw.phone || "";
  r.blok = raw.Blok || raw.blok || "";
  r.area = raw.Area || raw.area || "";
  r.price = Number(raw["Harga Jual"] || raw.price || 0);
  r.downPayment = Number(raw["Uang Masuk"] || raw["Uang masuk"] || raw.downPayment || 0);
  r.outstanding = Number(raw.Outstanding || raw.outstanding || 0);
  r.installment = Number(raw["Nilai Angsuran"] || 0);
  r.rawDue = Number(raw["Jatuh Tempo"] || 0);
  r.mulai = raw["Mulai Cicilan"] || raw.mulai || "";
  r.selesai = raw["Selesai Cicilan"] || raw.selesai || "";
  r.status = raw.Status || raw.status || "Belum Bayar";
  r.polaBayar = raw["Pola Pembayaran"] || raw["Pola Bayar"] || raw.pola || raw.polaBayar || "";

  // Mapping Plan I & II untuk Export
  r.sumberDana1 = Number(raw["Rencana Pembayaran 1"] || 0); 
  r.tenor1 = Number(raw["Lama Angsuran"] || 0);
  r.installment1 = Number(raw["Nilai Angsuran"] || 0);
  r.mulai1 = raw["Mulai Cicilan"] || "";
  r.selesai1 = raw["Selesai Cicilan"] || "";

  r.jenisMetode2 = raw["Metode Pembayaran 2"] || "-";
  r.sumberDana2 = Number(raw["Rencana Pembayaran 2"] || 0);
  r.tenor2 = Number(raw["Lama Angsuran 2"] || 0);
  r.installment2 = Number(raw["Nilai Angsuran 2"] || 0);
  r.mulai2 = raw["Mulai Cicilan 2"] || "";
  r.selesai2 = raw["Selesai Cicilan 2"] || "";

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
        via: h.via || h.Via || h["Metode Pembayaran"] || "",
        keterangan: h.keterangan || h.Catatan || h.note || ""
      };
    })
    : [];

  return r;
};

// Sum history totals
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

// ----------------- Component -----------------
export default function ReportModule() {
  // raw list from API
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [areaFilter, setAreaFilter] = useState("");
  const [blokFilter, setBlokFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // UI
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [selected, setSelected] = useState(null);

  // Load data
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await getConsumers();
      const rawList = Array.isArray(res) ? res : (res?.data || []);
      const normalized = rawList.map(normalize);
      setList(normalized);
    } catch (err) {
      console.error("loadData error:", err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  // Enrich list (FULL LOGIC INTEGRATION FROM MASTER COLLECTION)
  const enriched = useMemo(() => {
    return list.map((c) => {
      const totalHistory = sumHistoryAll(c);
      
      // LOGIKA ANTI DOUBLE COUNT
      const hasAutoDP = c.history.some(h => (h.keterangan || "").toUpperCase().includes("DP"));
      const totalPaid = hasAutoDP ? totalHistory : (Number(c.downPayment || 0) + totalHistory);

      const newOutstanding = Math.max(0, Number(c.price || 0) - totalPaid);
      const activeInstallment = c.tenor2 > 0 ? c.installment2 : c.installment1;
      const activeStartDate = c.tenor2 > 0 ? c.mulai2 : c.mulai1;
      const activeRawDue = c.rawDue; 

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

      const statusClass = getStatusColor(computedStatus); // Uses getStatusColor defined above

      return {
        ...c,
        totalPaid,
        outstanding: newOutstanding,
        computedStatus,
        statusClass,
        activeInstallment,
      };
    });
  }, [list]);

  // Filtered dataset
  const filtered = useMemo(() => {
    let d = enriched;
    if (areaFilter) d = d.filter((c) => (c.area || "") === areaFilter);
    if (blokFilter.trim() !== "") {
      const q = blokFilter.toLowerCase();
      d = d.filter((c) => (c.blok || "").toLowerCase().includes(q));
    }
    if (statusFilter) d = d.filter((c) => (c.computedStatus || c.status || "") === statusFilter);
    if (startDate) {
      const s = parseFlexibleDate(startDate);
      d = d.filter((c) => {
        if (!c.mulai) return false;
        const dd = parseFlexibleDate(c.mulai);
        if (!dd) return false;
        return dd >= s;
      });
    }
    if (endDate) {
      const e = parseFlexibleDate(endDate);
      d = d.filter((c) => {
        if (!c.mulai) return false;
        const dd = parseFlexibleDate(c.mulai);
        if (!dd) return false;
        return dd <= e;
      });
    }
    return d;
  }, [enriched, areaFilter, blokFilter, statusFilter, startDate, endDate]);

  // Pagination derived
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  // Summary KPIs
  const summary = useMemo(() => {
    const total = filtered.length;
    const outstanding = filtered.reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const jatuhTempo = filtered.filter((c) => (c.computedStatus || "") === "JATUH TEMPO").length;
    const menunggak = filtered.filter((c) => (c.computedStatus || "").includes("TUNGGAKAN") || (c.computedStatus || "").includes("MACET") || (c.computedStatus || "") === "TERTUNGGAK SEDANG").length;
    const lunas = filtered.filter((c) => (c.computedStatus || "") === "LUNAS").length;
    return { total, outstanding, jatuhTempo, menunggak, lunas };
  }, [filtered]);

  // Export PDF: full filtered list (FIXED IMPLEMENTATION)
  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(14);
    doc.text("LAPORAN COLLECTION DETAIL", 14, 14);
    doc.setFontSize(7);

    // HEADERS (Comprehensive)
    const head = [[
        "No", "Nama", "Blok", "H. Jual", "Total Masuk", "Outstanding", "Status", 
        "Angs I", "Tenor I", "Mulai I", "Angs II", "Tenor II", "Mulai II"
    ]];
    
    // BODY (Using enriched data)
    const body = filtered.map((c, i) => [
      i + 1,
      c.name || "-",
      c.blok || "-",
      fmtRp(c.price || 0),
      fmtRp(c.totalPaid || 0),
      fmtRp(c.outstanding || 0),
      c.computedStatus || c.status || "-",
      // Plan I
      fmtRp(c.installment1 || 0),
      (c.tenor1 || 0) + " Bln",
      c.mulai1 || "-",
      // Plan II
      fmtRp(c.installment2 || 0),
      (c.tenor2 || 0) + " Bln",
      c.mulai2 || "-"
    ]);

    autoTable(doc, {
      startY: 20,
      head,
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [255, 180, 0], textColor: [0, 0, 0] },
      margin: { left: 8, right: 8 }
    });

    const fileName = `Laporan-Collection-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const clearFilters = () => {
    setAreaFilter("");
    setBlokFilter("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // === Export current modal (selected) as PDF (auto-download) ===
  // THIS FUNCTION TRIGGERS THE PRINT DIALOG FOR THE MODAL CONTENT
  const printModal = () => {
    window.print(); 
  };


  // ----------------- Render -----------------
  return (
    <ModuleLayout module="collection" title="Laporan Collection">
      <div className="p-4 space-y-6">
        <style>{`@media print { body * { visibility: hidden !important; } .print-modal, .print-modal * { visibility: visible !important; } .print-modal { position: absolute !important; inset: 0 !important; width: 100% !important; margin: 0 !important; padding: 20px !important; box-shadow: none !important; border: none !important; background: white !important; } .modal-overlay { display: none !important; } .no-print { display: none !important; } }`}</style>
        
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="bb-btn bb-btn-secondary border-2 border-black">
              🔄 Refresh
            </button>
            <button onClick={exportPDF} className="bb-btn bb-btn-primary bg-yellow-300 border-2 border-black">
              📄 Export PDF Detail
            </button>
            <button onClick={clearFilters} className="bb-btn bb-btn-danger border-2 border-black">
              ♻ Reset Filter
            </button>
            <div className="text-sm text-gray-600"> {loading ? "Memuat..." : `${list.length} data (MasterCollection)`} </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bb-section border-4 border-black shadow-[6px_6px_0px_#000] p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* AREA */}
            <div>
              <label className="bb-label">Area</label>
              <div className="bb-input-wrap">
                <span>📍</span>
                <input
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  placeholder="Contoh A, B, AA"
                />
              </div>
            </div>

            {/* BLOK */}
            <div>
              <label className="bb-label">Blok (search)</label>
              <div className="bb-input-wrap">
                <span>🏘️</span>
                <input
                  value={blokFilter}
                  onChange={(e) => setBlokFilter(e.target.value)}
                  placeholder="Contoh A12"
                />
              </div>
            </div>

            {/* STATUS */}
            <div>
              <label className="bb-label">Status</label>
              <div className="bb-input-wrap">
                <span>📊</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Semua</option>
                  <option value="LUNAS">LUNAS</option>
                  <option value="LANCAR">LANCAR</option>
                  <option value="HAMPIR LUNAS">HAMPIR LUNAS</option>
                  <option value="ANGSURAN BERJALAN">ANGSURAN BERJALAN</option>
                  <option value="JATUH TEMPO">JATUH TEMPO</option>
                  <option value="TERTUNGGAK RINGAN">TERTUNGGAK RINGAN</option>
                  <option value="TERTUNGGAK SEDANG">TERTUNGGAK SEDANG</option>
                  <option value="TUNGGAKAN KRITIS">TUNGGAKAN KRITIS</option>
                  <option value="KREDIT MACET TOTAL">KREDIT MACET TOTAL</option>
                </select>
              </div>
            </div>

            {/* RANGE TANGGAL */}
            <div>
              <label className="bb-label">Mulai Cicilan (Dari - Sampai)</label>
              <div className="flex gap-2">
                <div className="bb-input-wrap flex-1">
                  <span>📅</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="bb-input-wrap flex-1">
                  <span>📅</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* =========================== */}
        {/* SUMMARY CARDS */}
        {/* =========================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div className="bb-card text-center bg-green-50 border-4 border-green-600 shadow-[4px_4px_0px_#000]">
            <div className="text-sm text-gray-600">Total Kontrak</div>
            <div className="text-2xl font-bold text-green-800">{summary.total}</div>
          </div>

          <div className="bb-card text-center bg-red-50 border-4 border-red-600 shadow-[4px_4px_0px_#000]">
            <div className="text-sm text-gray-600">Total Outstanding</div>
            <div className="text-2xl font-bold text-red-800">
              {fmtRp(summary.outstanding)}
            </div>
          </div>

          <div className="bb-card text-center bg-yellow-50 border-4 border-yellow-600 shadow-[4px_4px_0px_#000]">
            <div className="text-sm text-gray-600">Jatuh Tempo (HARI INI)</div>
            <div className="text-2xl font-bold text-amber-600">
              {summary.jatuhTempo}
            </div>
          </div>

          <div className="bb-card text-center bg-orange-50 border-4 border-orange-600 shadow-[4px_4px_0px_#000]">
            <div className="text-sm text-gray-600">Tunggakan Kritis/Total</div>
            <div className="text-2xl font-bold text-orange-800">
              {summary.menunggak}
            </div>
          </div>

        </div>

        {/* =========================== */}
        {/* TABLE */}
        {/* =========================== */}
        <div className="overflow-x-auto bg-white p-4 border-4 border-black shadow-[6px_6px_0px_#000]">
          <table className="min-w-full text-sm">

            <thead className="bg-yellow-300 border-b-4 border-black">
              <tr className="border-black border-b-2">
                <th className="py-2 border-r-2 border-black">No</th>
                <th className="py-2 border-r-2 border-black">Area</th>
                <th className="py-2 border-r-2 border-black">Blok</th>
                <th className="py-2 border-r-2 border-black">Nama</th>
                <th className="py-2 border-r-2 border-black">Harga Jual</th>
                <th className="py-2 border-r-2 border-black">Total Masuk</th>
                <th className="py-2 border-r-2 border-black">Outstanding</th>
                <th className="py-2 border-r-2 border-black">Mulai</th>
                <th className="py-2 border-r-2 border-black">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((c, i) => (
                <tr key={c.id || i} className="border-t-2 border-black hover:bg-gray-50 transition-colors">
                  <td className="py-2 border-r-2 border-black">{(page - 1) * perPage + i + 1}</td>
                  <td className="py-2 border-r-2 border-black">{c.area}</td>
                  <td className="py-2 border-r-2 border-black">{c.blok}</td>
                  <td className="py-2 border-r-2 border-black">{c.name}</td>
                  <td className="py-2 border-r-2 border-black">{fmtRp(c.price)}</td>
                  <td className="py-2 border-r-2 border-black font-bold text-green-700">
                    {fmtRp(c.totalPaid)}
                  </td>
                  <td className="py-2 border-r-2 border-black font-bold text-red-600">{fmtRp(c.outstanding)}</td>
                  <td className="py-2 border-r-2 border-black">{c.mulai}</td>

                  <td className="py-2 border-r-2 border-black">
                    <span
                      className={`px-3 py-1 border-2 border-black font-bold inline-block text-xs ${c.statusClass}`}
                    >
                      {c.computedStatus}
                    </span>
                  </td>

                  <td className="py-2">
                    <button
                      onClick={() => setSelected(c)}
                      className="bb-btn bb-btn-primary text-xs"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* =========================== */}
        {/* PAGINATION */}
        {/* =========================== */}
        <div className="flex items-center justify-between">
          <div className="text-sm">Halaman {page} / {totalPages}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="bb-btn bb-btn-secondary"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="bb-btn bb-btn-secondary"
            >
              Next
            </button>
          </div>
        </div>

        {/* =========================== */}
        {/* DETAIL MODAL (Placeholder) */}
        {/* =========================== */}
        {selected && (
          <div
            className="modal-overlay no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            {/* MODAL BOX */}
            <div
              className="print-modal bg-white w-full max-w-4xl border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-h-[90vh] overflow-auto"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  Detail Konsumen — {selected.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    className="bb-btn bb-btn-primary"
                    onClick={printModal} // FIXED: Call the printModal function
                  >
                    📄 Cetak Modal
                  </button>
                  <button
                    className="bb-btn bb-btn-danger"
                    onClick={() => setSelected(null)}
                  >
                    ✖ Tutup
                  </button>
                </div>
              </div>
              
              {/* STATUS PREVIEW */}
              <div className="mb-4 p-3 border-2 border-black rounded-lg">
                <span className="font-bold">Status:</span> 
                <span className={`ml-2 px-3 py-1 font-bold ${selected.statusClass}`}>{selected.computedStatus}</span>
              </div>
              
              {/* INFORMASI UTAMA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Simplified detail content for modal preview */}
                 <div className="p-3 bg-gray-50 border border-black">
                     <div className="text-xs text-gray-600">Kode</div>
                     <div className="font-bold">{selected.code}</div>
                 </div>
                 <div className="p-3 bg-gray-50 border border-black">
                     <div className="text-xs text-gray-600">Harga Jual</div>
                     <div className="font-bold">{fmtRp(selected.price)}</div>
                 </div>
                 <div className="p-3 bg-gray-50 border border-black">
                     <div className="text-xs text-gray-600">Outstanding</div>
                     <div className="font-bold text-red-600">{fmtRp(selected.outstanding)}</div>
                 </div>
              </div>
              
              <h4 className="font-bold text-lg mt-4">Riwayat Pembayaran (Ringkas)</h4>
              <div className="text-sm text-gray-700">Total Transaksi: {selected.history?.length || 0}</div>


              {/* FOOTER */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setSelected(null)}
                  className="bb-btn bb-btn-danger"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}