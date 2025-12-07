// src/MasterData/modals/UpdatePPJBModal.jsx
import React, { useEffect, useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";

export default function UpdatePPJBModal(){
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [form, setForm] = useState({ namaPPJB:'', nomorPPJB:'', tanggalPPJB:'', upload: null, statusPPJB: 'Draft' });
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ if (modal.name==='ppjb' && modal.payload) setForm(modal.payload.ppjb || form); }, [modal]);

  if (modal.name !== "ppjb") return null;

  async function uploadAndSave() {
    try {
      setLoading(true);
      // if file exists upload
      if (form.upload instanceof File) {
        const fd = new FormData();
        fd.append('file', form.upload);
        const upRes = await api.uploadPPJB ? api.uploadPPJB(modal.payload._id, fd) : api.post(`/masterdata/${modal.payload._id}/upload-ppjb`, fd);
        form.upload = upRes.data.path || upRes.data.filename || form.upload.name;
      }
      // update
      const masterRes = await api.get(modal.payload._id);
      const master = masterRes.data;
      master.ppjb = {...master.ppjb, ...form};
      await api.update(master._id, master);
      triggerReload();
      closeModal();
    } catch (e) { console.error(e); alert("Gagal update PPJB"); } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-md p-4">
        <h3 className="font-bold mb-2">Update PPJB</h3>
        <input className="p-2 border mb-2" placeholder="Nama di PPJB" value={form.namaPPJB} onChange={e=>setForm(f=>({...f,namaPPJB:e.target.value}))} />
        <input className="p-2 border mb-2" placeholder="Nomor PPJB" value={form.nomorPPJB} onChange={e=>setForm(f=>({...f,nomorPPJB:e.target.value}))} />
        <input type="date" className="p-2 border mb-2" value={form.tanggalPPJB || ''} onChange={e=>setForm(f=>({...f,tanggalPPJB:e.target.value}))} />
        <input type="file" className="p-2 mb-2" onChange={e=>setForm(f=>({...f,upload:e.target.files[0]}))} />
        <div className="flex gap-2">
          <button className="bb-btn bb-btn-primary" onClick={uploadAndSave} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </div>
  );
}