/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      /* ============================================================
         1. CUSTOM SPACING (DARI KODE ANDA)
      ============================================================ */
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
      },

      /* ============================================================
         2. CUSTOM COLORS (DARI KODE ANDA)
      ============================================================ */
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1e40af",
          700: "#1e3a8a",
          900: "#0c1222",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",

        // 👇 Untuk shadcn/radix biar kompatibel dan tidak bentrok
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },

      /* ============================================================
         3. FONTS (DARI KODE ANDA)
      ============================================================ */
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },

      /* ============================================================
         4. FONT SIZE (DARI KODE ANDA)
      ============================================================ */
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
      },

      /* ============================================================
         5. RADIUS UNTUK SHADCN (SAFE)
      ============================================================ */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },

  /* ============================================================
     6. PLUGIN (RECOMMENDED)
  ============================================================ */
  plugins: [
    require("tailwindcss-animate"),
  ],
};