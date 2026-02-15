import { XMLParser } from 'fast-xml-parser';
import { query, queryOne, transaction } from '@/lib/db';
import type { OperaGRoom, OperaImportResult, ParsedReservation } from './types';

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, yearShort] = parts;
  const year = parseInt(yearShort) < 50 ? `20${yearShort}` : `19${yearShort}`;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseName(fullName: string): { firstName: string; lastName: string; fullName: string } {
  if (!fullName) return { firstName: '', lastName: '', fullName: '' };
  const parts = fullName.split(',').map(p => p.trim());
  const lastName = parts[0] || '';
  const firstName = parts[1] || '';
  return {
    firstName,
    lastName,
    fullName: firstName ? `${firstName} ${lastName}` : lastName,
  };
}

function parseNumber(val: string): number | null {
  if (!val || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function extractGRooms(xmlData: any): OperaGRoom[] {
  try {
    const root = xmlData.RESENTEREDON || xmlData;
    const grpby1List = root?.LIST_G_GRPBY_1?.G_GRPBY_1;
    if (!grpby1List) return [];

    const groups = Array.isArray(grpby1List) ? grpby1List : [grpby1List];
    const rooms: OperaGRoom[] = [];

    for (const g1 of groups) {
      const grpby2List = g1?.LIST_G_GRPBY_2?.G_GRPBY_2;
      if (!grpby2List) continue;
      const groups2 = Array.isArray(grpby2List) ? grpby2List : [grpby2List];

      for (const g2 of groups2) {
        const roomList = g2?.LIST_G_ROOM?.G_ROOM;
        if (!roomList) continue;
        const roomArr = Array.isArray(roomList) ? roomList : [roomList];
        rooms.push(...roomArr);
      }
    }

    return rooms;
  } catch {
    return [];
  }
}

function parseReservation(gRoom: OperaGRoom): ParsedReservation {
  const name = parseName(gRoom.FULL_NAME || '');
  return {
    opera_resv_id: String(gRoom.RESV_NAME_ID || ''),
    status: gRoom.RESV_STATUS || 'RESERVED',
    short_status: gRoom.SHORT_RESV_STATUS || 'RESV',
    room: String(gRoom.ROOM || ''),
    first_name: name.firstName,
    last_name: name.lastName,
    full_name: name.fullName,
    arrival: parseDate(String(gRoom.ARRIVAL || '')),
    departure: parseDate(String(gRoom.DEPARTURE || '')),
    persons: parseInt(String(gRoom.PERSONS || '1')) || 1,
    nights: parseInt(String(gRoom.NIGHTS || '1')) || 1,
    no_of_rooms: parseInt(String(gRoom.NO_OF_ROOMS || '1')) || 1,
    room_category: gRoom.ROOM_CATEGORY_LABEL || '',
    rate_code: gRoom.RATE_CODE || '',
    guarantee_code: gRoom.GUARANTEE_CODE || '',
    guarantee_code_desc: gRoom.GUARANTEE_CODE_DESC || '',
    group_name: gRoom.GROUP_NAME || '',
    travel_agent: gRoom.TRAVEL_AGENT_NAME || '',
    company: gRoom.COMPANY_NAME || '',
    c_t_s_name: gRoom.C_T_S_NAME || '',
    insert_user: gRoom.INSERT_USER || '',
    insert_date: gRoom.INSERT_DATE || '',
    share_amount: parseNumber(String(gRoom.SHARE_AMOUNT || '')),
    share_amount_per_stay: parseNumber(String(gRoom.SHARE_AMOUNT_PER_STAY || '')),
  };
}

export async function importOperaXml(xmlContent: string): Promise<OperaImportResult> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  const xmlData = parser.parse(xmlContent);
  const gRooms = extractGRooms(xmlData);

  const result: OperaImportResult = {
    total: gRooms.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  };

  if (gRooms.length === 0) {
    result.errors.push('No G_ROOM records found in XML');
    return result;
  }

  for (const gRoom of gRooms) {
    try {
      const parsed = parseReservation(gRoom);
      if (!parsed.opera_resv_id) {
        result.errors.push('Skipped record with no RESV_NAME_ID');
        continue;
      }

      await transaction(async (client) => {
        // Upsert guest by full_name
        let guestId: string;
        const existingGuest = await client.query(
          'SELECT id FROM guests WHERE full_name = $1 LIMIT 1',
          [parsed.full_name]
        );

        if (existingGuest.rows.length > 0) {
          guestId = existingGuest.rows[0].id;
        } else {
          const newGuest = await client.query(
            `INSERT INTO guests (first_name, last_name, full_name)
             VALUES ($1, $2, $3) RETURNING id`,
            [parsed.first_name, parsed.last_name, parsed.full_name]
          );
          guestId = newGuest.rows[0].id;
        }

        // Upsert reservation by opera_resv_id
        const existingResv = await client.query(
          'SELECT id, status, room FROM reservations WHERE opera_resv_id = $1',
          [parsed.opera_resv_id]
        );

        if (existingResv.rows.length > 0) {
          const existing = existingResv.rows[0];
          if (existing.status === parsed.status && existing.room === parsed.room) {
            result.unchanged++;
          } else {
            await client.query(
              `UPDATE reservations SET
                guest_id = $1, status = $2, short_status = $3, room = $4,
                arrival = $5, departure = $6, persons = $7, nights = $8,
                no_of_rooms = $9, room_category = $10, rate_code = $11,
                guarantee_code = $12, guarantee_code_desc = $13, group_name = $14,
                travel_agent = $15, company = $16, c_t_s_name = $17,
                share_amount = $18, share_amount_per_stay = $19,
                insert_user = $20, insert_date = $21
              WHERE opera_resv_id = $22`,
              [
                guestId, parsed.status, parsed.short_status, parsed.room,
                parsed.arrival, parsed.departure, parsed.persons, parsed.nights,
                parsed.no_of_rooms, parsed.room_category, parsed.rate_code,
                parsed.guarantee_code, parsed.guarantee_code_desc, parsed.group_name,
                parsed.travel_agent, parsed.company, parsed.c_t_s_name,
                parsed.share_amount, parsed.share_amount_per_stay,
                parsed.insert_user, parsed.insert_date,
                parsed.opera_resv_id,
              ]
            );
            result.updated++;
          }
        } else {
          await client.query(
            `INSERT INTO reservations (
              opera_resv_id, guest_id, status, short_status, room,
              arrival, departure, persons, nights, no_of_rooms,
              room_category, rate_code, guarantee_code, guarantee_code_desc,
              group_name, travel_agent, company, c_t_s_name,
              share_amount, share_amount_per_stay, insert_user, insert_date
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
            [
              parsed.opera_resv_id, guestId, parsed.status, parsed.short_status, parsed.room,
              parsed.arrival, parsed.departure, parsed.persons, parsed.nights, parsed.no_of_rooms,
              parsed.room_category, parsed.rate_code, parsed.guarantee_code, parsed.guarantee_code_desc,
              parsed.group_name, parsed.travel_agent, parsed.company, parsed.c_t_s_name,
              parsed.share_amount, parsed.share_amount_per_stay, parsed.insert_user, parsed.insert_date,
            ]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      result.errors.push(`RESV ${gRoom.RESV_NAME_ID}: ${err.message}`);
    }
  }

  return result;
}
