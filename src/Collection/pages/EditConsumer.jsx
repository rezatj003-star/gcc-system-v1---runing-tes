import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ModuleLayout from "../../layouts/ModuleLayout";
import { getConsumerById, updateConsumer } from "../../api";
import { getRealStatus } from "../utils/statusCalculator";

// ===================================================
// DATA LIST (Sama dengan AddConsumer)
// ===================================================
const areaList = ["A", "A-R", "AA", "AA-R", "B", "BB", "BB-A", "BB-B", "BC", "C", "CC", "D", "DD", "EE", "GG", "HH", "HH-R", "II", "II-R", "JJ-R", "LL", "LL-R", "KK", "KK-R"];
const marketingList = ["Arin", "Asri", "Reza", "Habib", "Holil", "Taufiq", "Gita", "Sari", "Sholihin", "Bahtera", "Legal", "Maulana"].sort();
const polaBayarList = ["KPR AKAD BTN", "KPR AKAD BJB", "KPR PROSES", "KARYAWAN", "MEMO INTERNAL", "SOFT CASH", "HARD CASH", "LAINNYA"];
const metodeIIOptions = ["TIDAK ADA", "CICILAN BERTAHAP", "PELUNASAN"];

// ===================================================
// HELPER
// ===================================================
const totalRiwayat = (arr = []) => arr.reduce((s, r) => s + Number(r?.Jumlah || 0), 0);

