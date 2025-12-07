// src/MasterData/modals/CancelCustomerModal.jsx
import React, { useState } from "react";
import api from "../MasterDataAPI";
import { useMasterDataCtx } from "../MasterDataContext";

export default function CancelCustomerModal(){
  const { modal, closeModal, triggerReload } = useMasterDataCtx();
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(0);
  const [loading, setLoading] = useState(false);

  if (modal.name !== "cancel") return null;

  async function save(){
    try {
      setLoading(true);
      // server should move record to cancel collection; frontend sends reason & refund
      await api.cancel(modal.payload._id, { reason, refund });
      triggerReload();
      closeModal();
    } catch (e) { console.error(e); alert("Gagal cancel"); } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4">
      <div className="bb-card w-full max-w-md p-4">
        <h3 className="font-bold mb-2">Cancel Konsumen</h3>
        <textarea className="p-2 border mb-2" placeholder="Alasan cancel" value={reason} onChange={e=>setReason(e.target.value)} />
        <input className="p-2 border mb-2" placeholder="Refund (Rp)" type="number" value={refund} onChange={e=>setRefund(Number(e.target.value))} />
        <div className="flex gap-2">
          <button className="bb-btn bb-btn-danger" onClick={save} disabled={loading}>{loading ? "Processing..." : "Confirm Cancel"}</button>
          <button className="bb-btn" onClick={closeModal}>Batal</button>
        </div>
      </div>
    </div>
  );
}