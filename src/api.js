/* ============================================================
   API.JS — ENV-BASED FINAL VERSION
   Author: GCC System
   Description:
   - Fully uses Vite environment variables
   - Zero hardcode for LAN or localhost
   - Production-ready axios wrapper
=============================================================== */

import axios from "axios";

/* ============================================================
   🔥 ENV-BASED BASE URLS
=============================================================== */
export const AUTH_URL = import.meta.env.VITE_AUTH_URL;
export const COLLECTION_URL = import.meta.env.VITE_COLLECTION_URL;
export const KASIR_URL = import.meta.env.VITE_KASIR_URL;
export const MASTER_URL = import.meta.env.VITE_MASTER_URL;
export const FILES_URL = import.meta.env.VITE_FILES_URL || AUTH_URL; // optional fallback

/* ============================================================
   AXIOS WRAPPER (Clean, Reusable)
=============================================================== */
const apiClient = (baseURL) =>
  axios.create({
    baseURL,
    timeout: 20000,
  });

export const api = {
  auth: apiClient(AUTH_URL),
  collection: apiClient(COLLECTION_URL),
  kasir: apiClient(KASIR_URL),
  master: apiClient(MASTER_URL),
  files: apiClient(FILES_URL),
};

/* ============================================================
   🔥 AUTH MODULE
=============================================================== */
export const login = async (username, password) => {
  const { data: users } = await api.auth.get("/users"); // ambil semua user
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) throw new Error("Invalid username/password");
  if (!user.isActive) throw new Error("User not active");
  return user; // login sukses
};

export const getUsers = () => api.auth.get("/users");
export const addUser = (data) => api.auth.post("/users", data);
export const updateUser = (id, data) => api.auth.put(`/users/${id}`, data);
export const deleteUser = (id) => api.auth.delete(`/users/${id}`);

export const toggleUser = async (id) => {
  const { data } = await api.auth.get(`/users/${id}`);
  return api.auth.put(`/users/${id}`, { ...data, isActive: !data.isActive });
};

export const changeUserPassword = (id, password) => 
  api.auth.patch(`/users/${id}`, { password });

/* ============================================================
   COLLECTION MODULE
=============================================================== */
export const getConsumers = () => api.collection.get("/consumers");
export const getConsumerById = (id) => api.collection.get(`/consumers/${id}`);
export const addConsumer = (data) => api.collection.post("/consumers", data);
export const updateConsumer = (id, data) => api.collection.put(`/consumers/${id}`, data);
export const deleteConsumer = (id) => api.collection.delete(`/consumers/${id}`);

// --- TEMPEL KODE BARU DI SINI ---
export const generateConsumerId = async () => {
  const uniqueId = "C-" + Date.now().toString().slice(-6);
  return uniqueId;
};

/* ============================================================
   KASIR MODULE
=============================================================== */
export const getCashIn = () => api.kasir.get("/cashIn");
export const addCashIn = (d) => api.kasir.post("/cashIn", d);
export const updateCashIn = (id, d) => api.kasir.put(`/cashIn/${id}`, d);
export const deleteCashIn = (id) => api.kasir.delete(`/cashIn/${id}`);

export const getCashOut = () => api.kasir.get("/cashOut");
export const addCashOut = (d) => api.kasir.post("/cashOut", d);
export const updateCashOut = (id, d) => api.kasir.put(`/cashOut/${id}`, d);
export const deleteCashOut = (id) => api.kasir.delete(`/cashOut/${id}`);

export const getKwitansi = () => api.kasir.get("/kwitansi");
export const addKwitansi = (d) => api.kasir.post("/kwitansi", d);
export const updateKwitansi = (id, d) => api.kasir.put(`/kwitansi/${id}`, d);
export const deleteKwitansi = (id) => api.kasir.delete(`/kwitansi/${id}`);

export const getTukarKwi = () => api.kasir.get("/tukarKwi");
export const addTukarKwi = (d) => api.kasir.post("/tukarKwi", d);
export const updateTukarKwi = (id, d) => api.kasir.put(`/tukarKwi/${id}`, d);
export const deleteTukarKwi = (id) => api.kasir.delete(`/tukarKwi/${id}`);

export const getLaporanKasir = () => api.kasir.get("/laporan");
export const addLaporanKasir = (d) => api.kasir.post("/laporan", d);
export const updateLaporanKasir = (id, d) => api.kasir.put(`/laporan/${id}`, d);
export const deleteLaporanKasir = (id) => api.kasir.delete(`/laporan/${id}`);

export const addCancel = (collection, data) => api.kasir.post(`/${collection}Cancel`, data);

/* ============================================================
   MASTER MODULE
=============================================================== */
export const getHouses = () => api.master.get("/houses");
export const addHouse = (d) => api.master.post("/houses", d);
export const updateHouse = (id, d) => api.master.put(`/houses/${id}`, d);
export const deleteHouse = (id) => api.master.delete(`/houses/${id}`);

export const getBanks = () => api.master.get("/banks");
export const addBank = (d) => api.master.post("/banks", d);
export const updateBank = (id, d) => api.master.put(`/banks/${id}`, d);
export const deleteBank = (id) => api.master.delete(`/banks/${id}`);

export const getProducts = () => api.master.get("/products");
export const addProduct = (d) => api.master.post("/products", d);
export const updateProduct = (id, d) => api.master.put(`/products/${id}`, d);
export const deleteProduct = (id) => api.master.delete(`/products/${id}`);

/* ============================================================
   FILES MODULE
=============================================================== */
export const uploadFile = (formData) =>
  api.files.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const downloadFile = (filename, category) =>
  api.files.get(`/download/${filename}?category=${category}`, {
    responseType: "blob",
  });

export const listFiles = (category) => api.files.get(`/list?category=${category}`);

export const deleteFile = (filename, category) =>
  api.files.delete(`/${filename}?category=${category}`);
