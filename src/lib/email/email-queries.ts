import { query } from '../db';

interface ThreadFilters {
  accountId?: number;
  assignedTo?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listThreads(filters: ThreadFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.accountId) {
    conditions.push(`et.account_id = $${paramIdx++}`);
    params.push(filters.accountId);
  }
  if (filters.assignedTo) {
    conditions.push(`et.assigned_to = $${paramIdx++}`);
    params.push(filters.assignedTo);
  }
  if (filters.status) {
    conditions.push(`et.status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push(`(et.subject ILIKE $${paramIdx} OR EXISTS (
      SELECT 1 FROM email_messages em WHERE em.thread_id = et.id AND (
        em.from_address ILIKE $${paramIdx} OR em.body_text ILIKE $${paramIdx}
      )
    ))`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 25;
  const offset = ((filters.page || 1) - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM email_threads et ${where}`,
    params
  );

  const threadsResult = await query(
    `SELECT et.*,
            ea.email_address as account_email,
            ea.display_name as account_display_name,
            su.first_name || ' ' || su.last_name as assigned_user_name,
            (SELECT em.snippet FROM email_messages em WHERE em.thread_id = et.id ORDER BY em.gmail_internal_date DESC LIMIT 1) as latest_snippet,
            (SELECT em.from_address FROM email_messages em WHERE em.thread_id = et.id ORDER BY em.gmail_internal_date DESC LIMIT 1) as latest_from
     FROM email_threads et
     JOIN email_accounts ea ON ea.id = et.account_id
     LEFT JOIN staff_users su ON su.id = et.assigned_to
     ${where}
     ORDER BY et.last_message_at DESC NULLS LAST
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return {
    threads: threadsResult.rows,
    total: parseInt(countResult.rows[0].total),
    page: filters.page || 1,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
  };
}

export async function getThreadWithMessages(threadId: number) {
  const threadResult = await query(
    `SELECT et.*,
            ea.email_address as account_email,
            ea.display_name as account_display_name,
            su.first_name || ' ' || su.last_name as assigned_user_name,
            g.first_name || ' ' || g.last_name as guest_name,
            g.email as guest_email
     FROM email_threads et
     JOIN email_accounts ea ON ea.id = et.account_id
     LEFT JOIN staff_users su ON su.id = et.assigned_to
     LEFT JOIN guests g ON g.id = et.guest_id
     WHERE et.id = $1`,
    [threadId]
  );

  if (threadResult.rows.length === 0) return null;

  const messagesResult = await query(
    `SELECT em.*,
            (SELECT json_agg(json_build_object(
              'id', att.id, 'filename', att.filename, 'mime_type', att.mime_type, 'size_bytes', att.size_bytes
            )) FROM email_attachments att WHERE att.message_id = em.id) as attachments
     FROM email_messages em
     WHERE em.thread_id = $1
     ORDER BY em.gmail_internal_date ASC`,
    [threadId]
  );

  const activityResult = await query(
    `SELECT ea.*, su.first_name || ' ' || su.last_name as performer_name
     FROM email_activity ea
     LEFT JOIN staff_users su ON su.id = ea.performed_by
     WHERE ea.thread_id = $1
     ORDER BY ea.created_at DESC
     LIMIT 50`,
    [threadId]
  );

  return {
    thread: threadResult.rows[0],
    messages: messagesResult.rows,
    activity: activityResult.rows,
  };
}

export async function getUnreadCount(userId: number): Promise<number> {
  const result = await query(
    `SELECT COUNT(DISTINCT et.id) as count
     FROM email_threads et
     JOIN email_messages em ON em.thread_id = et.id
     WHERE et.assigned_to = $1 AND em.is_read = false AND em.direction = 'inbound'`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

export async function markMessageRead(messageId: number, isRead: boolean): Promise<void> {
  await query(
    'UPDATE email_messages SET is_read = $1 WHERE id = $2',
    [isRead, messageId]
  );
}

export async function updateThread(
  threadId: number,
  updates: { status?: string; assigned_to?: number | null; priority?: string; tags?: string[] },
  performedBy: number
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.status !== undefined) {
    sets.push(`status = $${idx++}`);
    params.push(updates.status);
  }
  if (updates.assigned_to !== undefined) {
    sets.push(`assigned_to = $${idx++}`);
    params.push(updates.assigned_to);
  }
  if (updates.priority !== undefined) {
    sets.push(`priority = $${idx++}`);
    params.push(updates.priority);
  }
  if (updates.tags !== undefined) {
    sets.push(`tags = $${idx++}`);
    params.push(updates.tags);
  }

  if (sets.length === 0) return;

  sets.push('updated_at = NOW()');
  params.push(threadId);

  await query(
    `UPDATE email_threads SET ${sets.join(', ')} WHERE id = $${idx}`,
    params
  );

  // Log activity
  const action = updates.status ? 'status_changed' : updates.assigned_to !== undefined ? 'assigned' : 'updated';
  await query(
    `INSERT INTO email_activity (thread_id, action, performed_by, details)
     VALUES ($1, $2, $3, $4)`,
    [threadId, action, performedBy, JSON.stringify(updates)]
  );
}

export async function searchThreads(searchTerm: string, userId?: number) {
  const conditions = [
    `(et.subject ILIKE $1
      OR em.from_address ILIKE $1
      OR em.body_text ILIKE $1
      OR em.from_name ILIKE $1)`
  ];
  const params: unknown[] = [`%${searchTerm}%`];

  if (userId) {
    conditions.push(`(et.assigned_to = $2 OR EXISTS (
      SELECT 1 FROM email_accounts ea2
      JOIN email_aliases eal ON eal.account_id = ea2.id
      WHERE eal.assigned_user_id = $2 AND ea2.id = et.account_id
    ))`);
    params.push(userId);
  }

  const result = await query(
    `SELECT DISTINCT et.*,
            ea.display_name as account_display_name,
            su.first_name || ' ' || su.last_name as assigned_user_name
     FROM email_threads et
     JOIN email_accounts ea ON ea.id = et.account_id
     LEFT JOIN staff_users su ON su.id = et.assigned_to
     LEFT JOIN email_messages em ON em.thread_id = et.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY et.last_message_at DESC
     LIMIT 50`,
    params
  );

  return result.rows;
}
