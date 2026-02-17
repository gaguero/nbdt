/**
 * Client-side utility for sending messages to guests.
 * Handles find-or-create conversation, then POSTs the message.
 */

export async function sendGuestMessage(
  guestId: string,
  channelId: string,
  body: string
): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
  // Find or create a conversation for this guest + channel
  const convRes = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_id: guestId, channel_id: channelId }),
  });

  if (!convRes.ok) {
    const err = await convRes.json().catch(() => ({}));
    return { ok: false, error: err.error ?? 'Failed to create conversation' };
  }

  const { conversation } = await convRes.json();
  if (!conversation?.id) {
    return { ok: false, error: 'No conversation returned' };
  }

  // Send the message
  const msgRes = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversation.id,
      sender_type: 'staff',
      body,
      is_internal: false,
    }),
  });

  if (!msgRes.ok) {
    const err = await msgRes.json().catch(() => ({}));
    return { ok: false, error: err.error ?? 'Failed to send message' };
  }

  return { ok: true, conversationId: conversation.id };
}

export async function getDefaultChannelId(): Promise<string | null> {
  try {
    const res = await fetch('/api/conversations/channels');
    if (!res.ok) return null;
    const data = await res.json();
    const channels: any[] = data.channels ?? [];
    // Prefer a 'concierge' channel, then first available
    const concierge = channels.find((c: any) =>
      c.name?.toLowerCase().includes('concierge') ||
      c.display_name_en?.toLowerCase().includes('concierge')
    );
    return concierge?.id ?? channels[0]?.id ?? null;
  } catch {
    return null;
  }
}
