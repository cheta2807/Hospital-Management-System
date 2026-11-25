import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client";
import { Field, Notice } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const DEMO = [
  ["Admin", "admin", "Admin@12345"],
  ["Doctor", "dr.sharma", "Doctor@12345"],
  ["Reception", "reception", "Reception@123"],
  ["Patient", "patient1", "Patient@12345"],
];
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO !== "false";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.status === 401 ? "Incorrect username or password." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-side">
        <h1>City Care Hospital</h1>
        <p>Appointments, patient records and billing in one place.</p>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <h2>Sign in</h2>
          <Notice>{error}</Notice>
          <Field label="Username">
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required />
          </Field>
          <Field label="Password">
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
          </Field>
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <p className="muted">New patient? <Link to="/register">Create an account</Link></p>
          {SHOW_DEMO && (
            <div className="demo">
              <p className="muted">Try a demo account</p>
              {DEMO.map(([label, u, p]) => (
                <button type="button" className="ghost" key={u} onClick={() => setForm({ username: u, password: p })}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
