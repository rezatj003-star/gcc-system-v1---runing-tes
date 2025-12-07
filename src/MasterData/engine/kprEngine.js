// src/MasterData/engine/kprEngine.js
export function applyKprCair(master, amount) {
  master.prosesKpr = master.prosesKpr || {};
  master.prosesKpr.danaKprCair = (Number(master.prosesKpr.danaKprCair||0) + Number(amount||0));
  return master;
}