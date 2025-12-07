// src/MasterData/engine/penagihanEngine.js
export function addPenagihanEntry(master, entry) {
  master.timelinePenagihan = master.timelinePenagihan || [];
  master.timelinePenagihan.push(Object.assign({ createdAt: new Date() }, entry));
  return master;
}