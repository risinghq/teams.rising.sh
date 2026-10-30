import { Link } from "@tanstack/react-router";
import { Columns3, LayoutList } from "lucide-react";
import type { Label, Person } from "@shared/types";
import { parseStatus, STATUS_LABEL, STATUSES } from "@/lib/domain";
import { Select } from "@/ui/select";
import { SegmentedControl } from "@/ui/segmented-control";
import { SearchBox } from "./search-box";
import type { TeamSearch } from "./search";

type Patch = (patch: Partial<TeamSearch>) => void;

// Only filters the page does not already offer: the list is grouped by due
// date, the shortcut cards pick overdue and this week, and the project cards
// pick a project.
export function TaskFilters({
  search,
  onChange,
  onChangeText,
  labels,
  owners,
}: {
  search: TeamSearch;
  onChange: Patch;
  // Typing replaces the history entry instead of adding one per keystroke.
  onChangeText: Patch;
  labels: Label[] | undefined;
  owners?: Person[];
}) {
  return (
    <>
      <SearchBox
        label="Buscar tareas"
        value={search.q ?? ""}
        onCommit={(q) => onChangeText({ q })}
        className="w-40"
      />
      {owners && (
        <Select
          aria-label="Filtro de responsable"
          size="sm"
          className="w-auto"
          value={search.owner ?? ""}
          onChange={(e) => onChange({ owner: e.target.value })}
        >
          <option value="">Responsable</option>
          <option value="none">Sin asignar</option>
          {owners.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      )}
      <Select
        aria-label="Filtro de estado"
        size="sm"
        className="w-auto"
        value={search.status ?? ""}
        onChange={(e) => onChange({ status: parseStatus(e.target.value) })}
      >
        <option value="">Estado</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
      {(labels?.length || search.label) && (
        <Select
          aria-label="Filtro de etiqueta"
          size="sm"
          className="w-auto"
          value={search.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
        >
          <option value="">Etiqueta</option>
          {labels?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      )}
      <SegmentedControl
        legend="Vista"
        value={search.view ?? "list"}
        options={[
          {
            value: "list",
            label: "Vista de lista",
            Icon: LayoutList,
            iconOnly: true,
          },
          {
            value: "board",
            label: "Vista de tablero",
            Icon: Columns3,
            iconOnly: true,
          },
        ]}
        renderOption={({ value }, props) => (
          <Link
            {...props}
            to="."
            search={(prev: Record<string, unknown>) => ({
              ...prev,
              view: value === "list" ? undefined : value,
            })}
          />
        )}
      />
    </>
  );
}
