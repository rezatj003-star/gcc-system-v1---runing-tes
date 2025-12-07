// src/pages/ModuleSelect.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { getAuthData } from "../utils/auth";

/**
 * Module selector shown after login. Sets localStorage.currentModule then navigates.
 */

export default function ModuleSelect() {
  const navigate = useNavigate();
  const auth = getAuthData?.() || {};
  const user = auth.user || {};
  const role = user.role || "";
  const perm = user.permissions || {};

  const modules = [
    { key: "collection", label: "Collection", path: "/collection/dashboard" },
    { key: "kasir", label: "Kasir", path: "/kasir/dashboard" },
    { key: "master", label: "Master Data", path: "/master/dashboard" },
  ];

  const visible = modules.filter((m) => {
    if (role === "superadmin") return true;
    if (m.key === "collection") return role === "collection" || perm.collection;
    if (m.key === "kasir") return role === "kasir" || perm.kasir;
    if (m.key === "master") return role === "masterdata" || perm.masterdata;
    return false;
  });

  const choose = (m) => {
    try { localStorage.setItem("currentModule", m.key); } catch {}
    navigate(m.path);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 pt-28">
      <h1 className="text-3xl font-black mb-6">Pilih Module</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visible.map((m) => (
          <button key={m.key} onClick={() => choose(m)} className="p-6 bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 transition-transform text-left">
            <div className="text-2xl font-bold mb-1">{m.label}</div>
            <div className="text-sm text-gray-600">Masuk ke module {m.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
