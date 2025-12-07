import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomeMenu() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const perms = user?.modulePermissions || {};

  // ==========================================
  // AKSES BERDASARKAN ROLE + PERMISSION
  // ==========================================
  const access = {
    collection:
      user?.role === "superadmin" ||
      perms.collection === "edit" ||
      perms.collection === "view",

    master:
      user?.role === "superadmin" ||
      perms.masterdata === "edit" ||
      perms.masterdata === "view",

    kasir:
      user?.role === "superadmin" ||
      perms.kasir === "edit" ||
      perms.kasir === "view",

    usermanagement: user?.role === "superadmin",
  };

  // ==========================================
  // MODULE REDIRECT (HANYA FIX KASIR)
  // ==========================================
  const handleSelect = (module) => {
    localStorage.setItem("currentModule", module);

    if (module === "collection") navigate("/collection/dashboard");
    if (module === "master") navigate("/master/dashboard");

    // ✔ PERBAIKAN MODULE KASIR BARU
    if (module === "kasir") navigate("/kasir/dashboard");
  };

  const handleLogout = () => {
    if (window.confirm("Yakin ingin logout?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center p-10">

      {/* BACKGROUND VIDEO */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0 brightness-75"
      >
        <source src="/videos/city.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/10 z-0"></div>

      <div className="relative z-10 w-full flex flex-col items-center">

        {/* PROFILE CARD */}
        <div className="
          bg-white/10 backdrop-blur-xl 
          border-4 border-yellow-500
          shadow-[0px_0px_25px_rgba(255,215,0,0.75)]
          rounded-3xl p-8 mb-10 max-w-md w-full
        ">
          <div className="text-center text-yellow-200">

            <div className="
              w-24 h-24 mx-auto mb-4 rounded-full
              bg-gradient-to-br from-yellow-300 to-yellow-600
              shadow-[0_0_35px_rgba(255,215,0,0.9)]
              flex items-center justify-center 
              text-4xl font-extrabold text-white border-4 border-yellow-500
            ">
              {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <h2 className="text-2xl font-extrabold">Selamat Datang!</h2>

            <p className="text-xl font-bold mt-1">{user?.displayName}</p>

            <p className="text-sm mt-1 font-semibold tracking-wide">
              {user?.role === "superadmin" ? "SUPER ADMIN" : user?.role}
            </p>
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold text-yellow-300 mb-12 drop-shadow-[0_0_12px_gold]">
          Menu Utama
        </h1>

        {/* MENU GRID */}
        <div
          className={`
          grid gap-8 mb-12
          ${access.usermanagement ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}
        `}
        >
          {/* MODULE BUTTONS */}
          {[
            { name: "Collection", icon: "📋", key: "collection", color: "from-yellow-200 to-yellow-400" },
            { name: "Master Data", icon: "📊", key: "master", color: "from-green-200 to-green-400" },
            { name: "Kasir", icon: "💰", key: "kasir", color: "from-blue-200 to-blue-400" },
          ].map((btn, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (access[btn.key]) handleSelect(btn.key);
                else alert("Anda tidak memiliki akses. Hubungi Admin.");
              }}
              className={`
                border-4 border-yellow-500
                bg-gradient-to-br ${btn.color}
                rounded-2xl p-6
                shadow-[0_0_20px_rgba(255,215,0,0.7)]
                transform transition-all duration-200
                hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,1)]
                active:scale-95 flex flex-col items-center gap-3 font-bold
                ${!access[btn.key] && "opacity-40 pointer-events-none"}
              `}
            >
              <span className="text-5xl animate-bounce">{btn.icon}</span>
              <p className="text-lg">{btn.name}</p>
            </button>
          ))}

          {/* USER MANAGEMENT */}
          {access.usermanagement && (
            <button
              onClick={() => navigate("/user-management")}
              className="
                border-4 border-yellow-500
                bg-gradient-to-br from-purple-200 to-purple-400
                rounded-2xl p-6
                shadow-[0_0_20px_rgba(255,215,0,0.7)]
                transform transition-all duration-200
                hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,1)]
                active:scale-95 flex flex-col items-center gap-3 font-bold
              "
            >
              <span className="text-5xl animate-bounce">👥</span>
              <p className="text-lg">User Management</p>
            </button>
          )}
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="
            px-10 py-4 rounded-2xl border-4 border-yellow-500
            bg-gradient-to-br from-red-300 to-red-500
            text-black font-extrabold text-xl
            shadow-[0_0_20px_rgba(255,215,0,0.7)]
            hover:scale-110 hover:shadow-[0_0_35px_gold]
            active:scale-95 transition-all duration-200
          "
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}