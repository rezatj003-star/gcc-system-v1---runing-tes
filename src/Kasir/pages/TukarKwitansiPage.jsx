import React, { useEffect, useState } from "react";
import ModuleLayout from "../../layouts/ModuleLayout";
import { api } from "../../api";
import TukarKwiPopup from "../components/popup/TukarKwiPopup";
// 🔥 IMPORT LOGIC CANCEL UNIVERSAL
import { deleteCashInToCancel } from "../logic/kasirSaveLogic"; 

export default function TukarKwitansiPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const handleUpdate = () => fetchData();
    window.addEventListener('tukarKwi:updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tukarKwi:updated', handleUpdate);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api.kasir.get("/tukarKwi");
      const list = res.data || [];
      const sortedList = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const mapped = sortedList.map((r, idx) => ({
        id: r.id || r._id || idx,
        _raw: r,
        TglReport: r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "-",
        TanggalKwitansi: r.tglKwi || r.TanggalKwitansi || "",
        NoKwi: r.noKwi || r.NoKwi || "",
        TanggalTransfer: r.tglTrf || r.TanggalTransfer || "",
        Bank: r.bank || r.transferKe || r.rekeningTransfer || "",
        JenisKonsumen: r.jnsKons || r.JenisKonsumen || "Umum",
        NamaKonsumen: r.namaKons || r.NamaKonsumen || "",
        Blok: r.blok || r.Blok || "",
        NoRumah: r.kav || r.NoRumah || "",
        LB: r.lb || r.LB || "",
        LT: r.lt || r.LT || "",
        NilaiRp: Number(r.nilaiRp || r.NilaiRp || 0),
        Angsuran: r.Angsur || r.Angsuran || "",
        Keterangan: r.ket2 || `${r.ket1 || ""} ${r.ket2 || ""} ${r.ket3 || ""}`.trim(),
        NoHP: r.no_hp || r.NoHP || "",
        NoKTP: r.no_ktp || r.NoKTP || "",
        Marketing: r.nm_mkt || r.Marketing || "",
        Admin: r.adminlog || r.Admin || "",
        jnsTrx: r.jnsTrx || "TRANSFER",
      }));

      setRows(mapped);
    } catch (err) {
      console.error("Fetch tukarKwi error:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const openNew = () => { setEditRow(null); setShowPopup(true); };
  const openEdit = (row) => { setEditRow(row._raw || row); setShowPopup(true); };

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (r.NoKwi || "").toLowerCase().includes(s) ||
      (r.NamaKonsumen || "").toLowerCase().includes(s) ||
      (r.Blok || "").toLowerCase().includes(s) ||
      (r.Bank || "").toLowerCase().includes(s) ||
      String(r.NilaiRp).includes(s)
    );
  });

  const onPopupClose = async (refresh = false) => {
    setShowPopup(false);
    setEditRow(null);
    if (refresh) await fetchData();
  };

  const handleCancel = async (row) => {
    const raw = row._raw || row;
    if (!window.confirm(`Batalkan Tukar Kwitansi No: ${raw.noKwi || raw.NoKwi}? Data akan dihapus dari Laporan Aktif!`)) return;
    setLoading(true);
    try {
      // 🔥 PANGGIL FUNGSI UNIVERSAL DARI LOGIC
      await deleteCashInToCancel(raw.NoKwi, "Cancel Transfer via Table");
      await fetchData();
      alert("Tukar Kwitansi berhasil dicancel dan laporan aktif sudah dibersihkan!");
    } catch (err) {
      console.error("Cancel error:", err);
      alert("Gagal cancel Tukar Kwitansi.");
    } finally {
      setLoading(false);
    }
  };

  const formatRp = (v) => (typeof v === "number" ? v.toLocaleString("id-ID") : v);

  return (
    <ModuleLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">🔄 TUKAR KWITANSI — Rekap Transaksi TRANSFER</h1>
          <div className="flex gap-2">
            <input className="bb-input w-64" placeholder="🔍 Cari..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="bb-btn bb-btn-primary" onClick={openNew}>➕ Input Tukar Kwitansi</button>
            <button className="bb-btn bb-btn-secondary" onClick={fetchData}>🔄 Refresh</button>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-blue-600">{filtered.length}</div><div className="text-sm text-gray-600">Total Transaksi</div></div>
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-green-600">Rp {formatRp(filtered.reduce((sum, r) => sum + (r.NilaiRp || 0), 0))}</div><div className="text-sm text-gray-600">Total Nilai</div></div>
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-yellow-600">{new Set(filtered.map((r) => r.Bank).filter(Boolean)).size}</div><div className="text-sm text-gray-600">Bank Aktif</div></div>
             <div className="bb-card p-4 text-center"><div className="text-2xl font-bold text-purple-600">{new Set(filtered.map((r) => r.Marketing)).size}</div><div className="text-sm text-gray-600">Marketing Aktif</div></div>
        </div>

        {/* TABLE */}
        <div className="bb-card overflow-hidden">
          <div className="bb-table-wrapper overflow-auto">
            <table className="bb-table w-full">
              <thead>
                <tr>
                  <th className="w-10 text-center">No</th>
                  <th className="w-16 text-center">ID</th>
                  <th>Tgl Report</th>
                  <th>No Kwitansi</th>
                  <th>Tgl Kwitansi</th>
                  <th>Tgl Transfer</th>
                  <th>Bank</th>
                  <th>Jenis</th>
                  <th>Nama Konsumen</th>
                  <th>Blok</th>
                  <th>Kav</th>
                  <th>LB</th>
                  <th>LT</th>
                  <th className="text-right">Nilai Rp</th>
                  <th>Angsuran</th>
                  <th>Keterangan</th>
                  <th>No HP</th>
                  <th>No KTP</th>
                  <th>Marketing</th>
                  <th>Admin</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={21} className="p-6 text-center">⏳ Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={21} className="p-6 text-center text-gray-500">📭 Tidak ada data</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="text-center">{i + 1}</td>
                      <td className="text-[10px] text-gray-400 text-center select-all">{String(r.id).substring(0, 6)}...</td>
                      <td className="text-gray-600 font-semibold">{r.TglReport}</td>
                      <td className="font-bold">{r.NoKwi}</td>
                      <td>{r.TanggalKwitansi}</td>
                      <td>{r.TanggalTransfer}</td>
                      <td className="font-semibold text-blue-600">{r.Bank}</td>
                      <td>{r.JenisKonsumen}</td>
                      <td className="font-semibold">{r.NamaKonsumen}</td>
                      <td>{r.Blok}</td>
                      <td>{r.NoRumah}</td>
                      <td>{r.LB}</td>
                      <td>{r.LT}</td>
                      <td className="text-right font-bold text-green-600">Rp {formatRp(r.NilaiRp)}</td>
                      <td>{r.Angsuran}</td>
                      <td className="text-xs">{r.Keterangan}</td>
                      <td>{r.NoHP}</td>
                      <td>{r.NoKTP}</td>
                      <td>{r.Marketing}</td>
                      <td>{r.Admin}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="bb-btn bb-btn-small" onClick={() => openEdit(r)}>✏️</button>
                          <button className="bb-btn bb-btn-small bb-btn-danger" onClick={() => handleCancel(r)}>❌</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showPopup && <TukarKwiPopup isOpen={showPopup} onClose={onPopupClose} editData={editRow} />}
      </div>
    </ModuleLayout>
  );
}