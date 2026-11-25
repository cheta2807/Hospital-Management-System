import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  { to: "/", label: "Dashboard", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"], end: true },
  { to: "/appointments", label: "Appointments", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"] },
  { to: "/patients", label: "Patients", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"] },
  { to: "/doctors", label: "Doctors", roles: ["ADMIN", "RECEPTIONIST", "PATIENT"] },
  { to: "/records", label: "Medical records", roles: ["ADMIN", "DOCTOR", "PATIENT"] },
  { to: "/billing", label: "Billing", roles: ["ADMIN", "RECEPTIONIST", "PATIENT"] },
];

const ROLE_LABEL = { ADMIN: "Administrator", DOCTOR: "Doctor", RECEPTIONIST: "Reception", PATIENT: "Patient" };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">City Care Hospital</div>
        <nav aria-label="Main">
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="who">
          <strong>{name}</strong>
          <span>{ROLE_LABEL[user.role]}</span>
          <button
            className="link"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
