import { Link } from "react-router-dom"

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-100">
      <div className="text-center max-w-md bg-white p-10 rounded-2xl border-2 border-black shadow-[6px_6px_0px_#000]">
        <div className="text-9xl font-black text-red-600 mb-4">403</div>
        <h1 className="text-3xl font-black mb-2">Akses Ditolak</h1>
        <p className="text-gray-700 mb-6">Anda tidak memiliki izin untuk mengakses halaman ini.</p>

        <div className="flex gap-4 justify-center">
          <Link to="/menu" className="btn">Kembali ke Menu</Link>
          <Link to="/login" className="btn btn-blue">Login Ulang</Link>
        </div>
      </div>
    </div>
  )
}