import { api } from "../../api";

const cashInLogic = {
  // ============================================================
  // 1. GENERATE NOMOR KWITANSI (ANTI BENTROK)
  // ============================================================
  async generateCashInNoKwi() {
    try {
      const res = await api.kasir.get("/laporan"); 
      const data = res.data || [];

      if (data.length === 0) return "KSS0100001";

      const numbers = data.map(item => {
        const str = item.noKwi || "";
        const numPart = str.replace(/\D/g, "");
        return parseInt(numPart) || 0;
      });

      const maxNum = Math.max(...numbers);
      const nextNum = maxNum + 1;

      return `KSS0${String(nextNum).padStart(6, "0")}`;
    } catch (e) {
      console.error("Gagal generate no kwi:", e);
      return "KSS0ERROR"; 
    }
  },

  // ============================================================
  // 2. SEARCH DATA BY NO KWI
  // ============================================================
  async getDataByNoKwi(noKwi) {
    try {
      const res = await api.kasir.get(`/cashIn?noKwi=${noKwi}`);
      if (res.data && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  // ============================================================
  // 3. SIMPAN DATA (KE 3 TABEL)
  // ============================================================
  async saveCashIn(payload, mode = "new") {
    const timestamp = new Date().toISOString();
    const nilaiRp = Number(String(payload.nilaiRp).replace(/\D/g, ""));
    
    // Normalisasi Data
    const dataFix = {
      ...payload,
      nilaiRp: nilaiRp,
      jnsTrx: "TUNAI",
      jenisTransaksi: "TUNAI",
      namaKons: (payload.namaKons || "").toUpperCase(),
      blok: (payload.blok || "").toUpperCase(),
      ket1: (payload.ket1 || "").toUpperCase(),
      updatedAt: timestamp
    };

    // Mapping untuk Tabel Laporan
    const dataLaporan = {
      ...dataFix,
      NamaKonsumen: dataFix.namaKons,
      NoKwi: dataFix.noKwi,
      NilaiRp: nilaiRp,
      status: "Active",
      Marketing: payload.nm_mkt,
      Admin: payload.adminlog
    };

    if (mode === "new") {
      dataFix.createdAt = timestamp;
      dataLaporan.createdAt = timestamp;
      
      const [resCashIn] = await Promise.all([
        api.kasir.post("/cashIn", dataFix),
        api.kasir.post("/laporan", dataLaporan),
        api.kasir.post("/kwitansi", dataFix)
      ]);
      return resCashIn.data;

    } else if (mode === "edit") {
      const updateByNo = async (endpoint, noKwi, newData) => {
        const find = await api.kasir.get(`/${endpoint}?noKwi=${noKwi}`);
        if(find.data.length > 0) {
          const id = find.data[0].id;
          await api.kasir.put(`/${endpoint}/${id}`, newData);
        }
      };

      await Promise.all([
        updateByNo("cashIn", dataFix.noKwi, dataFix),
        updateByNo("laporan", dataFix.noKwi, dataLaporan),
        updateByNo("kwitansi", dataFix.noKwi, dataFix)
      ]);
      return dataFix;
    }
  },

  // ============================================================
  // 4. DELETE / CANCEL
  // ============================================================
  async deleteCashInToCancel(noKwi, reason = "Dibatalkan User") {
    const timestamp = new Date().toISOString();

    const moveAndDelete = async (endpoint, targetCancelEndpoint) => {
      const find = await api.kasir.get(`/${endpoint}?noKwi=${noKwi}`);
      if(find.data.length > 0) {
        const item = find.data[0];
        // 1. Copy ke tabel cancel
        await api.kasir.post(`/${targetCancelEndpoint}`, { 
          ...item, 
          cancelReason: reason, 
          canceledAt: timestamp,
          status: "Cancel" 
        });
        // 2. Hapus dari tabel aktif
        await api.kasir.delete(`/${endpoint}/${item.id}`);
      }
    };

    await moveAndDelete("cashIn", "cashinCancel");
    await moveAndDelete("laporan", "laporanCancel"); 
    await moveAndDelete("kwitansi", "kwitansiCancel");

    return true;
  }
};

export default cashInLogic;