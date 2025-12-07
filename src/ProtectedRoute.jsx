// src/ProtectedRoute.jsx — FINAL PRODUCTION VERSION (REAL-TIME PERMISSIONS)
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { getAuthData, clearAuthData, setAuthData } from "./utils/auth";

/* ===========================
   AUTO DETECT AUTH SERVER
=========================== */
const AUTH_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5050"
    : `http://${window.location.hostname}:5050`;

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  /* =====================================================
     REAL-TIME SYNC USER PERMISSIONS DARI SERVER
  ====================================================== */
  const refreshUserFromServer = async (user) => {
    try {
      const res = await axios.get(`${AUTH_URL}/users/${user.id}`);
      const latestUser = res.data;

      const token = localStorage.getItem("authToken");
      setAuthData(latestUser, token);

      return latestUser;
    } catch {
      console.warn("Gagal sync user, pakai data lokal.");
      return user;
    }
  };

  useEffect(() => {
    let alive = true;

    async function check() {
      let auth = getAuthData();

      // Belum login
      if (!auth || !auth.user) {
        clearAuthData();
        setAllowed(false);
        setReady(true);
        return;
      }

      // sync user real-time
      let user = await refreshUserFromServer(auth.user);

      const role = user.role;
      const perms = user.modulePermissions || {
        collection: "none",
        kasir: "none",
        masterdata: "none",
      };

      const path = location.pathname;

      // ========================================
      // SUPER ADMIN FULL ACCESS
      // ========================================
      if (role === "superadmin") {
        setAllowed(true);
        setReady(true);
        return;
      }

      // ========================================
      // DETEKSI MODULE DARI URL
      // ========================================
      const requiredModule =
        path.startsWith("/collection")
          ? "collection"
          : path.startsWith("/kasir")
          ? "kasir"
          : path.startsWith("/master")
          ? "masterdata"
          : null;

      // Route umum → selalu boleh
      if (!requiredModule) {
        setAllowed(true);
        setReady(true);
        return;
      }

      // ========================================
      // PERMISSION CHECK
      // view/edit = BOLEH
      // none      = DITOLAK
      // ========================================
      const level = perms[requiredModule];

      if (level === "none" || !level) {
        setAllowed(false);
        setReady(true);
        return;
      }

      // Jika view / edit → OK
      setAllowed(true);
      setReady(true);
    }

    check();
  }, [location.pathname]);

  // Tunda render sampai pengecekan selesai
  if (!ready) return null;

  if (!allowed) {
    const auth = getAuthData();
    if (!auth?.user) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}