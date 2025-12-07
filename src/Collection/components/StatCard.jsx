// src/Collection/components/StatCard.jsx
import React from "react";

export default function StatCard({
  label,
  value,
  bg = "bg-yellow-300",
  border = "border-black",
  onClick,
}) {
  const displayValue =
    value === null || value === undefined
      ? "0"
      : Number(value).toLocaleString("id-ID");

  return (
    <div
      onClick={onClick}
      className={`
        ${bg} ${border}
        border-2 rounded-xl p-5 cursor-pointer
        transition-all duration-150
        shadow-[4px_4px_0px_#000]
        hover:translate-x-[-3px] hover:translate-y-[-3px]
        hover:shadow-[7px_7px_0px_#000]
      `}
    >
      <p className="text-sm font-semibold uppercase tracking-wide">
        {label}
      </p>

      <h2 className="mt-2 text-3xl font-black">
        {displayValue}
      </h2>
    </div>
  );
}