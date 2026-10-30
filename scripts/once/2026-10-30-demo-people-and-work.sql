-- after: 0004_script_runs.sql
-- Fills the disposable environment so every screen has something to show:
-- David and Pedro as admins and leaders, eight fictional people, and the work
-- of each team. Fictional people use the reserved example.test domain, which
-- no Google account has, so they cannot sign in, and one DELETE on that domain
-- removes them later. Sign-in matches users by email, so Pedro's first login
-- reuses the row made here. Teams come from 2026-10-30-aiplaygrounds-teams.

INSERT OR IGNORE INTO users (id, email, name, is_admin) VALUES
  ('u-david', 'dadch1404@gmail.com', 'David', 1),
  ('u-pedro', 'pedro.rojas.f24@gmail.com', 'Pedro Rojas', 1),
  ('u-lucia', 'lucia@example.test', 'Lucía Paredes', 0),
  ('u-mateo', 'mateo@example.test', 'Mateo Quispe', 0),
  ('u-valeria', 'valeria@example.test', 'Valeria Huamán', 0),
  ('u-diego', 'diego@example.test', 'Diego Salazar', 0),
  ('u-camila', 'camila@example.test', 'Camila Torres', 0),
  ('u-andres', 'andres@example.test', 'Andrés Rivas', 0),
  ('u-sofia', 'sofia@example.test', 'Sofía Mendoza', 0),
  ('u-joaquin', 'joaquin@example.test', 'Joaquín Flores', 0);

UPDATE users SET is_admin = 1
WHERE email IN ('dadch1404@gmail.com', 'pedro.rojas.f24@gmail.com');

-- Ids differ between environments, so rows join on team key and email.
INSERT OR IGNORE INTO team_members (team_id, user_id, role)
WITH m (team, email, role) AS (VALUES
  ('AIS', 'dadch1404@gmail.com', 'leader'),
  ('AIS', 'pedro.rojas.f24@gmail.com', 'member'),
  ('AIS', 'mateo@example.test', 'member'),
  ('AISW', 'dadch1404@gmail.com', 'leader'),
  ('AISW', 'diego@example.test', 'member'),
  ('AISW', 'joaquin@example.test', 'member'),
  ('AIF', 'pedro.rojas.f24@gmail.com', 'leader'),
  ('AIF', 'sofia@example.test', 'member'),
  ('AIFIN', 'camila@example.test', 'leader'),
  ('AIFIN', 'andres@example.test', 'member'),
  ('ACAD', 'lucia@example.test', 'leader'),
  ('ACAD', 'sofia@example.test', 'member'),
  ('ACAD', 'dadch1404@gmail.com', 'member'),
  ('LABS', 'pedro.rojas.f24@gmail.com', 'leader'),
  ('LABS', 'dadch1404@gmail.com', 'member'),
  ('LABS', 'andres@example.test', 'member'),
  ('COM', 'valeria@example.test', 'leader'),
  ('COM', 'pedro.rojas.f24@gmail.com', 'member'),
  ('COM', 'joaquin@example.test', 'member'))
SELECT t.id, u.id, m.role FROM m
JOIN teams t ON t.key = m.team
JOIN users u ON u.email = m.email;

-- D1 allows at most five terms in a UNION, so every list here is a VALUES CTE.
INSERT OR IGNORE INTO projects (id, team_id, name, description, start_date, target_date)
WITH p (id, team, name, description, start, target) AS (VALUES
  ('p-nino', 'AIS', 'Observatorio El Niño',
    'Panel público con el pronóstico del fenómeno El Niño (wawapacha).', '-20 day', '+40 day'),
  ('p-hack', 'COM', 'hack@latam 2027',
    'Convocatoria, mentores y logística del hackathon regional.', '-10 day', '+60 day'),
  ('p-cohorte', 'ACAD', 'Cohorte de verano',
    'Primera cohorte pagada de AI Academy.', '-5 day', '+30 day'),
  ('p-demo', 'LABS', 'Demo day',
    'Muestra de los proyectos de AI Labs ante aliados.', '-15 day', '+21 day'))
SELECT p.id, t.id, p.name, p.description, date('now', p.start), date('now', p.target)
FROM p JOIN teams t ON t.key = p.team;

INSERT OR IGNORE INTO labels (id, team_id, name, color)
WITH l (id, team, name, color) AS (VALUES
  ('l-datos', 'AIS', 'datos', '#3b82f6'),
  ('l-modelo', 'AIS', 'modelo', '#8b5cf6'),
  ('l-web', 'AISW', 'web', '#10b981'),
  ('l-patrocinio', 'COM', 'patrocinio', '#f59e0b'),
  ('l-contenido', 'ACAD', 'contenido', '#ec4899'))
SELECT l.id, t.id, l.name, l.color FROM l JOIN teams t ON t.key = l.team;

INSERT OR IGNORE INTO tasks
  (id, team_id, number, project_id, parent_id, title, description, owner_id,
   status, visibility, priority, due_date, created_by)
