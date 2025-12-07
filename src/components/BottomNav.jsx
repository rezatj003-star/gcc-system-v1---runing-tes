import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MODULE_MENU } from "./HorizontalNav";
import { getModule } from "../utils/storage";

export default function BottomNav() {
  const nav = useNavigate();
  const location = useLocation();
  const module = getModule() || "collection";
  const menu = MODULE_MENU[module] || MODULE_MENU.collection;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden">
      <div className="flex justify-between px-2 py-1">
        {menu.slice(0, 4).map((m, i) => (
          <button
            key={i}
            onClick={() => nav(m.path)}
            className={`flex-1 px-2 py-2 text-center text-xs font-medium ${location.pathname === m.path ? 'font-bold' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </nav>
  );
}