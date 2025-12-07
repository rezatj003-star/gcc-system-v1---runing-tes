// src/Kasir/logic/tukarKwiLogic.js
// FINAL VERSION — PRODUKSI
import { api } from "/src/api";
import { generateNoKwiFromLaporan } from "./sharedKwitansiLogic";

export default {
  // ============================
  // GENERATE NOMOR KWITANSI OTOMATIS (TIDAK BENTROK)
  // ============================
  async generateTukarNoKwi() {
    try {
      // Coba dari laporan dulu
      const noKwi = await generateNoKwiFromLaporan();
      return noKwi;
    } catch (e) {
      // Fallback: generate dari kwitansi
      const res = await api.kasir.get("/kwitansi");
      const kws = res.data || [];
      const nums = kws
        .map((k) => {
          const match = String(k.noKwi || "").match(/KSS0(\d+)/);
          return match ? Number(match[1]) : 0;
        })
        .filter((n) => n > 0);
      const last = nums.length ? Math.max(...nums) : 0;
      return `KSS0${String(last + 1).padStart(6, "0")}`;
    }
  },

  // ============================
  // GET LAST KWI NUMBER
  // ============================
  async getLastKwiNumber() {
    try {
      const res = await api.kasir.get("/kwitansi?_sort=id&_order=desc&_limit=1");
      const last = res.data?.[0];
      return last?.noKwi || "-";
    } catch (e) {
      return "-";
    }
  },

  // ============================
  // SIMPAN TUKAR KWI BARU (KE 3 TABEL)
  // ============================
  async saveTukarKwi(payload) {
    const noKwi = payload.noKwi || (await this.generateTukarNoKwi());
    
    // Generate ket2 otomatis untuk transfer
    const bank = payload.bank || payload.tRek || "";
    const tglTrf = payload.tglTrf || payload.tanggalTransfer || new Date().toISOString().slice(0, 10);
    const nilaiRp = Number(payload.nilaiRp || 0);
    const ket2 = this.makeKetTransfer({ nilaiRp, bank, tglTrf });

    // Format data untuk tukarKwi
    const tukarKwiData = {
      ...payload,
      noKwi,
      jnsTrx: "TRANSFER",
      bank: bank,
      rekeningTransfer: payload.rekeningTransfer || bank,
      tanggalTransfer: tglTrf,
      ket2: ket2,
      createdAt: new Date().toISOString(),
    };

    // Format data untuk laporan
    const laporanData = {
      noKwi,
      tglKwi: payload.tglKwi || new Date().toISOString().slice(0, 10),
      jnsTrx: "TRANSFER",
      namaKonsumen: payload.namaKons || payload.namaKons,
      blok: payload.blok || "",
      kav: payload.kav || payload.NoRumah || "",
      lb: payload.lb || payload.LB || "",
      lt: payload.lt || payload.LT || "",
      nilaiRp: nilaiRp,
      angsuranKe: payload.Angsur || payload.angsuranKe || "",
      ket1: payload.ket1 || "",
      ket2: ket2,
      ket3: payload.ket3 || payload.refTransfer || "",
      noHP: payload.no_hp || payload.NoHP || "",
      noKTP: payload.no_ktp || payload.NoKTP || "",
      marketing: payload.nm_mkt || payload.Marketing || "",
      admin: payload.adminlog || payload.Admin || "",
      jenisKonsumen: payload.jnsKons || payload.JenisKonsumen || "Umum",
      bank: bank,
      rekeningTransfer: payload.rekeningTransfer || bank,
      tanggalTransfer: tglTrf,
      createdAt: new Date().toISOString(),
    };

    // Format data untuk kwitansi
    const kwitansiData = {
      noKwi,
      tglKwi: payload.tglKwi || new Date().toISOString().slice(0, 10),
      namaKonsumen: payload.namaKons || payload.namaKons,
      blok: payload.blok || "",
      kav: payload.kav || payload.NoRumah || "",
      lb: payload.lb || payload.LB || "",
      lt: payload.lt || payload.LT || "",
      nilaiRp: nilaiRp,
      ket1: payload.ket1 || "",
      ket2: ket2,
      ket3: payload.ket3 || payload.refTransfer || "",
      noHP: payload.no_hp || payload.NoHP || "",
      noKTP: payload.no_ktp || payload.NoKTP || "",
      marketing: payload.nm_mkt || payload.Marketing || "",
      admin: payload.adminlog || payload.Admin || "",
      jenisKonsumen: payload.jnsKons || payload.JenisKonsumen || "Umum",
      jnsTrx: "TRANSFER",
      bank: bank,
      rekeningTransfer: payload.rekeningTransfer || bank,
      tanggalTransfer: tglTrf,
      createdAt: new Date().toISOString(),
    };

    // Simpan ke 3 tabel secara berurutan
    const [tukarKwiRes, laporanRes, kwitansiRes] = await Promise.all([
      api.kasir.post("/tukarKwi", tukarKwiData),
      api.kasir.post("/laporan", laporanData),
      api.kasir.post("/kwitansi", kwitansiData),
    ]);

    return {
      tukarKwi: tukarKwiRes.data,
      laporan: laporanRes.data,
      kwitansi: kwitansiRes.data,
    };
  },

  // ============================
  // EDIT TUKAR KWI
  // ============================
  async editTukarKwi(identifier, payload) {
    const no = identifier.noKwi;
    
    // Update ke 3 tabel
    const [tukarKwiRes, laporanRes, kwitansiRes] = await Promise.all([
      api.kasir.put(`/tukarKwi/${identifier.id || no}`, payload),
      api.kasir.put(`/laporan/${identifier.laporanId || no}`, payload),
      api.kasir.put(`/kwitansi/${identifier.kwitansiId || no}`, payload),
    ]);

    return {
      tukarKwi: tukarKwiRes.data,
      laporan: laporanRes.data,
      kwitansi: kwitansiRes.data,
    };
  },

  // ============================
  // CANCEL / HAPUS TUKAR KWI (PINDAH ARSIP)
  // ============================
  async deleteTukarKwi(identifier) {
    const no = identifier.noKwi;
    
    // Ambil data dulu
    const tukarKwiRes = await api.kasir.get(`/tukarKwi?noKwi=${no}`);
    const tukarKwiData = tukarKwiRes.data?.[0];
    
    if (!tukarKwiData) throw new Error("Data tidak ditemukan");

    // Pindah ke cancel
    const cancelData = {
      ...tukarKwiData,
      status: "Cancel",
      canceledAt: new Date().toISOString(),
    };

    await Promise.all([
      api.kasir.post("/tukarKwiCancel", cancelData),
      api.kasir.post("/laporanCancel", cancelData),
      api.kasir.post("/kwitansiCancel", cancelData),
    ]);

    // Hapus dari tabel utama
    await Promise.all([
      api.kasir.delete(`/tukarKwi/${tukarKwiData.id}`),
      api.kasir.delete(`/laporan/${tukarKwiData.laporanId || tukarKwiData.id}`),
      api.kasir.delete(`/kwitansi/${tukarKwiData.kwitansiId || tukarKwiData.id}`),
    ]);

    return { success: true };
  },

  // ============================
  // CEK DUPLIKAT NOMOR REFERENSI TRANSFER
  // ============================
  async checkDuplicateRef(ref) {
    if (!ref) return false;
    const res = await api.kasir.get(`/tukarKwi?ket3=${ref}`);
    return (res.data || []).length > 0;
  },

  // ============================
  // GENERATE KETERANGAN TRANSFER OTOMATIS (ket2)
  // ============================
  makeKetTransfer({ nilaiRp, bank, tglTrf }) {
    const rp = Number(String(nilaiRp).replace(/\D/g, "")) || 0;
    const frp = rp.toLocaleString("id-ID");

    // Format: "TRANSFER Rp.6.130.938,- Ke MANDIRI GCC Tgl. 7/11/2025"
    const tglFormatted = tglTrf ? new Date(tglTrf).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    }) : tglTrf;

    return `TRANSFER Rp.${frp},- Ke ${bank} Tgl. ${tglFormatted}`;
  },
};
