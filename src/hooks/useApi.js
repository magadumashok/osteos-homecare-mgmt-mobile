import { useCallback, useEffect, useRef, useState } from "react";

/** Load data on mount, with loading / error / reload / pull-to-refresh state. */
export default function useApi(load, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const fetch = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const result = await run();
        if (mounted.current) setData(result);
      } catch (e) {
        if (mounted.current) setError(e?.message || "Could not load data.");
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [run],
  );

  useEffect(() => {
    mounted.current = true;
    fetch();
    return () => {
      mounted.current = false;
    };
  }, [fetch]);

  return { data, loading, refreshing, error, reload: () => fetch(), refresh: () => fetch("refresh") };
}
