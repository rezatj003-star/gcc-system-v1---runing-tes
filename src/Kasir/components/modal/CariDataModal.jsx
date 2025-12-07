// src/Kasir/components/modal/CariDataModal.jsx
// CariData dari LAPORAN (induk master)
import React, { useEffect, useState } from "react";
import { api } from "/src/api";

export default function CariDataModal({ onClose = () => {}, onSelect = () => {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // =============== AMBIL DATA HANYA DARI /laporan ===============
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await api.kasir.get("/laporan?_sort=createdAt&_order=desc");
        setData(r.data || []);
      } catch (err) {
        console.error("Gagal load laporan:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ====================== FILTER PENCARIAN ======================
  const filtered = data.filter((d) => {
    if (!q) return true;
    const x = q.toLowerCase();
    return (
      (d.noKwi || "").toLowerCase().includes(x) ||
      (d.namaKonsumen || d.NamaKonsumen || "").toLowerCase().includes(x) ||
      (d.blok || d.Blok || "").toLowerCase().includes(x) ||
      String(d.kav || d.NoRumah || "").includes(x) ||
      String(d.lb || d.LB || "").includes(x) ||
      String(d.lt || d.LT || "").includes(x) ||
      (d.noHP || d.NoHP || "").includes(x) ||
      (d.noKTP || d.NoKTP || "").includes(x)
    );
  });

  const handleSelect = (row) => {
    // Map data dari laporan ke format yang diharapkan popup
    onSelect({
      namaKons: row.namaKonsumen || row.NamaKonsumen || "",
      NamaKonsumen: row.namaKonsumen || row.NamaKonsumen || "",
      blok: row.blok || row.Blok || "",
      Blok: row.blok || row.Blok || "",
      kav: row.kav || row.NoRumah || "",
      NoRumah: row.kav || row.NoRumah || "",
      lb: row.lb || row.LB || "",
      LB: row.lb || row.LB || "",
      lt: row.lt || row.LT || "",
      LT: row.lt || row.LT || "",
      no_hp: row.noHP || row.NoHP || "",
      NoHP: row.noHP || row.NoHP || "",
      no_ktp: row.noKTP || row.NoKTP || "",
      NoKTP: row.noKTP || row.NoKTP || "",
      nm_mkt: row.marketing || row.Marketing || "",
      Marketing: row.marketing || row.Marketing || "",
      jnsKons: row.jenisKonsumen || row.JenisKonsumen || "Umum",
      JenisKonsumen: row.jenisKonsumen || row.JenisKonsumen || "Umum",
      // Hitung angsuran ke- berikutnya (jika ada data sebelumnya)
      cicilanTerakhir: row.angsuranKe ? Number(row.angsuranKe) : 0,
    });
  };

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="modal-card max-w-6xl w-full bg-white rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] p-6">
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-2xl">🔍 Cari Data Konsumen</h3>
          <div className="flex gap-2">
            <input
              className="bb-input flex-1"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari Nama / NoKwi / Blok / Kav / HP / KTP..."
            />
            <button 
              className="bb-btn bb-btn-secondary"
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Memuat data...</div>
        ) : (
          <div className="bb-table-wrapper max-h-96 overflow-auto border-2 border-black">
            <table className="bb-table w-full">
              <thead>
                <tr>
                  <th>NoKwi</th>
                  <th>Nama</th>
                  <th>Jenis</th>
                  <th>Blok</th>
                  <th>Kav</th>
                  <th>LB</th>
                  <th>LT</th>
                  <th>HP</th>
                  <th>KTP</th>
                  <th>Marketing</th>
                  <th>Angsuran Ke-</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-4 text-gray-500">
                      {q ? "Tidak ada data yang cocok" : "Tidak ada data"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id || r.noKwi}>
                      <td className="font-bold">{r.noKwi || "-"}</td>
                      <td>{r.namaKonsumen || r.NamaKonsumen || "-"}</td>
                      <td>{r.jenisKonsumen || r.JenisKonsumen || "-"}</td>
                      <td>{r.blok || r.Blok || "-"}</td>
                      <td>{r.kav || r.NoRumah || "-"}</td>
                      <td>{r.lb || r.LB || "-"}</td>
                      <td>{r.lt || r.LT || "-"}</td>
                      <td>{r.noHP || r.NoHP || "-"}</td>
                      <td>{r.noKTP || r.NoKTP || "-"}</td>
                      <td>{r.marketing || r.Marketing || "-"}</td>
                      <td>{r.angsuranKe || "-"}</td>
                      <td>
                        <button
                          className="bb-btn bb-btn-primary bb-btn-small"
                          onClick={() => {
                            handleSelect(r);
                            onClose();
                          }}
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-600 text-center">
          Sumber data: <strong>Laporan Kasir</strong> (Induk Master)
        </div>

      </div>
    </div>
  );
}
