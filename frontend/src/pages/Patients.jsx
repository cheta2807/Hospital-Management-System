import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { Empty, Field, Notice, PageHeader, Pagination } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useList } from "../api/useList";
import { fmtDate } from "../utils";

const EMPTY = { full_name: "", phone: "", email: "", date_of_birth: "", gender: "", blood_group: "", address: "" };
const GENDER = { M: "Male", F: "Female", O: "Other" };

export default function Patients() {
  const { user } = useAuth();
  const canAdd = ["ADMIN", "RECEPTIONIST"].includes(user.role);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const list = useList("/patients/", { search });
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/patients/", { ...form, date_of_birth: form.date_of_birth || null });
      setForm(EMPTY);
      setOpen(false);
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Patients">
        <form className="inline" onSubmit={(e) => { e.preventDefault(); setSearch(query); }}>
          <input placeholder="Search name, phone or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search patients" />
          <button className="ghost">Search</button>
        </form>
        {canAdd && <button onClick={() => setOpen(!open)}>{open ? "Close" : "Add patient"}</button>}
      </PageHeader>

      {open && (
        <form className="panel" onSubmit={add}>
          <Notice>{error}</Notice>
          <div className="grid">
            <Field label="Full name"><input value={form.full_name} onChange={set("full_name")} required /></Field>
            <Field label="Phone"><input value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="Date of birth"><input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
            <Field label="Gender">
              <select value={form.gender} onChange={set("gender")}>
                <option value="">Not specified</option>
                <option value="F">Female</option><option value="M">Male</option><option value="O">Other</option>
              </select>
            </Field>
            <Field label="Blood group"><input value={form.blood_group} onChange={set("blood_group")} placeholder="O+" /></Field>
          </div>
          <Field label="Address"><textarea rows={2} value={form.address} onChange={set("address")} /></Field>
          <button>Save patient</button>
        </form>
      )}

      <Notice>{list.error}</Notice>
      {list.loading ? <p className="muted">Loading…</p> : list.items.length === 0 ? (
        <Empty>{search ? "No patients match this search." : "No patients yet."}</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Gender</th><th>Blood group</th><th>Born</th></tr></thead>
            <tbody>
              {list.items.map((p) => (
                <tr key={p.id}>
                  <td>{p.full_name}</td><td>{p.phone || "-"}</td><td>{p.email || "-"}</td>
                  <td>{GENDER[p.gender] || "-"}</td><td>{p.blood_group || "-"}</td><td>{fmtDate(p.date_of_birth) || "-"}</td>
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
