const { dayjs } = require('../config/timezone');

// "HH:mm" strings -> total minutes between them, handling overnight (end < start).
function shiftMinutes(shiftStart, shiftEnd) {
  const [sh, sm] = shiftStart.split(':').map(Number);
  const [eh, em] = shiftEnd.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins < startMins) {
    // overnight: startMins -> midnight, midnight -> endMins, plus 1 minute boundary
    return (24 * 60 - startMins) + endMins + 1;
  }
  return endMins - startMins;
}

function shiftHoursRounded(shiftStart, shiftEnd) {
  return Math.round((shiftMinutes(shiftStart, shiftEnd) / 60) * 100) / 100;
}

// Date/Time instances, handles overnight (end before start means end is next day).
function diffMinutes(start, end) {
  if (!start || !end) return 0;
  let s = dayjs(start);
  let e = dayjs(end);
  if (e.isBefore(s)) e = e.add(1, 'day');
  return e.diff(s, 'minute');
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = { shiftMinutes, shiftHoursRounded, diffMinutes, round2 };
