/**
 * Task Data Access Layer.
 * PostgreSQL is the single source of truth for tasks.
 *
 * Returns Frappe-compatible response shapes ({ data: ... })
 * so the frontend requires zero changes.
 */
import { query, withTransaction } from './db.js';

/**
 * Map a PG task row to the Frappe-compatible shape consumed by the frontend.
 */
function mapTaskRow(row) {
  if (!row) return null;
  return {
    name: row.id,
    subject: row.subject,
    status: row.status,
    description: row.description || '',
    custom_assignee_employee: row.assignee_employee_id || null,
    custom_author_employee: row.author_employee_id || null,
    creation: row.created_at?.toISOString() || null,
    modified: row.updated_at?.toISOString() || null,
    completed_on: row.completed_on?.toISOString()?.split('T')[0] || null,
    priority: row.priority || 'Medium',
  };
}

/**
 * Get tasks for an employee (as assignee, author, or both).
 * Single query replaces 2 Frappe API calls.
 *
 * @param {string} employeeId
 * @param {{ status?: string, role?: string, search?: string, days?: string }} opts
 * @returns {{ data: object[] }}
 */
export async function getTasksForEmployee(employeeId, { status = 'all', role = 'all', search = '', days = '' } = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Role filter: assignee, author, or both
  if (role === 'assignee') {
    conditions.push(`t.assignee_employee_id = $${paramIndex}`);
    params.push(employeeId);
    paramIndex++;
  } else if (role === 'author') {
    conditions.push(`t.author_employee_id = $${paramIndex}`);
    params.push(employeeId);
    paramIndex++;
  } else {
    // 'all' — tasks where employee is either assignee or author
    conditions.push(`(t.assignee_employee_id = $${paramIndex} OR t.author_employee_id = $${paramIndex})`);
    params.push(employeeId);
    paramIndex++;
  }

  // Status filter
  if (status && status !== 'all') {
    conditions.push(`t.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  // Search filter
  if (search) {
    conditions.push(`t.subject ILIKE $${paramIndex}`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Days filter
  if (days && !isNaN(parseInt(days))) {
    conditions.push(`t.created_at >= now() - $${paramIndex}::interval`);
    params.push(`${parseInt(days)} days`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT * FROM tasks t ${whereClause} ORDER BY t.created_at DESC`,
    params
  );

  return { data: (result?.rows || []).map(mapTaskRow) };
}

/**
 * Get a single task by ID.
 * @returns {{ data: object }}
 */
export async function getTaskById(taskId) {
  const result = await query(
    `SELECT * FROM tasks WHERE id = $1`,
    [taskId]
  );
  if (!result || result.rows.length === 0) return { data: null };
  return { data: mapTaskRow(result.rows[0]) };
}

/**
 * Create a new task.
 * Generates TASK-XXXXX ID from sequence.
 * @returns {{ data: object }}
 */
export async function createTask({ subject, description, assigneeId, authorId, priority }) {
  return await withTransaction(async (client) => {
    const seqResult = await client.query(`SELECT nextval('task_id_seq') AS val`);
    const taskId = `TASK-${String(seqResult.rows[0].val).padStart(5, '0')}`;

    await client.query(
      `INSERT INTO tasks (id, subject, description, assignee_employee_id, author_employee_id, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Open')`,
      [taskId, subject, description || '', assigneeId || null, authorId || null, priority || 'Medium']
    );

    const result = await client.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
    return { data: mapTaskRow(result.rows[0]) };
  });
}

/**
 * Update task status. Sets completed_on when Completed, clears when reopened.
 * @returns {{ data: object }}
 */
export async function updateTaskStatus(taskId, status) {
  let completedOn = null;
  if (status === 'Completed') {
    completedOn = new Date().toISOString();
  }

  await query(
    `UPDATE tasks SET status = $2, completed_on = $3, updated_at = now() WHERE id = $1`,
    [taskId, status, completedOn]
  );

  return getTaskById(taskId);
}

/**
 * Update task fields (partial update).
 * Supports: subject, description, assignee, author, priority, status.
 * @returns {{ data: object }}
 */
export async function updateTask(taskId, updates) {
  const fieldMap = {
    subject: 'subject',
    description: 'description',
    custom_assignee_employee: 'assignee_employee_id',
    custom_author_employee: 'author_employee_id',
    priority: 'priority',
    status: 'status',
  };

  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  for (const [apiField, dbField] of Object.entries(fieldMap)) {
    if (updates[apiField] !== undefined) {
      setClauses.push(`${dbField} = $${paramIndex}`);
      params.push(updates[apiField]);
      paramIndex++;
    }
  }

  // Handle completed_on based on status
  if (updates.status === 'Completed') {
    setClauses.push(`completed_on = $${paramIndex}`);
    params.push(new Date().toISOString());
    paramIndex++;
  } else if (updates.status === 'Open') {
    setClauses.push(`completed_on = NULL`);
  }

  if (setClauses.length === 0) {
    return getTaskById(taskId);
  }

  setClauses.push(`updated_at = now()`);
  params.push(taskId);

  await query(
    `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    params
  );

  return getTaskById(taskId);
}
