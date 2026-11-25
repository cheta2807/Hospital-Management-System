const express = require("express");
const config = require("../config");
const { buildInvoice } = require("../services/pdf");

const router = express.Router();

/**
 * GET /api/invoices/:id/pdf
 * Forwards the caller's JWT to Django, so Django's role rules decide who may see the bill
 * (patients only their own, staff all). This service never trusts the token itself.
 */
router.get("/:id/pdf", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ detail: "Authentication required." });
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ detail: "Invalid bill id." });

  let upstream;
  try {
    upstream = await fetch(`${config.djangoUrl}/api/bills/${req.params.id}/`, { headers: { Authorization: auth } });
  } catch (err) {
    console.error("Django unreachable:", err.message);
    return res.status(502).json({ detail: "Billing service is unreachable." });
  }
  if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : upstream.status).json({ detail: "Cannot load this bill." });

  const bill = await upstream.json();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${bill.invoice_no}.pdf"`);
  buildInvoice(bill, config.hospitalName, res);
});

module.exports = router;
