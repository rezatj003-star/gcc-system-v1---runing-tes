import { getConsumers } from "../../api"

// NORMALISASI AGAR COMPATIBLE DENGAN Dashboard, ReportForm, Reports, ConsumerTable, WA Template
export const normalizeConsumer = (r = {}) => {
  const o = { ...r }

  // ID
  o.id =
    r.id ??
    r["No"] ??
    r["no"] ??
    r["ID"] ??
    r["Id"] ??
    r.kode ??
    null

  // Nama / Name
  o.nama = r.nama ?? r.Nama ?? r.name ?? r["Name"] ?? "-"

  // Area
  o.area = r.area ?? r.Area ?? r["AREA"] ?? r["Area Rumah"] ?? ""

  // Blok
  o.blok =
    r.blok ??
    r.Blok ??
    r.block ??
    r["Block"] ??
    r["Blok Rumah"] ??
    ""

  // Phone
  o.phone =
    r.phone ??
    r["No Wa"] ??
    r["No_Wa"] ??
    r["no_wa"] ??
    r["WA"] ??
    ""

  // Harga rumah
  o.price = r.price ?? r["Harga Jual"] ?? r["harga"] ?? 0

  // Uang Muka / Down Payment
  o.downPayment =
    r.downPayment ??
    r["Uang Masuk"] ??
    r["DP"] ??
    r["Down Payment"] ??
    0

  // Outstanding
  o.outstanding = Number(
    r.outstanding ??
      r["Outstanding"] ??
      r["Sisa"] ??
      r["Sisa Tagihan"] ??
      0
  )

  // Installment / Angsuran
  o.installment =
    r.installment ??
    r["Nilai Angsuran"] ??
    r["Angsuran"] ??
    r.angsuran ??
    0

  // Jatuh tempo
  o.jatuh_tempo =
    r.jatuh_tempo ??
    r["Jatuh Tempo"] ??
    r["JatuhTempo"] ??
    r.dueDate ??
    r["Due Date"] ??
    ""

  // Status
  o.status =
    r.status ??
    r.Status ??
    r["PAYMENT_STATUS"] ??
    r["Payment Status"] ??
    "Belum Bayar"

  // Mulai cicilan
  o.mulai =
    r.mulai ??
    r["Mulai Cicilan"] ??
    r["Cicilan Mulai"] ??
    ""

  // Selesai cicilan
  o.selesai =
    r.selesai ??
    r["Selesai Cicilan"] ??
    r["Cicilan Selesai"] ??
    ""

  // Marketing
  o.marketing =
    r.marketing ??
    r.Marketing ??
    r.sales ??
    r["Sales"] ??
    "-"

  // Riwayat Pembayaran
  o.history =
    r.history ??
    r["Riwayat Pembayaran"] ??
    r["History"] ??
    r.paymentHistory ??
    []

  return o
}

export const getMasterConsumers = async () => {
  const res = await getConsumers()
  const arr = (res.data || []).map(normalizeConsumer)
  return arr
}