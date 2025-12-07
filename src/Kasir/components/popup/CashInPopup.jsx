import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import cashInLogic from "../../logic/cashInLogic";
import CariDataModal from "../modal/CariDataModal";

// DATA LIST
const MARKETING_LIST = ["Arin", "Asri", "Bahtera", "Gita", "Holil", "Maulana", "Reza", "Sari", "Solihin", "Taufiq", "Habib"];
const ADMIN_LIST = ["Shinta", "Hadi", "Sinta", "Zahra", "Haryadi"];

// 🔥 POLA BAYAR (SAMA KAYAK TUKAR KWI)
const POLA_BAYAR_LIST = ["KPR PROSES", "KPR AKAD BTN", "KPR AKAD BJB", "SOFT CASH", "HARD CASH", "SEWA"];

export default function CashInPopup({ isOpen = false, onClose = () => {}, editData = null }) {
  
  // STATE FORM
  const [form, setForm] = useState({
    noKwi: "", tglKwi: "", tglTrf: "", adminlog: "",
    jnsKons: "Umum", 
    consumerId: "", 
    namaKons: "",
    blok: "", kav: "", lb: "", lt: "",
    nilaiRp: "", 
    Angsur: "",       // MANUAL
    angsuranAuto: "", // OTOMATIS
    ket1: "", 
    polaBayar: "",    // 🔥 FIELD BARU
    ket2: "",         // 🔥 JADI MANUAL
    ket3: "", refInfo: "",
    no_hp: "", no_ktp: "", nm_mkt: ""
  });

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("new");
  const [nextNoKwi, setNextNoKwi] = useState("...");
  const [showCariKonsumen, setShowCariKonsumen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [isIdLocked, setIsIdLocked] = useState(false); 

  // === FITUR ESCAPE CLOSE ===
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // === INITIAL LOAD ===
  useEffect(() => {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(date.toLocaleDateString('id-ID', options));

    if (isOpen) {
      if (editData) {
        setForm({ 
            ...editData, 
            refInfo: editData.refInfo || "",
            consumerId: editData.consumerId || editData.id || "",
            polaBayar: editData.polaBayar || "", // Load Pola Bayar
            angsuranAuto: "-" 
        });
        setMode("edit");
        setIsIdLocked(true);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editData]);

  // ❌ AUTO GENERATE KET 2 DIHAPUS SESUAI REQUEST ❌
  // (User input manual untuk "Untuk Pembayaran")

  const resetForm = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const newKwi = await cashInLogic.generateCashInNoKwi();
    
    setForm({
      noKwi: newKwi, tglKwi: today, tglTrf: "", adminlog: "",
      jnsKons: "Umum", consumerId: "", namaKons: "",
      blok: "", kav: "", lb: "", lt: "",
      nilaiRp: "", 
      Angsur: "", angsuranAuto: "",
      ket1: "", polaBayar: "", ket2: "", ket3: "", refInfo: "",
      no_hp: "", no_ktp: "", nm_mkt: ""
    });
    setNextNoKwi(newKwi);
    setMode("new");
    setIsIdLocked(false);
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const upperFields = ["namaKons", "blok", "kav", "ket1", "ket2", "ket3", "refInfo", "consumerId"];
    setForm(prev => ({
      ...prev,
      [name]: upperFields.includes(name) ? value.toUpperCase() : value
    }));
  };

  const handleNilaiChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setForm(prev => ({ ...prev, nilaiRp: raw }));
  };

  const handleCekKwitansi = async () => {
    if (!form.noKwi) return Swal.fire("Eits!", "Masukin nomor kwitansi dulu brok!", "warning");
    setLoading(true);
    const data = await cashInLogic.getDataByNoKwi(form.noKwi);
    if (data) {
      setForm({ 
          ...data, 
          tglKwi: data.tglKwi || data.createdAt?.slice(0,10),
          consumerId: data.consumerId || data.id || "" 
      });
      setMode("edit"); 
      setIsIdLocked(true);
      Swal.fire({ icon: 'success', title: 'Ketemu!', text: `Data: ${data.namaKons}`, timer: 1000, showConfirmButton: false });
    } else {
      setMode("new");
      setIsIdLocked(false);
      Swal.fire({ icon: 'info', title: 'Baru', text: 'Nomor tersedia.', timer: 1000, showConfirmButton: false });
    }
    setLoading(false);
  };

  const handlePilihKonsumen = (data) => {
    const lastInstallment = parseInt(data.cicilanTerakhir || 0); 
    const nextInstallment = lastInstallment + 1;
    setForm(prev => ({
      ...prev,
      consumerId: data.id || data.consumerId || "", 
      namaKons: data.namaKons || "",
      blok: data.blok || "", kav: data.kav || "",
      lb: data.lb || "", lt: data.lt || "",
      no_hp: data.no_hp || "", no_ktp: data.no_ktp || "",
      nm_mkt: data.nm_mkt || "",
      Angsur: String(nextInstallment),
      angsuranAuto: String(nextInstallment)
    }));
    setIsIdLocked(true); 
    setShowCariKonsumen(false);
  };

  const handleSimpan = async () => {
    if (!form.namaKons || !form.nilaiRp || !form.adminlog) return Swal.fire("Gagal", "Lengkapi Data Utama!", "error");
    if (!form.consumerId) return Swal.fire("Gagal", "ID Konsumen wajib diisi!", "warning");

    setLoading(true);
    try {
      const payload = { ...form };
      
      // Gabung Pola Bayar ke Ket3 (Opsional, atau simpan sebagai field sendiri jika DB support)
      if(form.polaBayar) payload.ket3 = `${payload.ket3} [${form.polaBayar}]`.trim();
      if(form.refInfo) payload.ket3 = `${payload.ket3} (Ref: ${form.refInfo})`;

      await cashInLogic.saveCashIn(payload, mode);
      Swal.fire({ icon: 'success', title: mode === 'edit' ? 'Updated!' : 'Saved!', timer: 1500, showConfirmButton: false }).then(() => onClose(true));
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menyimpan data.", "error");
    }
    setLoading(false);
  };

  const handleRefundCancel = () => {
    if (mode !== "edit") return Swal.fire({ title: 'Info', text: 'Cari dulu Nomor Kwitansi!', icon: 'info' });
    Swal.fire({
      title: 'REFUND / CANCEL?',
      html: `Data <b>${form.noKwi}</b> akan dipindah ke Laporan Cancel.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Proses!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          await cashInLogic.deleteCashInToCancel(form.noKwi, "Cancel by User");
          Swal.fire('Selesai!', 'Data berhasil di-cancel.', 'success').then(() => onClose(true));
        } catch (error) {
           Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error');
        }
        setLoading(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[50] p-4 font-sans animate-in fade-in zoom-in duration-200">
      
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-slate-800 px-5 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-wide flex items-center gap-2 text-white">
              <span className="text-yellow-400 text-2xl">💵</span> INPUT CASH IN
            </h2>
            <div className="flex items-center gap-2 mt-1 text-slate-300 text-xs font-mono bg-slate-700/50 px-2 py-1 rounded w-fit">
               <span>📅 {currentDate}</span>
            </div>
          </div>
          <button onClick={() => onClose(false)} className="bg-red-500/80 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-lg hover:rotate-90 transition-all">&times;</button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto bg-slate-50 space-y-5">
          
          {/* 1. IDENTITAS */}
          <div className="grid grid-cols-12 gap-4">
             <div className="col-span-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tanggal Kwitansi</label>
                <input type="date" name="tglKwi" value={form.tglKwi} onChange={handleChange} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-semibold shadow-sm focus:border-blue-500 outline-none" />
             </div>
             <div className="col-span-5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">No. Kwitansi <span className="text-green-600 text-[10px] ml-1">(Auto: {nextNoKwi})</span></label>
                <div className="flex gap-1">
                   <input type="text" name="noKwi" value={form.noKwi} onChange={handleChange} className="w-full border border-slate-300 rounded-l px-2 py-1.5 text-sm font-bold uppercase text-slate-700 shadow-sm" placeholder="KSS..." />
                   <button onClick={handleCekKwitansi} className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-3 rounded-r font-bold text-sm border border-yellow-500 shadow-sm">🔍</button>
                </div>
             </div>
             <div className="col-span-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Admin Input</label>
                <select className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white font-semibold shadow-sm focus:border-blue-500 outline-none" value={form.adminlog} onChange={e => setForm({...form, adminlog: e.target.value})}>
                   <option value="">- Pilih Admin -</option>
                   {ADMIN_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
             </div>
          </div>

          {/* 2. KONSUMEN */}
          <div className="grid grid-cols-12 gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
             <div className="col-span-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase">ID Konsumen</label>
                <input name="consumerId" value={form.consumerId} onChange={handleChange} readOnly={isIdLocked} className={`w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-bold text-center ${isIdLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:border-blue-500'}`} placeholder="KETIK / AUTO" />
             </div>
             <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Jenis</label>
                <select name="jnsKons" value={form.jnsKons} onChange={handleChange} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"><option>Umum</option><option>Kemhan</option><option>Corporate</option></select>
             </div>
             <div className="col-span-7">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nama Konsumen</label>
                <div className="flex gap-2">
                   <input type="text" name="namaKons" value={form.namaKons} onChange={handleChange} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-bold uppercase focus:border-blue-500 outline-none" placeholder="NAMA LENGKAP..." />
                   <button onClick={() => setShowCariKonsumen(true)} className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 rounded font-bold text-xs border border-blue-300 shadow-sm">CARI DATA</button>
                </div>
             </div>
          </div>

          {/* 3. UNIT INFO */}
          <div className="flex items-center gap-2 bg-slate-200/50 p-2 rounded border border-slate-300 shadow-sm">
             <span className="text-xs font-bold text-slate-600 px-2">UNIT INFO:</span>
             <input name="blok" value={form.blok} onChange={handleChange} placeholder="BLOK" className="w-16 text-center border border-slate-300 rounded px-1 py-1 text-sm uppercase font-bold focus:border-blue-500 outline-none" />
             <input name="kav" value={form.kav} onChange={handleChange} placeholder="KAV" className="w-16 text-center border border-slate-300 rounded px-1 py-1 text-sm uppercase font-bold focus:border-blue-500 outline-none" />
             <span className="text-slate-400">|</span>
             <input name="lb" value={form.lb} onChange={handleChange} placeholder="LB" className="w-16 text-center border border-slate-300 rounded px-1 py-1 text-sm focus:border-blue-500 outline-none" />
             <input name="lt" value={form.lt} onChange={handleChange} placeholder="LT" className="w-16 text-center border border-slate-300 rounded px-1 py-1 text-sm focus:border-blue-500 outline-none" />
             <span className="text-slate-400 ml-auto">|</span>
             <select name="nm_mkt" value={form.nm_mkt} onChange={handleChange} className="w-48 border border-slate-300 rounded px-2 py-1 text-sm bg-white font-semibold focus:border-blue-500 outline-none"><option value="">- Marketing -</option>{MARKETING_LIST.map(m => <option key={m} value={m}>{m}</option>)}</select>
          </div>

          {/* 4. KEUANGAN (DUAL ANGSURAN) */}
          <div className="grid grid-cols-12 gap-4">
             <div className="col-span-8">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nilai Transaksi (Rupiah)</label>
                <div className="relative">
                   <span className="absolute left-3 top-2 text-slate-400 font-bold">Rp</span>
                   <input type="text" value={form.nilaiRp ? Number(form.nilaiRp).toLocaleString("id-ID") : ""} onChange={handleNilaiChange} className="w-full border border-blue-300 rounded pl-10 pr-3 py-1.5 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" placeholder="0" />
                </div>
             </div>
             <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Angsuran</label>
                <input name="Angsur" value={form.Angsur} onChange={handleChange} className="w-full border border-slate-300 rounded px-2 py-2 text-center text-sm font-bold shadow-sm focus:border-blue-500 outline-none" placeholder="Man" />
             </div>
             <div className="col-span-2">
                <label className="text-[11px] font-bold text-green-600 uppercase">Auto</label>
                <input value={form.angsuranAuto || "-"} readOnly className="w-full border border-green-200 bg-green-50 rounded px-2 py-2 text-center text-sm font-bold text-green-700 cursor-not-allowed" />
             </div>
          </div>

          {/* 5. KETERANGAN & POLA BAYAR */}
          <div className="space-y-2">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Keterangan</label>
                    <input name="ket1" value={form.ket1} onChange={handleChange} placeholder="CONTOH: DP..." className="w-full border border-slate-300 rounded px-3 py-2 text-sm uppercase font-bold" />
                </div>
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Pola Bayar</label>
                    <select name="polaBayar" value={form.polaBayar} onChange={handleChange} className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-sm font-bold shadow-sm outline-none focus:border-blue-500">
                        <option value="">- PILIH POLA BAYAR -</option>
                        {POLA_BAYAR_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
             </div>

             {/* 🔥 UNTUK PEMBAYARAN JADI MANUAL 🔥 */}
             <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Untuk Pembayaran</label>
                <input name="ket2" value={form.ket2} onChange={handleChange} placeholder="KETIK MANUAL UNTUK PEMBAYARAN..." className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm uppercase focus:border-blue-500 outline-none" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Ket. Tambahan</label>
                    <input name="ket3" value={form.ket3} onChange={handleChange} placeholder="OPSIONAL..." className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm uppercase" />
                </div>
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Reff / Catatan</label>
                    <input name="refInfo" value={form.refInfo} onChange={handleChange} placeholder="REFF..." className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm uppercase" />
                </div>
             </div>
          </div>

        </div>

        {/* FOOTER ACTION */}
        <div className="px-5 py-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
           <div className="w-1/3">
              <button onClick={handleRefundCancel} className="flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 border border-red-700 font-bold text-xs uppercase px-5 py-2.5 rounded shadow-md transition-all">⚠️ REFUND / CANCEL</button>
           </div>
           <div className="flex gap-3 justify-end w-2/3">
              <button onClick={resetForm} className="px-5 py-2.5 rounded bg-white border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs shadow-sm transition-colors">RESET</button>
              <button onClick={handleSimpan} disabled={loading} className={`px-8 py-2.5 rounded font-bold text-sm shadow-lg flex items-center gap-2 text-white transition-all transform hover:-translate-y-0.5 tracking-wide ${mode === 'edit' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                 <span>{mode === 'edit' ? '✏️' : '💾'}</span> {mode === 'edit' ? 'UPDATE DATA' : 'SIMPAN DATA'}
              </button>
           </div>
        </div>

      </div>

      {showCariKonsumen && <CariDataModal onClose={() => setShowCariKonsumen(false)} onSelect={handlePilihKonsumen} />}
    </div>
  );
}