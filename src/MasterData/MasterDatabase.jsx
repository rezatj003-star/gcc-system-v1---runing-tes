// src/MasterData/MasterDatabase.jsx
import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "../layout/AdminLayout";
import { FiDatabase, FiHome, FiUsers, FiDollarSign, FiUpload, FiDownload, FiEdit2, FiTrash2, FiPlus, FiSearch, FiFilter, FiRefreshCw, FiFileText, FiSave } from "react-icons/fi";
import { getHouses, addHouse, updateHouse, deleteHouse, getBanks, addBank, updateBank, deleteBank, getProducts, addProduct, updateProduct, deleteProduct, getConsumers, generateConsumerId, addConsumer, updateConsumer } from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ==================== UTILITY: SAVE FILE TO PUBLIC/ARSIP ====================
const saveFileToArsip = async (file, consumerId, category, customName = null) => {
  try {
    // Generate filename: {CONSUMER_ID}_{CATEGORY}_{TIMESTAMP}.{EXT}
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ext = file.name.split('.').pop();
    const categoryMap = {
      'ppjb': 'ARSIP PPJB',
      'sph': 'ARSIP SPH',
      'sp': 'ARSIP SP',
      'pembayaran': 'ARSIP PEMBAYARAN',
      'foto_unit': 'ARSIP FOTO UNIT',
      'lainnya': 'ARSIP LAINNYA'
    };
    const folderName = categoryMap[category] || 'ARSIP LAINNYA';
    const fileName = customName || `${consumerId || 'FILE'}_${category.toUpperCase()}_${timestamp}.${ext}`;
    const filePath = `/arsip/${folderName}/${fileName}`;

    // Read file as base64 for storage (in production, use backend API)
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;
      
      // Store in localStorage as fallback (in production, send to backend)
      const fileData = {
        name: fileName,
        originalName: file.name,
        path: filePath,
        category,
        consumerId,
        size: file.size,
        type: file.type,
        data: base64Data,
        uploadedAt: new Date().toISOString()
      };
      
      const existingFiles = JSON.parse(localStorage.getItem('arsip_files') || '[]');
      existingFiles.push(fileData);
      localStorage.setItem('arsip_files', JSON.stringify(existingFiles));
      
      // In production, use API call:
      // await api.master.post('/files/upload', formData);
      
      return { success: true, path: filePath, fileName };
    };
    
    reader.readAsDataURL(file);
    
    // Return promise-like object
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const base64Data = reader.result;
        const fileData = {
          name: fileName,
          originalName: file.name,
          path: filePath,
          category,
          consumerId,
          size: file.size,
          type: file.type,
          data: base64Data,
          uploadedAt: new Date().toISOString()
        };
        
        const existingFiles = JSON.parse(localStorage.getItem('arsip_files') || '[]');
        existingFiles.push(fileData);
        localStorage.setItem('arsip_files', JSON.stringify(existingFiles));
        
        resolve({ success: true, path: filePath, fileName });
      };
      reader.onerror = () => resolve({ success: false, error: 'Failed to read file' });
    });
  } catch (error) {
    console.error('Save file error:', error);
    return { success: false, error: error.message };
  }
};

