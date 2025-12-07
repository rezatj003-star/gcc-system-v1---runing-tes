import React, { useEffect, useState } from "react";
import ModuleLayout from "../../layouts/ModuleLayout";
import { api } from "../../api";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function terbilang(n) {
  const angka = ["", "SATU", "DUA", "TIGA", "EMPAT", "LIMA", "ENAM", "TUJUH", "DELAPAN", "SEMBILAN"];
  const belasan = ["SEPULUH", "SEBELAS", "DUA BELAS", "TIGA BELAS", "EMPAT BELAS", "LIMA BELAS", "ENAM BELAS", "TUJUH BELAS", "DELAPAN BELAS", "SEMBILAN BELAS"];
  
  if (n < 10) return angka[n];
  if (n < 20) return belasan[n - 10];
  if (n < 100) return angka[Math.floor(n / 10)] + " PULUH " + terbilang(n % 10);
  if (n < 200) return "SERATUS " + terbilang(n - 100);
  if (n < 1000) return angka[Math.floor(n / 100)] + " RATUS " + terbilang(n % 100);
  if (n < 2000) return "SERIBU " + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " RIBU " + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " JUTA " + terbilang(n % 1000000);
  return terbilang(Math.floor(n / 1000000000)) + " MILYAR " + terbilang(n % 1000000000);
}

