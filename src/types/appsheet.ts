export type AppSheetTable =
  | 'guests'
  | 'vendors'
  | 'transfers'
  | 'special_requests'
  | 'other_hotel_bookings'
  | 'romantic_dinners'
  | 'tour_bookings';

export const APPSHEET_TABLES: { value: AppSheetTable; label: string }[] = [
  { value: 'guests', label: 'Guests' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'transfers', label: 'Transfers' },
  { value: 'special_requests', label: 'Special Requests' },
  { value: 'other_hotel_bookings', label: 'Other Hotel Bookings' },
  { value: 'romantic_dinners', label: 'Romantic Dinners' },
  { value: 'tour_bookings', label: 'Tour Bookings' },
];
