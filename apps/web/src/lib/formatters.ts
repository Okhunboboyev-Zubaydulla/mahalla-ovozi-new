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

const ACTION_DISPLAY_NAMES_UZ: Record<string, string> = {
  AUTH_SIGN_IN_SUCCESS: 'Тизимга муваффақиятли кириш',
  AUTH_SIGN_IN_FAILURE: 'Тизимга киришда хатолик',
  ACCOUNT_PO_CREATED: 'Маҳсулот эгаси ҳисоби яратилди',
  ACCOUNT_PO_PASSWORD_RESET: 'Маҳсулот эгаси пароли янгиланди',
  AUTH_FIRST_LOGIN_PASSWORD_CHANGE_FAILED: 'Биринчи кириш паролини ўзгартиришда хатолик',
  ACCOUNT_HOKIM_CREATED: 'Туман ҳокими ҳисоби яратилди',
  ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED: 'Ҳокимнинг бошланғич пароли ўзгартирилди',
  ACCOUNT_HOKIM_PASSWORD_RESET: 'Ҳоким пароли вақтинчалик янгиланди',
  ACCOUNT_HOKIM_DISABLED: 'Ҳоким ҳисоби тўхтатилди',
  ACCOUNT_HOKIM_REPLACED: 'Ҳоким янгисига алмаштирилди',
  DISTRICT_CREATED: 'Янги туман яратилди',
  DISTRICT_UPDATED: 'Туман маълумотлари янгиланди',
  DISTRICT_DISCLOSURE_CONFIRMED: 'Маълумотларни ошкор қилиш тасдиқланди',
  DISTRICT_ACTIVATED: 'Туман муваффақиятли фаоллаштирилди',
  DISTRICT_ACTIVATION_FAILED: 'Туманни фаоллаштиришда хатолик',
  DISTRICT_TELEGRAM_BOT_CONNECTED: 'Телеграм бот муваффақиятли уланди',
  DISTRICT_TELEGRAM_BOT_DISCONNECTED: 'Телеграм бот уланиши узилди',
  DISTRICT_GROUP_VALIDATED: 'Телеграм гуруҳ текширилди',
  DISTRICT_GROUP_MAPPED: 'Телеграм гуруҳ маҳаллага бириктирилди',
  DISTRICT_GROUP_REMAPPED: 'Телеграм гуруҳ маҳаллага қайта бириктирилди',
  DISTRICT_GROUP_UNMAPPED: 'Телеграм гуруҳ бириктируви бекор қилинди',
  OPERATIONAL_ISSUE_DETECTED: 'Операцион муаммо аниқланди',
  OPERATIONAL_ISSUE_RESOLVED: 'Операцион муаммо бартараф этилди',
  OPERATIONAL_RETRY_TRIGGERED: 'Қайта уриниш амали ишга туширилди',
  DISTRICT_SUBSCRIPTION_METADATA_UPDATED: 'Обуна маълумотлари янгиланди',
  DISTRICT_GRACE_STARTED: 'Имтиёзли давр (Grace) бошланди',
  DISTRICT_SUBSCRIPTION_SUSPENDED: 'Обуна тўхтатилди (Suspended)',
  DISTRICT_SERVICE_RESTORED_ACTIVE: 'Фаол ҳолат тикланди',
};

export function getActionDisplayNameUz(action: string): string {
  if (ACTION_DISPLAY_NAMES_UZ[action]) {
    return ACTION_DISPLAY_NAMES_UZ[action];
  }
  return action.replace(/_/g, ' ');
}
