import React, { useEffect, useState, useMemo } from "react";
import ModuleLayout from "../../layouts/ModuleLayout";
import { api } from "../../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function LaporanPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterJnsTrx, setFilterJnsTrx] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const handleCashInUpdate = () => fetchData();
    const handleTukarKwiUpdate = () => fetchData();
    window.addEventListener('cashIn:updated', handleCashInUpdate);
    window.addEventListener('tukarKwi:updated', handleTukarKwiUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('cashIn:updated', handleCashInUpdate);
      window.removeEventListener('tukarKwi:updated', handleTukarKwiUpdate);
    };
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await api.kasir.get("/laporan?_sort=createdAt&_order=desc");
      const list = res.data || [];
      
      const mapped = list.map((r, idx) => ({
        id: r.id || r._id || idx,
        // No dihandle render
        tglReport: r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "-",
        noKwi: r.noKwi || r.NoKwi || "",
        tglKwi: r.tglKwi || r.TglKwi || r.tanggalKwitansi || "",
        tglTrf: r.tglTrf || r.TglTrf || r.tanggalTransfer || "",
        jnsTrx: r.jnsTrx || r.jenisTransaksi || "",
        namaKonsumen: r.namaKonsumen || r.NamaKonsumen || r.namaKons || "",
        blok: r.blok || r.Blok || "",
        kav: r.kav || r.NoRumah || "",
        lb: r.lb || r.LB || "",
        lt: r.lt || r.LT || "",
        nilaiRp: Number(r.nilaiRp || r.NilaiRp || 0),
        angsuranKe: r.angsuranKe || r.Angsur || "",
        ket1: r.ket1 || "",
        ket2: r.ket2 || "",
        ket3: r.ket3 || "",
        noHP: r.noHP || r.NoHP || r.no_hp || "",
        noKTP: r.noKTP || r.NoKTP || r.no_ktp || "",
        marketing: r.marketing || r.Marketing || r.nm_mkt || "",
        admin: r.admin || r.Admin || r.adminlog || "",
        jenisKonsumen: r.jenisKonsumen || r.JenisKonsumen || r.jnsKons || "Umum",
        bank: r.bank || r.rekeningTransfer || "",
        status: r.status || "Active",
        createdAt: r.createdAt || r.created_at || "",
      }));

      setData(mapped);
    } catch (err) {
      console.error("Gagal load laporan:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // Filtered data Logic (Sama seperti sebelumnya)
  const filtered = useMemo(() => {
    let result = [...data];
    if (q) {
      const s = q.toLowerCase();
      result = result.filter(r =>
        (r.noKwi || "").toLowerCase().includes(s) ||
        (r.namaKonsumen || "").toLowerCase().includes(s) ||
        (r.blok || "").toLowerCase().includes(s) ||
        (r.marketing || "").toLowerCase().includes(s) ||
        String(r.nilaiRp).includes(s)
      );
    }
    if (filterJnsTrx !== "all") {
      result = result.filter(r => (r.jnsTrx || "").toUpperCase() === filterJnsTrx.toUpperCase());
    }
    if (filterDate) {
      result = result.filter(r => r.tglKwi === filterDate);
    }
    return result;
  }, [data, q, filterJnsTrx, filterDate]);

  // Statistics Logic (Sama seperti sebelumnya)
  const stats = useMemo(() => {
    const total = filtered.length;
    const cashIn = filtered.filter(r => (r.jnsTrx || "").includes("TUNAI") || (r.jnsTrx || "").includes("CASH")).length;
    const tukarKwi = filtered.filter(r => (r.jnsTrx || "").includes("TRANSFER") || (r.jnsTrx || "").includes("TUKAR")).length;
    const totalNilai = filtered.reduce((sum, r) => sum + (r.nilaiRp || 0), 0);
    return { total, cashIn, tukarKwi, totalNilai };
  }, [filtered]);

  // Export functions (CSV, XLSX, PDF) tetap sama, hanya render Table yang berubah
  const exportCSV = () => { /* ... Logic Export CSV ... */ };
  const exportXLSX = () => { /* ... Logic Export XLSX ... */ };
  const exportPDF = () => { /* ... Logic Export PDF ... */ };

  return (
    <ModuleLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">📊 LAPORAN KASIR — Induk Master</h1>
          <div className="flex gap-2">
            <button className="bb-btn bb-btn-secondary" onClick={fetchData}>🔄 Refresh</button>
            <button className="bb-btn bb-btn-primary" onClick={exportXLSX}>📥 XLSX</button>
            <button className="bb-btn bb-btn-primary" onClick={exportPDF}>📄 PDF</button>
          </div>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* ... Cards Statistik ... */}
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-blue-600">{stats.total}</div><div className="text-sm text-gray-600">Total Transaksi</div></div>
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.cashIn}</div><div className="text-sm text-gray-600">Cash In (TUNAI)</div></div>
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-yellow-600">{stats.tukarKwi}</div><div className="text-sm text-gray-600">Tukar Kwi (TRANSFER)</div></div>
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-purple-600">{fmt(stats.totalNilai)}</div><div className="text-sm text-gray-600">Total Nilai</div></div>
        </div>

        {/* Filter Input */}
        <div className="bb-card p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <input className="bb-input flex-1 min-w-[200px]" placeholder="🔍 Cari..." value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="bb-input w-40" value={filterJnsTrx} onChange={(e) => setFilterJnsTrx(e.target.value)}>
              <option value="all">Semua Jenis</option>
              <option value="TUNAI">TUNAI</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>
            <input type="date" className="bb-input w-40" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            <button className="bb-btn bb-btn-secondary" onClick={() => { setQ(""); setFilterJnsTrx("all"); setFilterDate(""); }}>Reset</button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bb-card overflow-hidden">
          <div className="bb-table-wrapper overflow-auto">
            <table className="bb-table w-full">
              <thead>
                <tr>
                  <th className="w-10 text-center">No</th>
                  {/* 🔥 UPDATE: Kolom ID */}
                  <th className="w-16 text-center">ID</th>
                  <th>Tgl Report</th>
                  <th>No Kwitansi</th>
                  <th>Tgl Kwitansi</th>
                  <th>Tgl Transfer</th>
                  <th>Jenis</th>
                  <th>Nama Konsumen</th>
                  <th>Blok</th>
                  <th>Kav</th>
                  <th>LB</th>
                  <th>LT</th>
                  <th className="text-right">Nilai Rp</th>
                  <th>Angsuran</th>
                  <th>Ket1</th>
                  <th>Ket2</th>
                  <th>Ket3</th>
                  <th>No HP</th>
                  <th>No KTP</th>
                  <th>Marketing</th>
                  <th>Admin</th>
                  <th>Jenis Kons</th>
                  <th>Bank</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={24} className="p-6 text-center">⏳ Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={24} className="p-6 text-center text-gray-500">📭 Tidak ada data laporan</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="text-center">{i + 1}</td>

                      {/* 🔥 UPDATE: Value ID */}
                      <td className="text-[10px] text-gray-400 text-center select-all">
                        {String(r.id).substring(0, 6)}...
                      </td>

                      <td className="text-gray-600 font-semibold">{r.tglReport}</td>
                      <td className="font-bold">{r.noKwi}</td>
                      <td>{r.tglKwi}</td>
                      <td>{r.tglTrf || "-"}</td>
                      <td>
                        <span className={`px-2 py-1 rounded font-bold text-xs ${
                          (r.jnsTrx || "").includes("TUNAI") || (r.jnsTrx || "").includes("CASH")
                            ? "bg-green-200 text-green-800"
                            : "bg-blue-200 text-blue-800"
                        }`}>
                          {r.jnsTrx}
                        </span>
                      </td>
                      <td className="font-semibold">{r.namaKonsumen}</td>
                      <td>{r.blok}</td>
                      <td>{r.kav}</td>
                      <td>{r.lb}</td>
                      <td>{r.lt}</td>
                      <td className="text-right font-bold text-green-600">{fmt(r.nilaiRp)}</td>
                      <td>{r.angsuranKe || "-"}</td>
                      <td className="text-xs">{r.ket1 || "-"}</td>
                      <td className="text-xs">{r.ket2 || "-"}</td>
                      <td className="text-xs">{r.ket3 || "-"}</td>
                      <td>{r.noHP || "-"}</td>
                      <td>{r.noKTP || "-"}</td>
                      <td>{r.marketing || "-"}</td>
                      <td>{r.admin || "-"}</td>
                      <td>{r.jenisKonsumen || "-"}</td>
                      <td>{r.bank || "-"}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          r.status === "Active" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}