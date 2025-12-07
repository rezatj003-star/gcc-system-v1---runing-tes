import React from "react";
import { Link } from "react-router-dom";
import ModuleLayout from "../layouts/ModuleLayout";

export default function NotFound() {
  return (
    <ModuleLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-5xl font-extrabold text-black mb-4">404</h1>
        <p className="text-gray-700 mb-6">Halaman tidak ditemukan.</p>

        <Link
          to="/menu"
          className="px-4 py-2 bg-yellow-300 border-2 border-black rounded-lg shadow hover:bg-yellow-400 font-bold"
        >
          Kembali ke Menu
        </Link>
      </div>
    </ModuleLayout>
  );
}