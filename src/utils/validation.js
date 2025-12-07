export const validators = {
  // Username validation (lebih fleksibel)
  username: (value) => {
    if (!value) return "Username tidak boleh kosong";
    if (value.length < 3) return "Username minimal 3 karakter";
    if (value.length > 50) return "Username maksimal 50 karakter";
    if (!/^[a-zA-Z0-9._\-]+$/.test(value))
      return "Username hanya boleh mengandung huruf, angka, titik, underscore dan dash";
    return null;
  },

  // Password validation (kompatibel JSON-server)
  password: (value) => {
    if (!value) return "Password tidak boleh kosong";
    if (value.length < 4) return "Password minimal 4 karakter";
    if (value.length > 100) return "Password maksimal 100 karakter";
    return null;
  },

  // Email validation
  email: (value) => {
    if (!value) return "Email tidak boleh kosong";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Format email tidak valid";
    return null;
  },

  // Phone validation
  phone: (value) => {
    if (!value) return "Nomor telepon tidak boleh kosong";
    if (!/^[0-9+\-\s()]+$/.test(value))
      return "Format nomor telepon tidak valid";
    if (value.replace(/\D/g, "").length < 10)
      return "Nomor telepon minimal 10 digit";
    return null;
  },

  // Name validation
  name: (value) => {
    if (!value) return "Nama tidak boleh kosong";
    if (value.length < 3) return "Nama minimal 3 karakter";
    if (value.length > 100) return "Nama maksimal 100 karakter";
    if (!/^[a-zA-Z\s'.-]+$/i.test(value))
      return "Nama hanya boleh huruf, spasi, titik, apostrophe, dash";
    return null;
  },

  // Number validation
  number: (value, min = 0, max = Number.POSITIVE_INFINITY) => {
    if (!value && value !== 0) return "Nilai tidak boleh kosong";
    if (isNaN(value)) return "Nilai harus berupa angka";
    if (Number(value) < min) return `Nilai minimal ${min}`;
    if (Number(value) > max) return `Nilai maksimal ${max}`;
    return null;
  },

  // Date validation
  date: (value) => {
    if (!value) return "Tanggal tidak boleh kosong";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Format tanggal tidak valid";
    return null;
  },

  // Select validation
  select: (value) => {
    if (!value) return "Pilihan tidak boleh kosong";
    return null;
  },

  // Checkbox validation
  checkbox: (value) => {
    if (!value) return "Harus dicentang";
    return null;
  },
};

// Full-form validator
export const validateForm = (formData, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const rule = rules[field];
    const value = formData[field];

    if (typeof rule === "function") {
      const error = rule(value);
      if (error) errors[field] = error;
    } else if (Array.isArray(rule)) {
      for (const validator of rule) {
        const error = validator(value);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateAmount = (value) => {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return !isNaN(n) && n > 0;
};

export const validateDescription = (value) => {
  if (typeof value !== "string") return false;
  return value.trim().length >= 3;
};