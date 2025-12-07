// collectionEngine.js — HYBRID FINAL PRODUCTION + PATCH D (PROFESSIONAL FLEXIBLE STATUS)

import { formatRupiah, formatDate } from "../utils/formatters";
import { getStatusByDate } from "../utils/statusColor";
import { normalizeConsumer } from "./getMasterConsumers.js";

// ===============================
// HITUNG BULAN BERLALU (ME)
// ===============================
function getMonthsElapsed(startDate) {
  if (!startDate) return 0;
  const today = new Date();
  const start = new Date(startDate);

  const monthsElapsed =
    today.getFullYear() * 12 + today.getMonth() -
    (start.getFullYear() * 12 + start.getMonth());
    
  // Tambah 1 untuk memasukkan bulan berjalan (bulan pertama)
  return Math.max(0, monthsElapsed + 1);
}

// ===============================
// HITUNG SELISIH HARI
// ===============================
export function diffDays(jatuhTempo) {
  if (!jatuhTempo) return null;

  const today = new Date();
  const due = new Date(jatuhTempo);
  if (isNaN(due)) return null;

  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  return Math.floor((t - d) / (1000 * 60 * 60 * 24));
}

// ===============================================
// FUNGSI BARU: PENENTU WARNA STATUS BERDASARKAN KEPARAHAN
// Digunakan oleh MasterCollection.jsx untuk styling
// ===============================================
export function getStatusColor(status) {
    const s = (status || '').toUpperCase();
    
    // Status Positif/Netral
    if (s === 'LUNAS') return 'bg-gray-700 text-white'; // Lunas (Final state)
    if (s === 'LANCAR') return 'bg-green-500 text-white'; // Pembayaran on-track atau di muka
    if (s === 'HAMPIR LUNAS') return 'bg-lime-400 text-black'; // OS sisa 10% ke bawah
    if (s === 'ANGSURAN BERJALAN') return 'bg-blue-300 text-black'; // Default, tidak bermasalah

    // Status Peringatan/Tunggakan
    if (s === 'JATUH TEMPO') return 'bg-yellow-500 text-black'; // Hari H
    if (s === 'TERTUNGGAK RINGAN') return 'bg-orange-400 text-black'; // Baru lewat batas
    if (s === 'TERTUNGGAK SEDANG') return 'bg-orange-700 text-white'; // 1-2 Bulan Tertinggal

    // Status Koleksi/Macet (Merah)
    if (s === 'TUNGGAKAN KRITIS') return 'bg-red-600 text-white'; // 3-5 Bulan
    if (s === 'KREDIT MACET TOTAL') return 'bg-red-900 text-white'; // 6+ Bulan
    
    return 'bg-gray-300 text-black'; // Default/Unknown
}

// ===============================================
// ENGINE UTAMA (FINAL FLEXIBLE + PROFESSIONAL TERMS)
// ===============================================
export function computeConsumer(raw) {
  // Asumsi raw sudah dinormalisasi di MasterCollection (atau kita menggunakan normalizeConsumer yang harus lu sediakan)
  // Untuk tujuan ini, saya asumsikan properti yang diperlukan sudah ada di objek 'c'.
  const c = raw; 

  const totalPaid = c.history.reduce((sum, p) => sum + p.nominal, 0); // Asumsi history menggunakan field nominal
  c.totalPaid = totalPaid;

  const installment = c.installment1; // Asumsi menggunakan installment Plan 1 sebagai dasar
  const price = c.price;
  const outstanding = c.outstanding;
  
  // --- 1. Months Covered vs Months Elapsed ---
  const monthsElapsed = getMonthsElapsed(c.mulai1);
  const monthsCovered = installment > 0 ? Math.floor(totalPaid / installment) : 0;
  
  const delinquencyMonths = monthsElapsed - monthsCovered;
  c.tunggakanBulan = delinquencyMonths;

  // --- 2. LOGIKA STATUS BERDASARKAN KRITERIA BARU ---
  let finalStatus = "ANGSURAN BERJALAN"; // Default jika OS > 0

  if (outstanding === 0) {
    finalStatus = "LUNAS";
  } else if (delinquencyMonths <= 0) {
    finalStatus = "LANCAR"; 
  } else if (delinquencyMonths >= 6) {
    finalStatus = "KREDIT MACET TOTAL"; // >= 6 Bulan
  } else if (delinquencyMonths >= 3) {
    finalStatus = "TUNGGAKAN KRITIS"; // 3 - 5 Bulan
  } else if (delinquencyMonths >= 1) {
    finalStatus = "TERTUNGGAK SEDANG"; // 1 - 2 Bulan
  }

  // Cek Batasan Outstanding Sisa 10%
  const osThreshold = price * 0.10;
  if (finalStatus !== "LUNAS" && outstanding > 0 && outstanding <= osThreshold) {
    finalStatus = "HAMPIR LUNAS";
  }
  
  // Cek Jatuh Tempo (Override jika belum Lunas/Lancar/Hampir Lunas)
  const today = new Date();
  const startDay = parseDueDate(c.mulai1)?.getDate() || 0; // Ambil tanggal hari dari mulai cicilan
  const dueDay = c.rawDue || startDay; // Gunakan rawDue/startDay untuk hari jatuh tempo

  if (finalStatus !== "LANCAR" && finalStatus !== "LUNAS" && finalStatus !== "HAMPIR LUNAS" && dueDay > 0) {
      if (today.getDate() === dueDay) {
          finalStatus = "JATUH TEMPO"; 
      } else if (today.getDate() > dueDay) {
          // Jika hari ini sudah lewat tanggal jatuh tempo di bulan berjalan (dan belum masuk kategori sedang/kritis)
          if (delinquencyMonths <= 0) { // Jika hitungan bulan masih lancar/nol (tapi hari sudah lewat)
              finalStatus = "TERTUNGGAK RINGAN"; 
          }
      }
  }

  c.status = finalStatus;

  // --- 3. FORMATTING (Dipertahankan) ---
  // c.f_installment, c.f_outstanding, c.f_price, etc. (Assume these are handled by formatters util)
  
  // Tambahkan variabel yang diperlukan MasterCollection
  c.computedStatus = finalStatus; // Status yang sudah dihitung
  c.statusColor = getStatusColor(finalStatus); // Warna status
  c.tunggakanBulan = delinquencyMonths;
  
  return c;
}

export function computeCollectionList(list = []) {
  // Note: Dalam integrasi nyata, kita harus memastikan `list` di sini adalah data RAW sebelum normalization
  // Di sini, kita harus memanggil fungsi computeConsumer(item) setelah item dinormalisasi
  return list.map((item) => computeConsumer(item)); 
}

export default {
  computeConsumer,
  computeCollectionList,
  diffDays,
};