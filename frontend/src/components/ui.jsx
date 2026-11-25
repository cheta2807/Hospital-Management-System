export function PageHeader({ title, children }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      <div className="page-actions">{children}</div>
    </header>
  );
}

export function Notice({ kind = "error", children }) {
  if (!children) return null;
  return (
    <p className={`notice ${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Status({ value }) {
  return <span className={`status ${value.toLowerCase()}`}>{value.charAt(0) + value.slice(1).toLowerCase()}</span>;
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function Pagination({ page, count, pageSize, onChange }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages === 1) return null;
  return (
    <div className="pager">
      <button className="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
