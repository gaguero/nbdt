export interface OperaGRoom {
  RESV_NAME_ID: string;
  RESV_STATUS: string;
  SHORT_RESV_STATUS: string;
  ROOM: string;
  FULL_NAME: string;
  ARRIVAL: string;
  DEPARTURE: string;
  PERSONS: string;
  NIGHTS: string;
  NO_OF_ROOMS: string;
  ROOM_CATEGORY_LABEL: string;
  RATE_CODE: string;
  GUARANTEE_CODE: string;
  GUARANTEE_CODE_DESC: string;
  GROUP_NAME: string;
  TRAVEL_AGENT_NAME: string;
  COMPANY_NAME: string;
  INSERT_USER: string;
  INSERT_DATE: string;
  SHARE_AMOUNT: string;
  SHARE_AMOUNT_PER_STAY: string;
}

export interface OperaImportResult {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

export interface ParsedReservation {
  opera_resv_id: string;
  status: string;
  short_status: string;
  room: string;
  first_name: string;
  last_name: string;
  full_name: string;
  arrival: string | null;
  departure: string | null;
  persons: number;
  nights: number;
  no_of_rooms: number;
  room_category: string;
  rate_code: string;
  guarantee_code: string;
  guarantee_code_desc: string;
  group_name: string;
  travel_agent: string;
  company: string;
  insert_user: string;
  insert_date: string;
  share_amount: number | null;
  share_amount_per_stay: number | null;
}
