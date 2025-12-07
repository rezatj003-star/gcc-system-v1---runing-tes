// src/MasterData/modals/UpdatePenagihanModal.jsx
import React, { useEffect, useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";

export default function UpdatePenagihanModal(){
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [form, setForm] = useState({ tanggalKirimSurat:'', jenisSurat:'Teguran 1', respon:'', kodeRespon:'', planKehadiran:'', tanggalKehadiran:'', hasilKehadiran:'', keteranganPenagihan:'' });
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ if (modal.name==='penagihan' && modal.payload) setForm({ ...form }); }, [modal]);

  if (modal.name !== "penagihan") return null;

  async function save(){
    try {
      setLoading(true);
      const masterRes = await api.get(modal.payload._id);
      const master = masterRes.data;
      master.timelinePenagihan = master.timelinePenagihan || [];
      master.timelinePenagihan.push({ ...form, createdAt: new Date() });
      await api.update(master._id, master);
      triggerReload();
      closeModal();
    } catch(e){ console.error(e); alert("Gagal simpan penagihan"); } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-lg p-4">
        <h3 className="font-bold mb-2">Tambah Timeline Penagihan</h3>
        <input type="date" className="p-2 border mb-2" value={form.tanggalKirimSurat} onChange={e=>setForm(f=>({...f,tanggalKirimSurat:e.target.value}))} />
        <select className="p-2 border mb-2" value={form.jenisSurat} onChange={e=>setForm(f=>({...f,jenisSurat:e.target.value}))}>
          <option value="Teguran 1">Teguran 1</option>
          <option value="Teguran 2">Teguran 2</option>
          <option value="Somasi">Somasi</option>
        </select>
        <textarea className="p-2 border mb-2" placeholder="Keterangan" value={form.keteranganPenagihan} onChange={e=>setForm(f=>({...f,keteranganPenagihan:e.target.value}))} />
        <div className="flex gap-2">
          <button className="bb-btn bb-btn-primary" onClick={save}>Simpan</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </div>
  );
}