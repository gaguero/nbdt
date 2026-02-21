# Findings: API Research for Dashboard Integration

## Auth
- Cookie name: `nayara_auth_token` (httpOnly, sent automatically by browser)
- Static HTML file → use `fetch('/api/...', { credentials: 'include' })`
- 401 = not logged in → redirect to `/en/staff/login`
- 403 = insufficient permissions

## Endpoint Summary

| Service | Endpoint | Date Param |
|---|---|---|
| Arrivals | `GET /api/reservations?filter=arriving_today` or `?filter=arrivals&date=YYYY-MM-DD` | `date` |
| Departures | `GET /api/reservations?filter=departing_today` or `?filter=departures&date=YYYY-MM-DD` | `date` |
| In-House | `GET /api/reservations?filter=checked_in` | — |
| Transfers | `GET /api/transfers?date_from=DATE&date_to=DATE` | `date_from`, `date_to` |
| Tours | `GET /api/tour-bookings?date_from=DATE&date_to=DATE` | `date_from`, `date_to` |
| Dinners | `GET /api/romantic-dinners?date_from=DATE&date_to=DATE` | `date_from`, `date_to` |
| Requests | `GET /api/special-requests?filter=today` (offset=0) | client-side filter otherwise |
| Conversations | `GET /api/conversations` | client-side filter by `updated_at` |
| Orders | `GET /api/orders` | client-side filter by `created_at` |

## Response Root Keys
- reservations → `data.reservations[]`
- transfers → `data.transfers[]`
- tour_bookings → `data.tour_bookings[]`
- romantic_dinners → `data.romantic_dinners[]`
- special_requests → `data.special_requests[]`
- conversations → `data.conversations[]`
- orders → `data.orders[]`

## Key Field Names Per Service

### Reservations (arrivals/departures/in-house)
- `guest_name`, `room` (villa number), `arrival` (date), `departure` (date)
- `status`, `transfer_booked` (boolean), `tour_booked` (boolean)
- No `time` field — only date

### Transfers
- `guest_name`, `origin`, `destination`, `time` (HH:MM), `date`
- `vendor_name`, `guest_status`, `vendor_status`
- Route = `origin + ' → ' + destination`

### Tour Bookings
- `name_en`, `start_time`, `activity_date`, `vendor_name`
- `num_guests`, `guest_status`, `vendor_status`
- `booking_mode`: shared|private

### Romantic Dinners
- `guest_name`, `location`, `time`, `date`
- `num_guests`, `status`, `vendor_name`

### Special Requests
- `request` (text), `guest_name`, `department`, `priority` (normal|high)
- `status` (pending|resolved), `date`, `time`

### Conversations
- `guest_name`, `channel_label_en`, `unread_count`
- `status` (active|resolved), `updated_at`
- No `last_message` in conversations endpoint — need `/api/messages?conversation_id=X`

### Orders
- `order_number`, `room_id` (not room name), `status`, `total`
- `items[]` array with names

## Status Mapping
API values → Dashboard CSS classes:
- `'confirmed'` → `confirmed`
- `'pending'` → `pending`
- `'cancelled'` → `pending` (show differently)
- `'completed'` → `completed`
- `'active'` (transfer/tour in progress) → `en-route`
- `'en_route'` → `en-route`
- Priority: `'high'` → `high`, `'normal'` → `low`

## CRUD Endpoints
All support POST (create), PUT (update with `?id=`), DELETE (with `?id=`)
- Transfers: full CRUD
- Tours: full CRUD (capacity-checked)
- Dinners: full CRUD
- Requests: full CRUD
- Conversations: GET/POST/PUT only

## Dashboard-to-API Field Mapping (serviceData format)

Current dashboard `serviceData.transfers` row format:
`[guestName+villa, route, time, driverName, status]`

API response mapping:
```javascript
[
  `${r.guest_name}<br><small>${r.room || ''}</small>`,
  `${r.origin} → ${r.destination}`,
  r.time,
  r.vendor_name || '—',
  mapStatus(r.guest_status)
]
```

Current `serviceData.tours` row:
`[tourName, time, guide, capacity, status]`

API mapping:
```javascript
[
  r.name_en,
  r.start_time,
  r.vendor_name || '—',
  `${r.num_guests}`,
  mapStatus(r.guest_status)
]
```
