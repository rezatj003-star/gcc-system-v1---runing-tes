// ModuleLayout.jsx — FINAL DYNAMIC VERSION (Kasir Rapi, Lainnya Tetap Gede)

import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

/* ---------------------------------------
   SAFE LOCAL STORAGE HELPERS
----------------------------------------*/
function safeGetUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeGetModule() {
  try {
    return localStorage.getItem("currentModule") || "collection";
  } catch {
    return "collection";
  }
}

/* ---------------------------------------
   THEME COLORS
----------------------------------------*/
const NAVY = "#1E293B";
const THEME = {
  bg: "bg-[#F1F5F9]",
};

/* ---------------------------------------
   ANIMATED ICON
----------------------------------------*/
function AnimatedIcon({ size = 4 }) {
  const s = size === 6 ? "w-6 h-6" : size === 5 ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className={`${s} bg-yellow-300 rounded-full border border-black animate-ping`} />
  );
}

/* ---------------------------------------
   PROFILE DROPDOWN
----------------------------------------*/
function ProfileDropdown() {
  const navigate = useNavigate();
  const user = safeGetUser() || { name: "User", role: "Guest" };
  const [open, setOpen] = useState(false);

  const logout = () => {
    if (window.confirm("Yakin logout?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-gray-300 shadow hover:bg-gray-100 transition"
      >
        <div className="w-9 h-9 bg-gray-400 text-white rounded-full border border-black flex items-center justify-center font-bold">
          {user.name ? user.name.charAt(0) : "U"}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-black shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b">
            <p className="font-bold">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>

          <button
            onClick={logout}
            className="w-full px-4 py-2 text-left text-red-600 font-semibold hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------
   HEADER
----------------------------------------*/
function ElegantHeader() {
  const { pathname } = useLocation();
  const module = safeGetModule();

  // 🔥 DETEKSI APAKAH LAGI DI KASIR ATAU BUKAN
  const isKasir = module === "kasir";

  const MENU = {
    collection: [
      { label: "Home", path: "/menu", icon: "🏠" },
      { label: "Dashboard", path: "/collection/dashboard", icon: "📊" },
      { label: "Master", path: "/collection/master", icon: "📁" },
      { label: "Analytics", path: "/collection/analytics", icon: "📈" },
      { label: "Report", path: "/collection/reports", icon: "📄" },
    ],
    master: [
      { label: "Home", path: "/menu", icon: "🏠" },
      { label: "Dashboard", path: "/master/dashboard", icon: "📊" },
      { label: "Database", path: "/master/database", icon: "📂" },
      { label: "Arsip", path: "/master/arsip", icon: "📁" },
      { label: "Status Unit", path: "/master/status-unit", icon: "📌" },
    ],
    kasir: [
      { label: "Home", path: "/menu", icon: "🏠" },
      { label: "Dashboard", path: "/kasir/dashboard", icon: "📊" },
      { label: "Cash In", path: "/kasir/cash-in", icon: "📥" },
      { label: "Cash Out", path: "/kasir/cash-out", icon: "📤" },
      { label: "Laporan", path: "/kasir/laporan", icon: "📄" },
      // Label dipendekin khusus Kasir
      { label: "Tukar Kwi", path: "/kasir/tukar-kwitansi", icon: "🔄" },
      { label: "Cetak Kwi", path: "/kasir/kwitansi", icon: "🖨️" },
    ],
  }[module] || []; // Fallback array kosong biar ga error

  return (
    <header
      className="fixed top-0 left-0 right-0 shadow-lg z-50"
      style={{ backgroundColor: NAVY }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-white">

        {/* LEFT — LOGO */}
        <div className="flex items-center gap-2">
          <AnimatedIcon size={5} />
          <span className="font-bold text-lg">GCC System</span>
        </div>

        {/* CENTER — MENU */}
        {/* Gap menyesuaikan modul */}
        <div className={`hidden md:flex items-center mx-4 ${isKasir ? "gap-2" : "gap-3"}`}>
          {MENU.map((m, i) => {
            const active = pathname.startsWith(m.path);

            // 🔥 STYLE BUTTON DINAMIS
            // Kalo Kasir: px-3, text-sm, whitespace-nowrap (Biar muat)
            // Kalo Lainnya: px-4, text-base (Original Gede)
            const btnClass = isKasir 
              ? "px-3 py-2 text-sm whitespace-nowrap font-bold" 
              : "px-4 py-2 font-semibold";

            return (
              <Link
                key={i}
                to={m.path}
                className={`
                  flex items-center gap-2 rounded-xl border-2 transition
                  ${btnClass}
                  ${
                    active
                      ? "bg-yellow-300 border-black text-black shadow-[3px_3px_0px_#000]"
                      : "bg-white text-black border-gray-300 hover:bg-gray-100"
                  }
                `}
              >
                <span>{m.icon}</span> {m.label}
              </Link>
            );
          })}
        </div>

        {/* RIGHT — PROFILE */}
        <ProfileDropdown />
      </div>
    </header>
  );
}

/* ---------------------------------------
   MOBILE NAV
----------------------------------------*/
function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = safeGetUser();
  const module = safeGetModule() || user?.role || "collection";

  const MENUS = {
    collection: [
      { label: "Home", path: "/menu", icon: "🏠" },
      { label: "Dashboard", path: "/collection/dashboard", icon: "📊" },
      { label: "Master", path: "/collection/master", icon: "📁" },
      { label: "Analytics", path: "/collection/analytics", icon: "📈" },
      { label: "Report", path: "/collection/reports", icon: "📄" },
    ],
    masterdata: [
      { label: "Home", path: "/menu", icon: "🏠" },
      { label: "Dashboard", path: "/master/dashboard", icon: "📊" },
      { label: "Database", path: "/master/database", icon: "📂" },
      { label: "Arsip", path: "/master/arsip", icon: "📁" },
      { label: "Status", path: "/master/status-unit", icon: "📌" },
    ],
    kasir: [
      { label: "Home", path: "/menu", icon: "🏠" },
      { label: "Dashboard", path: "/kasir/dashboard", icon: "📊" },
      { label: "Cash In", path: "/kasir/cash-in", icon: "📥" },
      { label: "Cash Out", path: "/kasir/cash-out", icon: "📤" },
      { label: "Laporan", path: "/kasir/laporan", icon: "📄" },
      { label: "Kwitansi", path: "/kasir/tukar-kwitansi", icon: "🔄" },
      { label: "Cetak", path: "/kasir/kwitansi", icon: "🖨️" },
    ],
  };

  const MENU = MENUS[module] || MENUS.collection;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-lg py-2 flex justify-around md:hidden z-40 overflow-x-auto">
      {MENU.map((m, i) => {
        const active = location.pathname.startsWith(m.path);

        return (
          <button
            key={i}
            onClick={() => navigate(m.path)}
            className={`flex flex-col items-center text-xs font-semibold transition min-w-[60px] ${
              active ? "text-yellow-600 scale-110" : "text-gray-700"
            }`}
          >
            <span className="text-xl">{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </nav>
  );
}


/* ---------------------------------------
   MAIN WRAPPER
----------------------------------------*/
export default function ModuleLayout({ children }) {
  return (
    <div className={`${THEME.bg} min-h-screen`}>
      <ElegantHeader />

      {/* NAV ada di HEADER → padding dikurangi */}
      <main className="pt-[110px] pb-[80px] px-3">{children}</main>

      <MobileNav />
    </div>
  );
}