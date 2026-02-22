import { query } from '../db';

interface ThreadFilters {
  accountId?: number;
  assignedTo?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  folder?: string;
  starred?: boolean;
  archived?: boolean;
  labelId?: number;
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
  if (filters.folder) {
    conditions.push(`et.folder = $${paramIdx++}`);
    params.push(filters.folder);
  }
  if (filters.starred) {
    conditions.push('et.is_starred = true');
  }
  if (filters.archived) {
    conditions.push('et.is_archived = true');
  } else if (!filters.folder || filters.folder === 'inbox') {
    conditions.push('(et.is_archived = false OR et.is_archived IS NULL)');
  }
  if (filters.labelId) {
    conditions.push(`EXISTS (SELECT 1 FROM email_thread_labels etl WHERE etl.thread_id = et.id AND etl.label_id = $${paramIdx++})`);
    params.push(filters.labelId);
  }
  if (filters.search) {
    conditions.push(`(et.subject ILIKE $${paramIdx} OR EXISTS (
      SELECT 1 FROM email_messages em WHERE em.thread_id = et.id AND (
        em.from_address ILIKE $${paramIdx} OR em.body_text ILIKE $${paramIdx} OR em.from_name ILIKE $${paramIdx}
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
            (SELECT em.from_address FROM email_messages em WHERE em.thread_id = et.id ORDER BY em.gmail_internal_date DESC LIMIT 1) as latest_from,
            (SELECT em.from_name FROM email_messages em WHERE em.thread_id = et.id ORDER BY em.gmail_internal_date DESC LIMIT 1) as latest_from_name,
            EXISTS(SELECT 1 FROM email_messages em WHERE em.thread_id = et.id AND em.is_read = false AND em.direction = 'inbound') as has_unread,
            COALESCE(
              (SELECT array_agg(etl.label_id) FROM email_thread_labels etl WHERE etl.thread_id = et.id),
              '{}'
            ) as label_ids,
            COALESCE(
              (SELECT array_agg(el.name) FROM email_thread_labels etl JOIN email_labels el ON el.id = etl.label_id WHERE etl.thread_id = et.id),
              '{}'
            ) as label_names,
            COALESCE(
              (SELECT array_agg(el.color) FROM email_thread_labels etl JOIN email_labels el ON el.id = etl.label_id WHERE etl.thread_id = et.id),
              '{}'
            ) as label_colors
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
            g.email as guest_email,
            COALESCE(
              (SELECT array_agg(etl.label_id) FROM email_thread_labels etl WHERE etl.thread_id = et.id),
              '{}'
            ) as label_ids,
            COALESCE(
              (SELECT array_agg(el.name) FROM email_thread_labels etl JOIN email_labels el ON el.id = etl.label_id WHERE etl.thread_id = et.id),
              '{}'
            ) as label_names,
            COALESCE(
              (SELECT array_agg(el.color) FROM email_thread_labels etl JOIN email_labels el ON el.id = etl.label_id WHERE etl.thread_id = et.id),
              '{}'
            ) as label_colors
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
     WHERE et.assigned_to = $1 AND em.is_read = false AND em.direction = 'inbound'
       AND (et.is_archived = false OR et.is_archived IS NULL)`,
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
  updates: {
    status?: string;
    assigned_to?: number | null;
    priority?: string;
    tags?: string[];
    is_starred?: boolean;
    is_archived?: boolean;
    snoozed_until?: string | null;
    folder?: string;
  },
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
  if (updates.is_starred !== undefined) {
    sets.push(`is_starred = $${idx++}`);
    params.push(updates.is_starred);
  }
  if (updates.is_archived !== undefined) {
    sets.push(`is_archived = $${idx++}`);
    params.push(updates.is_archived);
  }
  if (updates.snoozed_until !== undefined) {
    sets.push(`snoozed_until = $${idx++}`);
    params.push(updates.snoozed_until);
  }
  if (updates.folder !== undefined) {
    sets.push(`folder = $${idx++}`);
    params.push(updates.folder);
  }

  if (sets.length === 0) return;

  sets.push('updated_at = NOW()');
  params.push(threadId);

  await query(
    `UPDATE email_threads SET ${sets.join(', ')} WHERE id = $${idx}`,
    params
  );

  // Log activity
  const action = updates.status ? 'status_changed'
    : updates.assigned_to !== undefined ? 'assigned'
    : updates.is_starred !== undefined ? 'starred'
    : updates.is_archived !== undefined ? 'archived'
    : 'updated';

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

// ── Labels ──

export async function getLabels(propertyId?: number) {
  const result = await query(
    `SELECT * FROM email_labels
     WHERE property_id IS NULL ${propertyId ? 'OR property_id = $1' : ''}
     ORDER BY sort_order ASC, name ASC`,
    propertyId ? [propertyId] : []
  );
  return result.rows;
}

export async function createLabel(name: string, color: string, propertyId: number | null, createdBy: number) {
  const result = await query(
    `INSERT INTO email_labels (name, color, property_id, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, color, propertyId, createdBy]
  );
  return result.rows[0];
}

export async function deleteLabel(labelId: number) {
  await query('DELETE FROM email_labels WHERE id = $1 AND is_system = false', [labelId]);
}

export async function addThreadLabel(threadId: number, labelId: number, userId: number) {
  await query(
    `INSERT INTO email_thread_labels (thread_id, label_id, applied_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (thread_id, label_id) DO NOTHING`,
    [threadId, labelId, userId]
  );
}

export async function removeThreadLabel(threadId: number, labelId: number) {
  await query(
    'DELETE FROM email_thread_labels WHERE thread_id = $1 AND label_id = $2',
    [threadId, labelId]
  );
}

// ── Folder counts ──

export async function getFolderCounts(userId: number): Promise<Record<string, number>> {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE (is_archived = false OR is_archived IS NULL) AND (folder = 'inbox' OR folder IS NULL)) as inbox,
       COUNT(*) FILTER (WHERE is_starred = true AND (is_archived = false OR is_archived IS NULL)) as starred,
       COUNT(*) FILTER (WHERE folder = 'sent') as sent,
       COUNT(*) FILTER (WHERE folder = 'drafts') as drafts,
       COUNT(*) FILTER (WHERE is_archived = true) as archive,
       COUNT(*) FILTER (WHERE folder = 'trash') as trash
     FROM email_threads
     WHERE assigned_to = $1`,
    [userId]
  );
  return result.rows[0] || { inbox: 0, starred: 0, sent: 0, drafts: 0, archive: 0, trash: 0 };
}
