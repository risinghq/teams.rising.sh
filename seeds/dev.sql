-- Local sample data: two teams with two leaders each, six people, 20 tasks.
INSERT OR IGNORE INTO users (id, email, name, is_admin) VALUES
  ('u-ana', 'ana@example.test', 'Ana Ruiz', 1),
  ('u-ben', 'ben@example.test', 'Ben Cole', 0),
  ('u-caro', 'caro@example.test', 'Caro Diaz', 0),
  ('u-dan', 'dan@example.test', 'Dan Fox', 0),
  ('u-eva', 'eva@example.test', 'Eva Lin', 0),
  ('u-fer', 'fer@example.test', 'Fer Gil', 0);

INSERT OR IGNORE INTO teams (id, key, name) VALUES
  ('t-eng', 'ENG', 'Engineering'),
  ('t-ops', 'OPS', 'Logistics');

INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES
  ('t-eng', 'u-ana', 'leader'), ('t-eng', 'u-ben', 'leader'), ('t-eng', 'u-caro', 'member'),
  ('t-ops', 'u-dan', 'leader'), ('t-ops', 'u-eva', 'leader'), ('t-ops', 'u-fer', 'member'),
  ('t-ops', 'u-caro', 'member');

INSERT OR IGNORE INTO projects (id, team_id, name, target_date) VALUES
  ('p-launch', 't-eng', 'Launch', date('now', '+30 day')),
  ('p-event', 't-ops', 'Spring event', date('now', '+14 day'));

INSERT OR IGNORE INTO labels (id, team_id, name, color) VALUES
  ('l-code', 't-eng', 'code', '#3b82f6'),
  ('l-logistics', 't-ops', 'logistics', '#f59e0b'),
  ('l-vendor', 't-ops', 'vendor', '#10b981');

INSERT OR IGNORE INTO tasks
  (id, team_id, number, project_id, parent_id, title, owner_id, status, visibility, due_date, created_by)
VALUES
  ('k-e1', 't-eng', 1, 'p-launch', NULL, 'Sign-in page', 'u-caro', 'done', 'open', date('now', '-3 day'), 'u-ana'),
  ('k-e2', 't-eng', 2, 'p-launch', NULL, 'Task board', 'u-caro', 'in_progress', 'open', date('now', '+2 day'), 'u-ana'),
  ('k-e3', 't-eng', 3, 'p-launch', 'k-e2', 'Drag cards between columns', 'u-caro', 'todo', 'open', date('now', '+4 day'), 'u-caro'),
  ('k-e4', 't-eng', 4, 'p-launch', 'k-e2', 'Column counts', 'u-caro', 'done', 'open', NULL, 'u-caro'),
  ('k-e5', 't-eng', 5, NULL, NULL, 'Calendar sync', 'u-ben', 'blocked', 'open', date('now', '+9 day'), 'u-ben'),
  ('k-e6', 't-eng', 6, NULL, NULL, 'GitHub webhook', 'u-ben', 'todo', 'open', date('now', '+12 day'), 'u-ben'),
  ('k-e7', 't-eng', 7, NULL, NULL, 'Rotate signing keys', 'u-ana', 'todo', 'private', date('now', '+1 day'), 'u-ana'),
  ('k-e8', 't-eng', 8, NULL, NULL, 'Cut dependency bloat', NULL, 'backlog', 'open', NULL, 'u-ben'),
  ('k-e9', 't-eng', 9, 'p-launch', NULL, 'Landing copy', 'u-eva', 'in_progress', 'open', date('now', '+6 day'), 'u-ana'),
  ('k-e10', 't-eng', 10, NULL, NULL, 'Retire old staging', 'u-ben', 'canceled', 'open', NULL, 'u-ben'),
  ('k-o1', 't-ops', 1, 'p-event', NULL, 'Book the venue', 'u-dan', 'done', 'open', date('now', '-5 day'), 'u-dan'),
  ('k-o2', 't-ops', 2, 'p-event', NULL, 'Catering quotes', 'u-fer', 'in_progress', 'open', date('now', '+1 day'), 'u-dan'),
  ('k-o3', 't-ops', 3, 'p-event', 'k-o2', 'Ask three suppliers', 'u-fer', 'done', 'open', NULL, 'u-fer'),
  ('k-o4', 't-ops', 4, 'p-event', 'k-o2', 'Compare prices', 'u-fer', 'todo', 'open', date('now', '+3 day'), 'u-fer'),
  ('k-o5', 't-ops', 5, 'p-event', NULL, 'Ship banners', 'u-eva', 'blocked', 'open', date('now', '-1 day'), 'u-eva'),
  ('k-o6', 't-ops', 6, NULL, NULL, 'Renew warehouse contract', 'u-dan', 'todo', 'private', date('now', '+20 day'), 'u-dan'),
  ('k-o7', 't-ops', 7, 'p-event', NULL, 'Print badges', NULL, 'todo', 'open', date('now', '+8 day'), 'u-eva'),
  ('k-o8', 't-ops', 8, NULL, NULL, 'Van maintenance', 'u-fer', 'todo', 'open', date('now', '+15 day'), 'u-fer'),
  ('k-o9', 't-ops', 9, 'p-event', NULL, 'Volunteer rota', 'u-caro', 'in_progress', 'open', date('now', '+5 day'), 'u-eva'),
  ('k-o10', 't-ops', 10, NULL, NULL, 'Audit stock counts', 'u-eva', 'backlog', 'open', NULL, 'u-eva');

INSERT OR IGNORE INTO task_collaborators (task_id, user_id) VALUES
  ('k-e9', 'u-caro'), ('k-o9', 'u-ben'), ('k-e7', 'u-ben');

INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES
  ('k-e2', 'l-code'), ('k-e5', 'l-code'), ('k-e6', 'l-code'),
  ('k-o2', 'l-logistics'), ('k-o2', 'l-vendor'), ('k-o5', 'l-logistics'), ('k-o8', 'l-logistics');

INSERT OR IGNORE INTO events (id, team_id, title, starts_at, ends_at, all_day, created_by) VALUES
  ('e-kick', 't-eng', 'Launch kickoff', strftime('%Y-%m-%dT10:00:00Z', 'now', '+2 day'), strftime('%Y-%m-%dT11:00:00Z', 'now', '+2 day'), 0, 'u-ana'),
  ('e-event', 't-ops', 'Spring event', strftime('%Y-%m-%dT00:00:00Z', 'now', '+14 day'), NULL, 1, 'u-dan');
