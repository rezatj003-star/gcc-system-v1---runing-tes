// src/Kasir/logic/sharedKwitansiLogic.js
import { api } from "../../api";

/**
 * Shared helpers for kws/kwitansi/layanan kasir.
 * Uses collections:
 *  - cashIn, tukarKwi, cashOut, kwitansi, laporan
 *  - and their Cancel and laporanGantiNama variants
 */

const PREFIX = "KSS0";
const parseNo = (s) => {
  if (!s) return 0;
  const clean = String(s).replace(/^KSS0/, "").replace(/\D/g, "");
  const n = Number(clean || 0);
  return isNaN(n) ? 0 : n;
};

async function list(path){
  try {
    const r = await api.kasir.get(`/${path}`);
    return Array.isArray(r.data) ? r.data : (r.data || []);
  } catch(e) { return []; }
}

export async function generateNoKwiFromLaporan(){
  const laps = await list("laporan");
  const nums = laps.map(r => parseNo(r.noKwi));
  const last = nums.length ? Math.max(...nums) : 0;
  return `${PREFIX}${last+1}`;
}
export async function generateNoKwiFallback(){
  const kws = await list("kwitansi");
  const nums = kws.map(r => parseNo(r.noKwi));
  const last = nums.length ? Math.max(...nums) : 0;
  return `${PREFIX}${last+1}`;
}

export async function findByNo(collection, noKwi){
  const all = await list(collection);
  return all.find(x => String(x.noKwi) === String(noKwi)) || null;
}

export async function archiveAndDelete(collection, record){
  if(!record) return;
  const cancel = `${collection}Cancel`;
  try { await api.kasir.post(`/${cancel}`, { ...record, canceledAt: new Date().toISOString(), status: "canceled" }); } catch(e){}
  try {
    await api.kasir.put(`/${collection}/${record.id}`, { ...record, status: "canceled", canceledAt: new Date().toISOString() });
    await api.kasir.delete(`/${collection}/${record.id}`);
  } catch(e){}
}

export async function renameCustomer(oldName, newName){
  if(!oldName || !newName) throw new Error("oldName/newName required");
  const allK = await list("kwitansi");
  const matched = allK.filter(r => (r.namaKons||"").toUpperCase() === oldName.toUpperCase());
  for(const rec of matched){
    try{ await api.kasir.post("/laporanGantiNama", { ...rec, movedAt: new Date().toISOString(), oldName }); }catch(e){}
    try{ await api.kasir.delete(`/kwitansi/${rec.id}`); }catch(e){}
  }
  const total = matched.reduce((s,m) => s + (Number(m.nilaiRp)||0), 0);
  const noKwi = await generateNoKwiFallback();
  const created = await api.kasir.post("/kwitansi", {
    noKwi,
    tglKwi: new Date().toLocaleDateString("id-ID"),
    report: new Date().toLocaleDateString("id-ID", { dateStyle: "full" }),
    namaKons: newName,
    nilaiRp: total,
    note: `Merged ${matched.length} kwitansi (rename ${oldName}→${newName})`,
    created_at: new Date().toISOString()
  });
  return { moved: matched.length, created: created.data };
}

export default {
  generateNoKwiFromLaporan,
  generateNoKwiFallback,
  findByNo,
  archiveAndDelete,
  renameCustomer
};