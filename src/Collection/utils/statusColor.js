// ====================================================== 
// statusColor.js (FINAL PRODUCTION)
// Global Color System for Status Badge
// ======================================================

// Hitung selisih hari dengan jatuh tempo
export function getDueDays(jatuhTempo) {
  if (!jatuhTempo) return null;
  const today = new Date();
  const due = new Date(jatuhTempo);
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

// Backup Status Based on Date (opsional)
// Engine utama menggunakan collectionEngine.js
export function getStatusByDate(status, jatuhTempo) {
  const diff = getDueDays(jatuhTempo);

  if (status === "Lunas") return "Lunas";
  if (status === "Sudah Bayar") return "Sudah Bayar";

  if (!jatuhTempo) return "Belum Bayar";
  if (diff === 0) return "Jatuh Tempo";
  if (diff < 0) return "Belum Bayar";

  if (diff >= 1 && diff <= 30) return "Belum Bayar";
  if (diff >= 31 && diff <= 90) return "Menunggak";
  if (diff > 90) return "Macet";

  return status;
}

// ======================================================
// WARNA STATUS — GLOBAL
// ======================================================
export function getStatusColor(status) {
  const map = {
    "Lunas": "bg-blue-300 border-blue-700 text-black",
    "Sudah Bayar": "bg-green-300 border-green-700 text-black",
    "Jatuh Tempo": "bg-yellow-300 border-yellow-700 text-black",
    "Belum Bayar": "bg-orange-200 border-orange-500 text-black",
    "Menunggak": "bg-pink-300 border-pink-600 text-black",
    "Macet": "bg-red-600 border-red-900 text-white",
  };

  return map[status] || "bg-gray-200 border-gray-400 text-black";
}

// ======================================================
// BADGE STYLE HELPER – Konsistensi UI
// ======================================================
export function getStatusBadge(status) {
  return `
    px-3 py-1 rounded-lg font-bold border-2 
    shadow-sm inline-block ${getStatusColor(status)}
  `;
}