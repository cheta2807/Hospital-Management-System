import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./client";

/** Loads a paginated DRF list. Re-fetches when `params` or the page changes. */
export function useList(path, params = {}) {
  const [data, setData] = useState({ results: [], count: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const key = JSON.stringify(params);

  useEffect(() => setPage(1), [key]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(path, { params: { ...JSON.parse(key), page } });
      setData(res.data.results ? res.data : { results: res.data, count: res.data.length });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [path, key, page]);

  useEffect(() => {
    load();
  }, [load]);

  return { items: data.results, count: data.count, page, setPage, loading, error, reload: load, pageSize: 10 };
}

/** Loads a full (up to 100) list for <select> menus. */
export function useOptions(path) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get(path, { params: { page_size: 100 } }).then((res) => setItems(res.data.results || res.data)).catch(() => setItems([]));
  }, [path]);
  return items;
}
