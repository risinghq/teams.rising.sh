import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";

type Raw = Record<string, unknown>;

// The current route's search params, validated by `parse`, and two setters that
// merge a patch into them. `parse` must drop unknown values and defaults, so
// the URL only ever holds what differs from the default view. `push` adds a
// history entry; `replace` overwrites the current one, for changes that Back
// should not step through, such as typing.
export function useSearchParams<S extends object>(parse: (raw: Raw) => S) {
  const raw = useSearch({ strict: false }) as Raw;
  const navigate = useNavigate();
  const search = useMemo(() => parse(raw), [parse, raw]);
  const write =
    (replace: boolean) => (patch: { [K in keyof S]?: S[K] | undefined }) =>
      void navigate({
        to: ".",
        replace,
        search: (prev: Raw) => parse({ ...prev, ...patch }),
      });
  return { search, push: write(false), replace: write(true) };
}
