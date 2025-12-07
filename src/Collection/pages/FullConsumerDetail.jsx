import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ModuleLayout from "../../layouts/ModuleLayout";
import { getConsumerById, updateConsumer } from "../../api";
import { getRealStatus, getStatusColor } from "../utils/statusCalculator";
import { printVisualPDF } from "../../utils/printVisualPDF";

// Arithmetic helper
const add = (a, b) => Number(Number(a || 0) + Number(b || 0));
const sub = (a, b) => Number(Number(a || 0) - Number(b || 0));
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

const StatusBadge = ({ status }) => (
  <span className={`px-3 py-1 text-xs font-bold rounded uppercase ${getStatusColor(status)}`}>
    {status}
  </span>
);

export default function FullConsumerDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Transfer");
  const [payNote, setPayNote] = "";
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // ===========================================
  // LOAD DATA & MAPPING BARU
  // ===========================================
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await getConsumerById(id);
        if (!mounted) return;

        let d = res.data || {};
        let history = Array.isArray(d["Riwayat Pembayaran"])
          ? d["Riwayat Pembayaran"].map((h) => ({
            ...h,
            Jumlah: Number(h?.Jumlah || 0),
          }))
          : [];

        const totalHistory = history.reduce((s, r) => add(s, r.Jumlah), 0);
        const hj = Number(d["Harga Jual"] || 0);
        const outstanding = Math.max(sub(hj, totalHistory), 0);

        setData({
          ...d,
          // Mapping Plan I & II data
          Tenor_1: Number(d["Lama Angsuran"] || 0),
          Angsuran_1: Number(d["Nilai Angsuran"] || 0),
          SumberDana_1: Number(d["Rencana Pembayaran 1"] || 0),
          Mulai_1: d["Mulai Cicilan"] || '',
          Selesai_1: d["Selesai Cicilan"] || '',
          
          JenisMetode_2: d["Metode Pembayaran 2"] || "TIDAK ADA",
          Tenor_2: Number(d["Lama Angsuran 2"] || 0),
          Angsuran_2: Number(d["Nilai Angsuran 2"] || 0),
          SumberDana_2: Number(d["Rencana Pembayaran 2"] || 0),
          Mulai_2: d["Mulai Cicilan 2"] || '',
          Selesai_2: d["Selesai Cicilan 2"] || '',
          "Jatuh Tempo": d["Jatuh Tempo"] || '',
          "Jatuh Tempo 2": d["Jatuh Tempo 2"] || '',

          "Uang Masuk": totalHistory, // Uang Masuk = Total History
          "Riwayat Pembayaran": history,
          Outstanding: outstanding,
        });
      } catch (err) {
        console.error(err);
        alert("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, [id]);

  // ===========================================
  // AGGREGATE & STATUS CALCULATION
  // ===========================================
  const totalUangMasuk = useMemo(() => data ? data["Uang Masuk"] : 0, [data]);

  const filteredHistory = useMemo(() => {
    if (!data) return [];
    return data["Riwayat Pembayaran"].filter((h) => Number(h?.Jumlah || 0) > 0).sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
  }, [data]);

  const paidThisMonth = useMemo(() => {
    const mm = new Date().getMonth();
    const yy = new Date().getFullYear();
    return filteredHistory.reduce((s, r) => {
      const d = r?.Tanggal ? new Date(r.Tanggal) : null;
      if (!d) return s;
      if (d.getMonth() === mm && d.getFullYear() === yy) return add(s, r.Jumlah);
      return s;
    }, 0);
  }, [filteredHistory]);

  const monthsPaid = useMemo(() => {
    if (!data) return 0;
    const angsuran = Number(data.Angsuran_1 || 0);
    if (angsuran <= 0) return 0;
    return Math.floor(totalUangMasuk / angsuran);
  }, [totalUangMasuk, data]);

  // Real Status (Logic based on Active Plan)
  const realStatus = useMemo(() => {
    if (!data) return "Belum Bayar";
    
    const activeInstallment = data.Tenor_2 > 0 ? data.Angsuran_2 : data.Angsuran_1;
    const activeStartDate = data.Tenor_2 > 0 ? data.Mulai_2 : data.Mulai_1;
    const activeDueDate = data.Tenor_2 > 0 ? data["Jatuh Tempo 2"] : data["Jatuh Tempo"]; 

    return getRealStatus({
      startDate: activeStartDate,
      dueDate: Number(activeDueDate || 0),
      outstanding: Number(data.Outstanding || 0),
      installment: Number(activeInstallment || 0),
      history: filteredHistory,
    });
  }, [data, filteredHistory]);


  // ===========================================
  // SUBMIT PAYMENT
  // ===========================================
  const submitPayment = async () => {
    const nominal = Number(payAmount || 0);
    if (nominal <= 0) return alert("Nominal tidak valid!");
    if (!data) return alert("Data belum siap.");

    const hj = Number(data["Harga Jual"] || 0);

    const newHistoryItem = {
      Tanggal: payDate,
      Jumlah: nominal,
      Catatan: payNote || "Pembayaran",
      via: payMethod,
    };

    const updatedHistory = [...data["Riwayat Pembayaran"], newHistoryItem];
    const newTotal = updatedHistory.reduce((s, r) => add(s, r.Jumlah), 0);
    const newOutstanding = Math.max(sub(hj, newTotal), 0);

    const newStatus = getRealStatus({
      startDate: data.Mulai_1,
      dueDate: Number(data["Jatuh Tempo"] || 0),
      outstanding: newOutstanding,
      installment: Number(data.Angsuran_1 || 0),
      history: updatedHistory,
    });

    const updated = {
      ...data,
      "Riwayat Pembayaran": updatedHistory,
      Outstanding: newOutstanding,
      Status: newStatus,
      "Uang Masuk": 0,
    };

    try {
      setSaving(true);
      await updateConsumer(data.id, updated);

      setData(updated);
      setShowPay(false);
      setPayAmount("");
      setPayNote("");
      setPayMethod("Transfer");

      alert("Pembayaran berhasil!");
      nav("/collection/master?refresh=" + Date.now());
    } catch (err) {
      alert("Gagal menyimpan pembayaran.");
    } finally {
      setSaving(false);
    }
  };


  // ===========================================
  // UI RENDER
  // ===========================================
  if (loading) return <ModuleLayout><div className="p-8 text-center font-black text-xl">MEMUAT DATA...</div></ModuleLayout>;
  if (!data) return <ModuleLayout><div className="p-4 text-center text-red-600 font-bold">Data tidak ditemukan!</div></ModuleLayout>;

  const detailBox = "p-4 bg-white border-2 border-black shadow-[4px_4px_0px_#000]";
  const titleStyle = "text-xl font-black uppercase text-slate-700 mb-3 border-b-2 border-slate-300 pb-1";
  const lineStyle = "flex justify-between items-center py-1 border-b border-gray-100";
  const valueStyle = "font-extrabold text-right text-gray-800";
  const valueDanger = "font-extrabold text-right text-red-600";
  const statusClass = getStatusColor(realStatus);

  return (
    <ModuleLayout title="Detail Konsumen">
      <div className="min-h-screen bg-orange-50 p-4 md:p-8 font-sans pb-32">
        
        {/* --- HEADER JUDUL & ACTION BAR (DI LUAR PRINT AREA) --- */}
        <div className="max-w-5xl mx-auto mb-8 p-4 border-4 border-black shadow-[6px_6px_0px_0px_#000] bg-[#FFCD00]">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-center text-black">
                {data.Nama} ({data.Blok})
            </h1>
            <div className="flex justify-center gap-4 mt-3">
                <button onClick={() => nav("/collection/master?refresh=" + Date.now())} className="bb-btn bb-btn-secondary py-2 px-4 shadow-[3px_3px_0px_#000] border-2 border-black">
                    ← Kembali
                </button>
                <button onClick={() => nav(`/collection/edit/${data.id}`)} className="bb-btn bb-btn-secondary py-2 px-4 shadow-[3px_3px_0px_#000] border-2 border-black">
                    ✏️ Edit Data
                </button>
                <button onClick={() => printVisualPDF("print-area", `Detail-${data.Nama}`)} className="bb-btn bb-btn-primary py-2 px-4 shadow-[3px_3px_0px_#000] border-2 border-black">
                    🖨️ Cetak PDF
                </button>
            </div>
        </div>
        
        {/* === PRINT AREA START === */}
        <div id="print-area" className="max-w-5xl mx-auto space-y-8 font-sans">
        
            {/* === STATUS BANNER === */}
            <div className="flex justify-between items-center p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
                <h2 className="text-2xl font-black text-slate-800">
                    <StatusBadge status={realStatus} />
                    <span className="text-sm font-normal text-gray-600 ml-3">Terpenuhi: {monthsPaid} Bulan</span>
                </h2>
                <div className="text-right">
                    <p className="text-sm text-gray-600">Outstanding Saat Ini:</p>
                    <span className="text-2xl font-black text-red-700">Rp {fmt(data.Outstanding)}</span>
                </div>
            </div>

            {/* ============================== */}
            {/* INFO UTAMA & PLAN DETAIL (3 COL) */}
            {/* ============================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* COL 1: INFORMASI UMUM */}
            <div className={detailBox}>
                <h3 className={titleStyle}>INFORMASI DASAR</h3>
                <div className="space-y-2 text-sm">
                    <div className={lineStyle}><span className="text-gray-600">Kode:</span><b className={valueStyle}>{data.code}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Area/Blok:</span><b className={valueStyle}>{data.Area} / {data.Blok}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Pola Bayar:</span><b className={valueStyle}>{data["Pola Pembayaran"]}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Marketing:</span><b className={valueStyle}>{data.Marketing}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">No. WA:</span><b className={valueStyle}>{data["No Wa"] || "-"}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Status Manual:</span><b className={valueStyle}>{data.Status}</b></div>
                </div>
            </div>
            
            {/* COL 2: KEUANGAN MASTER */}
            <div className={detailBox}>
                <h3 className={titleStyle}>KEUANGAN MASTER</h3>
                <div className="space-y-2 text-sm">
                    <div className={lineStyle}><span className="text-gray-600">Harga Jual:</span><b className={valueStyle}>Rp {fmt(data["Harga Jual"])}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Uang Masuk (Total):</span><b className={valueStyle}>Rp {fmt(totalUangMasuk)}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Angsuran Plan I:</span><b className={valueStyle}>Rp {fmt(data.Angsuran_1)}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Tenor Plan I:</span><b className={valueStyle}>{data.Tenor_1} Bulan</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Jatuh Tempo (Tgl):</span><b className={valueStyle}>{data["Jatuh Tempo"] || "-"}</b></div>
                </div>
            </div>

            {/* COL 3: RENCANA PEMBAYARAN I (PLAN DETAIL) */}
            <div className={detailBox}>
                <h3 className={titleStyle}>RENCANA PEMBAYARAN I</h3>
                <div className="space-y-2 text-sm">
                    <div className={lineStyle}><span className="text-gray-600">Sumber Dana (Nominal):</span><b className={valueStyle}>Rp {fmt(data.SumberDana_1)}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Nilai Angsuran:</span><b className={valueStyle}>Rp {fmt(data.Angsuran_1)}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Tenor:</span><b className={valueStyle}>{data.Tenor_1} Bulan</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Mulai Cicilan:</span><b className={valueStyle}>{data.Mulai_1 || "-"}</b></div>
                    <div className={lineStyle}><span className="text-gray-600">Selesai Cicilan:</span><b className={valueStyle}>{data.Selesai_1 || "-"}</b></div>
                </div>
            </div>
            </div>

            {/* ============================== */}
            {/* PLAN II (Jika Ada) */}
            {/* ============================== */}
            {data.JenisMetode_2 !== "TIDAK ADA" && (
                <div className={`${detailBox} bg-fuchsia-50`}>
                    <h3 className={titleStyle}>RENCANA PEMBAYARAN II ({data.JenisMetode_2})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2">
                            <div className={lineStyle}><span className="text-gray-600">Sumber Dana (Nominal):</span><b className={valueStyle}>Rp {fmt(data.SumberDana_2)}</b></div>
                            <div className={lineStyle}><span className="text-gray-600">Tenor:</span><b className={valueStyle}>{data.Tenor_2} Bulan</b></div>
                            <div className={lineStyle}><span className="text-gray-600">Nilai Angsuran:</span><b className={valueStyle}>Rp {fmt(data.Angsuran_2)}</b></div>
                        </div>
                        <div className="space-y-2">
                            <div className={lineStyle}><span className="text-gray-600">Mulai Cicilan:</span><b className={valueStyle}>{data.Mulai_2 || "-"}</b></div>
                            <div className={lineStyle}><span className="text-gray-600">Jatuh Tempo (Tgl):</span><b className={valueStyle}>{data["Jatuh Tempo 2"] || "-"}</b></div>
                            <div className={lineStyle}><span className="text-gray-600">Selesai Cicilan:</span><b className={valueStyle}>{data.Selesai_2 || "-"}</b></div>
                        </div>
                    </div>
                </div>
            )}


            {/* ============================== */}
            {/* RIWAYAT PEMBAYARAN TABLE */}
            {/* ============================== */}
            <div className="bb-card space-y-4 shadow-lg bg-gradient-to-br from-purple-50 to-white border-l-4 border-purple-500">

            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2">
                <span className="text-2xl">📋</span> Riwayat Pembayaran (Rekap)
                </h3>
                <div className="bg-purple-100 px-3 py-1 rounded-full text-purple-800 font-semibold">
                Total Transaksi: <b>{filteredHistory.length}</b>
                </div>
            </div>

            {/* TABLE */}
            <div className="bb-table-container">
                <div className="bb-table-wrapper">
                <table className="w-full text-sm border-collapse">
                    <thead>
                    <tr className="bg-purple-100 border-b-2 border-black">
                        <th className="p-2 text-center border-r border-black">NO</th>
                        <th className="p-2 text-center border-r border-black">TANGGAL</th>
                        <th className="p-2 text-left border-r border-black min-w-[250px]">KETERANGAN</th>
                        <th className="p-2 text-center border-r border-black">METODE</th>
                        <th className="p-2 text-right">JUMLAH</th>
                    </tr>
                    </thead>

                    <tbody className="bb-tbody">
                    {filteredHistory.length === 0 && (
                        <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-500">Belum ada pembayaran</td>
                        </tr>
                    )}

                    {filteredHistory.map((h, i) => (
                        <tr key={i} className="hover:bg-purple-50 transition-colors">
                        <td className="text-center p-2 border-r border-gray-300">{filteredHistory.length - i}</td>
                        <td className="text-center p-2 border-r border-gray-300 whitespace-nowrap">{h.Tanggal}</td>
                        <td className="p-2 border-r border-gray-300">{h.Catatan}</td>
                        <td className="text-center p-2 border-r border-gray-300">{h.via || h["Metode Pembayaran"]}</td>
                        <td className="p-2 text-right font-semibold text-green-600">Rp {fmt(h.Jumlah)}</td>
                        </tr>
                    ))}
                    
                    {/* TOTAL FOOTER ROW */}
                    <tr className="bg-purple-200 border-t-2 border-black font-black text-base">
                        <td colSpan={4} className="p-2 text-right">GRAND TOTAL UANG MASUK</td>
                        <td className="p-2 text-right text-green-800">Rp {fmt(totalUangMasuk)}</td>
                    </tr>

                    </tbody>
                </table>
                </div>
            </div>

            {/* PAY BUTTON */}
            <button
                onClick={() => setShowPay(true)}
                className="bb-btn bb-btn-primary w-full py-3 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 mt-4 no-print"
            >
                <span className="text-xl">💰</span> Input Pembayaran Baru
            </button>

            </div>

        {/* === PRINT AREA END === */}
        </div>


        {/* MODAL PEMBAYARAN */}
        {showPay && (
          <div className="modal-overlay fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">

            <div className="modal-card bb-card w-11/12 md:w-[420px] p-6 space-y-6 bg-white rounded-2xl border-[4px] border-black shadow-[6px_6px_0px_#000]">

              <h2 className="text-2xl font-extrabold text-center text-slate-800 flex items-center justify-center gap-2">
                <span className="text-3xl">💳</span>
                Input Pembayaran
              </h2>

              <div className="space-y-1">
                <label className="font-semibold text-sm">Tanggal</label>
                <div className="bb-input-wrap">
                  <span className="text-lg">📅</span>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-sm">Nominal</label>
                <div className="bb-input-wrap">
                  <span className="text-lg">💰</span>
                  <input type="number" placeholder="Masukkan nominal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-sm">Metode</label>
                <div className="bb-input-wrap">
                  <span className="text-lg">🏦</span>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="Transfer">Transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-sm">Catatan</label>
                <div className="bb-input-wrap">
                  <span className="text-lg">📝</span>
                  <input type="text" placeholder="Contoh: Cicilan ke-3" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setShowPay(false)} className="bb-btn bb-btn-secondary px-6 py-2">
                  <span className="text-lg">❌</span> Batal
                </button>
                <button disabled={saving} onClick={submitPayment} className="bb-btn bb-btn-primary px-6 py-2">
                  <span className="text-lg">💾</span>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}