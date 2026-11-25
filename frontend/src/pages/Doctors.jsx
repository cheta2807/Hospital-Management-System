import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { Empty, Field, Notice, PageHeader, Pagination } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useList, useOptions } from "../api/useList";
import { fmtTime, money } from "../utils";

const EMPTY = {
  first_name: "", last_name: "", username: "", password: "", email: "", department: "",
  specialization: "", consultation_fee: "500", available_from: "09:00", available_to: "17:00", slot_minutes: 30,
};

export default function Doctors() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [dept, setDept] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const list = useList("/doctors/", { search, department: dept });
  const departments = useOptions("/departments/");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [newDept, setNewDept] = useState("");
  const [error, setError] = useState("");
  const [deptList, setDeptList] = useState(null);
  const allDepts = deptList || departments;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/doctors/", { ...form, slot_minutes: Number(form.slot_minutes) });
      setForm(EMPTY);
      setOpen(false);
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const addDept = async () => {
    if (!newDept.trim()) return;
    try {
      const { data } = await api.post("/departments/", { name: newDept.trim() });
      setDeptList([...allDepts, data]);
      setNewDept("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Doctors">
        <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {allDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <form className="inline" onSubmit={(e) => { e.preventDefault(); setSearch(query); }}>
          <input placeholder="Search doctors" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search doctors" />
          <button className="ghost">Search</button>
        </form>
        {isAdmin && <button onClick={() => setOpen(!open)}>{open ? "Close" : "Add doctor"}</button>}
      </PageHeader>

      {open && (
        <form className="panel" onSubmit={add}>
          <Notice>{error}</Notice>
          <div className="grid">
            <Field label="First name"><input value={form.first_name} onChange={set("first_name")} required /></Field>
            <Field label="Last name"><input value={form.last_name} onChange={set("last_name")} /></Field>
            <Field label="Username"><input value={form.username} onChange={set("username")} required /></Field>
            <Field label="Password (8+ characters)"><input type="password" value={form.password} onChange={set("password")} required /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="Department">
              <select value={form.department} onChange={set("department")} required>
                <option value="">Choose…</option>
                {allDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Specialization"><input value={form.specialization} onChange={set("specialization")} required /></Field>
            <Field label="Consultation fee (₹)"><input type="number" min="0" step="0.01" value={form.consultation_fee} onChange={set("consultation_fee")} required /></Field>
            <Field label="Works from"><input type="time" value={form.available_from} onChange={set("available_from")} required /></Field>
            <Field label="Works until"><input type="time" value={form.available_to} onChange={set("available_to")} required /></Field>
            <Field label="Slot length (minutes)"><input type="number" min="5" max="120" value={form.slot_minutes} onChange={set("slot_minutes")} required /></Field>
          </div>
          <button>Save doctor</button>
          <div className="inline subtle">
            <input placeholder="New department name" value={newDept} onChange={(e) => setNewDept(e.target.value)} aria-label="New department name" />
            <button type="button" className="ghost" onClick={addDept}>Add department</button>
          </div>
        </form>
      )}

      <Notice>{!open && error}</Notice>
      <Notice>{list.error}</Notice>
      {list.loading ? <p className="muted">Loading…</p> : list.items.length === 0 ? (
        <Empty>No doctors found.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Department</th><th>Specialization</th><th>Hours</th><th>Fee</th></tr></thead>
            <tbody>
              {list.items.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td><td>{d.department_name}</td><td>{d.specialization}</td>
                  <td>{fmtTime(d.available_from)} to {fmtTime(d.available_to)}</td><td>{money(d.consultation_fee)}</td>
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
