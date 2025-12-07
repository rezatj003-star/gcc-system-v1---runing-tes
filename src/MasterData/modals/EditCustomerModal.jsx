// src/MasterData/modals/EditCustomerModal.jsx
import React, { useEffect, useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";
import { computeKelebihanTanah, computeHargaJualAkhir } from "../engine/priceEngine";
import { computeTotalUangMasuk } from "../engine/penerimaanEngine";
import { computeOutstanding, computeRefund } from "../engine/outstandingEngine";

function ModalShell({ title, onClose, children }) {
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

export default function EditCustomerModal() {
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if (modal.name === "edit" && modal.payload) {
      setForm(JSON.parse(JSON.stringify(modal.payload)));
    }
  }, [modal]);

  if (modal.name !== "edit") return null;
  if (!form) return null;

  function setField(path, val) {
    const parts = path.split(".");
    setForm(prev=>{
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
      // recompute financials
      form.kewajibanBayar.kelebihanTanahRp = computeKelebihanTanah(form.dataTeknik, form.kewajibanBayar);
      form.kewajibanBayar.hargaJualAkhir = computeHargaJualAkhir(form.kewajibanBayar);
      const totalMasuk = computeTotalUangMasuk(form.penerimaanMengurangiOutstanding);
      form.statusCash.outstandingAkhir = computeOutstanding(form.kewajibanBayar.hargaJualAkhir, totalMasuk, form.prosesKpr.danaKprCair, form.prosesKpr.subsidi, form.prosesKpr.asabri);
      form.statusCash.refundLebihBayar = computeRefund(form.kewajibanBayar.hargaJualAkhir, totalMasuk);
      await api.update(form._id, form);
      triggerReload();
      closeModal();
    } catch (err) {
      console.error(err); alert("Gagal update");
    } finally { setLoading(false); }
  }

  return (
    <ModalShell title="Edit Konsumen" onClose={closeModal}>
      <div className="grid gap-2">
        <input placeholder="Nama Konsumen" value={form.identitas.namaKonsumen} onChange={e=>setField("identitas.namaKonsumen", e.target.value)} className="p-2 border" />
        <input placeholder="No HP" value={form.identitas.noHp} onChange={e=>setField("identitas.noHp", e.target.value)} className="p-2 border" />
        <div className="flex gap-2">
          <button className="bb-btn bb-btn-primary" onClick={save} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </ModalShell>
  );
}