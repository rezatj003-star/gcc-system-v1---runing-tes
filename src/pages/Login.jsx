// src/pages/Login.jsx — PRODUCTION VERSION
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { login } from "../api";
import { setAuthData, sanitizeInput } from "../utils/auth";
import { validators, validateForm } from "../utils/validation";
import Logo from "/logo-gcc.png";

/* ======================================
   AUTO DETECT API HOST (PRODUCTION SAFE)
   Jika tidak pakai localhost, tetap bekerja
====================================== */
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5050"
    : `http://${window.location.hostname}:5050`;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ===========================
      LOADING SCREEN
  ============================ */
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (initialLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black">
        <img
          src={Logo}
          className="w-40 h-40 animate-spin-slow drop-shadow-[0_0_30px_gold]"
        />
        <p className="mt-4 text-yellow-300 font-bold text-xl animate-pulse">
          Memuat Sistem...
        </p>

        <style>{`
          .animate-spin-slow { animation: spin 4s linear infinite; }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  /* ===========================
      LOGIN HANDLER (PROD-SECURE)
  ============================ */
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setLoading(true);

    try {
      /* VALIDATION */
      const { isValid, errors: validationErrors } = validateForm(
        { username, password },
        { username: validators.username, password: validators.password }
      );

      if (!isValid) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      /* SANITASI */
      const sanitizedUsername = sanitizeInput(username.trim());

      /* CEK USER */
      const user = await login(sanitizedUsername, password);

      if (!user) {
        setServerError("Username atau password salah.");
        setLoading(false);
        return;
      }

      /* ======================================
         PRODUCTION FIX: AMBIL USER TERBARU
         (Supaya modules hasil update Superadmin
          langsung ikut)
      ====================================== */
      let refreshedUser;
      try {
        const res = await axios.get(`${API_BASE}/users/${user.id}`);
        refreshedUser = res.data;
      } catch (err) {
        refreshedUser = user; // fallback aman
      }

      /* GENERATE TOKEN */
      const token =
        Date.now() + "-" + Math.random().toString(36).substring(2, 15);

      /* SIMPAN AUTH */
      setAuthData(refreshedUser, token);

      /* SIMPAN DEFAULT MODULE */
      const selectedModule =
        refreshedUser.role === "superadmin"
          ? "collection"
          : refreshedUser.modules?.[0] || refreshedUser.role;

      localStorage.setItem("currentModule", selectedModule);

      /* REDIRECT SESUAI ROLE */
      const redirectMap = {
        superadmin: "/menu",
        collection: "/collection/dashboard",
        kasir: "/kasir/dashboard",
        masterdata: "/master/dashboard",
      };

      navigate(redirectMap[refreshedUser.role] || "/menu", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setServerError("Gagal login. Periksa koneksi server atau jaringan.");
    } finally {
      setLoading(false);
    }
  };

  /* ===========================
      UI LOGIN PRODUKSI
  ============================ */
  return (
    <div className="relative min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-yellow-700 via-yellow-900 to-black">

      <div className="absolute inset-0 bg-black/50"></div>

      <div
        className="
          relative z-10 p-10 w-full max-w-md
          bg-black/70
          border-4 border-yellow-400
          rounded-3xl
          shadow-[0_0_35px_12px_rgba(255,215,0,0.5)]
        "
      >
        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img
            src={Logo}
            className="
              w-32 h-32 rounded-full object-contain
              border-4 border-yellow-400 bg-white
              shadow-[0_0_30px_12px_rgba(255,215,0,0.8)]
              animate-spin-slow
            "
            alt="GCC"
          />
        </div>

        <style>{`
          .animate-spin-slow { animation: spin 6s linear infinite; }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        <div className="text-center mb-6 text-yellow-300">
          <h1 className="text-3xl font-extrabold">GREEN CONSTRUCTION CITY</h1>
          <p className="text-sm opacity-90">Sistem Manajemen GCC</p>
        </div>

        {serverError && (
          <div className="bg-red-300 border-2 border-black rounded-xl p-3 mb-4 text-black shadow">
            {serverError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="font-bold text-yellow-300">Username</label>
            <input
              type="text"
              className="
                w-full px-4 py-3 rounded-xl bg-white
                border-2 border-yellow-400 text-black font-semibold
              "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="font-bold text-yellow-300">Password</label>
            <input
              type="password"
              className="
                w-full px-4 py-3 rounded-xl bg-white
                border-2 border-yellow-400 text-black font-semibold
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="
              w-full py-3 text-black font-extrabold text-lg
              bg-yellow-400 border-4 border-black rounded-xl
              shadow-[6px_6px_0px_#000]
              hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000]
              active:translate-y-1 active:shadow-[4px_4px_0px_#000]
              transition-all duration-200
            "
          >
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}