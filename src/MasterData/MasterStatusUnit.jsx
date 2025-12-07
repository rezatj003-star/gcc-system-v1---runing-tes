// src/MasterData/MasterStatusUnit.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "../layout/AdminLayout";
import { FiLayers, FiEdit2, FiTrash2, FiPlus, FiRefreshCw, FiSearch } from "react-icons/fi";
import { getHouses, updateHouse } from "../api";

export default function MasterStatusUnit() {
  const [statuses, setStatuses] = useState([
    { id: "STU", name: "STU", description: "Siap Terjual", color: "green", isActive: true },
    { id: "HUNI", name: "HUNI", description: "Huni", color: "blue", isActive: true },
    { id: "RENOV", name: "RENOV", description: "Renovasi", color: "orange", isActive: true },
    { id: "NUP", name: "NUP", description: "NUP", color: "yellow", isActive: true },
    { id: "DLL", name: "DLL", description: "Lainnya", color: "gray", isActive: true }
  ]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [statusForm, setStatusForm] = useState({ name: "", description: "", color: "gray", isActive: true });
  const [selectedHouses, setSelectedHouses] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");

  useEffect(() => {
    loadHouses();
  }, []);

  const loadHouses = async () => {
    setLoading(true);
    try {
      const res = await getHouses();
      setHouses(res?.data || []);
    } catch (err) {
      console.error("Load houses error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStatus = () => {
    setEditingStatus(null);
    setStatusForm({ name: "", description: "", color: "gray", isActive: true });
    setShowStatusModal(true);
  };

  const handleEditStatus = (status) => {
    setEditingStatus(status);
    setStatusForm(status);
    setShowStatusModal(true);
  };

  const handleSaveStatus = () => {
    if (!statusForm.name) {
      alert("Nama status harus diisi");
      return;
    }

    if (editingStatus) {
      setStatuses(statuses.map(s => s.id === editingStatus.id ? { ...statusForm, id: editingStatus.id } : s));
    } else {
      const newId = statusForm.name.toUpperCase();
      setStatuses([...statuses, { ...statusForm, id: newId }]);
    }
    setShowStatusModal(false);
  };

  const handleDeleteStatus = (id) => {
    if (!window.confirm("Yakin hapus status ini? Unit yang menggunakan status ini akan terpengaruh.")) return;
    setStatuses(statuses.filter(s => s.id !== id));
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedHouses.length === 0) {
      alert("Pilih status dan unit terlebih dahulu");
      return;
    }

    try {
      for (const houseId of selectedHouses) {
        await updateHouse(houseId, { type: bulkStatus });
      }
      alert(`Berhasil update ${selectedHouses.length} unit.`);
      setShowBulkModal(false);
      setSelectedHouses([]);
      await loadHouses();
    } catch (err) {
      alert("Gagal update unit.");
    }
  };

  const toggleHouseSelection = (id) => {
    setSelectedHouses(prev => 
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  const filteredHouses = houses.filter(h => {
    if (searchTerm && !h.code?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !h.unit_number?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter && h.type !== statusFilter) return false;
    return true;
  });

  const getStatusColor = (statusId) => {
    const status = statuses.find(s => s.id === statusId);
    if (!status) return "bg-gray-300";
    const colors = {
      green: "bg-green-500",
      blue: "bg-blue-500",
      orange: "bg-orange-500",
      yellow: "bg-yellow-300",
      gray: "bg-gray-300"
    };
    return colors[status.color] || "bg-gray-300";
  };

  return (
    <AdminLayout>
      <div className="p-4 space-y-6">
        <h1 className="text-3xl font-black mb-4 border-b-4 border-black inline-block">
          Master Status Unit
        </h1>

        {/* Status Management Card */}
        <div className="bb-card p-6 bg-yellow-50 border-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <FiLayers className="text-5xl text-black" />
              <div>
                <p className="text-xl font-black">Status Unit</p>
                <p className="text-sm font-bold">
                  Kelola status unit seperti STU, HUNI, RENOV, NUP, DLL.
                </p>
              </div>
            </div>
            <button onClick={handleAddStatus} className="bb-btn bb-btn-primary">
              <FiPlus className="mr-2" /> Tambah Status
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {statuses.map(status => (
              <div
                key={status.id}
                className={`p-4 rounded-lg border-4 border-black shadow-[4px_4px_0px_#000] ${getStatusColor(status.id)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-lg">{status.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditStatus(status)}
                      className="p-1 bg-white/80 rounded border border-black"
                    >
                      <FiEdit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteStatus(status.id)}
                      className="p-1 bg-white/80 rounded border border-black"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-bold">{status.description}</p>
                <p className="text-xs mt-2">
                  {houses.filter(h => h.type === status.id).length} unit
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Unit List with Bulk Update */}
        <div className="bb-card p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="bb-input-wrap">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Cari unit..."
                  className="flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <select
              className="bb-input w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              {statuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {selectedHouses.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="bb-btn bb-btn-primary"
              >
                Update {selectedHouses.length} Unit
              </button>
            )}
            <button onClick={loadHouses} className="bb-btn bb-btn-secondary">
              <FiRefreshCw />
            </button>
          </div>

          <div className="bb-table-wrapper">
            <table className="bb-table w-full">
              <thead className="bb-thead">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHouses(filteredHouses.map(h => h.id));
                        } else {
                          setSelectedHouses([]);
                        }
                      }}
                      checked={selectedHouses.length === filteredHouses.length && filteredHouses.length > 0}
                    />
                  </th>
                  <th>Code</th>
                  <th>Tower</th>
                  <th>Unit Number</th>
                  <th>Current Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody className="bb-tbody">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-6">Memuat...</td></tr>
                ) : filteredHouses.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-6">Tidak ada data</td></tr>
                ) : (
                  filteredHouses.map((h, i) => (
                    <tr key={h.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedHouses.includes(h.id)}
                          onChange={() => toggleHouseSelection(h.id)}
                        />
                      </td>
                      <td className="font-bold">{h.code}</td>
                      <td>{h.tower}</td>
                      <td>{h.unit_number}</td>
                      <td>
                        <select
                          className="bb-input text-xs"
                          value={h.type || ""}
                          onChange={async (e) => {
                            try {
                              await updateHouse(h.id, { type: e.target.value });
                              await loadHouses();
                            } catch (err) {
                              alert("Gagal update status.");
                            }
                          }}
                        >
                          {statuses.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>{h.owner_consumer_id || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Form Modal */}
        {showStatusModal && (
          <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStatusModal(false)}>
            <div className="modal-card bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-4">
                {editingStatus ? "Edit" : "Tambah"} Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="bb-label">Nama Status *</label>
                  <input
                    type="text"
                    className="bb-input"
                    value={statusForm.name}
                    onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value.toUpperCase() })}
                    placeholder="STU, HUNI, RENOV, dll"
                  />
                </div>
                <div>
                  <label className="bb-label">Deskripsi</label>
                  <input
                    type="text"
                    className="bb-input"
                    value={statusForm.description}
                    onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="bb-label">Warna</label>
                  <select
                    className="bb-input"
                    value={statusForm.color}
                    onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                  >
                    <option value="green">Hijau</option>
                    <option value="blue">Biru</option>
                    <option value="orange">Orange</option>
                    <option value="yellow">Kuning</option>
                    <option value="gray">Abu-abu</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusForm.isActive}
                    onChange={(e) => setStatusForm({ ...statusForm, isActive: e.target.checked })}
                  />
                  <label className="bb-label">Aktif</label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleSaveStatus} className="bb-btn bb-btn-primary flex-1">Simpan</button>
                  <button onClick={() => setShowStatusModal(false)} className="bb-btn bb-btn-secondary">Batal</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Update Modal */}
        {showBulkModal && (
          <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBulkModal(false)}>
            <div className="modal-card bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-4">
                Bulk Update {selectedHouses.length} Unit
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="bb-label">Status Baru *</label>
                  <select
                    className="bb-input"
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                  >
                    <option value="">Pilih Status</option>
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.description}</option>
                    ))}
                  </select>
                </div>
                <div className="p-3 bg-yellow-50 border-2 border-black rounded-lg">
                  <p className="text-sm font-bold">
                    ⚠️ Anda akan mengupdate {selectedHouses.length} unit ke status: <strong>{bulkStatus}</strong>
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleBulkUpdate} className="bb-btn bb-btn-primary flex-1">Update</button>
                  <button onClick={() => setShowBulkModal(false)} className="bb-btn bb-btn-secondary">Batal</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}