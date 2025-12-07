// src/MasterData/engine/ppjbEngine.js
export function applyPPJB(master, ppjb) {
  master.ppjb = Object.assign(master.ppjb || {}, ppjb);
  return master;
}