// src/Collection/utils/formatters.js

/**
 * Format angka menjadi Rupiah lokal Indonesia.
 * Contoh: 1200000 → "Rp 1.200.000"
 */
export function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "Rp 0";
  const num = Number(value) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

/**
 * Format angka tanpa "Rp", hanya pemisah ribuan.
 * Contoh: 1200000 → "1.200.000"
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "0";
  const num = Number(value) || 0;
  return num.toLocaleString("id-ID");
}

/**
 * Parse string "Rp 1.200.000" → 1200000
 */
export function parseRupiah(str) {
  if (typeof str === "number") return str;
  if (!str) return 0;

  return Number(String(str).replace(/[^0-9-]+/g, "")) || 0;
}

/**
 * Format tanggal menjadi format lokal.
 * Contoh: "2025-02-01" → "1 Februari 2025"
 */
export function formatDate(date) {
  if (!date) return "-";

  const d = new Date(date);
  if (isNaN(d)) return "-";

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format status dengan fallback
 */
export function formatStatus(status) {
  return status || "Belum Bayar";
}

/**
 * Safe string → menghindari undefined/null di UI
 */
export function safe(str) {
  return str && str !== "undefined" && str !== "null" ? str : "-";
}

// Shorthand used across older code (kept for backward compatibility)
export const fmt = formatNumber