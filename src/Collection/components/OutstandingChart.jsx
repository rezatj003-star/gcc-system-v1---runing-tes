// src/Collection/components/OutstandingChart.jsx
import React from "react";

export default function OutstandingChart({ consumers = [] }) {
  const total = consumers.reduce((sum, c) => {
    const val =
      Number(c.outstanding) ||
      Number(c["Outstanding"]) ||
      Number(c["Outstanding Sekarang"]) ||
      0;
    return sum + val;
  }, 0);

  return (
    <div className="h-full flex flex-col justify-center items-center">
      <div className="text-sm text-gray-600">Outstanding Total</div>

      <div className="text-3xl font-bold text-indigo-600 mt-2">
        Rp {total.toLocaleString("id-ID")}
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {consumers.length} pelanggan
      </div>
    </div>
  );
}