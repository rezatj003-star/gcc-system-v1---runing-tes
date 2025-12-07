// src/MasterData/modals/UpdateSPHModal.jsx
import React, { useEffect, useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";
import { computeAngsuran } from "../engine/sphEngine"; // we'll export helper

export default function UpdateSPHModal(){
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [form, setForm] = useState({ namaSPH:'', tanggalSPH:'', nilaiSPH:0, polaPembayaran:'', tenor:0, startAngsuran:'', statusSPH:'Aktif' });
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ if (modal.name === 'sph' && modal.payload) setForm(modal.payload.sph || form); }, [modal]);

  if (modal.name !== 'sph') return null;

  async function save() {
    try {
      setLoading(true);
      const masterRes = await api.get(modal.payload._id);
      const master = masterRes.data;
      master.sph = {...master.sph, ...form};
      // compute angsuran jika tenor
      if (master.sph.tenor && master.sph.tenor>0) {
        const sisaBayar = Number(master.kewajibanBayar.hargaJualAkhir||0) - computeTotalUangMasuk(master.penerimaanMengurangiOutstanding || {});
        master.sph.angsuranPerBulan = computeAngsuran(sisaBayar, master.sph.tenor);
      }
      await api.update(master._id, master);
      triggerReload();
      closeModal();
    } catch(e){ console.error(e); alert("Gagal update SPH"); } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-md p-4">
        <h3 className="font-bold mb-2">Update SPH</h3>
        <input className="p-2 border mb-2" placeholder="Nama SPH" value={form.namaSPH} onChange={e=>setForm(f=>({...f,namaSPH:e.target.value}))} />
        <input type="date" className="p-2 border mb-2" value={form.tanggalSPH||''} onChange={e=>setForm(f=>({...f,tanggalSPH:e.target.value}))} />
        <input className="p-2 border mb-2" placeholder="Nilai SPH" type="number" value={form.nilaiSPH} onChange={e=>setForm(f=>({...f,nilaiSPH:Number(e.target.value)}))} />
        <input className="p-2 border mb-2" placeholder="Tenor (bulan)" type="number" value={form.tenor} onChange={e=>setForm(f=>({...f,tenor:Number(e.target.value)}))} />
        <div className="flex gap-2">
          <button className="bb-btn bb-btn-primary" onClick={save}>Simpan</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </div>
  );
}