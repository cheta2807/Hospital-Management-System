import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { Empty, Field, Notice, PageHeader, Pagination } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useList, useOptions } from "../api/useList";
import { fmtDate } from "../utils";

const BLANK_RX = { medicine: "", dosage: "", duration: "" };

export default function Records() {
  const { user } = useAuth();
  const isDoctor = user.role === "DOCTOR";
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const list = useList("/records/", { search });
  const patients = useOptions("/patients/");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient: "", diagnosis: "", notes: "" });
  const [rx, setRx] = useState([{ ...BLANK_RX }]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const setRxField = (i, key, value) => setRx(rx.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const prescriptions = rx.filter((r) => r.medicine.trim() && r.dosage.trim());
      await api.post("/records/", { ...form, prescriptions });
      setForm({ patient: "", diagnosis: "", notes: "" });
      setRx([{ ...BLANK_RX }]);
      setOpen(false);
      setMessage("Medical record saved.");
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Medical records">
        <form className="inline" onSubmit={(e) => { e.preventDefault(); setSearch(query); }}>
          <input placeholder="Search diagnosis or patient" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search records" />
          <button className="ghost">Search</button>
        </form>
        {isDoctor && <button onClick={() => setOpen(!open)}>{open ? "Close" : "New record"}</button>}
      </PageHeader>

      {open && (
        <form className="panel" onSubmit={save}>
          <Notice>{error}</Notice>
          <div className="grid">
            <Field label="Patient">
              <select value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required>
                <option value="">Choose…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </Field>
            <Field label="Diagnosis"><input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} required /></Field>
          </div>
          <Field label="Clinical notes"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <h2>Prescription</h2>
          {rx.map((r, i) => (
            <div className="rx-row" key={i}>
              <input placeholder="Medicine" value={r.medicine} onChange={(e) => setRxField(i, "medicine", e.target.value)} aria-label="Medicine" />
              <input placeholder="Dosage, e.g. 5 mg twice daily" value={r.dosage} onChange={(e) => setRxField(i, "dosage", e.target.value)} aria-label="Dosage" />
              <input placeholder="Duration" value={r.duration} onChange={(e) => setRxField(i, "duration", e.target.value)} aria-label="Duration" />
              <button type="button" className="ghost danger" disabled={rx.length === 1} onClick={() => setRx(rx.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
          <div className="inline">
            <button type="button" className="ghost" onClick={() => setRx([...rx, { ...BLANK_RX }])}>Add medicine</button>
            <button>Save record</button>
          </div>
        </form>
      )}

      <Notice kind="success">{message}</Notice>
      <Notice>{list.error}</Notice>
      {list.loading ? <p className="muted">Loading…</p> : list.items.length === 0 ? (
        <Empty>{isDoctor ? "No records yet. Complete an appointment, then add a record for the patient." : "No medical records yet."}</Empty>
      ) : (
        <div className="records">
          {list.items.map((r) => (
            <article key={r.id}>
              <header>
                <h3>{r.diagnosis}</h3>
                <p className="muted">{fmtDate(r.created_at)}, {r.patient_name} with {r.doctor_name}</p>
              </header>
              {r.notes && <p>{r.notes}</p>}
              {r.prescriptions.length > 0 && (
                <table className="rx">
                  <thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead>
                  <tbody>{r.prescriptions.map((p) => <tr key={p.id}><td>{p.medicine}</td><td>{p.dosage}</td><td>{p.duration || "-"}</td></tr>)}</tbody>
                </table>
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination page={list.page} count={list.count} pageSize={list.pageSize} onChange={list.setPage} />
    </>
  );
}
