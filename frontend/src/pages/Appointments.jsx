import { useEffect, useState } from "react";
import { api, errorMessage } from "../api/client";
import { Empty, Field, Notice, PageHeader, Pagination, Status } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useList, useOptions } from "../api/useList";
import { fmtDate, fmtTime, todayISO } from "../utils";

function BookingForm({ editing, isStaff, onDone, onCancel }) {
  const isEdit = editing && editing !== "new";
  const patients = useOptions("/patients/");
  const doctors = useOptions("/doctors/");
  const [form, setForm] = useState({
    patient: "",
    doctor: isEdit ? String(editing.doctor) : "",
    date: isEdit ? editing.date : "",
    start_time: isEdit ? fmtTime(editing.start_time) : "",
    reason: isEdit ? editing.reason : "",
  });
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.doctor || !form.date) return setSlots([]);
    let ignore = false;
    api
      .get(`/doctors/${form.doctor}/slots/`, { params: { date: form.date } })
      .then((res) => {
        if (ignore) return;
        let list = res.data.slots;
        // The appointment being moved still occupies its own slot, so offer it back.
        if (isEdit && form.date === editing.date) list = [...new Set([...list, fmtTime(editing.start_time)])].sort();
        setSlots(list);
      })
      .catch((e) => !ignore && setError(errorMessage(e)));
    return () => {
      ignore = true;
    };
  }, [form.doctor, form.date]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!form.start_time) return setError("Pick a time slot.");
    setBusy(true);
    setError("");
    try {
      if (isEdit) {
        await api.patch(`/appointments/${editing.id}/`, { date: form.date, start_time: form.start_time, reason: form.reason });
      } else {
        const body = { doctor: form.doctor, date: form.date, start_time: form.start_time, reason: form.reason };
        if (isStaff) body.patient = form.patient;
        await api.post("/appointments/", body);
      }
      onDone(isEdit ? "Appointment rescheduled." : "Appointment booked.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h2>{isEdit ? "Reschedule appointment" : "Book an appointment"}</h2>
      <Notice>{error}</Notice>
      <div className="grid">
        {isStaff && !isEdit && (
          <Field label="Patient">
            <select value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required>
              <option value="">Choose…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Doctor">
          <select value={form.doctor} disabled={isEdit} onChange={(e) => setForm({ ...form, doctor: e.target.value, start_time: "" })} required>
            <option value="">Choose…</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.department_name}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" min={todayISO()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, start_time: "" })} required />
        </Field>
      </div>
      <div className="field">
        <span>Time</span>
        {!form.doctor || !form.date ? (
          <p className="muted">Choose a doctor and date to see free slots.</p>
        ) : slots.length === 0 ? (
          <p className="muted">No free slots on this date. Try another day.</p>
        ) : (
          <div className="slots" role="radiogroup" aria-label="Time slots">
            {slots.map((s) => (
              <button type="button" key={s} role="radio" aria-checked={form.start_time === s}
                className={form.start_time === s ? "slot on" : "slot"} onClick={() => setForm({ ...form, start_time: s })}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <Field label="Reason for visit"><textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
      <div className="inline">
        <button disabled={busy}>{busy ? "Saving…" : isEdit ? "Save new time" : "Book appointment"}</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const isStaff = ["ADMIN", "RECEPTIONIST"].includes(user.role);
  const canBook = isStaff || user.role === "PATIENT";
  const canComplete = ["ADMIN", "DOCTOR"].includes(user.role);
  const [status, setStatus] = useState("");
  const list = useList("/appointments/", { status });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const act = async (id, action, body = {}, done) => {
    setError("");
    setMessage("");
    try {
      await api.post(`/appointments/${id}/${action}/`, body);
      setMessage(done);
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const cancel = (a) => window.confirm(`Cancel the appointment on ${fmtDate(a.date)} at ${fmtTime(a.start_time)}?`) && act(a.id, "cancel", {}, "Appointment cancelled.");
  const complete = (a) => {
    const notes = window.prompt("Visit notes (optional)", "");
    if (notes !== null) act(a.id, "complete", { notes }, "Appointment completed. A consultation bill was created.");
  };

  return (
    <>
      <PageHeader title="Appointments">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="BOOKED">Booked</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        {canBook && !editing && <button onClick={() => setEditing("new")}>Book appointment</button>}
      </PageHeader>

      {editing && (
        <BookingForm editing={editing} isStaff={isStaff}
          onCancel={() => setEditing(null)}
          onDone={(msg) => { setEditing(null); setMessage(msg); list.reload(); }} />
      )}

      <Notice kind="success">{message}</Notice>
      <Notice>{error || list.error}</Notice>

      {list.loading ? <p className="muted">Loading…</p> : list.items.length === 0 ? (
        <Empty>{canBook ? "No appointments yet. Use “Book appointment” to schedule one." : "No appointments found."}</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.items.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDate(a.date)}</td><td>{fmtTime(a.start_time)}</td><td>{a.patient_name}</td>
                  <td>{a.doctor_name}<br /><span className="muted">{a.department_name}</span></td>
                  <td>{a.reason || "-"}{a.notes && <><br /><span className="muted">Notes: {a.notes}</span></>}</td>
                  <td><Status value={a.status} /></td>
                  <td className="actions">
                    {a.status === "BOOKED" && canBook && <button className="ghost" onClick={() => setEditing(a)}>Reschedule</button>}
                    {a.status === "BOOKED" && canBook && <button className="ghost danger" onClick={() => cancel(a)}>Cancel</button>}
                    {a.status === "BOOKED" && canComplete && <button className="ghost" onClick={() => complete(a)}>Mark complete</button>}
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
