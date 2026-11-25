import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Field, Notice } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY = { username: "", password: "", email: "", first_name: "", last_name: "", phone: "", date_of_birth: "", gender: "" };

export default function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...form, date_of_birth: form.date_of_birth || null };
      await api.post("/auth/register/", body);
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-side">
        <h1>Create your patient account</h1>
        <p>Book appointments, see your prescriptions and pay bills online.</p>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <h2>Register</h2>
          <Notice>{error}</Notice>
          <div className="row">
            <Field label="First name"><input value={form.first_name} onChange={set("first_name")} required /></Field>
            <Field label="Last name"><input value={form.last_name} onChange={set("last_name")} /></Field>
          </div>
          <Field label="Email"><input type="email" value={form.email} onChange={set("email")} required /></Field>
          <div className="row">
            <Field label="Phone"><input value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Date of birth"><input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
          </div>
          <Field label="Gender">
            <select value={form.gender} onChange={set("gender")}>
              <option value="">Prefer not to say</option>
              <option value="F">Female</option>
              <option value="M">Male</option>
              <option value="O">Other</option>
            </select>
          </Field>
          <Field label="Username"><input value={form.username} onChange={set("username")} autoComplete="username" required /></Field>
          <Field label="Password (8+ characters)">
            <input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required />
          </Field>
          <button disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </section>
    </div>
  );
}
