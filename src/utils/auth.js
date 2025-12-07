// src/utils/auth.js
// =======================================================
//   AUTH UTIL — PRODUCTION READY FOR JSON-SERVER
//   (Not for real backend, but secure enough for local use)
// =======================================================

/* -------------------------------------------------------
   HASHING (SHA-256)
--------------------------------------------------------*/
export const hashPassword = async (password) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.error("Hash error:", err);
    return password; // fallback (never break login)
  }
};

/* -------------------------------------------------------
   VERIFY PASSWORD
   (Support plaintext OR hashed)
--------------------------------------------------------*/
export const verifyPassword = async (plainPassword, storedPassword) => {
  if (!plainPassword || !storedPassword) return false;

  // Try hash compare
  try {
    const hashed = await hashPassword(plainPassword);
    if (hashed === storedPassword) return true;
  } catch {}

  // Fallback plaintext (for legacy JSON)
  return plainPassword === storedPassword;
};

/* -------------------------------------------------------
   SESSION TOKEN
--------------------------------------------------------*/
export const generateSessionToken = () => {
  const ts = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${ts}-${random}`;
};

/* -------------------------------------------------------
   SESSION VALIDATION
--------------------------------------------------------*/
export const validateSession = (loginTime, timeout = 3 * 60 * 60 * 1000) => {
  const now = Date.now();
  return now - loginTime < timeout;
};

/* -------------------------------------------------------
   SAVE AUTH DATA
   (User object is CLONED so it never mutates)
--------------------------------------------------------*/
export const setAuthData = (user, token) => {
  try {
    const cleanUser = { ...user }; // clone, never mutate original

    // NEVER store password in localStorage
    delete cleanUser.password;

    localStorage.setItem("user", JSON.stringify(cleanUser));
    localStorage.setItem("authToken", token);
    localStorage.setItem("loginTime", Date.now());
  } catch (err) {
    console.error("Failed to save auth:", err);
  }
};

/* -------------------------------------------------------
   GET AUTH DATA
--------------------------------------------------------*/
export const getAuthData = () => {
  try {
    const rawUser = localStorage.getItem("user");
    const token = localStorage.getItem("authToken");
    const loginTime = Number(localStorage.getItem("loginTime") || 0);

    if (!rawUser || !token || !loginTime) return null;

    if (!validateSession(loginTime)) {
      clearAuthData();
      return null;
    }

    const user = JSON.parse(rawUser);
    return { user, token };
  } catch (err) {
    console.error("Auth parse error:", err);
    clearAuthData();
    return null;
  }
};

/* -------------------------------------------------------
   CLEAR AUTH
--------------------------------------------------------*/
export const clearAuthData = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("authToken");
  localStorage.removeItem("loginTime");
};

/* -------------------------------------------------------
   SANITIZE USER INPUT
--------------------------------------------------------*/
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/* -------------------------------------------------------
   EMAIL VALIDATION
--------------------------------------------------------*/
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/* -------------------------------------------------------
   PASSWORD STRENGTH
--------------------------------------------------------*/
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);

  const score = [
    password.length >= minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  return {
    isValid: password.length >= minLength && score >= 3,
    strength: score,
    feedback: { minLength, hasUpper, hasLower, hasNumber, hasSpecial },
  };
};