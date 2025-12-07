import React, { useEffect, useState } from "react";
import { api } from "../../api";
import CashInPopup from "../components/popup/CashInPopup";
import { deleteCashInToCancel } from "../logic/kasirSaveLogic"; 

export default function CashInPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState({ totalTrx: 0, totalNilai: 0, activeMkt: 0, activeAdm: 0 });

  // === FETCH DATA ===
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.kasir.get("/cashIn");
      const list = res.data || [];

      // Sort data terbaru diatas
      const sortedList = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const mapped = sortedList.map((r, idx) => ({
        // 🔥 UPDATE 1: Pastikan ID terambil string aslinya untuk ditampilkan
        id: r.id || r._id || "-", 
        
        // No Urut logic ada di render map (i+1)
        _raw: r,
        
        // 🔥 UPDATE 2: Mapping Tgl Report (Ambil dari CreatedAt / Waktu Input)
        TglReport: r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "-",

        TanggalKwitansi: r.tglKwi || r.TanggalKwitansi || "",
        NoKwi: r.noKwi || r.NoKwi || "",
        JenisKonsumen: r.jnsKons || r.JenisKonsumen || "Umum",
        NamaKonsumen: r.namaKons || r.NamaKonsumen || "",
        Blok: r.blok || r.Blok || "",
        Kav: r.kav || r.NoRumah || "",
        LB: r.lb || r.LB || "",
        LT: r.lt || r.LT || "",
        NilaiRp: Number(r.nilaiRp || r.NilaiRp || 0),
        Angsuran: r.Angsur || r.Angsuran || "-",
        Keterangan: `${r.ket1 || ""} ${r.ket2 || ""} ${r.ket3 || ""}`.trim(),
        NoHP: r.no_hp || r.NoHP || "",
        NoKTP: r.no_ktp || r.NoKTP || "",
        Marketing: r.nm_mkt || r.Marketing || "",
        Admin: r.adminlog || r.Admin || "",
      }));

      setRows(mapped);

      // Hitung Summary
      setSummary({
         totalTrx: mapped.length,
         totalNilai: mapped.reduce((acc, curr) => acc + curr.NilaiRp, 0),
         activeMkt: new Set(mapped.map(r => r.Marketing).filter(Boolean)).size,
         activeAdm: new Set(mapped.map(r => r.Admin).filter(Boolean)).size
      });

    } catch (err) {
      console.error("Error fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, []);

  // === HANDLERS ===
  const handleEdit = (row) => {
    setEditRow(row._raw);
    setShowPopup(true);
  };

  const handleCancel = async (row) => {
    if (!window.confirm(`Yakin cancel kwitansi ${row.NoKwi}?`)) return;
    try {
        await deleteCashInToCancel(row.NoKwi, "Manual Cancel via Table");
        alert("Data berhasil dicancel dan masuk Laporan Cancel!");
        fetchData();
    } catch (e) {
        console.error(e);
        alert("Gagal cancel data.");
    }
  };

  // Filter Search
  const filtered = rows.filter(r => 
    r.NoKwi.toLowerCase().includes(q.toLowerCase()) || 
    r.NamaKonsumen.toLowerCase().includes(q.toLowerCase()) ||
    r.Blok.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
        
        {/* HEADER TITLE */}
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                 <div className="bg-blue-600 p-3 rounded-lg text-white text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
                    💰
                 </div>
                 <div>
                    <h1 className="text-3xl font-black uppercase tracking-wider text-slate-900 italic">
                        CASH IN <span className="text-blue-600">— TUNAI</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-500">Rekapitulasi Transaksi Pembayaran Tunai</p>
                 </div>
            </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
             <CardSummary title="Total Transaksi" value={summary.totalTrx} color="text-blue-600" />
             <CardSummary title="Total Nilai Masuk" value={`Rp ${summary.totalNilai.toLocaleString('id-ID')}`} color="text-green-600" />
             <CardSummary title="Marketing Aktif" value={summary.activeMkt} color="text-orange-500" />
             <CardSummary title="Admin Aktif" value={summary.activeAdm} color="text-purple-600" />
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg border-2 border-slate-300 w-full md:w-1/3 focus-within:border-blue-500 transition-all">
                <span>🔍</span>
                <input 
                    className="bg-transparent outline-none text-sm font-bold w-full uppercase text-slate-700"
                    placeholder="CARI NO KWI / NAMA..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full md:w-auto">
                 <button 
                    onClick={() => { setEditRow(null); setShowPopup(true); }}
                    className="flex-1 md:flex-none bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black px-6 py-2 rounded-lg font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                 >
                    ➕ INPUT CASH IN
                 </button>
                 <button 
                    onClick={fetchData}
                    className="bg-cyan-300 hover:bg-cyan-400 text-black border-2 border-black px-4 py-2 rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                    title="Refresh Data"
                 >
                    🔄
                 </button>
            </div>
        </div>

        {/* === TABEL DATA (STYLE EXCEL) === */}
        <div className="overflow-hidden rounded-lg border border-slate-300 shadow-sm bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    {/* HEADER PUTIH, BORDER TIPIS, FONT TEBAL */}
                    <thead className="bg-white text-slate-700 uppercase font-bold border-b border-slate-300">
                        <tr>
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-10">No</th>
                            {/* 🔥 UPDATE: Kolom ID */}
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-16">ID</th>
                            {/* 🔥 UPDATE: Kolom Tgl Report */}
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-24">Tgl Report</th>
                            
                            <th className="px-3 py-2 border-r border-slate-300">No. Kwitansi</th>
                            <th className="px-3 py-2 border-r border-slate-300">Tgl Kwitansi</th>
                            <th className="px-3 py-2 border-r border-slate-300">Jenis</th>
                            <th className="px-3 py-2 border-r border-slate-300">Nama Konsumen</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-12">Blok</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-12">Kav</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-12">LB</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-12">LT</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-right">Nilai (Rp)</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-16">Angsur</th>
                            <th className="px-3 py-2 border-r border-slate-300">Keterangan</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center">Sales</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center">Admin</th>
                            <th className="px-3 py-2 text-center w-20">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr><td colSpan="17" className="px-3 py-4 text-center font-bold text-slate-500">⏳ Memuat data...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="17" className="px-3 py-4 text-center font-bold text-slate-400">📭 Tidak ada data ditemukan</td></tr>
                        ) : (
                            filtered.map((r, i) => (
                                <tr key={i} className="hover:bg-blue-50 transition-colors font-medium text-slate-700">
                                    {/* NO URUT (Otomatis Page) */}
                                    <td className="px-3 py-2 border-r border-slate-200 text-center bg-slate-50">{i + 1}</td>
                                    
                                    {/* ID (Database) - Font kecil biar muat */}
                                    <td className="px-3 py-2 border-r border-slate-200 text-center text-[10px] text-slate-500 select-all">
                                        {r.id.substring(0,6)}...
                                    </td>

                                    {/* TGL REPORT */}
                                    <td className="px-3 py-2 border-r border-slate-200 text-center font-semibold text-slate-600">
                                        {r.TglReport}
                                    </td>

                                    <td className="px-3 py-2 border-r border-slate-200 font-bold text-blue-700">{r.NoKwi}</td>
                                    <td className="px-3 py-2 border-r border-slate-200">{r.TanggalKwitansi}</td>
                                    <td className="px-3 py-2 border-r border-slate-200">{r.JenisKonsumen}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 uppercase font-bold">{r.NamaKonsumen}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-center">{r.Blok}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-center">{r.Kav}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-center">{r.LB}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-center">{r.LT}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-green-700">
                                        {r.NilaiRp.toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-center">{r.Angsuran}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 truncate max-w-[180px]" title={r.Keterangan}>{r.Keterangan}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-center">{r.Marketing}</td>
                                    <td className="px-3 py-2 border-r border-slate-200 text-center text-[10px] uppercase bg-slate-50">{r.Admin}</td>
                                    <td className="px-2 py-2 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => handleEdit(r)} className="w-6 h-6 flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-700 text-[10px]" title="Edit">✏️</button>
                                            <button onClick={() => handleCancel(r)} className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 border border-red-300 text-red-700 text-[10px]" title="Cancel">❌</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* POPUP MODAL */}
        {showPopup && (
            <CashInPopup
                isOpen={showPopup}
                onClose={(refresh) => {
                    setShowPopup(false);
                    if (refresh) fetchData();
                }}
                editData={editRow}
            />
        )}
    </div>
  );
}

function CardSummary({ title, value, color }) {
    return (
        <div className="bg-white p-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center hover:translate-y-[-2px] transition-transform">
            <span className={`text-2xl font-black ${color}`}>{value}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-wider">{title}</span>
        </div>
    );
}