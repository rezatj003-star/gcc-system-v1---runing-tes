import React, { useEffect, useState } from "react";
import ModuleLayout from "/src/layouts/ModuleLayout";
import { api } from "/src/api";
import { fmt } from "/src/Collection/utils/formatters"; // Asumsi formatters ada di path ini

export default function LaporanCancel() {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 🔥 RESMI — AMBIL DARI SATU SUMBER LAPORAN CANCEL TERPUSAT
      const res = await api.kasir.get("/laporanCancel?_sort=cancelledAt&_order=desc");
      const list = res.data || [];

      // Mapping data agar sesuai tampilan tabel
      const mapped = list.map((r, i) => ({
        ...r,
        Tanggal: r.tglKwi || r.cancelledAt?.slice(0, 10) || "-",
        Nilai: r.nilaiRp || 0,
        JenisTrx: r.jnsTrx || "-",
        Keterangan: r.alasan || r.cancelReason || r.ket1 || r.ket2 || "-",
        Admin: r.cancelledBy || r.adminlog || "-",
      }));

      setRows(mapped);
    } catch (err) {
      console.error("Gagal load cancel:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter(r => 
    (r.noKwi || "").toLowerCase().includes(q.toLowerCase()) || 
    (r.namaKonsumen || r.namaKons || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <ModuleLayout>
      <div className="p-6">

        <h2 className="text-3xl font-black mb-4">❌ LAPORAN CANCEL / REFUND</h2>
        
        <div className="mb-4 flex gap-2">
            <input 
                className="border-2 border-black p-2 rounded w-64" 
                placeholder="Cari No Kwi / Nama Konsumen..." 
                value={q} 
                onChange={e => setQ(e.target.value)}
            />
            <button onClick={loadData} className="bg-cyan-300 border-2 border-black px-4 py-2 rounded font-bold">🔄 Refresh</button>
        </div>


        <div className="bb-table-wrapper border-2 border-black rounded-lg overflow-x-auto">
          {loading ? (
             <div className="p-6 text-center font-bold text-gray-500">Memuat data...</div>
          ) : (
            <table className="bb-table w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-center">No</th>
                  <th>Tgl Cancel</th>
                  <th>No Kwitansi</th>
                  <th>Nama Konsumen</th>
                  <th className="text-right">Nilai</th>
                  <th>Jenis Trx</th>
                  <th>Alasan / Keterangan</th>
                  <th>Admin</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-3 text-gray-500">
                      Tidak ada data cancel ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="p-2 text-center">{i + 1}</td>
                      <td>{r.Tanggal}</td>
                      <td className="font-bold text-red-700">{r.noKwi}</td>
                      <td>{r.namaKonsumen || r.namaKons}</td>
                      <td className="text-right font-bold text-red-600">Rp {fmt(r.Nilai)}</td>
                      <td>{r.JenisTrx}</td>
                      <td>{r.Keterangan}</td>
                      <td>{r.Admin}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}