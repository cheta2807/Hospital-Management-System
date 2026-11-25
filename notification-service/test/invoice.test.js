const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

// Fake Django that only knows bill 7 and requires a bearer token.
const bill = {
  id: 7, invoice_no: "INV-00007", patient_name: "Aarav Kumar", description: "Consultation with Dr. Anita Sharma",
  amount: "800.00", status: "PAID", payment_method: "UPI", created_at: new Date().toISOString(), paid_at: new Date().toISOString(),
};
const fakeDjango = http.createServer((req, res) => {
  if (!req.headers.authorization) { res.writeHead(401); return res.end("{}"); }
  if (req.url === "/api/bills/7/") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify(bill)); }
  res.writeHead(404); res.end("{}");
});

test("invoice route returns a PDF built from Django data", async (t) => {
  await new Promise((r) => fakeDjango.listen(0, r));
  process.env.DJANGO_API_URL = `http://127.0.0.1:${fakeDjango.address().port}`;
  const app = require("../src/app");
  const server = app.listen(0);
  t.after(() => { server.close(); fakeDjango.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const noAuth = await fetch(`${base}/api/invoices/7/pdf`);
  assert.strictEqual(noAuth.status, 401);

  const missing = await fetch(`${base}/api/invoices/99/pdf`, { headers: { Authorization: "Bearer x" } });
  assert.strictEqual(missing.status, 404);

  const ok = await fetch(`${base}/api/invoices/7/pdf`, { headers: { Authorization: "Bearer x" } });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.headers.get("content-type"), "application/pdf");
  const buf = Buffer.from(await ok.arrayBuffer());
  assert.strictEqual(buf.subarray(0, 4).toString(), "%PDF");
});
