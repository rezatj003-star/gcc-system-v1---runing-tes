import React, { useEffect, useState } from "react";
import { api } from "/src/api";

export default function LaporanCashOut() {
  const [data, setData] = useState([]);

  // === Ambil data dari API CashOut ===
  const loadData = async () => {
    try {
      const res = await api.kasir.get("/cashOut");
      const list = res.data || [];

      // beri nomor urut otomatis
      const sorted = list.map((item, index) => ({
        ...item,
        no: index + 1
      }));

      setData(sorted);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-center text-xl font-bold">PT. GREEN CONTRUCTION CITY</h1>
      <h2 className="text-center text-lg font-bold mt-1">CASH OUT</h2>
      <h3 className="text-center text-md font-semibold mb-6">
        TANGGAL {new Date().toLocaleDateString("id-ID")}
      </h3>

      <div className="overflow-auto border border-gray-500">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 text-black font-bold text-sm">
              <th className="border px-2 py-2 w-10 text-center">No.</th>
              <th className="border px-2 py-2 w-40">Tanggal Kwitansi</th>
              <th className="border px-2 py-2 w-40">Report</th>
              <th className="border px-2 py-2 w-48">Nama Penerima</th>
              <th className="border px-2 py-2 w-60">Keterangan</th>
              <th className="border px-2 py-2 w-40 text-right">Nominal</th>
              <th className="border px-2 py-2 w-32 text-center">Checker</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-gray-50 text-sm">

                <td className="border px-2 py-1 text-center">{row.no}</td>

                <td className="border px-2 py-1">{row.tanggal}</td>

                <td className="border px-2 py-1">{row.longDate}</td>

                <td className="border px-2 py-1">{row.penerima}</td>

                <td className="border px-2 py-1">{row.keterangan}</td>

                <td className="border px-2 py-1 text-right">
                  {row.nominal?.toLocaleString("id-ID")}
                </td>

                <td className="border px-2 py-1 text-center">{row.admin}</td>

              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-400">
                  Tidak ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}