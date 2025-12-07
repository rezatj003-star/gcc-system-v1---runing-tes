// src/MasterData/MasterArsip.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "../layout/AdminLayout";
import { FiFileText, FiUpload, FiDownload, FiSearch, FiTrash2, FiEye, FiTag, FiLink } from "react-icons/fi";

export default function MasterArsip() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    name: "",
    category: "kwitansi",
    linkedEntityType: "",
    linkedEntityId: "",
    tags: "",
    description: ""
  });

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API
      // const res = await api.master.get("/files");
      // setFiles(res.data);
      
      // Mock data
      setFiles([
        {
          id: "1",
          name: "Kwitansi_001.pdf",
          category: "kwitansi",
          linkedEntityType: "consumer",
          linkedEntityId: "GCC-00001",
          tags: ["pembayaran", "januari"],
          uploadedAt: "2024-01-15",
          uploadedBy: "Admin",
          size: 245678,
          url: "#"
        }
      ]);
    } catch (err) {
      console.error("Load files error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file) {
      alert("Pilih file terlebih dahulu");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", uploadData.file);
      formData.append("name", uploadData.name || uploadData.file.name);
      formData.append("category", uploadData.category);
      formData.append("linkedEntityType", uploadData.linkedEntityType);
      formData.append("linkedEntityId", uploadData.linkedEntityId);
      formData.append("tags", uploadData.tags);
      formData.append("description", uploadData.description);

      // Mock API call
      // await api.master.post("/files", formData, { headers: { "Content-Type": "multipart/form-data" } });
      
      alert("File berhasil diupload!");
      setShowUploadModal(false);
      setUploadData({
        file: null,
        name: "",
        category: "kwitansi",
        linkedEntityType: "",
        linkedEntityId: "",
        tags: "",
        description: ""
      });
      await loadFiles();
    } catch (err) {
      alert("Gagal upload file.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus file ini?")) return;
    try {
      // await api.master.delete(`/files/${id}`);
      await loadFiles();
    } catch (err) {
      alert("Gagal menghapus file.");
    }
  };

  const filteredFiles = files.filter(f => {
    if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !(f.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }
    if (categoryFilter && f.category !== categoryFilter) return false;
    if (entityFilter && f.linkedEntityType !== entityFilter) return false;
    return true;
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <AdminLayout>
      <div className="p-4 space-y-6">
        <h1 className="text-3xl font-black mb-4 border-b-4 border-black inline-block">
          Master Arsip Dokumen
        </h1>

        {/* Upload Card */}
        <div className="bb-card p-6 bg-yellow-50 border-4 border-yellow-500">
          <div className="flex items-center gap-4 mb-4">
            <FiFileText className="text-5xl text-black" />
            <div>
              <p className="text-xl font-black">Arsip PDF & Dokumen</p>
              <p className="text-sm font-bold">
                Upload, kelola, dan arsipkan seluruh dokumen PDF di sini.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bb-btn bb-btn-primary"
          >
            <FiUpload className="mr-2" /> Upload Dokumen
          </button>
        </div>

        {/* Filters */}
        <div className="bb-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="bb-input-wrap">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Cari nama file atau tag..."
                  className="flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <select
              className="bb-input w-40"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              <option value="kwitansi">Kwitansi</option>
              <option value="kontrak">Kontrak</option>
              <option value="ktp">KTP</option>
              <option value="surat">Surat</option>
              <option value="lainnya">Lainnya</option>
            </select>
            <select
              className="bb-input w-40"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">Semua Entity</option>
              <option value="consumer">Consumer</option>
              <option value="house">House</option>
              <option value="payment">Payment</option>
              <option value="invoice">Invoice</option>
            </select>
          </div>
        </div>

        {/* Files List */}
        <div className="bb-card bb-table-wrapper">
          <table className="bb-table w-full">
            <thead className="bb-thead">
              <tr>
                <th>No</th>
                <th>Nama File</th>
                <th>Kategori</th>
                <th>Linked To</th>
                <th>Tags</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody className="bb-tbody">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-6">Memuat...</td></tr>
              ) : filteredFiles.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-6">Tidak ada file</td></tr>
              ) : (
                filteredFiles.map((f, i) => (
                  <tr key={f.id}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{f.name}</td>
                    <td><span className="bb-badge bb-badge-yellow">{f.category}</span></td>
                    <td>
                      {f.linkedEntityType && f.linkedEntityId ? (
                        <span className="text-xs">
                          <FiLink className="inline mr-1" />
                          {f.linkedEntityType}: {f.linkedEntityId}
                        </span>
                      ) : "-"}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(f.tags || []).map((tag, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded border border-black">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{formatFileSize(f.size)}</td>
                    <td className="text-xs">{f.uploadedAt}<br />by {f.uploadedBy}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedFile(f)}
                          className="bb-btn bb-btn-small bb-btn-secondary"
                        >
                          <FiEye />
                        </button>
                        <a
                          href={f.url}
                          download
                          className="bb-btn bb-btn-small bb-btn-secondary"
                        >
                          <FiDownload />
                        </a>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="bb-btn bb-btn-small bb-btn-danger"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
            <div className="modal-card bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-4">Upload Dokumen</h3>
              <div className="space-y-4">
                <div>
                  <label className="bb-label">File *</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="bb-input"
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0], name: e.target.files[0]?.name || "" })}
                  />
                </div>
                <div>
                  <label className="bb-label">Nama File</label>
                  <input
                    type="text"
                    className="bb-input"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="bb-label">Kategori *</label>
                    <select
                      className="bb-input"
                      value={uploadData.category}
                      onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                    >
                      <option value="kwitansi">Kwitansi</option>
                      <option value="kontrak">Kontrak</option>
                      <option value="ktp">KTP</option>
                      <option value="surat">Surat</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label">Linked Entity Type</label>
                    <select
                      className="bb-input"
                      value={uploadData.linkedEntityType}
                      onChange={(e) => setUploadData({ ...uploadData, linkedEntityType: e.target.value })}
                    >
                      <option value="">-</option>
                      <option value="consumer">Consumer</option>
                      <option value="house">House</option>
                      <option value="payment">Payment</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  </div>
                </div>
                {uploadData.linkedEntityType && (
                  <div>
                    <label className="bb-label">Linked Entity ID</label>
                    <input
                      type="text"
                      className="bb-input"
                      value={uploadData.linkedEntityId}
                      onChange={(e) => setUploadData({ ...uploadData, linkedEntityId: e.target.value })}
                      placeholder="GCC-00001 atau HOU-0001"
                    />
                  </div>
                )}
                <div>
                  <label className="bb-label">Tags (pisahkan dengan koma)</label>
                  <input
                    type="text"
                    className="bb-input"
                    value={uploadData.tags}
                    onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                    placeholder="pembayaran, januari, kontrak"
                  />
                </div>
                <div>
                  <label className="bb-label">Deskripsi</label>
                  <textarea
                    className="bb-input"
                    rows="3"
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleUpload} className="bb-btn bb-btn-primary flex-1">Upload</button>
                  <button onClick={() => setShowUploadModal(false)} className="bb-btn bb-btn-secondary">Batal</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {selectedFile && (
          <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedFile(null)}>
            <div className="modal-card bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-4">{selectedFile.name}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Kategori:</strong> {selectedFile.category}</p>
                <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                <p><strong>Uploaded:</strong> {selectedFile.uploadedAt} by {selectedFile.uploadedBy}</p>
                {selectedFile.linkedEntityType && (
                  <p><strong>Linked:</strong> {selectedFile.linkedEntityType} - {selectedFile.linkedEntityId}</p>
                )}
                <div className="mt-4">
                  <iframe src={selectedFile.url} className="w-full h-96 border-2 border-black rounded-lg" />
                </div>
              </div>
              <button onClick={() => setSelectedFile(null)} className="bb-btn bb-btn-secondary mt-4">Tutup</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}