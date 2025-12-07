// src/MasterData/engine/validationEngine.js
export function validateMasterBasic(master) {
  const errs = [];
  if (!master.identitas?.namaKonsumen) errs.push("Nama konsumen wajib diisi");
  if (!master.identitas?.noUnit) errs.push("No Unit wajib diisi");
  if (!master.dataTeknik?.blok) errs.push("Blok unit wajib diisi");
  // add more domain rules...
  return errs;
}