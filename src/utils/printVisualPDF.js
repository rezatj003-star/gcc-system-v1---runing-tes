import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function printVisualPDF(elementId, fileName = "document") {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Element tidak ditemukan!");
    return;
  }

  /* SEMBUNYIKAN ELEMEN print-hide */
  const hidden = document.querySelectorAll(".print-hide");
  hidden.forEach(el => (el.style.display = "none"));

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#FFFFFF",
    useCORS: true,
    scrollY: -window.scrollY
  });

  /* TAMPILKAN KEMBALI */
  hidden.forEach(el => (el.style.display = ""));

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${fileName}.pdf`);
}