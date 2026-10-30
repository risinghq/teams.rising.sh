-- Project counts group a project's tasks by status.
CREATE INDEX tasks_project ON tasks(project_id, status);

-- The task list order, so a page reads only the rows it returns. The
-- expressions must match ORDER_BY in src/worker/tasks/page.ts.
CREATE INDEX tasks_list_order ON tasks((due_date IS NULL), COALESCE(due_date, ''), priority DESC, updated_at DESC, id);
