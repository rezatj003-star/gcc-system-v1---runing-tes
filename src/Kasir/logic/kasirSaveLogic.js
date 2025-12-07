/**
 * kasirSaveLogic.js
 * Logic Penyimpanan & Pembatalan Terpusat (CashIn & TukarKwitansi)
 */

import { api } from "../../api";

const PREFIX = "KSS0"; 

// 1. GENERATOR NO KWI
export async function generateUniqueNoKwi() {
  try {
    const res = await api.kasir.get("/laporan");
    const data = res.data || [];
    if (data.length === 0) return `${PREFIX}100001`;

    const allNumbers = data.map(item => {
      const kwiStr = item.noKwi || item.NoKwi || "";
      const numOnly = kwiStr.replace(/\D/g, "");
      return parseInt(numOnly) || 0;
    });

    const maxNum = Math.max(...allNumbers);
    return `${PREFIX}${String(maxNum + 1).padStart(6, "0")}`;
  } catch (err) {
    return `${PREFIX}${Date.now().toString().slice(-6)}`;
  }
}

// 2. SAVE CASH IN
export async function saveCashInToAllTables(payload, mode = "new") {
  const now = new Date().toISOString();
  let noKwiFix = payload.noKwi;
  if (mode === "new" || !noKwiFix) noKwiFix = await generateUniqueNoKwi();

  const nilaiRpFix = Number(String(payload.nilaiRp || 0).replace(/\D/g, ""));
  
  const dataBase = {
    ...payload,
    noKwi: noKwiFix,
    nilaiRp: nilaiRpFix,
    namaKons: (payload.namaKons || "").toUpperCase(),
    blok: (payload.blok || "").toUpperCase(),
    consumerId: payload.consumerId || "", 
    jnsTrx: "TUNAI",
    updatedAt: now
  };

  const dataLaporan = {
    ...dataBase,
    NoKwi: noKwiFix,
    TglKwi: payload.tglKwi,
    NamaKonsumen: dataBase.namaKons,
    ConsumerId: payload.consumerId || "",
    Blok: dataBase.blok,
    NoRumah: payload.kav,
    NilaiRp: nilaiRpFix,
    Marketing: payload.nm_mkt,
    Admin: payload.adminlog,
    status: "Active",
    jnsTrx: "CASH IN"
  };

  try {
    if (mode === "new") {
      dataBase.createdAt = now;
      dataLaporan.createdAt = now;
      await Promise.all([
        api.kasir.post("/cashIn", dataBase),
        api.kasir.post("/laporan", dataLaporan),
        api.kasir.post("/kwitansi", { ...dataBase, status: "Active" })
      ]);
    } else {
      const updateByNo = async (endpoint, data) => {
        const find = await api.kasir.get(`/${endpoint}?noKwi=${noKwiFix}`);
        if (find.data.length > 0) await api.kasir.put(`/${endpoint}/${find.data[0].id}`, data);
      };
      await Promise.all([
        updateByNo("cashIn", dataBase),
        updateByNo("laporan", dataLaporan),
        updateByNo("kwitansi", { ...dataBase, status: "Active" })
      ]);
    }
    return { success: true, noKwi: noKwiFix };
  } catch (err) {
    throw new Error("Gagal menyimpan data.");
  }
}

// 3. SAVE TUKAR KWI (TRANSFER)
export async function saveTukarKwiToAllTables(payload, mode = "new") {
  const now = new Date().toISOString();
  let noKwiFix = payload.noKwi;
  if (mode === "new" || !noKwiFix) noKwiFix = await generateUniqueNoKwi();

  const nilaiRpFix = Number(String(payload.nilaiRp || 0).replace(/\D/g, ""));
  const tglTrfFix = payload.tglTrf || payload.tglKwi;
  const bankFix = (payload.bank || "").toUpperCase();
  
  let ket2Fix = (payload.ket2 || "").toUpperCase();
  if (!ket2Fix) ket2Fix = `TRF VIA ${bankFix} TGL ${tglTrfFix}`;

  const dataBase = {
    ...payload,
    noKwi: noKwiFix,
    nilaiRp: nilaiRpFix,
    namaKons: (payload.namaKons || "").toUpperCase(),
    consumerId: payload.consumerId || "", 
    tglTrf: tglTrfFix,
    bank: bankFix,
    ket2: ket2Fix,
    jnsTrx: "TRANSFER",
    updatedAt: now
  };

  const dataLaporan = {
    ...dataBase,
    NoKwi: noKwiFix,
    TglKwi: payload.tglKwi,
    TglTrf: tglTrfFix,
    NamaKonsumen: dataBase.namaKons,
    ConsumerId: payload.consumerId || "", 
    Blok: payload.blok,
    NoRumah: payload.kav,
    NilaiRp: nilaiRpFix,
    Marketing: payload.nm_mkt,
    Admin: payload.adminlog,
    rekeningTransfer: bankFix,
    status: "Active",
    jnsTrx: "TUKAR KWI"
  };

  try {
    if (mode === "new") {
      dataBase.createdAt = now;
      dataLaporan.createdAt = now;
      await Promise.all([
        api.kasir.post("/tukarKwi", dataBase),
        api.kasir.post("/laporan", dataLaporan),
        api.kasir.post("/kwitansi", { ...dataBase, status: "Active" })
      ]);
    } else {
        const updateByNo = async (endpoint, data) => {
            const find = await api.kasir.get(`/${endpoint}?noKwi=${noKwiFix}`);
            if (find.data.length > 0) await api.kasir.put(`/${endpoint}/${find.data[0].id}`, data);
        };
        await Promise.all([
            updateByNo("tukarKwi", dataBase),
            updateByNo("laporan", dataLaporan),
            updateByNo("kwitansi", { ...dataBase, status: "Active" })
        ]);
    }
    return { success: true, noKwi: noKwiFix };
  } catch (err) {
    throw new Error("Gagal menyimpan data transfer.");
  }
}

// 4. DELETE / CANCEL (Universal)
export async function deleteCashInToCancel(noKwi, reason = "Cancel by User") {
    const timestamp = new Date().toISOString();

    const moveAndDelete = async (endpoint, targetCancelEndpoint) => {
      const find = await api.kasir.get(`/${endpoint}?noKwi=${noKwi}`);
      if(find.data.length > 0) {
        const item = find.data[0];
        // Copy ke tabel cancel
        await api.kasir.post(`/${targetCancelEndpoint}`, { 
          ...item, 
          cancelReason: reason, 
          canceledAt: timestamp,
          status: "Cancel" 
        });
        // Hapus dari tabel aktif
        await api.kasir.delete(`/${endpoint}/${item.id}`);
      }
    };

    // Eksekusi untuk 3 tabel (Termasuk TukarKwi kalau ada)
    await moveAndDelete("cashIn", "cashinCancel");
    await moveAndDelete("tukarKwi", "tukarKwiCancel"); // Jaga2 kalau ini data transfer
    await moveAndDelete("laporan", "laporanCancel"); 
    await moveAndDelete("kwitansi", "kwitansiCancel");

    return true;
}