export default function MasterDatabase() {
  const [activeTab, setActiveTab] = useState("houses");
  const [houses, setHouses] = useState([]);
  const [banks, setBanks] = useState([]);
  const [products, setProducts] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [towerFilter, setTowerFilter] = useState("");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "houses") {
        const res = await getHouses();
        setHouses(res?.data || []);
      } else if (activeTab === "banks") {
        const res = await getBanks();
        setBanks(res?.data || []);
      } else if (activeTab === "products") {
        const res = await getProducts();
        setProducts(res?.data || []);
      } else if (activeTab === "consumers") {
        const res = await getConsumers();
        setConsumers(res?.data || []);
      }
    } catch (err) {
      console.error("Load data error:", err);
      setError("Gagal memuat data. Periksa koneksi API.");
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Paginated Data
  const filteredData = useMemo(() => {
    let data = [];
    if (activeTab === "houses") data = houses;
    else if (activeTab === "banks") data = banks;
    else if (activeTab === "products") data = products;
    else if (activeTab === "consumers") data = consumers;

    let filtered = [...data];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (activeTab === "houses") {
        filtered = filtered.filter(h => 
          (h.code || "").toLowerCase().includes(term) ||
          (h.tower || "").toLowerCase().includes(term) ||
          (h.unit_number || "").toLowerCase().includes(term) ||
          (h.type || "").toLowerCase().includes(term)
        );
      } else if (activeTab === "banks") {
        filtered = filtered.filter(b => 
          (b.name || "").toLowerCase().includes(term) ||
          (b.account_no || "").toLowerCase().includes(term) ||
          (b.holder_name || "").toLowerCase().includes(term)
        );
      } else if (activeTab === "products") {
        filtered = filtered.filter(p => 
          (p.name || "").toLowerCase().includes(term) ||
          (p.code || "").toLowerCase().includes(term) ||
          (p.type || "").toLowerCase().includes(term)
        );
      } else if (activeTab === "consumers") {
        filtered = filtered.filter(c => 
          (c.name || "").toLowerCase().includes(term) ||
          (c.id || "").toLowerCase().includes(term) ||
          (c.phone || "").toLowerCase().includes(term) ||
          (c.area || "").toLowerCase().includes(term) ||
          (c.blok || "").toLowerCase().includes(term)
        );
      }
    }

    if (statusFilter && activeTab === "houses") {
      filtered = filtered.filter(h => h.status === statusFilter);
    }

    if (towerFilter && activeTab === "houses") {
      filtered = filtered.filter(h => h.tower === towerFilter);
    }

    return filtered;
  }, [activeTab, houses, banks, products, consumers, searchTerm, statusFilter, towerFilter]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredData.slice(start, start + perPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / perPage);

  // CRUD Operations
  const handleAdd = () => {
    setEditingItem(null);
    setFormData(getDefaultFormData());
    setUploadedFiles([]);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setUploadedFiles(item.uploadedFiles || []);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    try {
      if (activeTab === "houses") await deleteHouse(id);
      else if (activeTab === "banks") await deleteBank(id);
      else if (activeTab === "products") await deleteProduct(id);
      else if (activeTab === "consumers") await deleteConsumer(id);
      await loadData();
    } catch (err) {
      alert("Gagal menghapus data.");
    }
  };

  // Handle file upload
  const handleFileUpload = async (e, category) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadPromises = files.map(async (file) => {
      const consumerId = formData.id || formData.code || 'UNKNOWN';
      const result = await saveFileToArsip(file, consumerId, category);
      if (result.success) {
        return {
          name: result.fileName,
          path: result.path,
          category,
          originalName: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        };
      }
      return null;
    });

    const uploaded = (await Promise.all(uploadPromises)).filter(Boolean);
    setUploadedFiles([...uploadedFiles, ...uploaded]);
    alert(`Berhasil upload ${uploaded.length} file ke arsip.`);
    e.target.value = ''; // Reset input
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      // Attach uploaded files to formData
      const finalData = {
        ...formData,
        uploadedFiles: uploadedFiles,
        files: uploadedFiles.map(f => ({
          name: f.name,
          path: f.path,
          category: f.category
        }))
      };

      if (activeTab === "houses") {
        if (editingItem) await updateHouse(editingItem.id, finalData);
        else await addHouse(finalData);
      } else if (activeTab === "banks") {
        if (editingItem) await updateBank(editingItem.id, finalData);
        else await addBank(finalData);
      } else if (activeTab === "products") {
        if (editingItem) await updateProduct(editingItem.id, finalData);
        else await addProduct(finalData);
      } else if (activeTab === "consumers") {
        // Generate ID if new consumer
        if (!editingItem && !finalData.id) {
          finalData.id = await generateConsumerId();
        }
        if (editingItem) await updateConsumer(editingItem.id, finalData);
        else await addConsumer(finalData);
      }
      
      setShowModal(false);
      setUploadedFiles([]);
      await loadData();
      alert("Data berhasil disimpan!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Gagal menyimpan data: " + (err.message || "Unknown error"));
    }
  };

  const getDefaultFormData = () => {
    if (activeTab === "houses") {
      return {
        code: "",
        tower: "",
        blok: "",
        unit_number: "",
        type: "STU",
        status: "available",
        owner_consumer_id: null,
        // I. IDENTITAS UNIT & KONSUMEN
        area: "",
        no_unit: "",
        nama_konsumen: "",
        nup: "",
        nik_ktp: "",
        alamat: "",
        no_hp: "",
        // II. DATA TEKNIK
        lahan: "11HA",
        type_bangunan: "",
        lb: 0,
        lt: 0,
        tanah_lebih_m2: 0,
        boulevard: 0,
        taman: 0,
        progres_persen: 0,
        stu: "STU",
        tgl_stu: "",
        mi: 0,
        huni: 0,
        renov: 0,
        cut_off_teknik: "",
        // III. KEWAJIBAN BAYAR
        harga_unit: 0,
        harga_ktanah: 0,
        uang_muka_dp: 0,
        biaya_proses_adm: 0,
        kelebihan_tanah_rp: 0,
        boulevard_rp: 0,
        depan_tanah_rp: 0,
        diskon: 0,
        ajb_notaris: 0,
        cut_off: 0,
        ppn_bebas_ppn: 0,
        biaya_adm_pajak: 0,
        harga_jual_akhir: 0,
        // IV. KEWAJIBAN TIDAK MENGURANGI HARGA JUAL
        biaya_renovasi: 0,
        biaya_pindah: 0,
        // ... tambahkan semua field lainnya
        metadata: {}
      };
    } else if (activeTab === "banks") {
      return {
        name: "",
        account_no: "",
        holder_name: "",
        branch: "",
        metadata: {}
      };
    } else if (activeTab === "products") {
      return {
        code: "",
        name: "",
        price: 0,
        type: "fee",
        metadata: {}
      };
    } else if (activeTab === "consumers") {
      return {
        id: "",
        name: "",
        phone: "",
        email: "",
        birthdate: "",
        ktp_no: "",
        alamat: {
          jalan: "",
          kelurahan: "",
          kecamatan: "",
          kota: "",
          provinsi: "",
          kode_pos: ""
        },
        current_unit_id: null,
        status: "active",
        marketing: "",
        area: "",
        blok: "",
        metadata: {}
      };
    }
    return {};
  };

  // Export Functions
  const handleExport = () => {
    const data = filteredData.map((item, idx) => {
      if (activeTab === "houses") {
        return {
          No: idx + 1,
          Code: item.code,
          Tower: item.tower,
          Blok: item.blok,
          "Unit Number": item.unit_number,
          Type: item.type,
          Status: item.status,
          Area: item.area,
          "Nama Konsumen": item.nama_konsumen,
          "Owner ID": item.owner_consumer_id || "",
          Created: item.created_at || ""
        };
      } else if (activeTab === "banks") {
        return {
          No: idx + 1,
          Name: item.name,
          "Account No": item.account_no,
          "Holder Name": item.holder_name,
          Branch: item.branch
        };
      } else if (activeTab === "products") {
        return {
          No: idx + 1,
          Code: item.code,
          Name: item.name,
          Price: item.price,
          Type: item.type
        };
      } else if (activeTab === "consumers") {
        return {
          No: idx + 1,
          ID: item.id,
          Name: item.name,
          Phone: item.phone,
          Area: item.area || "",
          Blok: item.blok || "",
          Status: item.status || ""
        };
      }
      return item;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([out]), `Master_${activeTab}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Import Functions
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const transformed = jsonData.map(row => {
          if (activeTab === "houses") {
            return {
              code: row.Code || row.code || "",
              tower: row.Tower || row.tower || "",
              blok: row.Blok || row.blok || "",
              unit_number: row["Unit Number"] || row.unit_number || "",
              type: row.Type || row.type || "STU",
              status: row.Status || row.status || "available",
              area: row.Area || row.area || "",
              nama_konsumen: row["Nama Konsumen"] || row.nama_konsumen || "",
              metadata: {}
            };
          } else if (activeTab === "banks") {
            return {
              name: row.Name || row.name || "",
              account_no: row["Account No"] || row.account_no || "",
              holder_name: row["Holder Name"] || row.holder_name || "",
              branch: row.Branch || row.branch || "",
              metadata: {}
            };
          } else if (activeTab === "products") {
            return {
              code: row.Code || row.code || "",
              name: row.Name || row.name || "",
              price: Number(row.Price || row.price || 0),
              type: row.Type || row.type || "fee",
              metadata: {}
            };
          } else if (activeTab === "consumers") {
            return {
              id: row.ID || row.id || "",
              name: row.Name || row.name || "",
              phone: row.Phone || row.phone || "",
              area: row.Area || row.area || "",
              blok: row.Blok || row.blok || "",
              status: row.Status || row.status || "active",
              metadata: {}
            };
          }
          return row;
        });

        for (const item of transformed) {
          try {
            if (activeTab === "houses") await addHouse(item);
            else if (activeTab === "banks") await addBank(item);
            else if (activeTab === "products") await addProduct(item);
            else if (activeTab === "consumers") {
              if (!item.id) item.id = await generateConsumerId();
              await addConsumer(item);
            }
          } catch (err) {
            console.error("Import item error:", err);
          }
        }

        alert(`Berhasil mengimpor ${transformed.length} data.`);
        await loadData();
      } catch (err) {
        alert("Gagal mengimpor file. Periksa format Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Calculate harga jual akhir
  const calculateHargaJualAkhir = (data) => {
    const hargaUnit = Number(data.harga_unit || 0);
    const kelebihanTanah = Number(data.kelebihan_tanah_rp || 0);
    const boulevard = Number(data.boulevard_rp || 0);
    const depanTanah = Number(data.depan_tanah_rp || 0);
    const biayaProsesAdm = Number(data.biaya_proses_adm || 0);
    const ajbNotaris = Number(data.ajb_notaris || 0);
    const biayaAdmPajak = Number(data.biaya_adm_pajak || 0);
    const diskon = Number(data.diskon || 0);
    const cutOff = Number(data.cut_off || 0);
    const ppn = Number(data.ppn_bebas_ppn || 0);

    const total = hargaUnit + kelebihanTanah + boulevard + depanTanah + 
                  biayaProsesAdm + ajbNotaris + biayaAdmPajak + ppn - 
                  diskon - cutOff;
    
    return total;
  };

  // Auto-calculate when form data changes
  useEffect(() => {
    if (activeTab === "houses" && formData.harga_unit) {
      const calculated = calculateHargaJualAkhir(formData);
      if (Math.abs(calculated - (formData.harga_jual_akhir || 0)) > 1) {
        setFormData({ ...formData, harga_jual_akhir: calculated });
      }
    }
  }, [formData.harga_unit, formData.kelebihan_tanah_rp, formData.boulevard_rp, 
      formData.depan_tanah_rp, formData.biaya_proses_adm, formData.ajb_notaris, 
      formData.biaya_adm_pajak, formData.diskon, formData.cut_off, formData.ppn_bebas_ppn]);

  const renderTable = () => {
    if (activeTab === "houses") {
      return (
        <table className="bb-table w-full">
          <thead className="bb-thead">
            <tr>
              <th>No</th>
              <th>Code</th>
              <th>Area</th>
              <th>Tower/Blok</th>
              <th>Unit</th>
              <th>Type</th>
              <th>Status</th>
              <th>Nama Konsumen</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody className="bb-tbody">
            {paginatedData.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-6">Tidak ada data</td></tr>
            ) : (
              paginatedData.map((h, i) => (
                <tr key={h.id || i}>
                  <td>{(page - 1) * perPage + i + 1}</td>
                  <td className="font-bold">{h.code}</td>
                  <td>{h.area || "-"}</td>
                  <td>{h.tower} / {h.blok || "-"}</td>
                  <td>{h.unit_number}</td>
                  <td><span className="bb-badge bb-badge-yellow">{h.type}</span></td>
                  <td><span className={`bb-badge ${h.status === "available" ? "bb-badge-green" : h.status === "sold" ? "bb-badge-red" : "bb-badge-yellow"}`}>{h.status}</span></td>
                  <td>{h.nama_konsumen || "-"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(h)} className="bb-btn bb-btn-small bb-btn-secondary"><FiEdit2 /></button>
                      <button onClick={() => handleDelete(h.id)} className="bb-btn bb-btn-small bb-btn-danger"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    } else if (activeTab === "consumers") {
      return (
        <table className="bb-table w-full">
          <thead className="bb-thead">
            <tr>
              <th>No</th>
              <th>ID</th>
              <th>Nama</th>
              <th>Phone</th>
              <th>Area</th>
              <th>Blok</th>
              <th>Status</th>
              <th>Files</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody className="bb-tbody">
            {paginatedData.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-6">Tidak ada data</td></tr>
            ) : (
              paginatedData.map((c, i) => (
                <tr key={c.id || i}>
                  <td>{(page - 1) * perPage + i + 1}</td>
                  <td className="font-bold">{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.area || "-"}</td>
                  <td>{c.blok || "-"}</td>
                  <td><span className={`bb-badge ${c.status === "active" ? "bb-badge-green" : "bb-badge-yellow"}`}>{c.status || "active"}</span></td>
                  <td>
                    {c.files && c.files.length > 0 ? (
                      <span className="text-xs bg-blue-100 px-2 py-1 rounded border border-black">
                        {c.files.length} file
                      </span>
                    ) : "-"}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(c)} className="bb-btn bb-btn-small bb-btn-secondary"><FiEdit2 /></button>
                      <button onClick={() => handleDelete(c.id)} className="bb-btn bb-btn-small bb-btn-danger"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    }
    // ... (banks & products table tetap sama seperti sebelumnya)
    return null;
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
        <div className="modal-card bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] max-w-4xl w-full mx-4 my-8" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-2xl font-black mb-4">
            {editingItem ? "Edit" : "Tambah"} {activeTab === "houses" ? "Unit" : activeTab === "consumers" ? "Konsumen" : activeTab === "banks" ? "Bank" : "Product"}
          </h3>

          {activeTab === "houses" && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* I. IDENTITAS UNIT & KONSUMEN */}
              <div className="bb-card p-4 bg-blue-50 border-2 border-blue-500">
                <h4 className="font-black text-lg mb-3">I. IDENTITAS UNIT & KONSUMEN</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="bb-label">Area *</label>
                    <input type="text" className="bb-input" value={formData.area || ""} onChange={(e) => setFormData({ ...formData, area: e.target.value })} />
                  </div>
                  <div>
                    <label className="bb-label">Blok *</label>
                    <input type="text" className="bb-input" value={formData.blok || ""} onChange={(e) => setFormData({ ...formData, blok: e.target.value })} />
                  </div>
                  <div>
                    <label className="bb-label">No Unit *</label>
                    <input type="text" className="bb-input" value={formData.unit_number || ""} onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="bb-label">Nama Konsumen</label>
                    <input type="text" className="bb-input" value={formData.nama_konsumen || ""} onChange={(e) => setFormData({ ...formData, nama_konsumen: e.target.value })} />
                  </div>
                  <div>
                    <label className="bb-label">NUP</label>
                    <input type="text" className="bb-input" value={formData.nup || ""} onChange={(e) => setFormData({ ...formData, nup: e.target.value })} />
                  </div>
                  <div>
                    <label className="bb-label">NIK/KTP</label>
                    <input type="text" className="bb-input" value={formData.nik_ktp || ""} onChange={(e) => setFormData({ ...formData, nik_ktp: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="bb-label">Alamat</label>
                    <textarea className="bb-input" rows="2" value={formData.alamat || ""} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} />
                  </div>
                  <div>
                    <label className="bb-label">No HP</label>
                    <input type="text" className="bb-input" value={formData.no_hp || ""} onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* II. DATA TEKNIK */}
              <div className="bb-card p-4 bg-green-50 border-2 border-green-500">
                <h4 className="font-black text-lg mb-3">II. DATA TEKNIK</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="bb-label">Lahan</label>
                    <select className="bb-input" value={formData.lahan || "11HA"} onChange={(e) => setFormData({ ...formData, lahan: e.target.value })}>
                      <option value="11HA">11HA</option>
                      <option value="46HA">46HA</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">Type</label>
                    <input type="text" className="bb-input" value={formData.type_bangunan || ""} onChange={(e) => setFormData({ ...formData, type_bangunan: e.target.value })} placeholder="36/60" />
                  </div>
                  <div>
                    <label className="bb-label">LB (m²)</label>
                    <input type="number" className="bb-input" value={formData.lb || 0} onChange={(e) => setFormData({ ...formData, lb: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">LT (m²)</label>
                    <input type="number" className="bb-input" value={formData.lt || 0} onChange={(e) => setFormData({ ...formData, lt: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Tanah Lebih (m²)</label>
                    <input type="number" className="bb-input" value={formData.tanah_lebih_m2 || 0} onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData({ 
                        ...formData, 
                        tanah_lebih_m2: val,
                        kelebihan_tanah_rp: val * (formData.harga_ktanah || 0)
                      });
                    }} />
                  </div>
                  <div>
                    <label className="bb-label">Boulevard</label>
                    <select className="bb-input" value={formData.boulevard || 0} onChange={(e) => setFormData({ ...formData, boulevard: Number(e.target.value) })}>
                      <option value={0}>Tidak Ada</option>
                      <option value={1}>Ada</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">Taman</label>
                    <select className="bb-input" value={formData.taman || 0} onChange={(e) => setFormData({ ...formData, taman: Number(e.target.value) })}>
                      <option value={0}>Tidak Ada</option>
                      <option value={1}>Ada</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">Progres (%)</label>
                    <input type="number" className="bb-input" value={formData.progres_persen || 0} onChange={(e) => setFormData({ ...formData, progres_persen: Number(e.target.value) })} min="0" max="100" />
                  </div>
                  <div>
                    <label className="bb-label">STU</label>
                    <select className="bb-input" value={formData.stu || "STU"} onChange={(e) => setFormData({ ...formData, stu: e.target.value })}>
                      <option value="STU">STU</option>
                      <option value="HUNI">HUNI</option>
                      <option value="RENOV">RENOV</option>
                      <option value="NUP">NUP</option>
                      <option value="DLL">DLL</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">Tgl STU</label>
                    <input type="date" className="bb-input" value={formData.tgl_stu || ""} onChange={(e) => setFormData({ ...formData, tgl_stu: e.target.value })} />
                  </div>
                  <div>
                    <label className="bb-label">MI</label>
                    <select className="bb-input" value={formData.mi || 0} onChange={(e) => setFormData({ ...formData, mi: Number(e.target.value) })}>
                      <option value={0}>Tidak</option>
                      <option value={1}>Ya</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">HUNI</label>
                    <select className="bb-input" value={formData.huni || 0} onChange={(e) => setFormData({ ...formData, huni: Number(e.target.value) })}>
                      <option value={0}>Tidak</option>
                      <option value={1}>Ya</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">RENOV</label>
                    <select className="bb-input" value={formData.renov || 0} onChange={(e) => setFormData({ ...formData, renov: Number(e.target.value) })}>
                      <option value={0}>Tidak</option>
                      <option value={1}>Ya</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">Cut Off Teknik</label>
                    <input type="date" className="bb-input" value={formData.cut_off_teknik || ""} onChange={(e) => setFormData({ ...formData, cut_off_teknik: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* III. KEWAJIBAN BAYAR */}
              <div className="bb-card p-4 bg-yellow-50 border-2 border-yellow-500">
                <h4 className="font-black text-lg mb-3">III. KEWAJIBAN BAYAR (MENGURANGI HARGA JUAL)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="bb-label">Harga Unit</label>
                    <input type="number" className="bb-input" value={formData.harga_unit || 0} onChange={(e) => setFormData({ ...formData, harga_unit: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Harga K/Tanah (per m²)</label>
                    <input type="number" className="bb-input" value={formData.harga_ktanah || 0} onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData({ 
                        ...formData, 
                        harga_ktanah: val,
                        kelebihan_tanah_rp: (formData.tanah_lebih_m2 || 0) * val
                      });
                    }} />
                  </div>
                  <div>
                    <label className="bb-label">Uang Muka (DP Wajib)</label>
                    <input type="number" className="bb-input" value={formData.uang_muka_dp || 0} onChange={(e) => setFormData({ ...formData, uang_muka_dp: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Biaya Proses & Adm</label>
                    <input type="number" className="bb-input" value={formData.biaya_proses_adm || 0} onChange={(e) => setFormData({ ...formData, biaya_proses_adm: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Kelebihan Tanah (Rp)</label>
                    <input type="number" className="bb-input" value={formData.kelebihan_tanah_rp || 0} readOnly />
                  </div>
                  <div>
                    <label className="bb-label">Boulevard (Rp)</label>
                    <input type="number" className="bb-input" value={formData.boulevard_rp || 0} onChange={(e) => setFormData({ ...formData, boulevard_rp: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Depan Tanah (Rp)</label>
                    <input type="number" className="bb-input" value={formData.depan_tanah_rp || 0} onChange={(e) => setFormData({ ...formData, depan_tanah_rp: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Diskon</label>
                    <input type="number" className="bb-input" value={formData.diskon || 0} onChange={(e) => setFormData({ ...formData, diskon: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">AJB & Notaris</label>
                    <input type="number" className="bb-input" value={formData.ajb_notaris || 0} onChange={(e) => setFormData({ ...formData, ajb_notaris: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Cut Off</label>
                    <input type="number" className="bb-input" value={formData.cut_off || 0} onChange={(e) => setFormData({ ...formData, cut_off: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">PPN / Bebas PPN</label>
                    <input type="number" className="bb-input" value={formData.ppn_bebas_ppn || 0} onChange={(e) => setFormData({ ...formData, ppn_bebas_ppn: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Biaya Adm & Pajak</label>
                    <input type="number" className="bb-input" value={formData.biaya_adm_pajak || 0} onChange={(e) => setFormData({ ...formData, biaya_adm_pajak: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <label className="bb-label font-black text-lg">HARGA JUAL AKHIR (Otomatis)</label>
                    <input type="number" className="bb-input text-2xl font-black bg-green-100" value={formData.harga_jual_akhir || 0} readOnly />
                  </div>
                </div>
              </div>

              {/* IV. KEWAJIBAN TIDAK MENGURANGI HARGA JUAL */}
              <div className="bb-card p-4 bg-purple-50 border-2 border-purple-500">
                <h4 className="font-black text-lg mb-3">IV. KEWAJIBAN TIDAK MENGURANGI HARGA JUAL</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="bb-label">Biaya Renovasi</label>
                    <input type="number" className="bb-input" value={formData.biaya_renovasi || 0} onChange={(e) => setFormData({ ...formData, biaya_renovasi: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="bb-label">Biaya Pindah</label>
                    <input type="number" className="bb-input" value={formData.biaya_pindah || 0} onChange={(e) => setFormData({ ...formData, biaya_pindah: Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* FILE UPLOAD SECTION */}
              <div className="bb-card p-4 bg-red-50 border-2 border-red-500">
                <h4 className="font-black text-lg mb-3">UPLOAD DOKUMEN KE ARSIP</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="bb-label">Upload PPJB</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'ppjb')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload SPH</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'sph')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload SP</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'sp')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload Foto Unit</label>
                    <input type="file" accept=".jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'foto_unit')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload Pembayaran</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'pembayaran')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload Lainnya</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'lainnya')} />
                  </div>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border-2 border-black">
                    <div className="font-bold mb-2">File Terupload ({uploadedFiles.length}):</div>
                    <div className="space-y-1">
                      {uploadedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-black">
                          <div className="flex items-center gap-2">
                            <FiFileText />
                            <span className="text-sm">{f.name}</span>
                            <span className="text-xs text-gray-500">({f.category})</span>
                          </div>
                          <button onClick={() => handleRemoveFile(idx)} className="bb-btn bb-btn-small bb-btn-danger">
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "consumers" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="bb-label">ID Konsumen *</label>
                  <input type="text" className="bb-input" value={formData.id || ""} readOnly placeholder="Auto-generate" />
                </div>
                <div>
                  <label className="bb-label">Nama *</label>
                  <input type="text" className="bb-input" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="bb-label">Phone *</label>
                  <input type="text" className="bb-input" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="bb-label">Email</label>
                  <input type="email" className="bb-input" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="bb-label">KTP No</label>
                  <input type="text" className="bb-input" value={formData.ktp_no || ""} onChange={(e) => setFormData({ ...formData, ktp_no: e.target.value })} />
                </div>
                <div>
                  <label className="bb-label">Area</label>
                  <input type="text" className="bb-input" value={formData.area || ""} onChange={(e) => setFormData({ ...formData, area: e.target.value })} />
                </div>
                <div>
                  <label className="bb-label">Blok</label>
                  <input type="text" className="bb-input" value={formData.blok || ""} onChange={(e) => setFormData({ ...formData, blok: e.target.value })} />
                </div>
                <div>
                  <label className="bb-label">Marketing</label>
                  <input type="text" className="bb-input" value={formData.marketing || ""} onChange={(e) => setFormData({ ...formData, marketing: e.target.value })} />
                </div>
              </div>

              {/* FILE UPLOAD FOR CONSUMERS */}
              <div className="bb-card p-4 bg-red-50 border-2 border-red-500">
                <h4 className="font-black text-lg mb-3">UPLOAD DOKUMEN KONSUMEN</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="bb-label">Upload PPJB</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'ppjb')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload SPH</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'sph')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload KTP</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'ktp')} />
                  </div>
                  <div>
                    <label className="bb-label">Upload Lainnya</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="bb-input" onChange={(e) => handleFileUpload(e, 'lainnya')} />
                  </div>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border-2 border-black">
                    <div className="font-bold mb-2">File Terupload ({uploadedFiles.length}):</div>
                    <div className="space-y-1">
                      {uploadedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-black">
                          <div className="flex items-center gap-2">
                            <FiFileText />
                            <span className="text-sm">{f.name}</span>
                            <span className="text-xs text-gray-500">({f.category})</span>
                          </div>
                          <button onClick={() => handleRemoveFile(idx)} className="bb-btn bb-btn-small bb-btn-danger">
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Banks & Products forms tetap sama seperti sebelumnya */}
          {activeTab === "banks" && (
            <div className="space-y-4">
              <div>
                <label className="bb-label">Bank Name *</label>
                <input type="text" className="bb-input" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="bb-label">Account Number *</label>
                <input type="text" className="bb-input" value={formData.account_no || ""} onChange={(e) => setFormData({ ...formData, account_no: e.target.value })} />
              </div>
              <div>
                <label className="bb-label">Account Holder Name *</label>
                <input type="text" className="bb-input" value={formData.holder_name || ""} onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })} />
              </div>
              <div>
                <label className="bb-label">Branch</label>
                <input type="text" className="bb-input" value={formData.branch || ""} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-4">
              <div>
                <label className="bb-label">Code *</label>
                <input type="text" className="bb-input" value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              </div>
              <div>
                <label className="bb-label">Product Name *</label>
                <input type="text" className="bb-input" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="bb-label">Price *</label>
                  <input type="number" className="bb-input" value={formData.price || 0} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="bb-label">Type *</label>
                  <select className="bb-input" value={formData.type || "fee"} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option value="fee">Fee</option>
                    <option value="service">Service</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6 pt-4 border-t-4 border-black">
            <button onClick={handleSave} className="bb-btn bb-btn-primary flex-1">
              <FiSave className="mr-2" /> Simpan
            </button>
            <button onClick={() => setShowModal(false)} className="bb-btn bb-btn-secondary">Batal</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="p-4 space-y-6">
        <h1 className="text-3xl font-black mb-4 border-b-4 border-black inline-block">
          Master Database
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b-4 border-black pb-2">
          <button
            onClick={() => { setActiveTab("houses"); setPage(1); }}
            className={`bb-btn ${activeTab === "houses" ? "bb-btn-primary" : "bb-btn-secondary"}`}
          >
            <FiHome className="mr-2" /> Houses ({houses.length})
          </button>
          <button
            onClick={() => { setActiveTab("banks"); setPage(1); }}
            className={`bb-btn ${activeTab === "banks" ? "bb-btn-primary" : "bb-btn-secondary"}`}
          >
            <FiDollarSign className="mr-2" /> Banks ({banks.length})
          </button>
          <button
            onClick={() => { setActiveTab("products"); setPage(1); }}
            className={`bb-btn ${activeTab === "products" ? "bb-btn-primary" : "bb-btn-secondary"}`}
          >
            <FiDatabase className="mr-2" /> Products ({products.length})
          </button>
          <button
            onClick={() => { setActiveTab("consumers"); setPage(1); }}
            className={`bb-btn ${activeTab === "consumers" ? "bb-btn-primary" : "bb-btn-secondary"}`}
          >
            <FiUsers className="mr-2" /> Consumers ({consumers.length})
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="bb-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="bb-input-wrap">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Cari..."
                  className="flex-1"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            {activeTab === "houses" && (
              <>
                <select
                  className="bb-input w-32"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Semua Status</option>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="rented">Rented</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
                <select
                  className="bb-input w-32"
                  value={towerFilter}
                  onChange={(e) => { setTowerFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Semua Tower</option>
                  {Array.from(new Set(houses.map(h => h.tower).filter(Boolean))).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </>
            )}

            <button onClick={handleAdd} className="bb-btn bb-btn-primary">
              <FiPlus className="mr-2" /> Tambah
            </button>
            <button onClick={handleExport} className="bb-btn bb-btn-secondary">
              <FiDownload className="mr-2" /> Export
            </button>
            <label className="bb-btn bb-btn-secondary cursor-pointer">
              <FiUpload className="mr-2" /> Import
              <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={loadData} className="bb-btn bb-btn-secondary">
              <FiRefreshCw className="mr-2" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bb-card bb-table-wrapper">
          {loading ? (
            <div className="text-center py-12">
              <FiRefreshCw className="animate-spin text-4xl mx-auto mb-4" />
              <p className="font-bold">Memuat data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600 font-bold">{error}</div>
          ) : (
            <>
              {renderTable()}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-black">
                  <div className="font-bold">
                    Halaman {page} dari {totalPages} — {filteredData.length} data
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bb-btn bb-btn-small"
                    >
                      Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = page <= 3 ? i + 1 : page - 2 + i;
                      if (p > totalPages) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`bb-btn bb-btn-small ${page === p ? "bg-black text-white" : ""}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="bb-btn bb-btn-small"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {renderModal()}
      </div>
    </AdminLayout>
  );
}