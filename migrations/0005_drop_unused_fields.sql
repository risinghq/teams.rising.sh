-- Fields nobody read: a team's description repeated what members already know,
-- and a task's priority showed only in its own side panel. Due dates order the
-- task list on their own.
DROP INDEX tasks_list_order;
ALTER TABLE tasks DROP COLUMN priority;
ALTER TABLE teams DROP COLUMN description;

-- The expressions must match ORDER_BY in src/worker/tasks/page.ts.
CREATE INDEX tasks_list_order ON tasks((due_date IS NULL), COALESCE(due_date, ''), updated_at DESC, id);

-- users.whatsapp_number and the 'whatsapp' update kind stay: SQLite drops a
-- UNIQUE column or a CHECK value only by rebuilding the table, and nothing
-- writes either since the WhatsApp webhook was removed.
