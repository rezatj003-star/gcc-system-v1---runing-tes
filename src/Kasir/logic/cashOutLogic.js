// src/Kasir/logic/cashOutLogic.js
import { api } from "../../api";
import shared from "./sharedKwitansiLogic";

export async function saveCashOut(payload){
  const now = new Date().toISOString();
  const base = { ...payload, created_at: now, jnsTrx: "CashOut" };
  const co = await api.kasir.post("/cashOut", base);
  const lap = await api.kasir.post("/laporan", base);
  return { cashOut: co.data, laporan: lap.data };
}

export async function editCashOut(id, payload){
  if(!id) throw new Error("id required");
  await api.kasir.put(`/cashOut/${id}`, payload);
  const lapAll = (await api.kasir.get("/laporan")).data || [];
  const lap = lapAll.find(r => r.cashOutId === id || (r.noKwi && r.noKwi === payload.noKwi));
  if(lap) await api.kasir.put(`/laporan/${lap.id}`, { ...lap, ...payload });
  return { ok: true };
}

export async function cancelCashOut(id){
  if(!id) throw new Error("id required");
  try{
    const lapAll = (await api.kasir.get("/laporan")).data || [];
    const lap = lapAll.find(r => r.cashOutId === id || (r.noKwi && r.noKwi === id));
    if(lap) await shared.archiveAndDelete("laporan", lap);
  }catch(e){}
  await shared.archiveAndDelete("cashOut", { id });
  return { ok: true };
}

export default { saveCashOut, editCashOut, cancelCashOut };