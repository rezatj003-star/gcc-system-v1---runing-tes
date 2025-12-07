import React, { useEffect, useState } from "react";
import { api } from "../../../api"; 

export default function CashOutPopup({ isOpen = false, onClose = () => {} }) {

  const [form, setForm] = useState({
    tglHari: "",
    tglBulan: "",
    tglTahun: "",
    penerima: "",
    keterangan: "",
    nominal: "",
    admin: "",
    longDate: "",
  });

  const bulanList = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","Nopember","Desember",
  ];

  const adminList = ["Shinta", "Hadi", "Sinta"];
  const penerimaList = ["Habib","Haryadi","Dede Yana","Arin","Chalimah","Shinta","Sri Mulyani"];

  // ==== SET DEFAULT VALUE SAAT MODAL DIBUKA ====
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    const hari = now.getDate();
    const bulan = bulanList[now.getMonth()];
    const tahun = now.getFullYear();

    setForm(f => ({
      ...f,
      tglHari: hari,
      tglBulan: bulan,
      tglTahun: tahun,
      longDate: now.toLocaleDateString("id-ID", { dateStyle: "full" })
    }));
  }, [isOpen]);

  const setField = (k, v) => {
    setForm(s => ({ ...s, [k]: v }));
  };

  // ==== RESET ====
  const handleReset = () => {
    setForm({
      tglHari: "",
      tglBulan: "",
      tglTahun: "",
      penerima: "",
      keterangan: "",
      nominal: "",
      admin: "",
      longDate: "",
    });
  };

  // ==== SIMPAN (SAMA SEPERTI VBA: tambah baris baru) ====
  const handleSave = async () => {
    if (!form.admin || !form.penerima || !form.nominal) {
      alert("Harap lengkapi semua data!");
      return;
    }

    const fullDate = `${form.tglHari} ${form.tglBulan} ${form.tglTahun}`;

    try {
      await api.kasir.post("/cashOut", {
        tanggal: fullDate,
        longDate: form.longDate,
        penerima: form.penerima,
        keterangan: form.keterangan,
        nominal: Number(form.nominal),
        admin: form.admin
      });

      alert("Data berhasil ditambah!");
      handleReset();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-xl shadow-xl border-4 border-black w-full max-w-xl p-6">

        <h2 className="text-center font-bold text-xl mb-4">:: INPUT CASH OUT ::</h2>

        <div className="grid grid-cols-3 gap-3">

          {/* ADMIN */}
          <div className="col-span-3">
            <label className="font-semibold">Admin</label>
            <select className="bb-input mt-1" value={form.admin} onChange={e => setField("admin", e.target.value)}>
              <option value="">- PILIH -</option>
              {adminList.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Tanggal */}
          <div>
            <label>Tanggal</label>
            <input className="bb-input" value={form.tglHari} onChange={e => setField("tglHari", e.target.value)} />
          </div>

          <div>
            <label>Bulan</label>
            <select className="bb-input" value={form.tglBulan} onChange={e => setField("tglBulan", e.target.value)}>
              {bulanList.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label>Tahun</label>
            <input className="bb-input" value={form.tglTahun} onChange={e => setField("tglTahun", e.target.value)} />
          </div>

          {/* Penerima */}
          <div className="col-span-3">
            <label>Nama Penerima</label>
            <select className="bb-input mt-1" value={form.penerima} onChange={e => setField("penerima", e.target.value)}>
              <option value="">- PILIH -</option>
              {penerimaList.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* Keterangan */}
          <div className="col-span-3">
            <label>Keterangan</label>
            <input className="bb-input mt-1" value={form.keterangan} onChange={e => setField("keterangan", e.target.value)} />
          </div>

          {/* Nominal */}
          <div className="col-span-3">
            <label>Nominal</label>
            <input className="bb-input mt-1" value={form.nominal} onChange={e => setField("nominal", e.target.value.replace(/\D/g, ""))} />
          </div>

        </div>

        <div className="flex justify-between mt-5">
          <button className="bb-btn" onClick={handleReset}>RESET</button>
          <button className="bb-btn bb-btn-primary" onClick={handleSave}>SIMPAN</button>
          <button className="bb-btn bb-btn-danger" onClick={() => onClose(false)}>CLOSE</button>
        </div>

        <div className="text-right text-sm text-gray-500 mt-2">
          {form.longDate}
        </div>

      </div>
    </div>
  );
}