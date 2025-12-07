// src/MasterData/modals/GantiNamaModal.jsx
import React, { useState, useEffect } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";
import { pushHistoriGantiNama } from "../engine/historiEngine";

export default function GantiNamaModal(){
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [namaBaru, setNamaBaru] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ if (modal.name === "gantiNama" && modal.payload) setNamaBaru(modal.payload.identitas?.namaKonsumen || ""); }, [modal]);

  if (modal.name !== "gantiNama") return null;

  async function save(){
    try {
      setLoading(true);
      const masterRes = await api.get(modal.payload._id);
      const master = masterRes.data;
      const namaLama = master.identitas.namaKonsumen;
      master.identitas.namaKonsumen = namaBaru;
      // push histori
      pushHistoriGantiNama(master, namaLama, namaBaru, "Ganti nama via modal");
      await api.update(master._id, master);
      triggerReload();
      closeModal();
    } catch (e){ console.error(e); alert("Gagal ganti nama"); } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-md p-4">
        <h3 className="font-bold mb-2">Ganti Nama Konsumen</h3>
        <input className="p-2 border mb-2" value={namaBaru} onChange={e=>setNamaBaru(e.target.value)} />
        <div className="flex gap-2">
          <button className="bb-btn bb-btn-primary" onClick={save} disabled={loading}>{loading ? "..." : "Simpan"}</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </div>
  );
}