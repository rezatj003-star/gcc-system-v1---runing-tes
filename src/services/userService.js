import axios from "axios";

const API = "http://localhost:8001/users";

export const getUsers = async () => {
  const res = await axios.get(API);
  return res.data;
};

export const addUser = async (data) => {
  const res = await axios.post(API, data);
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await axios.patch(`${API}/${id}`, data);
  return res.data;
};

export const deleteUser = async (id) => {
  await axios.delete(`${API}/${id}`);
};

export const toggleUser = async (id) => {
  const user = await axios.get(`${API}/${id}`);
  const updatedStatus = !user.data.isActive;
  const res = await axios.patch(`${API}/${id}`, { isActive: updatedStatus });
  return res.data;
};

// FIX: Gunakan PATCH biasa ke endpoint ID untuk update field password
export const changeUserPassword = async (userId, newPassword) => {
  try {
    const res = await axios.patch(`${API}/${userId}`, {
      password: newPassword,
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};