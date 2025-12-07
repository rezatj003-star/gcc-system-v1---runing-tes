import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function HorizontalNavMaster() {
  const location = useLocation();

  const navItems = [
    {
      path: "/master/dashboard",
      label: "Dashboard",
      icon: "📊",
    },
    {
      path: "/master/database",
      label: "Database",
      icon: "🗄️",
    },
    {
      path: "/master/arsip",
      label: "Arsip",
      icon: "📁",
    },
    {
      path: "/master/status-unit",
      label: "Status Unit",
      icon: "🏢",
    },
  ];

  return (
    <nav className="bg-blue-400 border-4 border-black p-4 mb-6 rounded-2xl shadow-[6px_6px_0px_#000]">
      <div className="flex flex-wrap gap-4 justify-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black font-bold transition-all duration-200
                ${isActive
                  ? "bg-black text-white shadow-[4px_4px_0px_#000]"
                  : "bg-white text-black hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-0 active:shadow-[2px_2px_0px_#000]"
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
