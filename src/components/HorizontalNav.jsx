import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getModule } from "../utils/storage";

export const MODULE_MENU = {
  collection: [
    { label: "Home", path: "/menu" },
    { label: "Dashboard", path: "/collection/dashboard" },
    { label: "Master", path: "/collection/master" },
    { label: "Analytics", path: "/collection/analytics" },
    { label: "Report", path: "/collection/reports" },
  ],

  master: [
    { label: "Home", path: "/menu" },
    { label: "Dashboard", path: "/master/dashboard" },
    { label: "Database", path: "/master/database" },
    { label: "Arsip", path: "/master/arsip" },
    { label: "Status Unit", path: "/master/status-unit" },
  ],

  kasir: [
    { label: "Home", path: "/menu" },
    { label: "Dashboard", path: "/kasir/dashboard" },
    { label: "Cash In", path: "/kasir/cash-in" },
    { label: "Cash Out", path: "/kasir/cash-out" },
    { label: "Laporan", path: "/kasir/laporan" },
    { label: "Tukar Kwitansi", path: "/kasir/tukar-kwitansi" },
  ],
};

export default function HorizontalNav() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const module = getModule() || "collection";

  const menu = MODULE_MENU[module] || MODULE_MENU.collection;

  const handleLogout = () => {
    if (window.confirm("Yakin ingin logout?")) {
      localStorage.clear();
      nav("/login");
    }
  };

  return (
    <div
      className="
        fixed top-12 md:top-16 left-0 right-0 bg-slate-50 border-b z-40
        flex justify-center gap-2 py-2 md:py-1 shadow-sm
        hidden md:flex
      "
      role="navigation"
      aria-label="Main module navigation"
    >
      {menu.map((m, i) => {
        // Active detection: exact path or pathname startsWith base path.
        const basePath = m.path.replace(/\/:.*$/, "");
        const active = pathname === m.path || pathname.startsWith(basePath);

        return (
          <Link
            key={i}
            to={m.path}
            className={`
              px-3 py-1 mx-1 text-sm font-semibold rounded-md transition-all
              ${active ? "bg-blue-600 text-white border-black shadow-[2px_2px_0px_#000]" : "bg-transparent hover:bg-white border border-gray-200"}
            `}
          >
            {m.label}
          </Link>
        );
      })}

      <button
        onClick={handleLogout}
        className="
          px-3 py-1 mx-1 text-sm font-semibold rounded-md
          bg-red-500 text-white border-black shadow-[2px_2px_0px_#000]
        "
      >
        Logout
      </button>
    </div>
  );
}
