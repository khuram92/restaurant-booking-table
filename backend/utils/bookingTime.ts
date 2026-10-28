// // utils/bookingTime.ts
// // Booking date + time helpers. Restaurant local time defaults to Pakistan (UTC+5).
// // Override with RESTAURANT_TZ_OFFSET_MINUTES in .env if needed.

// const tzOffsetMinutes = () => {
//   const raw = process.env.RESTAURANT_TZ_OFFSET_MINUTES;
//   const n = raw ? Number(raw) : NaN;
//   return Number.isFinite(n) ? n : 300;
// };

// /** "19:30" or "7:30 PM" -> minutes since midnight. null if unreadable. */
// export const parseTimeToMinutes = (value: unknown): number | null => {
//   if (typeof value !== "string") return null;
//   const m = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
//   if (!m) return null;

//   let hours = Number(m[1]);
//   const minutes = Number(m[2] ?? 0);
//   const meridiem = m[3]?.toLowerCase();
//   if (minutes > 59) return null;

//   if (meridiem) {
//     if (hours < 1 || hours > 12) return null;
//     if (meridiem === "pm" && hours !== 12) hours += 12;
//     if (meridiem === "am" && hours === 12) hours = 0;
//   } else if (hours > 23) {
//     return null;
//   }
//   return hours * 60 + minutes;
// };

// export type CalendarDay = { y: number; m: number; d: number }; // m is 1-12

// /**
//  * Calendar day (restaurant local time) of a "YYYY-MM-DD" string, a full ISO
//  * string, or a Date. Plain dates are used as-is; anything with a time part is
//  * shifted into restaurant time first, so "2026-10-27T19:00:00.000Z" (local
//  * midnight in Pakistan) correctly becomes 28 Oct, not 27 Oct.
//  */
// export const getCalendarDay = (input: Date | string): CalendarDay | null => {
//   if (typeof input === "string") {
//     const match = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
//     if (match) {
//       const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
//       const check = new Date(Date.UTC(y, m - 1, d));
//       if (
//         check.getUTCFullYear() !== y ||
//         check.getUTCMonth() !== m - 1 ||
//         check.getUTCDate() !== d
//       ) {
//         return null;
//       }
//       return { y, m, d };
//     }
//   }
//   const date = input instanceof Date ? input : new Date(input);
//   if (Number.isNaN(date.getTime())) return null;
//   const local = new Date(date.getTime() + tzOffsetMinutes() * 60_000);
//   return {
//     y: local.getUTCFullYear(),
//     m: local.getUTCMonth() + 1,
//     d: local.getUTCDate(),
//   };
// };

// export const toDayStart = (day: CalendarDay) =>
//   new Date(Date.UTC(day.y, day.m - 1, day.d));

// /**
//  * The real moment a booking starts (restaurant local time converted to UTC).
//  * Pass the restaurant's hours so after-midnight slots of an overnight
//  * restaurant (open 6 PM - 2 AM, booking at 1 AM) count as the NEXT calendar day.
//  */
// export const getBookingStart = (
//   date: Date | string,
//   time: unknown,
//   hours?: { opening?: unknown; closing?: unknown },
// ): Date | null => {
//   const day = getCalendarDay(date);
//   const minutes = parseTimeToMinutes(time);
//   if (!day || minutes === null) return null;

//   let start =
//     Date.UTC(day.y, day.m - 1, day.d) + (minutes - tzOffsetMinutes()) * 60_000;

//   const opening = parseTimeToMinutes(hours?.opening);
//   const closing = parseTimeToMinutes(hours?.closing);
//   if (
//     opening !== null &&
//     closing !== null &&
//     opening > closing && // overnight restaurant
//     minutes < opening &&
//     minutes <= closing // an after-midnight slot
//   ) {
//     start += 24 * 60 * 60 * 1000;
//   }
//   return new Date(start);
// };

// /** Inside opening hours? Handles overnight (e.g. 18:00 - 02:00). Skips the check if hours are unreadable. */
// export const isWithinOpeningHours = (
//   time: unknown,
//   opening: unknown,
//   closing: unknown,
// ): boolean => {
//   const t = parseTimeToMinutes(time);
//   const o = parseTimeToMinutes(opening);
//   const c = parseTimeToMinutes(closing);
//   if (t === null) return false;
//   if (o === null || c === null) return true;
//   return o <= c ? t >= o && t <= c : t >= o || t <= c;
// };

// /**
//  * Range of stored `date` values that belong to this calendar day. New bookings
//  * are stored at UTC midnight; older ones may be stored at local midnight
//  * (e.g. 19:00 UTC the day before in Pakistan). This range matches both.
//  */
// export const getDayRange = (day: CalendarDay) => {
//   const shift = Math.max(0, tzOffsetMinutes()) * 60_000;
//   const from = new Date(toDayStart(day).getTime() - shift);
//   return { from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
// };