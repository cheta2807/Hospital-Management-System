import { useState } from "react";
import { api, errorMessage, notify } from "../api/client";
import { Empty, Field, Notice, PageHeader, Pagination, Status } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useList, useOptions } from "../api/useList";
import { fmtDate, money } from "../utils";

export default function Billing() {
  const { user } = useAuth();
  const isStaff = ["ADMIN", "RECEPTIONIST"].includes(user.role);
  const [status, setStatus] = useState("");
  const list = useList("/bills/", { status });
  const patients = useOptions("/patients/");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient: "", description: "", amount: "" });
  const [methods, setMethods] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/bills/", form);
      setForm({ patient: "", description: "", amount: "" });
      setOpen(false);
      setMessage("Bill created.");
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const pay = async (bill) => {
    setError("");
    setMessage("");
    try {
      await api.post(`/bills/${bill.id}/pay/`, { payment_method: methods[bill.id] || (isStaff ? "CASH" : "UPI") });
      setMessage(`${bill.invoice_no} marked as paid.`);
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const download = async (bill) => {
    setError("");
    try {
      const res = await notify.get(`/invoices/${bill.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bill.invoice_no}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response ? "Could not generate the invoice PDF." : errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Billing">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All bills</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
        </select>
        {isStaff && <button onClick={() => setOpen(!open)}>{open ? "Close" : "Create bill"}</button>}
      </PageHeader>

      {open && (
        <form className="panel" onSubmit={create}>
          <Notice>{error}</Notice>
          <div className="grid">
            <Field label="Patient">
              <select value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required>
                <option value="">Choose…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </Field>
            <Field label="Description"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></Field>
            <Field label="Amount (₹)"><input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
          </div>
          <button>Save bill</button>
        </form>
      )}

      <Notice kind="success">{message}</Notice>
      <Notice>{!open && (error || list.error)}</Notice>
      {list.loading ? <p className="muted">Loading…</p> : list.items.length === 0 ? (
        <Empty>No bills yet. Bills appear here when an appointment is completed.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Date</th><th>Patient</th><th>Description</th><th className="num">Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.items.map((b) => (
                <tr key={b.id}>
                  <td>{b.invoice_no}</td><td>{fmtDate(b.created_at)}</td><td>{b.patient_name}</td><td>{b.description}</td>
                  <td className="num">{money(b.amount)}</td>
                  <td><Status value={b.status} />{b.payment_method && <span className="muted"> {b.payment_method}</span>}</td>
                  <td className="actions">
                    {b.status === "UNPAID" && (
                      <>
                        <select aria-label="Payment method" value={methods[b.id] || (isStaff ? "CASH" : "UPI")} onChange={(e) => setMethods({ ...methods, [b.id]: e.target.value })}>
                          {isStaff && <option value="CASH">Cash</option>}
                          <option value="CARD">Card</option>
                          <option value="UPI">UPI</option>
                        </select>
                        <button className="ghost" onClick={() => pay(b)}>Pay</button>
                      </>
                    )}
                    <button className="ghost" onClick={() => download(b)}>Download PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={list.page} count={list.count} pageSize={list.pageSize} onChange={list.setPage} />
    </>
  );
}
