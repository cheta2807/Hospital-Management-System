import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, errorMessage } from "../api/client";
import { Notice, PageHeader } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/stats/").then((r) => setStats(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  const name = user.first_name || user.username;

  return (
    <>
      <PageHeader title={`Welcome, ${name}`} />
      <Notice>{error}</Notice>
      {!stats && !error && <p className="muted">Loading…</p>}
      {stats && (
        <>
          <dl className="stats">
            {stats.cards.map((c) => (
              <div key={c.label}>
                <dd>{c.value}</dd>
                <dt>{c.label}</dt>
              </div>
            ))}
          </dl>
          {stats.appointments_by_day && (
            <div className="charts">
              <section>
                <h2>Appointments, last 7 days</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.appointments_by_day}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Appointments" fill="#0b7a75" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
              <section>
                <h2>Revenue collected, last 7 days (₹)</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={stats.revenue_by_day}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#c8453b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}
