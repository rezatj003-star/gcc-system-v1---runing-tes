// src/Collection/components/ConsumerTable.jsx

import React from "react";
import { Link } from "react-router-dom";
// Asumsi getStatusColor sudah diimpor/didefinisikan di tempat yang dapat diakses,
// atau kita harus mendefinisikannya di sini (Saya definisikan di sini untuk memastikan kodenya mandiri).

// ===============================================
// FUNGSI INJEKSI: PENENTU WARNA STATUS BARU
// (Sama seperti di MasterCollection)
// ===============================================
const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    
    // Status Positif/Netral
    if (s === 'LUNAS') return 'bg-gray-700 text-white'; 
    if (s === 'LANCAR') return 'bg-green-500 text-white'; 
    if (s === 'HAMPIR LUNAS') return 'bg-lime-400 text-black'; 
    if (s === 'ANGSURAN BERJALAN') return 'bg-blue-300 text-black'; 

    // Status Peringatan/Tunggakan
    if (s === 'JATUH TEMPO') return 'bg-yellow-500 text-black'; 
    if (s === 'TERTUNGGAK RINGAN') return 'bg-orange-400 text-black';
    if (s === 'TERTUNGGAK SEDANG') return 'bg-orange-700 text-white';

    // Status Koleksi/Macet (Merah)
    if (s === 'TUNGGAKAN KRITIS') return 'bg-red-600 text-white'; 
    if (s === 'KREDIT MACET TOTAL') return 'bg-red-900 text-white'; 
    
    return 'bg-gray-300 text-black'; 
};


// SAFE DATE FORMATTER
const formatDateSafe = (d) => {
  if (!d) return "-";

  // Jika string YYYY-MM-DD
  if (typeof d === "string" && d.includes("-")) return d;

  // Jika Date object
  if (d instanceof Date && !isNaN(d)) {
    return d.toISOString().slice(0, 10);
  }

  // Jika angka 1–31 → dianggap tanggal
  if (typeof d === "number" && d >= 1 && d <= 31) return String(d);

  // Fallback konversi manual
  try {
    const dd = new Date(d);
    if (!isNaN(dd)) return dd.toISOString().slice(0, 10);
  } catch (e) {
    return "-";
  }

  return "-";
};

export default function ConsumerTable({
  consumers = [],
  hideActions = false,
  showArea = false,
  statusColored = false // Kita akan selalu mewarnai sekarang
}) {
  return (
    <table className="w-full table-auto text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-600 border-b">
          <th className="px-3 py-2">No</th>
          <th className="px-3 py-2">Area Blok</th>
          <th className="px-3 py-2">Blok</th>
          <th className="px-3 py-2">Nama Konsumen</th>
          <th className="px-3 py-2">Outstanding</th>
          <th className="px-3 py-2">Nilai Angsuran (Rp)</th>
          <th className="px-3 py-2">Jatuh Tempo</th>
          <th className="px-3 py-2">Status</th>
          {!hideActions && <th className="px-3 py-2">Aksi</th>}
        </tr>
      </thead>

      <tbody>
        {consumers.map((c, idx) => {
          // Menggunakan computedStatus (status profesional) jika ada, atau fallback ke status lama
          const displayStatus = c.computedStatus || c.status || "-"; 
          const statusClass = getStatusColor(displayStatus) + " px-2 py-1 rounded font-bold text-xs";
          
          // Mengambil Jatuh Tempo dari rawDue (Day) atau field lainnya
          const due =
            c.rawDue || c["Jatuh Tempo"]; 
            
          // Nilai Angsuran: Ambil dari Angsuran Aktif (Angsuran_1, Angsuran_2, atau field installment)
          const installmentValue = c.Angsuran_1 || c.installment || 0;
          
          const outstandingValue = c.outstanding || 0;

          return (
            <tr key={c.id || idx} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2">{idx + 1}</td>
              <td className="px-3 py-2">{c.area || "-"}</td>
              <td className="px-3 py-2">{c.blok || "-"}</td>
              <td className="px-3 py-2 font-semibold">{c.name || c.nama || "-"}</td>

              <td className="px-3 py-2 font-bold text-red-600">
                Rp {outstandingValue.toLocaleString("id-ID")}
              </td>

              <td className="px-3 py-2">
                Rp {installmentValue.toLocaleString(
                  "id-ID"
                )}
              </td>

              <td className="px-3 py-2">{formatDateSafe(due)}</td>

              <td className="px-3 py-2">
                {/* STATUS BARU */}
                <span className={statusClass}>{displayStatus}</span>
              </td>

              {!hideActions && (
                <td className="px-3 py-2 flex gap-2 flex-wrap">
                  {/* ACTIONS DIBIARKAN SAMA */}
                  <Link
                    className="text-blue-600 hover:underline"
                    to={`/collection/detail/${c.id || idx}`}
                  >
                    Detail
                  </Link>

                  <button className="text-green-600 hover:underline">
                    Bayar
                  </button>

                  <Link
                    className="text-orange-600 hover:underline"
                    to={`/collection/edit/${c.id || idx}`}
                  >
                    Edit
                  </Link>

                  <button className="text-purple-600 hover:underline">
                    Wa
                  </button>

                  <button className="text-red-600 hover:underline">
                    Hapus
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}