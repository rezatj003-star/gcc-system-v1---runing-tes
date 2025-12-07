import React from "react"

export default function StatCard({ title = "", value = "-", color = "bg-white text-slate-900" }) {
  return (
    <div className={`rounded-lg p-4 shadow-sm ${color}`}>
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  )
}
