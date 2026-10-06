import { useEffect, useState } from "react";
import { countries, nationalities } from "../services/referenceService";

const cache = {};

/**
 * Reference lists as select options, loaded once per session.
 * kind: "countriesByName" (leads), "countriesByCode" (patients), "nationalities"
 */
export default function useReference(kind) {
  const [options, setOptions] = useState(cache[kind] || []);

  useEffect(() => {
    if (cache[kind]) return;
    const load =
      kind === "nationalities"
        ? nationalities().then((list) => (list || []).map((n) => ({ value: n.name ?? n.label, label: n.name ?? n.label })))
        : countries().then((list) =>
            (list || []).map((c) => ({ value: kind === "countriesByCode" ? c.code : c.name ?? c.label, label: c.name ?? c.label })),
          );
    load
      .then((list) => {
        cache[kind] = list.filter((o) => o.value);
        setOptions(cache[kind]);
      })
      .catch(() => {});
  }, [kind]);

  return options;
}
