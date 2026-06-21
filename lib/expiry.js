const TUESDAY = 2;

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function tradingDaysBetween(fromDate, toDate) {
  let count = 0;
  const cursor = startOfDay(fromDate);
  const end = startOfDay(toDate);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function nextTuesday(fromDate = new Date()) {
  const today = startOfDay(fromDate);
  const day = today.getDay();
  let daysUntil = (TUESDAY - day + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  return addDays(today, daysUntil);
}

function lastTuesdayOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  const day = lastDay.getDay();
  const diff = (day - TUESDAY + 7) % 7;
  return addDays(lastDay, -diff);
}

function nextMonthlyExpiry(fromDate = new Date()) {
  const today = startOfDay(fromDate);
  let candidate = lastTuesdayOfMonth(today.getFullYear(), today.getMonth());
  if (candidate <= today) {
    const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    candidate = lastTuesdayOfMonth(nextYear, nextMonth);
  }
  return candidate;
}

function buildExpiryInfo(date, label) {
  const today = startOfDay(new Date());
  const expiry = startOfDay(date);
  return {
    date: toDateString(expiry),
    daysAway: tradingDaysBetween(today, expiry),
    label,
  };
}

function getNiftyExpiries(fromDate = new Date()) {
  const weeklyDate = nextTuesday(fromDate);
  const monthlyDate = nextMonthlyExpiry(fromDate);

  return {
    weekly: buildExpiryInfo(weeklyDate, "Next Weekly Expiry"),
    monthly: buildExpiryInfo(monthlyDate, "Next Monthly Expiry"),
  };
}

module.exports = {
  getNiftyExpiries,
  tradingDaysBetween,
  nextTuesday,
  nextMonthlyExpiry,
};