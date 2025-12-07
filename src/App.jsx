import React, { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute.jsx";
import { LoadingFallback } from "./utils/lazyLoad.jsx";
import ModuleLayout from "./layouts/ModuleLayout.jsx";

/* ============================================================
   LAZY IMPORT HELPER
============================================================ */
const lazyTry = (paths) =>
  lazy(() =>
    Promise.any(
      paths.map((p) =>
        import(/* @vite-ignore */ p + ".jsx").catch((err) => {
          console.warn("Gagal import:", p);
          throw err;
        })
      )
    )
  );

/* ============================================================
   PUBLIC MODULE
============================================================ */
const Login = lazy(() => import("./pages/Login.jsx"));
const HomeMenu = lazy(() => import("./pages/HomeMenu.jsx"));
const UserManagement = lazy(() => import("./pages/UserManagement.jsx"));
const Forbidden = lazy(() => import("./pages/Forbidden.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

/* ============================================================
   MASTER MODULE
============================================================ */
const MasterDashboard = lazyTry(["./MasterData/MasterDashboard", "./MasterData/Dashboard"]);
const MasterDatabase = lazyTry(["./MasterData/MasterDatabase", "./MasterData/Database"]);
const MasterArsip = lazyTry(["./MasterData/MasterArsip", "./MasterData/Arsip"]);
const MasterStatusUnit = lazyTry(["./MasterData/MasterStatusUnit", "./MasterData/StatusUnit"]);

/* ============================================================
   COLLECTION MODULE
============================================================ */
const CollectionDashboard = lazy(() => import("./Collection/pages/Dashboard.jsx"));
const AddConsumer = lazy(() => import("./Collection/pages/AddConsumer.jsx"));
const EditConsumer = lazy(() => import("./Collection/pages/EditConsumer.jsx"));
const FullConsumerDetail = lazy(() => import("./Collection/pages/FullConsumerDetail.jsx"));
const ReportModule = lazy(() => import("./Collection/pages/ReportModule.jsx"));
const Analytics = lazy(() => import("./Collection/pages/Analytics.jsx"));
const BulkWhatsApp = lazy(() => import("./Collection/pages/BulkWhatsApp.jsx"));
const MasterCollection = lazy(() => import("./Collection/pages/MasterCollection.jsx"));

/* ============================================================
   KASIR MODULE
============================================================ */
const KasirDashboard = lazy(() => import("./Kasir/pages/MenuUtama.jsx"));
const CashInPage = lazy(() => import("./Kasir/pages/CashInPage.jsx"));
const TukarKwitansiPage = lazy(() => import("./Kasir/pages/TukarKwitansiPage.jsx"));
const CashOutPage = lazy(() => import("./Kasir/pages/LaporanCashOut.jsx"));
const LaporanPage = lazy(() => import("./Kasir/pages/LaporanPage.jsx"));
const LaporanCancelPage = lazy(() => import("./Kasir/pages/LaporanCancel.jsx"));
const KwitansiPage = lazy(() => import("./Kasir/pages/KwitansiPage.jsx"));

/* ============================================================
   ROLES CONFIG
============================================================ */
const ROLES = {
  SUPERADMIN: "superadmin",
  COLLECTION: "collection",
  KASIR: "kasir",
  MASTER: "master",
};

export default function App() {
  
  const renderElement = (element, roles, isPublic = false) => {
    if (isPublic) return element;
    return (
      <ProtectedRoute roles={roles}>
        <ModuleLayout>{element}</ModuleLayout>
      </ProtectedRoute>
    );
  };

  const MASTER_ROLES = [ROLES.SUPERADMIN, ROLES.MASTER];
  const COLLECTION_ROLES = [ROLES.SUPERADMIN, ROLES.COLLECTION];
  const KASIR_ROLES = [ROLES.SUPERADMIN, ROLES.KASIR];

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          
          {/* PUBLIC */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<HomeMenu />} />
          <Route path="/forbidden" element={<Forbidden />} />

          {/* SUPER ADMIN */}
          <Route path="/user-management" element={renderElement(<UserManagement />, [ROLES.SUPERADMIN])} />

          {/* MASTER DATA */}
          <Route path="/master" element={renderElement(<Outlet />, MASTER_ROLES)}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<MasterDashboard />} />
            <Route path="database" element={<MasterDatabase />} />
            <Route path="arsip" element={<MasterArsip />} />
            <Route path="status-unit" element={<MasterStatusUnit />} />
          </Route>

          {/* COLLECTION */}
          <Route path="/collection" element={renderElement(<Outlet />, COLLECTION_ROLES)}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CollectionDashboard />} />
            <Route path="add" element={<AddConsumer />} />
            <Route path="edit/:id" element={<EditConsumer />} />
            <Route path="detail/:id" element={<FullConsumerDetail />} />
            <Route path="reports" element={<ReportModule />} />
            <Route path="master" element={<MasterCollection />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="whatsapp" element={<BulkWhatsApp />} />
          </Route>

          {/* KASIR */}
          <Route path="/kasir" element={renderElement(<Outlet />, KASIR_ROLES)}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<KasirDashboard />} />
            <Route path="cash-in" element={<CashInPage />} />
            <Route path="tukar-kwitansi" element={<TukarKwitansiPage />} />
            <Route path="cash-out" element={<CashOutPage />} />
            <Route path="laporan" element={<LaporanPage />} />
            <Route path="laporanCancel" element={<LaporanCancelPage />} />
            
            {/* 🔥 PERBAIKAN DI SINI: route jadi 'kwitansi' biar match sama Navbar */}
            <Route path="kwitansi" element={<KwitansiPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
          
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}