const calculateEndDate = (startDateStr, months) => {
  if (!startDateStr || !months || months <= 0) return "-";
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return "-";
  const selesai = new Date(start);
  selesai.setMonth(selesai.getMonth() + Number(months));
  const yyyy = selesai.getFullYear();
  const mm = String(selesai.getMonth() + 1).padStart(2, "0");
  const dd = String(selesai.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function EditConsumer() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ===================================================
  // STATE FORM (Struktur disamakan dengan AddConsumer)
  // ===================================================
  const [form, setForm] = useState({
    code: "",
    Nama: "",
    "No Wa": "",
    Area: "",
    Blok: "",
    Marketing: "",
    "Pola Pembayaran": "",
    Status: "Belum Bayar",
    Keterangan: "",
    "Riwayat Pembayaran": [],

    // KEUANGAN
    "Harga Jual": 0,
    "Uang Masuk": 0, // Hanya untuk display total bayar
    Outstanding: 0,

    // PLAN I
    SumberDana_1: 0,
    Tenor_1: 0,
    Angsuran_1: 0,
    TotalPlan_1: 0,
    JatuhTempo_1: "", // Angka Tgl (1-31)
    Mulai_1: "",
    Selesai_1: "",

    // PLAN II
    JenisMetode_2: "TIDAK ADA",
    SumberDana_2: 0,
    Tenor_2: 0,
    Angsuran_2: 0,
    TotalPlan_2: 0,
    JatuhTempo_2: "", // Angka Tgl (1-31)
    Mulai_2: "",
    Selesai_2: ""
  });

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // ===================================================
  // 1. LOAD DATA DARI DB -> MAPPING KE FORM
  // ===================================================
  useEffect(() => {
    (async () => {
      try {
        const res = await getConsumerById(id);
        const c = res.data || {};

        // Mapping Data Lama ke Struktur Baru
        // Plan 1 Mappings
        const tenor1 = Number(c["Lama Angsuran"] || 0);
        const angsuran1 = Number(c["Nilai Angsuran"] || 0);
        const sumber1 = Number(c["Rencana Pembayaran 1"] || 0);
        // Jika data lama belum ada sumber dana 1, kita asumsi outstanding awal atau harga jual
        const finalSumber1 = sumber1 > 0 ? sumber1 : Number(c.Outstanding || 0); 

        // Plan 2 Mappings
        const tenor2 = Number(c["Lama Angsuran 2"] || 0);
        const angsuran2 = Number(c["Nilai Angsuran 2"] || 0);
        const sumber2 = Number(c["Rencana Pembayaran 2"] || 0);

        // Migrasi DP Lama ke History jika belum ada
        let listRiwayat = Array.isArray(c["Riwayat Pembayaran"]) ? [...c["Riwayat Pembayaran"]] : [];
        const dpManual = Number(c["Uang Masuk"] || 0);
        if (dpManual > 0) {
             const hasDP = listRiwayat.some(h => String(h.Catatan).toUpperCase().includes("DP") || String(h.Catatan).toUpperCase().includes("MIGRASI"));
             if (!hasDP) {
                 listRiwayat.unshift({
                     Tanggal: c["Mulai Cicilan"] || new Date().toISOString().slice(0, 10),
                     Jumlah: dpManual,
                     Catatan: "DP AWAL (MIGRASI)",
                     via: "Manual"
                 });
             }
        }

        setForm({
          code: c.code || c.id || "",
          Nama: c.Nama || "",
          "No Wa": c["No Wa"] || "",
          Area: c.Area || "",
          Blok: c.Blok || "",
          Marketing: c.Marketing || "",
          "Pola Pembayaran": c["Pola Pembayaran"] || "",
          Status: c.Status || "Belum Bayar",
          Keterangan: c.Keterangan || "",
          "Riwayat Pembayaran": listRiwayat,

          "Harga Jual": Number(c["Harga Jual"] || 0),
          "Uang Masuk": totalRiwayat(listRiwayat), // Display Only
          Outstanding: Number(c.Outstanding || 0),

          // PLAN I
          SumberDana_1: finalSumber1,
          Tenor_1: tenor1,
          Angsuran_1: angsuran1,
          TotalPlan_1: tenor1 * angsuran1,
          JatuhTempo_1: c["Jatuh Tempo"] || "", 
          Mulai_1: c["Mulai Cicilan"] || "",
          Selesai_1: c["Selesai Cicilan"] || calculateEndDate(c["Mulai Cicilan"], tenor1),

          // PLAN II
          JenisMetode_2: c["Metode Pembayaran 2"] || "TIDAK ADA",
          SumberDana_2: sumber2,
          Tenor_2: tenor2,
          Angsuran_2: angsuran2,
          TotalPlan_2: tenor2 * angsuran2,
          JatuhTempo_2: c["Jatuh Tempo 2"] || "",
          Mulai_2: c["Mulai Cicilan 2"] || "",
          Selesai_2: c["Selesai Cicilan 2"] || calculateEndDate(c["Mulai Cicilan 2"], tenor2),
        });

      } catch (err) {
        console.error(err);
        alert("Gagal memuat data.");
      } finally { setLoading(false); }
    })();
  }, [id]);

  // ===================================================
  // 2. LOGIKA HITUNG OTOMATIS (Sama dgn AddConsumer)
  // ===================================================
  useEffect(() => {
    if (loading) return;

    // A. DASAR
    const harga = Number(form["Harga Jual"] || 0);
    const totalBayar = totalRiwayat(form["Riwayat Pembayaran"]); // Uang Masuk = Total History
    const outstandingReal = Math.max(harga - totalBayar, 0);

    // B. PLAN I
    const sumber1 = Number(form.SumberDana_1); 
    const tenor1 = Number(form.Tenor_1);
    let angsuran1 = Number(form.Angsuran_1);
    
    // Auto hitung angsuran jika tenor berubah dan angsuran blm sesuai (Opsional, agar edit manual ttp bisa)
    // Disini kita biarkan user edit manual, tapi Total Plan otomatis
    const totalPlan1 = angsuran1 * tenor1;
    const selesai1 = calculateEndDate(form.Mulai_1, tenor1);

    // C. PLAN II
    const sumber2 = Number(form.SumberDana_2);
    const tenor2 = Number(form.Tenor_2);
    const angsuran2 = Number(form.Angsuran_2);
    const totalPlan2 = angsuran2 * tenor2;
    const selesai2 = calculateEndDate(form.Mulai_2, tenor2);

    setForm(prev => ({
      ...prev,
      Outstanding: outstandingReal,
      "Uang Masuk": totalBayar,
      
      TotalPlan_1: totalPlan1,
      Selesai_1: selesai1,

      TotalPlan_2: totalPlan2,
      Selesai_2: selesai2
    }));

  }, [
    loading,
    form["Harga Jual"], form["Riwayat Pembayaran"],
    form.SumberDana_1, form.Tenor_1, form.Angsuran_1, form.Mulai_1,
    form.SumberDana_2, form.Tenor_2, form.Angsuran_2, form.Mulai_2
  ]);

  // ===================================================
  // 3. RIWAYAT CRUD
  // ===================================================
  const handleAddHistory = () => {
    setForm(f => ({ ...f, "Riwayat Pembayaran": [...f["Riwayat Pembayaran"], { Tanggal: new Date().toISOString().slice(0, 10), Jumlah: 0, Catatan: "", via: "Transfer" }] }));
  };
  const handleHistoryChange = (i, k, v) => {
    const arr = [...form["Riwayat Pembayaran"]];
    arr[i] = { ...arr[i], [k]: k === "Jumlah" ? Number(v) : v };
    setForm(f => ({ ...f, "Riwayat Pembayaran": arr }));
  };
  const handleHistoryRemove = (i) => {
    if(!window.confirm("Hapus riwayat?")) return;
    const arr = [...form["Riwayat Pembayaran"]];
    arr.splice(i, 1);
    setForm(f => ({ ...f, "Riwayat Pembayaran": arr }));
  };

  // Status Preview
  const autoStatus = useMemo(() => {
    const installmentRef = form.Tenor_2 > 0 ? form.Angsuran_2 : form.Angsuran_1;
    const startDateRef = form.Tenor_2 > 0 ? form.Mulai_2 : form.Mulai_1;
    const dueDateRef = form.Tenor_2 > 0 ? form.JatuhTempo_2 : form.JatuhTempo_1;

    return getRealStatus({
      startDate: startDateRef,
      dueDate: Number(dueDateRef || 0),
      outstanding: form.Outstanding, 
      installment: Number(installmentRef || 0),
      history: form["Riwayat Pembayaran"] || []
    });
  }, [form.Outstanding, form.Tenor_2, form.Angsuran_2, form.Angsuran_1, form.JatuhTempo_2, form.JatuhTempo_1, form.Mulai_2, form.Mulai_1, form["Riwayat Pembayaran"]]);

  // ===================================================
  // 4. SUBMIT
  // ===================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mapping kembali ke Struktur Database
    const payload = {
      ...form,
      id: id,
      Status: autoStatus,
      
      // Update Plan I
      "Rencana Pembayaran 1": Number(form.SumberDana_1),
      "Lama Angsuran": Number(form.Tenor_1),
      "Nilai Angsuran": Number(form.Angsuran_1),
      "Jatuh Tempo": Number(form.JatuhTempo_1),
      "Mulai Cicilan": form.Mulai_1,
      "Selesai Cicilan": form.Selesai_1,

      // Update Plan II
      "Metode Pembayaran 2": form.JenisMetode_2,
      "Rencana Pembayaran 2": Number(form.SumberDana_2),
      "Lama Angsuran 2": Number(form.Tenor_2),
      "Nilai Angsuran 2": Number(form.Angsuran_2),
      "Jatuh Tempo 2": Number(form.JatuhTempo_2),
      "Mulai Cicilan 2": form.Mulai_2,
      "Selesai Cicilan 2": form.Selesai_2,

      "Uang Masuk": 0, // Reset field manual karena sudah di history
      
      "Riwayat Pembayaran": form["Riwayat Pembayaran"].map(r => ({ ...r, Jumlah: Number(r.Jumlah || 0) }))
    };

    try {
      setSaving(true);
      await updateConsumer(id, payload);
      localStorage.setItem("collection:updated", Date.now());
      alert("DATA BERHASIL DIPERBARUI!");
      nav("/collection/master?refresh=" + Date.now());
    } catch (err) { console.error(err); alert("GAGAL UPDATE."); } finally { setSaving(false); }
  };

  // --- STYLING (Sama dengan AddConsumer) ---
  const cardBase = "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-8 relative";
  const labelStyle = "text-xs font-black uppercase mb-2 block tracking-wider";
  const inputContainer = "flex items-center border-2 border-black h-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-none";
  const inputField = "w-full h-full px-3 outline-none font-bold uppercase text-sm bg-transparent placeholder-gray-400";
  const iconBox = "h-full px-3 flex items-center justify-center border-r-2 border-black bg-gray-100 font-bold text-lg";
  const readOnlyContainer = "flex items-center border-2 border-black h-12 bg-gray-200 cursor-not-allowed";
  const readOnlyField = "w-full h-full px-3 flex items-center font-black text-gray-700 text-sm";

  if (loading) return <ModuleLayout><div className="p-8 text-center font-black">MEMUAT DATA...</div></ModuleLayout>;

  return (
    <ModuleLayout>
      <div className="min-h-screen bg-orange-50 p-4 md:p-8 font-sans pb-32">
        
        <button onClick={() => nav("/collection/master")} className="mb-6 px-4 py-2 bg-white border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
          ⬅ Kembali ke Master
        </button>

        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
          
          {/* HEADER */}
          <div className={`${cardBase} bg-[#FFCD00]`}>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                   <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase drop-shadow-sm text-black">
                      EDIT DATA KONSUMEN
                   </h1>
                   <p className="font-bold text-sm uppercase mt-2 tracking-widest opacity-80">Perbarui data & rencana pembayaran</p>
                </div>
                <div className="bg-white border-2 border-black p-4 rotate-2 shadow-[4px_4px_0px_0px_#000]">
                   <div className="text-[10px] font-black uppercase text-gray-500">SYSTEM ID</div>
                   <div className="text-3xl font-black text-blue-600 tracking-widest">{form.code}</div>
                </div>
             </div>
          </div>

          {/* 1. DATA PRIBADI & UNIT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className={`${cardBase} bg-white`}>
                <div className="absolute -top-5 left-4 bg-black text-white px-4 py-1 font-bold text-sm -rotate-1 shadow-[4px_4px_0px_0px_#888]">👤 DATA PRIBADI</div>
                <div className="mt-2 space-y-6">
                   <div>
                      <label className={labelStyle}>Nama Lengkap</label>
                      <div className={`${inputContainer} bg-white`}><div className={iconBox}>📝</div><input value={form.Nama} onChange={(e) => setField("Nama", e.target.value.toUpperCase())} className={inputField} /></div>
                   </div>
                   <div>
                      <label className={labelStyle}>No WhatsApp</label>
                      <div className={`${inputContainer} bg-white`}><div className={iconBox}>📱</div><input type="number" value={form["No Wa"]} onChange={(e) => setField("No Wa", e.target.value)} className={inputField} /></div>
                   </div>
                   <div>
                      <label className={labelStyle}>Keterangan</label>
                      <div className={`${inputContainer} bg-white`}><div className={iconBox}>💬</div><input value={form.Keterangan} onChange={(e) => setField("Keterangan", e.target.value)} className={inputField} /></div>
                   </div>
                </div>
             </div>

             <div className={`${cardBase} bg-white`}>
                <div className="absolute -top-5 left-4 bg-black text-white px-4 py-1 font-bold text-sm rotate-1 shadow-[4px_4px_0px_0px_#888]">📍 UNIT & LOKASI</div>
                <div className="mt-2 grid grid-cols-2 gap-6">
                   <div>
                      <label className={labelStyle}>Area</label>
                      <div className={`${inputContainer} bg-white`}><select value={form.Area} onChange={(e) => setField("Area", e.target.value)} className={inputField}><option value="">-</option>{areaList.map(a => <option key={a}>{a}</option>)}</select></div>
                   </div>
                   <div>
                      <label className={labelStyle}>Blok</label>
                      <div className={`${inputContainer} bg-white`}><input value={form.Blok} onChange={(e) => setField("Blok", e.target.value)} className={inputField} /></div>
                   </div>
                   <div className="col-span-2">
                      <label className={labelStyle}>Marketing</label>
                      <div className={`${inputContainer} bg-white`}><select value={form.Marketing} onChange={(e) => setField("Marketing", e.target.value)} className={inputField}><option value="">-</option>{marketingList.map(m => <option key={m}>{m}</option>)}</select></div>
                   </div>
                   <div className="col-span-2">
                      <label className={labelStyle}>Pola Pembayaran</label>
                      <div className={`${inputContainer} bg-white`}><select value={form["Pola Pembayaran"]} onChange={(e) => setField("Pola Pembayaran", e.target.value)} className={inputField}><option value="">-</option>{polaBayarList.map(p => <option key={p}>{p}</option>)}</select></div>
                   </div>
                </div>
             </div>
          </div>

          {/* 2. KEUANGAN DASAR */}
          <div className={`${cardBase} bg-white`}>
             <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-[#FFCD00] border-2 border-black px-8 py-2 font-black text-lg shadow-[4px_4px_0px_0px_#000] z-10">💰 KEUANGAN DASAR</div>
             <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <label className={labelStyle}>Harga Jual</label>
                   <div className={`${inputContainer} bg-yellow-50`}><div className={iconBox}>Rp</div><input type="number" value={form["Harga Jual"]} onChange={(e) => setField("Harga Jual", e.target.value)} className={`${inputField} text-lg`} /></div>
                </div>
                <div>
                   <label className={labelStyle}>Total Masuk (History)</label>
                   <div className={readOnlyContainer}><div className={`${iconBox} bg-green-50 text-green-600`}>Rp</div><div className={readOnlyField}>{Number(form["Uang Masuk"]).toLocaleString("id-ID")}</div></div>
                </div>
                <div>
                   <label className={labelStyle}>Outstanding (Sisa)</label>
                   <div className={readOnlyContainer}><div className={`${iconBox} bg-red-100 text-red-600`}>Rp</div><div className={`${readOnlyField} text-red-600 text-xl`}>{Number(form.Outstanding).toLocaleString("id-ID")}</div></div>
                </div>
             </div>
          </div>

          {/* 3. PLAN I (CYAN) */}
          <div className={`${cardBase} bg-cyan-100`}>
             <div className="absolute -top-5 left-4 bg-cyan-400 border-2 border-black px-6 py-2 font-black text-lg shadow-[4px_4px_0px_0px_#000] uppercase text-black">🔹 Rencana Pembayaran I</div>
             <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div>
                    <label className={labelStyle}>Sumber Dana (Plan I)</label>
                    <div className={`${inputContainer} bg-white`}><div className={iconBox}>Rp</div><input type="number" value={form.SumberDana_1} onChange={(e) => setField("SumberDana_1", e.target.value)} className={inputField} /></div>
                 </div>
                 <div>
                    <label className={labelStyle}>Tenor (Bulan)</label>
                    <div className={`${inputContainer} bg-white`}><div className={iconBox}>📅</div><input type="number" value={form.Tenor_1} onChange={(e) => setField("Tenor_1", e.target.value)} className={inputField} /></div>
                 </div>
                 <div>
                    <label className={labelStyle}>Nilai Angsuran (I)</label>
                    <div className={`${inputContainer} bg-white`}><div className={iconBox}>Rp</div><input type="number" value={form.Angsuran_1} onChange={(e) => setField("Angsuran_1", e.target.value)} className={`${inputField} text-blue-700`} /></div>
                 </div>
             </div>
             <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t-2 border-black pt-6 border-dashed border-cyan-400">
                 <div>
                    <label className={labelStyle}>Total Plan I</label>
                    <div className={readOnlyContainer}><div className={`${iconBox} bg-blue-200`}>Rp</div><div className={readOnlyField}>{Number(form.TotalPlan_1).toLocaleString("id-ID")}</div></div>
                 </div>
                 <div>
                    <label className={labelStyle}>Mulai Cicilan</label>
                    <div className={`${inputContainer} bg-white`}><div className={iconBox}>📆</div><input type="date" value={form.Mulai_1} onChange={(e) => setField("Mulai_1", e.target.value)} className={inputField} /></div>
                 </div>
                 <div>
                    <label className={labelStyle}>Jatuh Tempo (Tgl 1-31)</label>
                    <div className={`${inputContainer} bg-white`}><div className={iconBox}>⏰</div><input type="number" min="1" max="31" value={form.JatuhTempo_1} onChange={(e) => setField("JatuhTempo_1", e.target.value)} className={inputField} /></div>
                 </div>
             </div>
          </div>

          {/* 4. PLAN II (PURPLE) */}
          <div className={`${cardBase} bg-fuchsia-100`}>
             <div className="absolute -top-5 left-4 bg-fuchsia-400 border-2 border-black px-6 py-2 font-black text-lg shadow-[4px_4px_0px_0px_#000] uppercase text-black">🟣 Rencana Pembayaran II</div>
             <div className="mt-6">
                <label className={labelStyle}>Pilih Metode</label>
                <div className={`${inputContainer} bg-white w-full md:w-1/3`}><select value={form.JenisMetode_2} onChange={(e) => setField("JenisMetode_2", e.target.value)} className={inputField}>{metodeIIOptions.map(o => <option key={o}>{o}</option>)}</select></div>
             </div>
             {form.JenisMetode_2 !== "TIDAK ADA" && (
                <div className="mt-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div><label className={labelStyle}>Sumber Dana (II)</label><div className={`${inputContainer} bg-white`}><div className={iconBox}>Rp</div><input type="number" value={form.SumberDana_2} onChange={(e) => setField("SumberDana_2", e.target.value)} className={inputField} /></div></div>
                       <div><label className={labelStyle}>Tenor (Bulan)</label><div className={`${inputContainer} bg-white`}><div className={iconBox}>📅</div><input type="number" value={form.Tenor_2} onChange={(e) => setField("Tenor_2", e.target.value)} className={inputField} /></div></div>
                       <div><label className={labelStyle}>Nilai Angsuran (II)</label><div className={`${inputContainer} bg-white`}><div className={iconBox}>Rp</div><input type="number" value={form.Angsuran_2} onChange={(e) => setField("Angsuran_2", e.target.value)} className={`${inputField} text-purple-700`} /></div></div>
                   </div>
                   <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t-2 border-black pt-6 border-dashed border-fuchsia-400">
                       <div><label className={labelStyle}>Total Plan II</label><div className={readOnlyContainer}><div className={`${iconBox} bg-purple-200`}>Rp</div><div className={readOnlyField}>{Number(form.TotalPlan_2).toLocaleString("id-ID")}</div></div></div>
                       <div><label className={labelStyle}>Mulai Cicilan</label><div className={`${inputContainer} bg-white`}><div className={iconBox}>📆</div><input type="date" value={form.Mulai_2} onChange={(e) => setField("Mulai_2", e.target.value)} className={inputField} /></div></div>
                       <div><label className={labelStyle}>Jatuh Tempo (Tgl 1-31)</label><div className={`${inputContainer} bg-white`}><div className={iconBox}>⏰</div><input type="number" min="1" max="31" value={form.JatuhTempo_2} onChange={(e) => setField("JatuhTempo_2", e.target.value)} className={inputField} /></div></div>
                   </div>
                </div>
             )}
          </div>

          {/* 5. RIWAYAT */}
          <div className={`${cardBase} bg-white`}>
             <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">📜 Riwayat Pembayaran</h3>
             <button type="button" onClick={handleAddHistory} className="mb-4 px-4 py-2 bg-black text-white font-bold uppercase hover:bg-gray-800 shadow-[4px_4px_0px_0px_#888] transition-all">+ Tambah Item</button>
             <div className="space-y-3">
                {form["Riwayat Pembayaran"].map((r, i) => (
                   <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 border-2 border-black bg-gray-50 shadow-sm items-center">
                      <div className="md:col-span-3"><input type="date" value={r.Tanggal} onChange={(e) => handleHistoryChange(i, "Tanggal", e.target.value)} className="w-full border border-black p-2 font-bold" /></div>
                      <div className="md:col-span-3"><input type="number" value={r.Jumlah} onChange={(e) => handleHistoryChange(i, "Jumlah", e.target.value)} className="w-full border border-black p-2 font-bold" placeholder="Nominal" /></div>
                      <div className="md:col-span-4"><input value={r.Catatan} onChange={(e) => handleHistoryChange(i, "Catatan", e.target.value)} className="w-full border border-black p-2 font-bold" placeholder="Keterangan" /></div>
                      <div className="md:col-span-2 flex gap-1">
                         <select value={r.via} onChange={(e) => handleHistoryChange(i, "via", e.target.value)} className="w-full border border-black p-2 font-bold text-xs"><option value="Transfer">Transfer</option><option value="Cash">Cash</option><option value="Manual">Manual</option></select>
                         <button type="button" onClick={() => handleHistoryRemove(i)} className="bg-red-500 text-white px-3 font-bold border border-black">X</button>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col md:flex-row gap-4 mt-8">
             <button type="button" onClick={() => nav("/collection/master")} className="flex-1 py-4 bg-white border-4 border-black font-black uppercase text-xl shadow-[8px_8px_0px_0px_#000] hover:translate-y-1 hover:shadow-none transition-all">Batal</button>
             <button type="submit" disabled={saving} className="flex-[2] py-4 bg-green-400 border-4 border-black font-black uppercase text-xl shadow-[8px_8px_0px_0px_#000] hover:translate-y-1 hover:shadow-none transition-all">{saving ? "⏳ Menyimpan..." : "💾 Simpan Perubahan"}</button>
          </div>

        </form>
      </div>
    </ModuleLayout>
  );
}