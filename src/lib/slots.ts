// Web useProviderBooking'dan ko'chirilgan sof slot-hisoblash logikasi.

export interface WorkSlot {
  slot_date: string;
  start_time: string;
  end_time: string;
}
export interface BreakSlot {
  slot_date: string;
  start_time: string;
  end_time: string;
}
export interface BusyBooking {
  booking_date: string;
  start_time: string;
  end_time: string;
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

export function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Berilgan sanada slot bo'shmi (ish vaqti ichida, tanaffusda emas, band emas).
export function isSlotFree(
  startTime: string,
  duration: number,
  buffer: number,
  workSlots: WorkSlot[],
  breaks: BreakSlot[],
  bookings: BusyBooking[],
  date: string
): boolean {
  const end = addMinutes(startTime, duration);
  const startM = timeToMin(startTime);
  const endM = timeToMin(end);

  const inWork = workSlots
    .filter((s) => s.slot_date === date)
    .some(
      (w) => startM >= timeToMin(w.start_time) && endM <= timeToMin(w.end_time)
    );
  if (!inWork) return false;

  const inBreak = breaks
    .filter((b) => b.slot_date === date)
    .some(
      (br) => startM < timeToMin(br.end_time) && endM > timeToMin(br.start_time)
    );
  if (inBreak) return false;

  const inBooking = bookings
    .filter((b) => b.booking_date === date)
    .some(
      (bk) =>
        startM < timeToMin(bk.end_time) + buffer &&
        endM + buffer > timeToMin(bk.start_time)
    );
  if (inBooking) return false;

  return true;
}

function generateStartTimes(
  workSlots: WorkSlot[],
  date: string,
  step: number
): string[] {
  const times: string[] = [];
  workSlots
    .filter((s) => s.slot_date === date)
    .forEach((w) => {
      let cursor = w.start_time;
      while (timeToMin(cursor) < timeToMin(w.end_time)) {
        times.push(cursor);
        cursor = addMinutes(cursor, step);
      }
    });
  return [...new Set(times)].sort((a, b) => timeToMin(a) - timeToMin(b));
}

// Tanlangan sana + davomiylik uchun bo'sh boshlanish vaqtlari.
// nowDate/nowHHMM — Toshkent vaqti (o'tib ketgan vaqtlarni chiqarib tashlash uchun).
export function freeStartTimes(
  date: string,
  duration: number,
  buffer: number,
  workSlots: WorkSlot[],
  breaks: BreakSlot[],
  bookings: BusyBooking[],
  nowDate: string,
  nowHHMM: string
): string[] {
  const step = Math.max(15, Math.min(duration, 30));
  return generateStartTimes(workSlots, date, step).filter((time) => {
    if (date === nowDate && timeToMin(time) <= timeToMin(nowHHMM)) return false;
    return isSlotFree(time, duration, buffer, workSlots, breaks, bookings, date);
  });
}

// Slotlardan mavjud (kelajak) sanalar ro'yxati.
export function availableDates(workSlots: WorkSlot[], fromDate: string): string[] {
  const set = new Set(
    workSlots.map((s) => s.slot_date).filter((d) => d >= fromDate)
  );
  return [...set].sort();
}