WITH d (id, team, number, project, parent, title, description, owner, status,
  visibility, priority, due, creator) AS (VALUES
  ('k-ais1', 'AIS', 1, 'p-nino', NULL, 'Publicar el panel del observatorio', 'Primera versión pública con el pronóstico del mes.', 'dadch1404@gmail.com', 'in_progress', 'open', 3, '+3 day', 'dadch1404@gmail.com'),
  ('k-ais2', 'AIS', 2, 'p-nino', 'k-ais1', 'Automatizar la descarga de datos NOAA', '', 'mateo@example.test', 'done', 'open', 2, '-2 day', 'dadch1404@gmail.com'),
  ('k-ais3', 'AIS', 3, 'p-nino', 'k-ais1', 'Validar el modelo con 2023', 'Comparar el pronóstico con lo observado en 2023.', 'pedro.rojas.f24@gmail.com', 'todo', 'open', 2, '+5 day', 'dadch1404@gmail.com'),
  ('k-ais4', 'AIS', 4, 'p-nino', NULL, 'Revisar la nota técnica con el SENAMHI', '', 'dadch1404@gmail.com', 'blocked', 'open', 2, '-1 day', 'dadch1404@gmail.com'),
  ('k-ais5', 'AIS', 5, NULL, NULL, 'Elegir el próximo caso científico', '', NULL, 'backlog', 'open', 0, NULL, 'mateo@example.test'),
  ('k-sw1', 'AISW', 1, NULL, NULL, 'Plantilla base para proyectos de AI Labs', 'Repositorio con CI, despliegue y lineamientos.', 'diego@example.test', 'in_progress', 'open', 2, '+6 day', 'dadch1404@gmail.com'),
  ('k-sw2', 'AISW', 2, NULL, NULL, 'Conectar los repos de GitHub con teams', '', 'dadch1404@gmail.com', 'todo', 'open', 1, '+10 day', 'dadch1404@gmail.com'),
  ('k-sw3', 'AISW', 3, NULL, NULL, 'Rotar las llaves de la API', '', 'dadch1404@gmail.com', 'todo', 'private', 3, 'today', 'dadch1404@gmail.com'),
  ('k-sw4', 'AISW', 4, NULL, NULL, 'Migrar la web a Next 16', '', 'joaquin@example.test', 'done', 'open', 1, '-6 day', 'diego@example.test'),
  ('k-aif1', 'AIF', 1, NULL, NULL, 'Guía de fundamentos: redes neuronales', 'Material base para nuevos miembros.', 'sofia@example.test', 'in_progress', 'open', 1, '+8 day', 'pedro.rojas.f24@gmail.com'),
  ('k-aif2', 'AIF', 2, NULL, NULL, 'Club de lectura de papers', '', 'pedro.rojas.f24@gmail.com', 'todo', 'open', 1, '+2 day', 'pedro.rojas.f24@gmail.com'),
  ('k-fin1', 'AIFIN', 1, NULL, NULL, 'Prototipo de scoring crediticio', '', 'andres@example.test', 'in_progress', 'open', 2, '+12 day', 'camila@example.test'),
  ('k-fin2', 'AIFIN', 2, NULL, NULL, 'Reunión con la fintech aliada', '', 'camila@example.test', 'todo', 'open', 2, '+4 day', 'camila@example.test'),
  ('k-acad1', 'ACAD', 1, 'p-cohorte', NULL, 'Temario de la cohorte de verano', '', 'lucia@example.test', 'done', 'open', 3, '-4 day', 'lucia@example.test'),
  ('k-acad2', 'ACAD', 2, 'p-cohorte', NULL, 'Grabar el módulo de introducción', '', 'sofia@example.test', 'in_progress', 'open', 2, '+7 day', 'lucia@example.test'),
  ('k-acad3', 'ACAD', 3, 'p-cohorte', NULL, 'Taller práctico de IA para software', 'Sesión de dos horas para la cohorte.', 'dadch1404@gmail.com', 'todo', 'open', 2, '+9 day', 'lucia@example.test'),
  ('k-acad4', 'ACAD', 4, 'p-cohorte', NULL, 'Abrir inscripciones', '', 'lucia@example.test', 'blocked', 'open', 3, '+1 day', 'lucia@example.test'),
  ('k-labs1', 'LABS', 1, 'p-demo', NULL, 'Elegir los proyectos del demo day', '', 'pedro.rojas.f24@gmail.com', 'in_progress', 'open', 3, '+2 day', 'pedro.rojas.f24@gmail.com'),
  ('k-labs2', 'LABS', 2, 'p-demo', NULL, 'Ensayo general de presentaciones', '', 'andres@example.test', 'todo', 'open', 1, '+18 day', 'pedro.rojas.f24@gmail.com'),
  ('k-labs3', 'LABS', 3, 'p-demo', NULL, 'Video del observatorio para el demo day', '', 'dadch1404@gmail.com', 'todo', 'open', 1, '+15 day', 'pedro.rojas.f24@gmail.com'),
  ('k-com1', 'COM', 1, 'p-hack', NULL, 'Lanzar la convocatoria de hack@latam', '', 'valeria@example.test', 'in_progress', 'open', 3, '+5 day', 'valeria@example.test'),
  ('k-com2', 'COM', 2, 'p-hack', NULL, 'Cerrar patrocinadores', 'Meta: tres patrocinadores confirmados.', 'pedro.rojas.f24@gmail.com', 'todo', 'open', 3, '-3 day', 'valeria@example.test'),
  ('k-com3', 'COM', 3, 'p-hack', 'k-com1', 'Diseñar las piezas para redes', '', 'joaquin@example.test', 'todo', 'open', 1, '+4 day', 'valeria@example.test'),
  ('k-com4', 'COM', 4, NULL, NULL, 'Newsletter de noviembre', '', 'valeria@example.test', 'backlog', 'open', 0, NULL, 'valeria@example.test'))
