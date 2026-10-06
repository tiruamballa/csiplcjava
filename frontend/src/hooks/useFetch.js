import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../services/api.js";

/** Runs an async loader on mount and exposes { data, loading, error, reload }. */
export default function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    loader()
      .then((data) => !cancelled && setState({ data, loading: false, error: "" }))
      .catch((err) => !cancelled && setState({ data: null, loading: false, error: getErrorMessage(err) }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}
