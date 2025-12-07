// src/MasterData/modals/UpdatePembayaranModal.jsx
import React, { useEffect, useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";
import { computeTotalUangMasuk } from "../engine/penerimaanEngine";
import { computeOutstanding, computeRefund } from "../engine/outstandingEngine";
import { pushHistoriPembayaran } from "../engine/historiEngine";

export default function UpdatePembayaranModal(){
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [form, setForm] = useState({ noKwitansi:'', tanggalPembayaran:'', nilaiPembayaran:0, metodePembayaran:'Cash', bank:''});
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ if (modal.name==='pembayaran' && modal.payload) setForm({ ...form }); }, [modal]);

  if (modal.name !== "pembayaran") return null;

  async function save(){
    try {
      setLoading(true);
      const masterRes = await api.get(modal.payload._id);
      const master = masterRes.data;
      // push histori pembayaran
      master.historiPembayaran = master.historiPembayaran || [];
      master.historiPembayaran.push({ ...form, createdAt: new Date() });
      // add to penerimaanMengurangiOutstanding (choose mapping)
      master.penerimaanMengurangiOutstanding.cashLainnya = (Number(master.penerimaanMengurangiOutstanding.cashLainnya||0) + Number(form.nilaiPembayaran||0));
      // recompute outstanding & refund
      const totalMasuk = computeTotalUangMasuk(master.penerimaanMengurangiOutstanding);
      master.statusCash.outstandingAkhir = computeOutstanding(master.kewajibanBayar.hargaJualAkhir, totalMasuk, master.prosesKpr.danaKprCair, master.prosesKpr.subsidi, master.prosesKpr.asabri);
      master.statusCash.refundLebihBayar = computeRefund(master.kewajibanBayar.hargaJualAkhir, totalMasuk);
      // save
      await api.update(master._id, master);
      triggerReload();
      closeModal();
    } catch (e) { console.error(e); alert("Gagal simpan pembayaran"); } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-md p-4">
        <h3 className="font-bold mb-2">Tambah Pembayaran</h3>
        <input className="p-2 border mb-2" placeholder="No Kwitansi" value={form.noKwitansi} onChange={e=>setForm(f=>({...f,noKwitansi:e.target.value}))} />
        <input type="date" className="p-2 border mb-2" value={form.tanggalPembayaran} onChange={e=>setForm(f=>({...f,tanggalPembayaran:e.target.value}))} />
        <input type="number" className="p-2 border mb-2" placeholder="Nilai Pembayaran" value={form.nilaiPembayaran} onChange={e=>setForm(f=>({...f,nilaiPembayaran:Number(e.target.value)}))} />
        <select className="p-2 border mb-2" value={form.metodePembayaran} onChange={e=>setForm(f=>({...f,metodePembayaran:e.target.value}))}>
          <option value="Cash">Cash</option>
          <option value="Transfer">Transfer</option>
        </select>
        <div className="flex gap-2">
          <button className="bb-btn bb-btn-primary" onClick={save}>Simpan</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </div>
  );
}