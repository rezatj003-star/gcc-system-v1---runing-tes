import React, { useState, useEffect } from "react";
import { api } from "../../../api"; 
import jsPDF from "jspdf";
import QRCode from "qrcode";

// --- Logic Terbilang & Format ---
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

export default function CetakKwiPopup({ isOpen, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  async function fetchData() {
    setLoading(true);
    try {
      // Ambil 50 data terbaru aja biar enteng di popup
      const res = await api.kasir.get("/kwitansi?_sort=createdAt&_order=desc&_limit=50");
      setData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filter Search
  const filtered = data.filter(r => 
    (r.noKwi || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.namaKonsumen || r.namaKons || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.blok || "").toLowerCase().includes(q.toLowerCase())
  );

  // --- Logic Print PDF (Sama Persis) ---
  const handlePrint = async (kwitansi) => {
    try {
      const doc = new jsPDF("portrait", "mm", [210, 297]);
      
      doc.setFillColor(34, 197, 94); doc.circle(30, 20, 15, "F");
      doc.setFontSize(8);
      doc.text("GREEN", 30, 18, { align: "center" });
      doc.text("CONSTRUCTION", 30, 21, { align: "center" });
      doc.text("CITY", 30, 24, { align: "center" });

      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("PT. GREEN CONSTRUCTION CITY", 60, 20);

      doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(140, 10, 60, 25);
      doc.setFontSize(8);
      doc.text("Nama Proyek: GCC...", 142, 15);
      doc.text(`No. Kav: ${kwitansi.blok || ""} ${kwitansi.kav || ""}`, 142, 19);
      doc.text(`Luas Bangunan: ${kwitansi.lb || ""}`, 142, 23);
      doc.text(`Luas Tanah: ${kwitansi.lt || ""}`, 142, 27);

      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text(`No. : ${kwitansi.noKwi || ""}`, 105, 40, { align: "center" });

      try {
        const qrData = await QRCode.toDataURL(kwitansi.noKwi || "");
        doc.addImage(qrData, "PNG", 15, 45, 30, 30);
      } catch (e) {}

      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Telah terima dari : ${kwitansi.namaKonsumen || kwitansi.namaKons || ""}`, 15, 80);
      if (kwitansi.noHP) doc.text(`${kwitansi.noHP}`, 15, 85);

      const nilai = Number(kwitansi.nilaiRp || 0);
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(`Uang Sejumlah : ${terbilang(nilai).replace(/\s+/g, " ")} RUPIAH`, 15, 95);

      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Untuk Pembayaran : ${kwitansi.ket1 || ""}`, 15, 105);
      if (kwitansi.ket2) doc.text(kwitansi.ket2, 15, 110);
      if (kwitansi.ket3) doc.text(`REF: ${kwitansi.ket3}`, 15, 115);

      const tgl = kwitansi.tglKwi ? new Date(kwitansi.tglKwi) : new Date();
      const bln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"];
      doc.text(`Bogor, ${tgl.getDate()}. ${bln[tgl.getMonth()]} ${tgl.getFullYear()}`, 15, 250);

      doc.setFillColor(34, 197, 94); doc.circle(180, 260, 12, "F");
      doc.setFontSize(6);
      doc.text("GREEN", 180, 258, { align: "center" });
      doc.text("CONSTRUCTION", 180, 261, { align: "center" });
      doc.text("CITY", 180, 264, { align: "center" });
      doc.setFontSize(5); doc.text("KEUANGAN", 180, 267, { align: "center" });
      doc.text(kwitansi.admin || "HADI", 180, 270, { align: "center" });

      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text(`Rp. ${fmt(nilai)}`, 15, 280);

      doc.save(`Kwitansi_${kwitansi.noKwi}.pdf`);
    } catch (err) {
      alert("Gagal print");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border-4 border-black overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-purple-200 p-4 border-b-4 border-black flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase italic tracking-wider">🖨️ Cari & Cetak Kwitansi</h2>
          <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-lg font-bold border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none">X</button>
        </div>

        {/* Search */}
        <div className="p-4 bg-purple-50 border-b-2 border-gray-200">
            <input 
                className="w-full px-4 py-3 text-lg font-bold border-2 border-black rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-300 uppercase"
                placeholder="🔍 Ketik No Kwitansi / Nama Konsumen / Blok..."
                value={q}
                onChange={e => setQ(e.target.value)}
                autoFocus
            />
        </div>

        {/* List Data */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {loading ? (
                <div className="text-center py-10 font-bold text-gray-500">⏳ Memuat data...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10 font-bold text-gray-400">❌ Data tidak ditemukan</div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((r, i) => (
                        <div key={i} className="bg-white p-3 rounded-lg border-2 border-gray-300 hover:border-purple-500 shadow-sm flex justify-between items-center group transition-all">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-lg text-purple-700">{r.noKwi}</span>
                                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-bold">{r.tglKwi}</span>
                                </div>
                                <div className="text-sm font-bold text-gray-700 uppercase">{r.namaKonsumen || r.namaKons}</div>
                                <div className="text-xs text-gray-500 font-semibold">
                                    {r.blok} / {r.kav} • Rp {fmt(r.nilaiRp)}
                                </div>
                            </div>
                            <button 
                                onClick={() => handlePrint(r)}
                                className="bg-yellow-300 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg border-2 border-black font-bold shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none flex items-center gap-2"
                            >
                                🖨️ CETAK
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="p-2 bg-gray-100 text-center text-xs font-bold text-gray-500 border-t-2 border-black">
            Menampilkan 50 data terbaru. Gunakan pencarian untuk hasil spesifik.
        </div>
      </div>
    </div>
  );
}