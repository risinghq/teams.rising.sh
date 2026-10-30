import { Link } from "@tanstack/react-router";
import { Columns3, LayoutList } from "lucide-react";
import type { Label, Person, Project } from "@shared/types";
import { parseStatus, STATUS_LABEL, STATUSES } from "@/lib/domain";
import { Select } from "@/ui/select";
import { SegmentedControl } from "@/ui/segmented-control";
import { SearchBox } from "./search-box";
import type { TeamSearch } from "./search";

type Patch = (patch: Partial<TeamSearch>) => void;

const DUE_OPTIONS = [
  { value: "overdue", label: "Atrasadas" },
  { value: "week", label: "Esta semana" },
] as const;

export function TaskFilters({
  search,
  onChange,
  onChangeText,
  labels,
  owners,
  projects,
}: {
  search: TeamSearch;
  onChange: Patch;
  // Typing replaces the history entry instead of adding one per keystroke.
  onChangeText: Patch;
  labels: Label[] | undefined;
  owners?: Person[];
  projects?: Project[];
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
      <Select
        aria-label="Filtro de entrega"
        size="sm"
        className="w-auto"
        value={search.due ?? ""}
        onChange={(e) =>
          onChange({
            due: DUE_OPTIONS.find((o) => o.value === e.target.value)?.value,
          })
        }
      >
        <option value="">Entrega</option>
        {DUE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
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
      {projects && (
        <Select
          aria-label="Filtro de proyecto"
          size="sm"
          className="w-auto"
          value={search.project ?? ""}
          onChange={(e) => onChange({ project: e.target.value })}
        >
          <option value="">Proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