SELECT d.id, t.id, d.number, d.project, d.parent, d.title, d.description, o.id,
  d.status, d.visibility, d.priority,
  CASE WHEN d.due IS NULL THEN NULL WHEN d.due = 'today' THEN date('now') ELSE date('now', d.due) END,
  c.id
FROM d
JOIN teams t ON t.key = d.team
JOIN users c ON c.email = d.creator
LEFT JOIN users o ON o.email = d.owner
ORDER BY d.parent IS NOT NULL;

INSERT OR IGNORE INTO task_collaborators (task_id, user_id)
WITH c (task, email) AS (VALUES
  ('k-ais1', 'pedro.rojas.f24@gmail.com'),
  ('k-labs3', 'mateo@example.test'),
  ('k-com2', 'dadch1404@gmail.com'),
  ('k-acad3', 'diego@example.test'))
SELECT c.task, u.id FROM c JOIN users u ON u.email = c.email
WHERE EXISTS (SELECT 1 FROM tasks WHERE id = c.task);

INSERT OR IGNORE INTO task_labels (task_id, label_id)
WITH l (task, label) AS (VALUES
  ('k-ais2', 'l-datos'),
  ('k-ais3', 'l-modelo'),
  ('k-sw1', 'l-web'),
  ('k-sw2', 'l-web'),
  ('k-com2', 'l-patrocinio'),
  ('k-acad2', 'l-contenido'))
SELECT l.task, l.label FROM l
WHERE EXISTS (SELECT 1 FROM tasks WHERE id = l.task)
  AND EXISTS (SELECT 1 FROM labels WHERE id = l.label);

INSERT OR IGNORE INTO task_updates (id, task_id, author_id, kind, body, created_at)
WITH n (id, task, email, body, ago) AS (VALUES
  ('n-1', 'k-ais1', 'mateo@example.test',
    'Los datos de NOAA ya se descargan cada noche.', '-20 hour'),
  ('n-2', 'k-ais4', 'mateo@example.test',
    'SENAMHI pidió una semana más para revisar.', '-6 hour'),
  ('n-3', 'k-com2', 'valeria@example.test',
    'Dos patrocinadores dijeron que sí, falta uno.', '-3 hour'),
  ('n-4', 'k-acad3', 'lucia@example.test',
    '¿Puedes confirmar la fecha del taller?', '-90 minute'),
  ('n-5', 'k-labs1', 'andres@example.test',
    'Propongo el scoring crediticio como segundo proyecto.', '-40 minute'))
SELECT n.id, n.task, u.id, 'comment', n.body,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', n.ago)
FROM n JOIN users u ON u.email = n.email
WHERE EXISTS (SELECT 1 FROM tasks WHERE id = n.task);

-- Times are UTC: 15:00Z is 10:00 in Lima.
INSERT OR IGNORE INTO events (id, team_id, title, description, starts_at, ends_at, all_day, created_by)
WITH e (id, team, title, day, at, until, email) AS (VALUES
  ('e-sync', 'AIS', 'Revisión semanal del observatorio', '+1 day', '15:00', '16:00', 'dadch1404@gmail.com'),
  ('e-labs', 'LABS', 'Selección de proyectos', '+2 day', '17:00', '18:00', 'pedro.rojas.f24@gmail.com'),
  ('e-taller', 'ACAD', 'Taller de IA para software', '+9 day', '21:00', '23:00', 'lucia@example.test'),
  ('e-demo', 'LABS', 'Demo day', '+21 day', '00:00', NULL, 'pedro.rojas.f24@gmail.com'))
SELECT e.id, t.id, e.title, '', strftime('%Y-%m-%dT' || e.at || ':00Z', 'now', e.day),
  CASE WHEN e.until IS NULL THEN NULL ELSE strftime('%Y-%m-%dT' || e.until || ':00Z', 'now', e.day) END,
  e.until IS NULL, u.id
FROM e JOIN teams t ON t.key = e.team JOIN users u ON u.email = e.email;
