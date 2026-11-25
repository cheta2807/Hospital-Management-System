const PDFDocument = require("pdfkit");

// pdfkit's built-in Helvetica has no rupee glyph, so amounts are printed as "Rs."
const money = (v) => `Rs. ${Number(v).toFixed(2)}`;

/** Streams an invoice PDF for a bill object (as returned by Django /api/bills/:id/). */
function buildInvoice(bill, hospitalName, stream) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(stream);

  doc.fontSize(20).font("Helvetica-Bold").text(hospitalName);
  doc.fontSize(10).font("Helvetica").fillColor("#555").text("Invoice / Payment receipt");
  doc.moveDown(1.5).fillColor("#000");

  doc.fontSize(12).font("Helvetica-Bold").text(`Invoice ${bill.invoice_no}`);
  doc.font("Helvetica").fontSize(10);
  doc.text(`Date: ${new Date(bill.created_at).toLocaleDateString("en-GB")}`);
  doc.text(`Patient: ${bill.patient_name}`);
  doc.text(`Status: ${bill.status}${bill.payment_method ? ` (${bill.payment_method})` : ""}`);
  if (bill.paid_at) doc.text(`Paid on: ${new Date(bill.paid_at).toLocaleString("en-GB")}`);
  doc.moveDown();

  const y = doc.y;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#999").stroke();
  doc.font("Helvetica-Bold").text("Description", 50, y + 8).text("Amount", 450, y + 8, { width: 95, align: "right" });
  doc.moveTo(50, y + 26).lineTo(545, y + 26).stroke();
  doc.font("Helvetica").text(bill.description, 50, y + 34, { width: 380 });
  doc.text(money(bill.amount), 450, y + 34, { width: 95, align: "right" });

  const total = Math.max(doc.y, y + 60) + 12;
  doc.moveTo(50, total).lineTo(545, total).stroke();
  doc.font("Helvetica-Bold").fontSize(12).text("Total", 50, total + 8).text(money(bill.amount), 400, total + 8, { width: 145, align: "right" });

  doc.font("Helvetica").fontSize(9).fillColor("#666").text("This is a computer-generated invoice.", 50, 760, { align: "center", width: 495 });
  doc.end();
}

module.exports = { buildInvoice, money };
