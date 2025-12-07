export default function BrutStatusBadge({ status }) {
  const base = "px-3 py-1 rounded-lg border-2 border-black font-bold shadow-[2px_2px_0px_#000]"

  const colors = {
    "Belum Bayar": "bg-red-300",
    "Menunggak": "bg-orange-300",
    "Jatuh Tempo": "bg-yellow-300",
    "Sudah Bayar": "bg-green-300",
    "Lunas": "bg-blue-300",
  }

  return (
    <span className={`${base} ${colors[status] || "bg-gray-200"}`}>
      {status}
    </span>
  )
}