-- after: 0004_script_runs.sql
-- AI PlayGrounds as described in its October 2026 deck: four verticals and
-- three initiatives. People join through invites, so no memberships here.
INSERT OR IGNORE INTO teams (id, key, name, description) VALUES
  (lower(hex(randomblob(16))), 'AIF', 'AI Foundations', 'Cómo funciona la propia IA: comprender, evaluar y mejorar modelos y métodos.'),
  (lower(hex(randomblob(16))), 'AISW', 'AI for Software', 'Cómo la IA cambia la forma en que diseñamos, construimos y mejoramos software.'),
  (lower(hex(randomblob(16))), 'AIS', 'AI for Science', 'Cómo la IA aporta al trabajo científico, la investigación y la generación de conocimiento.'),
  (lower(hex(randomblob(16))), 'AIFIN', 'AI for Finance', 'Oportunidades, problemas y aplicaciones de IA alrededor de finanzas.'),
  (lower(hex(randomblob(16))), 'ACAD', 'AI Academy', 'Programas, cursos y workshops prácticos de formación.'),
  (lower(hex(randomblob(16))), 'LABS', 'AI Labs', 'Vitrina de los productos en etapas tempranas que surgen de las verticales.'),
  (lower(hex(randomblob(16))), 'COM', 'Comunidad', 'Logística, comunicaciones y relaciones institucionales de toda la organización.');

UPDATE teams
SET name = 'AI for Science',
  description = 'Cómo la IA aporta al trabajo científico, la investigación y la generación de conocimiento.'
WHERE key = 'AIS';
