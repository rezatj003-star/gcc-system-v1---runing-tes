// ========================================================
// STATUS ENGINE FINAL — Lancar, Belum Bayar, Jatuh Tempo (H), Macet, Macet Total
// ========================================================

export function extractDueDay(dueDate) {
  if (!dueDate && dueDate !== 0) return null;
  const s = String(dueDate).trim();
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 31 ? n : null;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getDate();
}

function parseDateSafe(s) {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  const m = String(s).trim().match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return new Date(yyyy + "-" + mm + "-" + dd);
  }
  return null;
}

function sumHistory(history = []) {
  if (!Array.isArray(history)) return 0;
  return history.reduce((s, r) => s + Number(r?.Jumlah || r?.jumlah || r?.nominal || 0), 0);
}

function sortedHistory(history = []) {
  return [...history].sort((a, b) => {
    const da = parseDateSafe(a?.Tanggal || a?.tanggal || a?.date || "");
    const db = parseDateSafe(b?.Tanggal || b?.tanggal || b?.date || "");
    if (!da && !db) return 0;
    if (!da) return -1;
    if (!db) return 1;
    return da - db;
  });
}

function setDayOfMonth(dateObj, day) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, Number(day)), lastDay);
  return new Date(y, m, safeDay);
}

// ========================================================
// STATUS COLOR — tấtap dipakai di semua halaman
// ========================================================
export const STATUS_COLOR = {
  "Lancar": "bg-green-600 text-white",
  "Belum Bayar": "bg-yellow-300 text-black",
  "Jatuh Tempo": "bg-orange-400 text-black",
  "Macet": "bg-red-500 text-white",
  "Macet Total": "bg-red-900 text-white",
};

export function getStatusColor(status) {
  return STATUS_COLOR[status] || "bg-gray-300 text-black";
}

// =========================================
//  HITUNG BULAN TERBAYAR
// =========================================
export function calculateMonthsPaid(amount, installment) {
  const am = Number(amount || 0);
  const ins = Number(installment || 0);
  if (!ins || ins <= 0) return 0;
  return Math.floor(am / ins);
}

// ========================================================
//     STATUS ENGINE FINAL
// ========================================================

export function getRealStatus({ startDate, dueDate, outstanding, installment, history }) {
  if (!startDate) return "Belum Bayar";

  const instal = Number(installment || 0);
  const out = Number(outstanding || 0);
  const start = parseDateSafe(startDate);
  if (!start) return "Belum Bayar";

  const hist = sortedHistory(history || []);
  const totalPaid = sumHistory(hist);

  const today = new Date();
  const dueDay = extractDueDay(dueDate) || start.getDate();

  // ====================
  // LANCAR CHECK
  // ====================
  const monthsPassed = Math.max(
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth()),
    0
  );

  const totalShouldPaid = monthsPassed * instal;

  if (totalPaid >= totalShouldPaid) {
    return "Lancar";
  }

  if (out <= 0) return "Lancar";

  // ====================
  // JATUH TEMPO — HARI H
  // ====================
  if (today.getDate() === dueDay) {
    return "Jatuh Tempo";
  }

  // ====================
  // HITUNG KETERLAMBATAN
  // ====================
  const currentDueDate = setDayOfMonth(new Date(today.getFullYear(), today.getMonth(), 1), dueDay);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLate = Math.floor((today - currentDueDate) / msPerDay);

  // Belum masuk hari H
  if (daysLate < 0) {
    return "Belum Bayar";
  }

  // ====================
  // MACET & MACET TOTAL
  // ====================
  if (daysLate >= 60 && daysLate <= 90) {
    return "Macet";
  }

  if (daysLate > 90) {
    return "Macet Total";
  }

  // ====================
  // DEFAULT: BELUM BAYAR
  // ====================
  return "Belum Bayar";
}