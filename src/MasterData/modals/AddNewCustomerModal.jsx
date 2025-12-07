// src/MasterData/modals/AddNewCustomerModal.jsx
import React, { useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";
import masterModel from "../masterDataModel";
import { computeKelebihanTanah, computeHargaJualAkhir } from "../engine/priceEngine";
import { computeTotalUangMasuk } from "../engine/penerimaanEngine";
import { computeOutstanding, computeRefund } from "../engine/outstandingEngine";

function ModalShell({ title, children, onClose }) {
  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">{title}</h3>
          <button className="bb-btn" onClick={onClose}>X</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export default function AddNewCustomerModal() {
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [form, setForm] = useState(modal.payload || JSON.parse(JSON.stringify(masterModel)));
  const [loading, setLoading] = useState(false);

  function setField(path, val) {
    const parts = path.split(".");
    setForm(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      let cur = copy;
      for (let i=0;i<parts.length-1;i++){ cur = cur[parts[i]] = cur[parts[i]] || {}; }
      cur[parts[parts.length-1]] = val;
      return copy;
    });
  }

  async function save() {
    try {
      setLoading(true);
      // compute derived fields
      form.kewajibanBayar.kelebihanTanahRp = computeKelebihanTanah(form.dataTeknik, form.kewajibanBayar);
      form.kewajibanBayar.hargaJualAkhir = computeHargaJualAkhir(form.kewajibanBayar);
      const totalMasuk = computeTotalUangMasuk(form.penerimaanMengurangiOutstanding);
      form.statusCash.outstandingAkhir = computeOutstanding(form.kewajibanBayar.hargaJualAkhir, totalMasuk, form.prosesKpr.danaKprCair, form.prosesKpr.subsidi, form.prosesKpr.asabri);
      form.statusCash.refundLebihBayar = computeRefund(form.kewajibanBayar.hargaJualAkhir, totalMasuk);
      const res = await api.create(form);
      triggerReload();
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan: " + (err?.response?.data?.message || err.message));
    } finally { setLoading(false); }
  }

  if (!modal.name || modal.name !== "addNew") return null;
  return (
    <ModalShell title="Tambah Konsumen Baru" onClose={closeModal}>
      <div className="grid grid-cols-1 gap-2">
        <input placeholder="Nama Konsumen" value={form.identitas.namaKonsumen} onChange={e=>setField("identitas.namaKonsumen", e.target.value)} className="p-2 border" />
        <input placeholder="NIK" value={form.identitas.nik} onChange={e=>setField("identitas.nik", e.target.value)} className="p-2 border" />
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="Area" value={form.identitas.area} onChange={e=>setField("identitas.area", e.target.value)} className="p-2 border" />
          <input placeholder="Blok" value={form.dataTeknik.blok} onChange={e=>setField("dataTeknik.blok", e.target.value)} className="p-2 border" />
          <input placeholder="No Unit" value={form.identitas.noUnit} onChange={e=>setField("identitas.noUnit", e.target.value)} className="p-2 border" />
        </div>
        {/* minimum kewajiban */}
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="Harga Unit" type="number" value={form.kewajibanBayar.hargaUnit} onChange={e=>setField("kewajibanBayar.hargaUnit", Number(e.target.value))} className="p-2 border" />
          <input placeholder="Harga /m2 tanah" type="number" value={form.kewajibanBayar.hargaPerM2Tanah} onChange={e=>setField("kewajibanBayar.hargaPerM2Tanah", Number(e.target.value))} className="p-2 border" />
          <input placeholder="Uang Muka" type="number" value={form.penerimaanMengurangiOutstanding.uangMukaRp} onChange={e=>setField("penerimaanMengurangiOutstanding.uangMukaRp", Number(e.target.value))} className="p-2 border" />
        </div>

        <div className="flex gap-2 mt-2">
          <button className="bb-btn bb-btn-primary" onClick={save} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </ModalShell>
  );
}