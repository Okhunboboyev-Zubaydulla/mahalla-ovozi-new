export function formatTashkentDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatTashkentTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '';
  }
}

export function formatTashkentActivityTime(isoString: string, currentCalendarDay?: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';

    const todayYmd =
      currentCalendarDay ||
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

    const itemYmd = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

    if (itemYmd === todayYmd) {
      return new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    }

    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '';
  }
}

export function formatTashkentCalendarDate(calendarDay: string): string {
  try {
    if (calendarDay.includes('..')) {
      const [from, to] = calendarDay.split('..');
      if (from && to) {
        return `${formatTashkentCalendarDate(from)} – ${formatTashkentCalendarDate(to)}`;
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(calendarDay)) {
      const [year, month, day] = calendarDay.split('-');
      return `${day}.${month}.${year}`;
    }
    const date = new Date(calendarDay);
    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return calendarDay;
  }
}

export function getTashkentToday(referenceDate?: Date): string {
  try {
    const d = referenceDate || new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const d = referenceDate || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
