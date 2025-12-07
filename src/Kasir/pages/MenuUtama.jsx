/**
 * MenuUtama Kasir - Modern Menu dengan 5 Menu Utama
 * CashIn, TukarKwi, Laporan, LaporanCancel, CetakKwi (POPUP)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModuleLayout from "../../layouts/ModuleLayout";
import CashInPopup from "../components/popup/CashInPopup";
import TukarKwiPopup from "../components/popup/TukarKwiPopup";
// 🔥 IMPORT POPUP BARU
import CetakKwiPopup from "../components/popup/CetakKwiPopup"; 
import { getLaporanKasir } from "../../api";

export default function MenuUtama() {
  const navigate = useNavigate();
  
  // STATE POPUP
  const [showCashIn, setShowCashIn] = useState(false);
  const [showTukarKwi, setShowTukarKwi] = useState(false);
  // 🔥 STATE POPUP CETAK
  const [showCetakKwi, setShowCetakKwi] = useState(false); 
  
  // STATISTIK
  const [stats, setStats] = useState({
    totalTransaksi: 0,
    totalCashIn: 0,
    totalTukarKwi: 0,
    totalCancel: 0,
  });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); 
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await getLaporanKasir();
      const all = Array.isArray(data) ? data : [];
      
      const cashIn = all.filter(r => r.jnsTrx === "CASH IN" || r.jenisTransaksi === "TUNAI");
      const tukarKwi = all.filter(r => r.jnsTrx === "TUKAR KWI" || r.jenisTransaksi === "TRANSFER");
      const cancel = all.filter(r => r.status === "Cancel" || r.status === "Ganti Nama");
      
      setStats({
        totalTransaksi: all.length,
        totalCashIn: cashIn.length,
        totalTukarKwi: tukarKwi.length,
        totalCancel: cancel.length,
      });
    } catch (err) {
      console.error("Gagal load stats:", err);
    }
  };

  const menuItems = [
    {
      id: "cashin",
      label: "CashIn",
      icon: "💰",
      color: "bg-green-200",
      hoverColor: "hover:bg-green-300",
      description: "Input Transaksi TUNAI",
      onClick: () => setShowCashIn(true),
    },
    {
      id: "tukarkwi",
      label: "TukarKwi",
      icon: "🔄",
      color: "bg-blue-200",
      hoverColor: "hover:bg-blue-300",
      description: "Input Transaksi TRANSFER",
      onClick: () => setShowTukarKwi(true),
    },
    {
      id: "laporan",
      label: "Laporan",
      icon: "📊",
      color: "bg-yellow-200",
      hoverColor: "hover:bg-yellow-300",
      description: "Induk Master Data Kasir",
      onClick: () => navigate("/kasir/laporan"),
    },
    {
      id: "laporancancel",
      label: "LaporanCancel",
      icon: "❌",
      color: "bg-red-200",
      hoverColor: "hover:bg-red-300",
      description: "Data Cancel & Ganti Nama",
      onClick: () => navigate("/kasir/laporanCancel"),
    },
    {
      id: "cetakkwi",
      label: "CetakKwi",
      icon: "🖨️",
      color: "bg-purple-200",
      hoverColor: "hover:bg-purple-300",
      description: "Cetak Kwitansi (Popup)",
      // 🔥 UBAH NAVIGATE JADI OPEN POPUP
      onClick: () => setShowCetakKwi(true), 
    },
  ];

  return (
    <ModuleLayout>
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">MODULE KASIR</h1>
            <p className="text-gray-600 font-semibold">Sistem Keuangan Perumahan Properti</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Transaksi" value={stats.totalTransaksi} icon="📈" color="bg-blue-100 border-blue-400" />
            <StatCard title="Cash In" value={stats.totalCashIn} icon="💰" color="bg-green-100 border-green-400" />
            <StatCard title="Tukar Kwi" value={stats.totalTukarKwi} icon="🔄" color="bg-yellow-100 border-yellow-400" />
            <StatCard title="Cancel" value={stats.totalCancel} icon="❌" color="bg-red-100 border-red-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <MenuCard
                key={item.id}
                label={item.label}
                icon={item.icon}
                description={item.description}
                color={item.color}
                hoverColor={item.hoverColor}
                onClick={item.onClick}
              />
            ))}
          </div>

          <div className="mt-8 bg-white rounded-lg border-4 border-black shadow-[6px_6px_0px_#000] p-6">
            <h3 className="text-xl font-bold mb-4">📋 Informasi Sistem</h3>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">• <strong>CashIn:</strong> Input transaksi TUNAI → Simpan ke cashIn + laporan + kwitansi</p>
              <p className="font-semibold">• <strong>TukarKwi:</strong> Input transaksi TRANSFER → Simpan ke tukarKwi + laporan + kwitansi</p>
              <p className="font-semibold">• <strong>Laporan:</strong> Induk master semua data kasir</p>
              <p className="font-semibold">• <strong>CetakKwi:</strong> Cari & Print kwitansi cepat via Popup</p>
            </div>
          </div>
        </div>

        {/* --- AREA POPUP --- */}
        {showCashIn && (
          <CashInPopup
            isOpen={showCashIn}
            onClose={(reload) => {
              setShowCashIn(false);
              if (reload) loadStats();
            }}
          />
        )}

        {showTukarKwi && (
          <TukarKwiPopup
            isOpen={showTukarKwi}
            onClose={(reload) => {
              setShowTukarKwi(false);
              if (reload) loadStats();
            }}
          />
        )}

        {/* 🔥 RENDER POPUP CETAK KWI */}
        {showCetakKwi && (
          <CetakKwiPopup
            isOpen={showCetakKwi}
            onClose={() => setShowCetakKwi(false)}
          />
        )}

      </div>
    </ModuleLayout>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`${color} p-4 rounded-lg border-4 border-black shadow-[4px_4px_0px_#000]`}>
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm text-gray-700 font-bold">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function MenuCard({ label, icon, description, color, hoverColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        ${color} ${hoverColor}
        p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_#000]
        transition-all transform hover:-translate-x-1 hover:-translate-y-1
        text-left w-full
      `}
    >
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-2">{label}</h3>
      <p className="text-sm text-gray-700 font-semibold">{description}</p>
    </button>
  );
}