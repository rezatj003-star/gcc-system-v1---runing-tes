"use client";
import React, { useEffect, useMemo, useState } from "react";

// ENGINE BARU (dipakai FullConsumerDetail juga)
import {
  calculateMonthsPaid,
  getRealStatus,
} from "../utils/statusCalculator";

import { getStatusColor } from "../utils/statusColor";

// ==========================
// HELPER FUNCTIONS
// ==========================
const sumAll = (arr = []) =>
  arr.reduce((s, r) => s + Number(r?.Jumlah || 0), 0);

const sumThisMonth = (arr = [], date = new Date()) => {
  const m = date.getMonth();
  const y = date.getFullYear();

  return arr.reduce((s, r) => {
    const d = r?.Tanggal ? new Date(r.Tanggal) : null;
    if (!d) return s;
    if (d.getMonth() === m && d.getFullYear() === y)
      return s + Number(r.Jumlah || 0);
    return s;
  }, 0);
};

export default function PaymentDialog({
  open,
  onClose,
  consumer,
  onSave,
}) {
  if (!open || !consumer) return null;

  // ==========================
  // LOCAL STATE
  // ==========================
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const riwayat = consumer["Riwayat Pembayaran"] || [];

  // ==========================
  // CURRENT PAYMENT CALCULATIONS
  // ==========================
  const totalPaid = useMemo(() => sumAll(riwayat), [riwayat]);

  const paidThisMonth = useMemo(
    () => sumThisMonth(riwayat),
    [riwayat]
  );

  const monthsPaid = useMemo(
    () =>
      calculateMonthsPaid(
        totalPaid,
        Number(consumer["Nilai Angsuran"] || 0)
      ),
    [totalPaid, consumer["Nilai Angsuran"]]
  );

  const autoStatus = useMemo(() => {
    return getRealStatus({
      startDate: consumer["Mulai Cicilan"],
      dueDate: consumer["Jatuh Tempo"],
      outstanding: Number(consumer.Outstanding || 0),
      installment: Number(consumer["Nilai Angsuran"] || 0),
      history: riwayat,
    });
  }, [
    consumer["Mulai Cicilan"],
    consumer["Jatuh Tempo"],
    consumer.Outstanding,
    consumer["Nilai Angsuran"],
    riwayat,
  ]);

  const statusClass = getStatusColor(autoStatus);

  const cicilanKurang =
    Number(amount || 0) < Number(consumer["Nilai Angsuran"] || 0);

  // ==========================
  // HANDLE SAVE PAYMENT
  // ==========================
  const handleSave = () => {
    if (!amount || Number(amount) <= 0) {
      alert("Jumlah pembayaran tidak valid.");
      return;
    }

    if (!date) {
      alert("Tanggal pembayaran wajib diisi.");
      return;
    }

    const newEntry = {
      Tanggal: date,
      Jumlah: Number(amount),
      Catatan: note || "Pembayaran",
    };

    const updatedHistory = [...riwayat, newEntry];

    // ==========================
    // Recalculate AFTER new input
    // ==========================
    const newTotalPaid = sumAll(updatedHistory);
    const newPaidThisMonth = sumThisMonth(updatedHistory);

    const newMonthsPaid = calculateMonthsPaid(
      newTotalPaid,
      Number(consumer["Nilai Angsuran"] || 0)
    );

    const newStatus = getRealStatus({
      startDate: consumer["Mulai Cicilan"],
      dueTime: consumer["Jatuh Tempo"],
      outstanding: Number(consumer.Outstanding || 0),
      installment: Number(consumer["Nilai Angsuran"] || 0),
      history: updatedHistory,
    });

    // Kembalikan ke parent (FullConsumerDetail)
    onSave(updatedHistory, newStatus);
    onClose();
  };

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">

        <h2 className="text-xl font-bold">Tambah Pembayaran</h2>

        {/* STATUS PREVIEW */}
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded font-semibold ${statusClass}`}>
            {autoStatus}
          </span>
          <span className="text-xs text-gray-600">
            Total: Rp {totalPaid.toLocaleString("id-ID")}
          </span>
        </div>

        {/* INPUT TANGGAL */}
        <div>
          <label className="font-semibold">Tanggal</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* INPUT JUMLAH */}
        <div>
          <label className="font-semibold">Jumlah Bayar</label>
          <input
            type="number"
            className="w-full border p-2 rounded"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Rp ..."
          />

          {amount && cicilanKurang && (
            <p className="text-red-600 text-xs mt-1">
              ⚠ Jumlah kurang dari nilai angsuran bulan ini.
            </p>
          )}
        </div>

        {/* INPUT CATATAN */}
        <div>
          <label className="font-semibold">Catatan (Opsional)</label>
          <input
            className="w-full border p-2 rounded"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: transfer, bayar sebagian"
          />
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            className="bg-gray-300 px-4 py-2 rounded border border-black"
            onClick={onClose}
          >
            Batal
          </button>

          <button
            className="bg-green-600 text-white px-4 py-2 rounded border border-black"
            onClick={handleSave}
          >
            Simpan
          </button>
        </div>

      </div>
    </div>
  );
}