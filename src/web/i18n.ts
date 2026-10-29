export type Lang = "en" | "es";

const STORAGE_KEY = "lang";

// The saved choice wins, then the browser's language. Outside a browser, as in
// tests, it is English.
function detect(): Lang {
  if (typeof localStorage === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "es") return saved;
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

export const lang: Lang = detect();
if (typeof document !== "undefined") document.documentElement.lang = lang;

// Switching reloads the page so every string, date and constant is rendered in
// the new language. People rarely switch, so this beats threading a context
// through every component.
export function setLang(next: Lang): void {
  localStorage.setItem(STORAGE_KEY, next);
  window.location.reload();
}

// The English text is the key, so a missing translation shows English. `{name}`
// placeholders take values from `vars`.
export function t(
  text: string,
  vars?: Record<string, string | number>,
  to: Lang = lang,
): string {
  const s = to === "es" ? (ES[text] ?? text) : text;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k])) : s;
}

// Dates follow the interface language, not the browser's.
export const day = (d: Date, options: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString(lang === "es" ? "es" : "en", options);

export const ES: Record<string, string> = {
  // Navigation
  "My work": "Mi trabajo",
  Inbox: "Bandeja",
  Calendar: "Calendario",
  Overview: "Resumen",
  Teams: "Equipos",
  People: "Personas",
  Search: "Buscar",
  "Sign out": "Cerrar sesión",
  "Open menu": "Abrir menú",
  "New team": "Nuevo equipo",
  "{n} unread": "{n} sin leer",
  "Command palette": "Paleta de comandos",
  "Jump to a task, team or screen": "Ir a una tarea, equipo o pantalla",
  "Nothing matches.": "No hay coincidencias.",
  task: "tarea",
  team: "equipo",
  screen: "pantalla",

  // Statuses and priorities
  Backlog: "Pendiente",
  "To do": "Por hacer",
  "In progress": "En curso",
  Blocked: "Bloqueada",
  Done: "Hecha",
  Canceled: "Cancelada",
  "No priority": "Sin prioridad",
  Low: "Baja",
  Medium: "Media",
  Urgent: "Urgente",

  // Due groups and times
  Overdue: "Atrasadas",
  Today: "Hoy",
  "This week": "Esta semana",
  Later: "Más adelante",
  "No date": "Sin fecha",
  Closed: "Cerradas",
  "just now": "ahora",
  "{n}m ago": "hace {n} min",
  "{n}h ago": "hace {n} h",
  "{n}d ago": "hace {n} d",

  // Lists and filters
  "Nothing on your plate": "No tienes nada pendiente",
  "Tasks you own show here, grouped by when they are due.":
    "Aquí aparecen tus tareas, agrupadas por fecha de entrega.",
  "Owner filter": "Filtro de responsable",
  "Any owner": "Responsable",
  Unassigned: "Sin asignar",
  "Status filter": "Filtro de estado",
  "Any status": "Estado",
  "Label filter": "Filtro de etiqueta",
  "Any label": "Etiqueta",
  "Project filter": "Filtro de proyecto",
  "Any project": "Proyecto",
  "No project": "Sin proyecto",
  View: "Vista",
  "List view": "Vista de lista",
  "Board view": "Vista de tablero",
  "Team settings": "Ajustes del equipo",
  "No tasks here": "No hay tareas aquí",
  "Add one above, or clear the filters.":
    "Agrega una arriba o quita los filtros.",
  "New task title": "Título de la nueva tarea",
  "Add a task and press Enter": "Escribe una tarea y pulsa Enter",
  Add: "Agregar",

  // Projects
  "Projects and areas": "Proyectos y áreas",
  "Projects end on a date. Areas, like funding, stay open.":
    "Los proyectos terminan en una fecha. Las áreas, como financiamiento, siguen abiertas.",
  Area: "Área",
  Loose: "Sueltas",
  "{n} open": "{n} abiertas",
  "{n} open · next {date}": "{n} abiertas · próxima {date}",
  "New project or area": "Nuevo proyecto o área",
  "All projects": "Todos los proyectos",
  "Ideas, papers and other loose tasks": "Ideas, papers y otras tareas sueltas",
  "Target {date}": "Meta {date}",
  "Ongoing area": "Área permanente",
  Edit: "Editar",
  "Project name": "Nombre del proyecto",
  Name: "Nombre",
  "Target date": "Fecha objetivo",
  "Leave the date empty for an ongoing area.":
    "Deja la fecha vacía para un área permanente.",
  "Project status": "Estado del proyecto",
  Active: "Activo",
  active: "activo",
  done: "terminado",
  archived: "archivado",
  Archived: "Archivado",
  "Project description": "Descripción del proyecto",
  "What it is, plus links to its repo or spreadsheet":
    "De qué trata, con enlaces a su repo u hoja de cálculo",
  Cancel: "Cancelar",
  Save: "Guardar",
  Create: "Crear",

  // Task panel
  "Task not found": "Tarea no encontrada",
  "It may be private or deleted.": "Puede ser privada o haber sido borrada.",
  Private: "Privada",
  Close: "Cerrar",
  Status: "Estado",
  Owner: "Responsable",
  Due: "Entrega",
  "Due date": "Fecha de entrega",
  Priority: "Prioridad",
  Project: "Proyecto",
  Labels: "Etiquetas",
  Helping: "Ayudan",
  Leave: "Salir",
  "Help out": "Ayudar",
  Subtasks: "Subtareas",
  "Linked work": "Trabajo enlazado",
  open: "abierto",
  closed: "cerrado",
  merged: "fusionado",
  Activity: "Actividad",
  System: "Sistema",
  Comment: "Comentar",
  "Write an update. Use @name to notify someone.":
    "Escribe una actualización. Usa @nombre para avisar a alguien.",
  none: "ninguno",
  "changed status from {from} to {to}": "cambió el estado de {from} a {to}",
  "changed the owner": "cambió el responsable",
  "changed the due date to {to}": "cambió la fecha de entrega a {to}",

  // Calendar, inbox, overview
  Previous: "Anterior",
  Next: "Siguiente",
  Range: "Rango",
  month: "mes",
  week: "semana",
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mié",
  Thu: "Jue",
  Fri: "Vie",
  Sat: "Sáb",
  Sun: "Dom",
  "All caught up": "Estás al día",
  "Mentions and changes to tasks you follow land here.":
    "Aquí llegan las menciones y los cambios en las tareas que sigues.",
  Open: "Abiertas",

  // Sign in
  "See what is pending, who owns it and how far along it is.":
    "Mira qué está pendiente, quién lo tiene y cuánto falta.",
  "Continue with Google": "Continuar con Google",

  // Team settings
  "Only an admin can create teams": "Solo un admin puede crear equipos",
  Key: "Clave",
  "2 to 6 letters or digits. Tasks are numbered with it, as in {key}-12, and branch names use it to link to tasks.":
    "De 2 a 6 letras o números. Numera las tareas, como en {key}-12, y las ramas la usan para enlazarse a una tarea.",
  Description: "Descripción",
  "Create team": "Crear equipo",
  "Team not found": "Equipo no encontrado",
  "Back to {team}": "Volver a {team}",
  "{team} settings": "Ajustes de {team}",
  Details: "Detalles",
  "Team name": "Nombre del equipo",
  "Team description": "Descripción del equipo",
  "What the team works on": "En qué trabaja el equipo",
  "Members {n}": "Miembros {n}",
  "Role of {name}": "Rol de {name}",
  Leader: "Líder",
  Member: "Miembro",
  Remove: "Quitar",
  "Person to add": "Persona a agregar",
  "Add a person…": "Agregar a una persona…",
  "People show up here after they sign in for the first time.":
    "Las personas aparecen aquí después de iniciar sesión por primera vez.",
  "No labels yet.": "Todavía no hay etiquetas.",
  "Shared by every team": "Compartida por todos los equipos",
  "Label color": "Color de la etiqueta",
  "New label name": "Nombre de la nueva etiqueta",
  "New label, such as paper or idea": "Nueva etiqueta, como paper o idea",
  Language: "Idioma",

  // Messages from the server
  "a team needs at least one leader": "un equipo necesita al menos un líder",
  "only a team leader or an admin can do this":
    "solo un líder del equipo o un admin puede hacer esto",
  "only an admin can do this": "solo un admin puede hacer esto",
  "team key is taken or a leader does not exist":
    "la clave ya está en uso o un líder no existe",
  "key must be 2-6 letters or digits":
    "la clave debe tener de 2 a 6 letras o números",
  "label already exists": "esa etiqueta ya existe",
  "join the team first": "primero únete al equipo",
  "only the owner, a collaborator or a leader can edit":
    "solo el responsable, un colaborador o un líder puede editar",
  "user not found": "usuario no encontrado",
};
