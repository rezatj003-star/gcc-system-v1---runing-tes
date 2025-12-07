// ======================================================================
//  WhatsApp Template System – REVISI FINAL (PROFESSIONAL TERMS & FLEXIBLE STATUS AWARE)
// ======================================================================

const fmt = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const clean = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ==============================
// PARSER TANGGAL AMAN
// ==============================
export const parseDueDate = (rawDue) => {
  if (!rawDue && rawDue !== 0) return null;

  if (typeof rawDue === "string" && rawDue.includes("-")) {
    const d = new Date(rawDue);
    if (!isNaN(d)) return d;
  }

  const num = Number(rawDue);
  if (!isNaN(num) && num >= 1 && num <= 31) {
    const t = new Date();
    let c = new Date(t.getFullYear(), t.getMonth(), num);
    if (c < clean(t)) c = new Date(t.getFullYear(), t.getMonth() + 1, num);
    return c;
  }

  const d = new Date(rawDue);
  return isNaN(d) ? null : d;
};

// --- BANK ACCOUNT DETAILS ---
const bankDetails = `
Pembayaran dapat dilakukan melalui:
Mandiri : 1330-5127-80776
BRI     : 1739-01-000-171-300
`;

// ===============================
// TEMPLATE PESAN (Disesuaikan dengan Status Baru & Bahasa Profesional)
// ===============================
export const Templates = {
  // Untuk LUNAS, LANCAR, HAMPIR LUNAS
  paid: ({ nama, computedStatus }) => `Assalamualaikum, Bapak/Ibu ${nama}

Kami informasikan dengan penuh hormat bahwa pembayaran angsuran unit Bapak/Ibu telah kami terima dan tercatat dengan status **${computedStatus}**. 
Terima kasih atas kedisiplinan dan kerjasama Bapak/Ibu.

Hormat kami,
Customer Care`,

  // Digunakan untuk TUNGGAKAN KRITIS & KREDIT MACET TOTAL (3+ bulan)
  severeOverdue: (ctx) => `Assalamualaikum, Bapak/Ibu ${ctx.nama}

🚨 PERINGATAN RISIKO TINGGI: STATUS KREDIT MACET 🚨

Dengan hormat, akun angsuran **Unit ${ctx.blok}** tercatat telah memasuki kategori **${ctx.computedStatus}** dengan akumulasi tunggakan pembayaran selama *minimal ${ctx.delinquencyMonths} bulan*. Tunggakan ini sangat mempengaruhi status kepemilikan unit Anda.

Rincian Kewajiban:
Unit: ${ctx.blok}
Nilai Angsuran Pokok: ${ctx.angsuran}
Outstanding Sisa: ${ctx.outstanding}

Mohon segera hubungi Divisi Collection kami untuk penyelesaian tunggakan *secepatnya*.

Hormat kami,
Divisi Collection
${bankDetails}`,

  // Digunakan untuk TERTUNGGAK SEDANG & TERTUNGGAK RINGAN (1-2 bulan)
  mildOverdue: (ctx) => `Assalamualaikum, Bapak/Ibu ${ctx.nama}

Pemberitahuan: Angsuran **Unit ${ctx.blok}** tercatat **${ctx.computedStatus}** dan telah melewati batas waktu pembayaran.

Rincian:
Nilai Angsuran: ${ctx.angsuran}
Outstanding Sisa: ${ctx.outstanding}

Mohon kerjasamanya agar dapat segera melunasi kewajiban untuk menghindari eskalasi status menjadi Kritis.
${bankDetails}

Hormat kami,
Customer Care`,

  // Digunakan untuk JATUH TEMPO
  dueToday: (ctx) => `Assalamualaikum, Bapak/Ibu ${ctx.nama}

PEMBERITAHUAN JATUH TEMPO HARI INI:

Angsuran **Unit ${ctx.blok}** jatuh tempo hari ini (${ctx.dueStr}).

Nilai Angsuran: ${ctx.angsuran}

Mohon kesediaan Bapak/Ibu untuk menunaikan kewajiban pembayaran hari ini.

Hormat kami,
Customer Care`,

  // Digunakan untuk ANGSURAN BERJALAN (Informasi ringan)
  info: (ctx) => `Assalamualaikum, Bapak/Ibu ${ctx.nama}

Berikut kami sampaikan informasi mengenai status angsuran **Unit ${ctx.blok}**:
Status Saat Ini: **${ctx.computedStatus}**

Rincian Keuangan:
Nilai Angsuran: ${ctx.angsuran}
Outstanding Sisa: ${ctx.outstanding}

${bankDetails}

Hormat kami,
Customer Care`,
};

// ===============================
//  ENGINE UTAMA – PRODUKSI FINAL
// ===============================
export const makeWAMessage = (c = {}) => {

  const status = (c.computedStatus || c.status || "").toUpperCase();
  const angsuran = fmt(c.installment || 0);
  const outstanding = fmt(c.outstanding || 0);
  const nama = c.name || "-";
  const blok = c.blok || "-";
  const delinquencyMonths = c.tunggakanBulan || 0; 
  const rawDue = c.rawDue || c.dueDate || c["Jatuh Tempo"] || null;
  const dueStr = rawDue ? parseDueDate(rawDue)?.toLocaleDateString("id-ID") || rawDue : "-";

  const ctx = { 
      nama, 
      blok, // Menggunakan BLOK spesifik
      angsuran, 
      outstanding,
      computedStatus: status,
      delinquencyMonths: Math.abs(delinquencyMonths),
      dueStr: dueStr,
  };

  if (status === "LUNAS" || status === "LANCAR" || status === "HAMPIR LUNAS") return Templates.paid(ctx);
  if (status === "KREDIT MACET TOTAL" || status === "TUNGGAKAN KRITIS") return Templates.severeOverdue(ctx);
  if (status === "JATUH TEMPO") return Templates.dueToday(ctx);
  if (status === "TERTUNGGAK SEDANG" || status === "TERTUNGGAK RINGAN" || status === "ANGSURAN BERJALAN") return Templates.mildOverdue(ctx);
  
  // Default fallback (walaupun seharusnya status sudah terdefinisi)
  return Templates.info(ctx);
};