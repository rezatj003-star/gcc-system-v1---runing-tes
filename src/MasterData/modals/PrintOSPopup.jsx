// src/MasterData/modals/PrintOSPopup.jsx
import React, { useEffect, useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";

export default function PrintOSPopup() {
  const { modal, closeModal } = useMasterDataCtx();
  const [doc, setDoc] = useState(null);

  useEffect(()=>{ if (modal.name === 'print' && modal.payload) api.get(modal.payload._id).then(r=>setDoc(r.data)).catch(()=>{}); }, [modal]);

  if (modal.name !== 'print') return null;
  if (!doc) return <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4"><div className="bb-card p-4">Loading...</div></div>;

  function onPrint(){ window.print(); }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Print Outstanding - {doc.identitas?.namaKonsumen}</h3>
          <button className="bb-btn" onClick={closeModal}>X</button>
        </div>
        <div>
          <p>Unit: {doc.identitas?.noUnit} — {doc.dataTeknik?.blok}</p>
          <p>Harga Jual Akhir: {doc.kewajibanBayar?.hargaJualAkhir}</p>
          <p>Outstanding Akhir: {doc.statusCash?.outstandingAkhir}</p>
        </div>
        <div className="mt-3">
          <button className="bb-btn bb-btn-primary mr-2" onClick={onPrint}>Print</button>
          <button className="bb-btn" onClick={closeModal}>Close</button>
        </div>
      </div>
    </div>
  );
}