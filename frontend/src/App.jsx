import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Appointments from "./pages/Appointments.jsx";
import Billing from "./pages/Billing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Doctors from "./pages/Doctors.jsx";
import Login from "./pages/Login.jsx";
import Patients from "./pages/Patients.jsx";
import Records from "./pages/Records.jsx";
import Register from "./pages/Register.jsx";

const guard = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={guard(["ADMIN", "RECEPTIONIST", "DOCTOR"], <Patients />)} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="records" element={guard(["ADMIN", "DOCTOR", "PATIENT"], <Records />)} />
        <Route path="billing" element={guard(["ADMIN", "RECEPTIONIST", "PATIENT"], <Billing />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