export default function KwitansiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await api.kasir.get("/kwitansi?_sort=createdAt&_order=desc");
      const list = res.data || [];

      const mapped = list.map(r => ({
        ...r,
        id: r.id || r._id || "-", // Pastikan ID ada
        TglReport: r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "-"
      }));

      setData(mapped);
    } catch (err) {
      console.error("Gagal load kwitansi:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = data.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (r.noKwi || "").toLowerCase().includes(s) ||
      (r.namaKonsumen || r.namaKons || "").toLowerCase().includes(s) ||
      (r.blok || "").toLowerCase().includes(s)
    );
  });

  const handlePrint = async (kwitansi) => {
    try {
      const doc = new jsPDF("portrait", "mm", [210, 297]); 
      
      // ... (Bagian Print Logic Sama seperti sebelumnya) ...
      // Biar code ga kepanjangan, logic print tidak saya ubah
      
      doc.setFillColor(34, 197, 94); 
      doc.circle(30, 20, 15, "F");
      doc.setFontSize(8);
      doc.text("GREEN", 30, 18, { align: "center" });
      doc.text("CONSTRUCTION", 30, 21, { align: "center" });
      doc.text("CITY", 30, 24, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PT. GREEN CONSTRUCTION CITY", 60, 20);

      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(140, 10, 60, 25);
      doc.setFontSize(8);
      doc.text("Nama Proyek: GCC...", 142, 15);
      doc.text(`No. Kav: ${kwitansi.blok || ""} ${kwitansi.kav || ""}`, 142, 19);
      doc.text(`Luas Bangunan: ${kwitansi.lb || ""}`, 142, 23);
      doc.text(`Luas Tanah: ${kwitansi.lt || ""}`, 142, 27);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`No. : ${kwitansi.noKwi || ""}`, 105, 40, { align: "center" });

      try {
        const qrData = await QRCode.toDataURL(kwitansi.noKwi || "");
        doc.addImage(qrData, "PNG", 15, 45, 30, 30);
      } catch (e) {
        console.error("QR Code error:", e);
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Telah terima dari : ${kwitansi.namaKonsumen || kwitansi.namaKons || ""}`, 15, 80);
      if (kwitansi.noHP || kwitansi.no_hp) {
        doc.text(`${kwitansi.noHP || kwitansi.no_hp}`, 15, 85);
      }

      const nilai = Number(kwitansi.nilaiRp || 0);
      const terbilangText = terbilang(nilai).replace(/\s+/g, " ");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Uang Sejumlah : ${terbilangText} RUPIAH`, 15, 95);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const ket1 = kwitansi.ket1 || "";
      const ket2 = kwitansi.ket2 || "";
      const ket3 = kwitansi.ket3 || "";
      doc.text(`Untuk Pembayaran : ${ket1}`, 15, 105);
      if (ket2) { doc.text(ket2, 15, 110); }
      if (ket3) { doc.text(`REF: ${ket3}`, 15, 115); }

      const tgl = kwitansi.tglKwi ? new Date(kwitansi.tglKwi) : new Date();
      const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"];
      doc.text(`Bogor, ${tgl.getDate()}. ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`, 15, 250);

      doc.setFillColor(34, 197, 94);
      doc.circle(180, 260, 12, "F");
      doc.setFontSize(6);
      doc.text("GREEN", 180, 258, { align: "center" });
      doc.text("CONSTRUCTION", 180, 261, { align: "center" });
      doc.text("CITY", 180, 264, { align: "center" });
      doc.setFontSize(5);
      doc.text("KEUANGAN", 180, 267, { align: "center" });
      doc.text(kwitansi.admin || kwitansi.adminlog || "HADI", 180, 270, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Rp. ${fmt(nilai)}`, 15, 280);

      doc.save(`Kwitansi_${kwitansi.noKwi || "unknown"}.pdf`);
    } catch (err) {
      console.error("Print error:", err);
      alert("Gagal mencetak kwitansi");
    }
  };

  return (
    <ModuleLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">🖨️ CETAK KWITANSI</h1>
          <div className="flex gap-2">
            <input
              className="bb-input w-64"
              placeholder="🔍 Cari NoKwi / Nama..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="bb-btn bb-btn-secondary" onClick={fetchData}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="bb-card overflow-hidden">
          <div className="bb-table-wrapper overflow-auto">
            <table className="bb-table w-full">
              <thead>
                <tr>
                  <th className="w-10 text-center">No</th>
                  {/* 🔥 UPDATE: Kolom ID */}
                  <th className="w-16 text-center">ID</th>
                  <th>Tgl Report</th>
                  <th>No Kwitansi</th>
                  <th>Tanggal</th>
                  <th>Nama Konsumen</th>
                  <th>Blok/Kav</th>
                  <th>LB/LT</th>
                  <th>Nilai Rp</th>
                  <th>Ket1</th>
                  <th>Ket2</th>
                  <th>Ket3</th>
                  <th>Marketing</th>
                  <th>Admin</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} className="p-6 text-center">⏳ Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={15} className="p-6 text-center text-gray-500">📭 Tidak ada data kwitansi</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="text-center">{i + 1}</td>
                      
                      {/* 🔥 UPDATE: Value ID (substring biar ga kepanjangan) */}
                      <td className="text-[10px] text-gray-400 text-center select-all">
                        {r.id.substring(0, 6)}...
                      </td>

                      <td className="text-gray-600 font-semibold">{r.TglReport}</td>
                      <td className="font-bold">{r.noKwi || "-"}</td>
                      <td>{r.tglKwi || "-"}</td>
                      <td className="font-semibold">{r.namaKonsumen || r.namaKons || "-"}</td>
                      <td>{r.blok || "-"} / {r.kav || "-"}</td>
                      <td>{r.lb || "-"} / {r.lt || "-"}</td>
                      <td className="text-right font-bold text-green-600">Rp {fmt(r.nilaiRp)}</td>
                      <td className="text-xs">{r.ket1 || "-"}</td>
                      <td className="text-xs">{r.ket2 || "-"}</td>
                      <td className="text-xs">{r.ket3 || "-"}</td>
                      <td>{r.marketing || r.nm_mkt || "-"}</td>
                      <td>{r.admin || r.adminlog || "-"}</td>
                      <td>
                        <button className="bb-btn bb-btn-primary bb-btn-small" onClick={() => handlePrint(r)}>
                          🖨️ Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="bb-card bg-yellow-50 border-yellow-300 p-4">
            <p className="text-sm font-bold">ℹ️ Data diambil Read-Only dari database Kwitansi.</p>
        </div>
      </div>
    </ModuleLayout>
  );
}