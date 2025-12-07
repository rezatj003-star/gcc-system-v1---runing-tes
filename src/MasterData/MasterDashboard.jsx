// src/MasterData/MasterDashboard.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "../layout/AdminLayout";
import { FiBarChart2, FiHome, FiUsers, FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { getHouses, getConsumers } from "../api";

export default function MasterDashboard() {
  const [stats, setStats] = useState({
    totalHouses: 0,
    availableHouses: 0,
    soldHouses: 0,
    totalConsumers: 0,
    activeConsumers: 0,
    totalRevenue: 0,
    outstanding: 0,
    percentReceived: 0
  });
  const [loading, setLoading] = useState(false);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const housesRes = await getHouses();
      const consumersRes = await getConsumers();
      
      const houses = housesRes?.data || [];
      const consumers = consumersRes?.data || [];

      // Calculate stats
      const totalHouses = houses.length;
      const availableHouses = houses.filter(h => h.status === "available").length;
      const soldHouses = houses.filter(h => h.status === "sold").length;
      const totalConsumers = consumers.length;
      const activeConsumers = consumers.filter(c => c.status === "active").length;

      // Mock calculations for revenue (replace with actual API)
      const totalRevenue = 0; // Sum from payments
      const outstanding = 0; // Sum from invoices
      const percentReceived = totalRevenue > 0 ? ((totalRevenue / (totalRevenue + outstanding)) * 100) : 0;

      setStats({
        totalHouses,
        availableHouses,
        soldHouses,
        totalConsumers,
        activeConsumers,
        totalRevenue,
        outstanding,
        percentReceived
      });

      // Mock recent transfers
      setRecentTransfers([
        { id: "1", consumerId: "GCC-00001", fromUnit: "HOU-001", toUnit: "HOU-002", date: "2024-01-15", status: "completed" }
      ]);

      // Mock alerts
      setAlerts([
        { id: "1", type: "overdue", message: "5 invoice overdue", count: 5, priority: "high" },
        { id: "2", type: "due_soon", message: "12 invoice due soon", count: 12, priority: "medium" }
      ]);
    } catch (err) {
      console.error("Load dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const KPI_CARDS = [
    {
      title: "Total Unit",
      value: stats.totalHouses,
      icon: FiHome,
      color: "blue",
      trend: null
    },
    {
      title: "Unit Tersedia",
      value: stats.availableHouses,
      icon: FiHome,
      color: "green",
      trend: null
    },
    {
      title: "Unit Terjual",
      value: stats.soldHouses,
      icon: FiHome,
      color: "red",
      trend: null
    },
    {
      title: "Total Konsumen",
      value: stats.totalConsumers,
      icon: FiUsers,
      color: "purple",
      trend: null
    },
    {
      title: "Konsumen Aktif",
      value: stats.activeConsumers,
      icon: FiUsers,
      color: "green",
      trend: null
    },
    {
      title: "Total Revenue",
      value: `Rp ${stats.totalRevenue.toLocaleString("id-ID")}`,
      icon: FiDollarSign,
      color: "green",
      trend: "up"
    },
    {
      title: "Outstanding",
      value: `Rp ${stats.outstanding.toLocaleString("id-ID")}`,
      icon: FiDollarSign,
      color: "red",
      trend: "down"
    },
    {
      title: "% Terbayar",
      value: `${stats.percentReceived.toFixed(1)}%`,
      icon: FiTrendingUp,
      color: stats.percentReceived >= 80 ? "green" : stats.percentReceived >= 50 ? "yellow" : "red",
      trend: null
    }
  ];

  return (
    <AdminLayout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black mb-4 border-b-4 border-black inline-block">
            Master Dashboard
          </h1>
          <button onClick={loadDashboard} className="bb-btn bb-btn-secondary">
            <FiRefreshCw className="mr-2" /> Refresh
          </button>
        </div>

        {/* Welcome Card */}
        <div className="bb-card p-6 bg-yellow-50 border-4 border-yellow-500">
          <div className="flex items-center gap-4">
            <FiBarChart2 className="text-5xl text-black" />
            <div>
              <p className="text-xl font-black">Welcome to Master Module</p>
              <p className="text-sm font-bold">
                Semua konfigurasi data master dapat diakses dari menu sidebar.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map((kpi, i) => {
            const Icon = kpi.icon;
            const colorClasses = {
              blue: "bg-blue-500 border-blue-600",
              green: "bg-green-500 border-green-600",
              red: "bg-red-500 border-red-600",
              purple: "bg-purple-500 border-purple-600",
              yellow: "bg-yellow-300 border-yellow-600"
            };
            return (
              <div
                key={i}
                className={`bb-card p-5 ${colorClasses[kpi.color]} text-white border-4 shadow-[6px_6px_0px_#000] hover:-translate-x-1 hover:-translate-y-1 transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-white/20 rounded-lg border-2 border-white">
                    <Icon className="w-6 h-6" />
                  </div>
                  {kpi.trend && (
                    kpi.trend === "up" ? (
                      <FiTrendingUp className="w-5 h-5 opacity-80" />
                    ) : (
                      <FiTrendingDown className="w-5 h-5 opacity-80" />
                    )
                  )}
                </div>
                <div className="text-sm font-bold opacity-90 mb-1">{kpi.title}</div>
                <div className="text-2xl font-black">{kpi.value}</div>
              </div>
            );
          })}
        </div>

        {/* Alerts & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Alerts */}
          <div className="bb-card p-5">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <FiAlertCircle className="text-red-600" />
              Alerts & Notifications
            </h3>
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-600">Tidak ada alert</p>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-2 border-black ${
                      alert.priority === "high" ? "bg-red-50" : "bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{alert.message}</span>
                      <span className={`bb-badge ${alert.priority === "high" ? "bb-badge-red" : "bb-badge-yellow"}`}>
                        {alert.count}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Transfers */}
          <div className="bb-card p-5">
            <h3 className="text-xl font-black mb-4">Recent Unit Transfers</h3>
            <div className="space-y-2">
              {recentTransfers.length === 0 ? (
                <p className="text-sm text-gray-600">Tidak ada transfer terakhir</p>
              ) : (
                recentTransfers.map(transfer => (
                  <div
                    key={transfer.id}
                    className="p-3 bg-gray-50 rounded-lg border-2 border-black"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">{transfer.consumerId}</p>
                        <p className="text-xs text-gray-600">
                          {transfer.fromUnit} → {transfer.toUnit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">{transfer.date}</p>
                        <span className={`bb-badge ${transfer.status === "completed" ? "bb-badge-green" : "bb-badge-yellow"}`}>
                          {transfer.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bb-card p-5">
          <h3 className="text-xl font-black mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/master/database" className="bb-btn bb-btn-primary text-center">
              Kelola Database
            </a>
            <a href="/master/arsip" className="bb-btn bb-btn-secondary text-center">
              Arsip Dokumen
            </a>
            <a href="/master/status-unit" className="bb-btn bb-btn-secondary text-center">
              Status Unit
            </a>
            <a href="/collection/master" className="bb-btn bb-btn-secondary text-center">
              Collection
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}