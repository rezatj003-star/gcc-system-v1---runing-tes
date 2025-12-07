import React from "react";
import { useNavigate } from "react-router-dom";
import { getModule, setModule } from "../utils/storage";

export default function Header({ title = "", subtitle = "" }) {
  const nav = useNavigate();
  const current = getModule();

  const onChangeModule = (m) => {
    setModule(m);
    if (m === "collection") nav("/collection/dashboard");
    if (m === "master") nav("/master/dashboard");
    if (m === "kasir") nav("/kasir/dashboard");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b p-2 md:p-4 flex items-center justify-between
                 h-12 md:h-16" // explicitly set header height
    >
      <div className="flex items-center gap-3">
        <div className="font-bold text-lg">GCC System</div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <select
          value={current}
          onChange={(e) => onChangeModule(e.target.value)}
          className="border rounded px-2 py-1"
          aria-label="Pilih Modul"
        >
          <option value="collection">Collection</option>
          <option value="master">Master</option>
          <option value="kasir">Kasir</option>
        </select>
      </div>
    </header>
  );
}