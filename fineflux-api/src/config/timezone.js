const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const IST = 'Asia/Kolkata';

const nowIst = () => dayjs().tz(IST);
const toIst = (date) => dayjs(date).tz(IST);
const startOfDayIst = (date) => toIst(date || undefined).startOf('day');
const endOfDayIst = (date) => toIst(date || undefined).endOf('day');
const startOfMonthIst = (date) => toIst(date || undefined).startOf('month');
const endOfMonthIst = (date) => toIst(date || undefined).endOf('month');
const startOfWeekIst = (date) => toIst(date || undefined).startOf('week');

module.exports = { dayjs, IST, nowIst, toIst, startOfDayIst, endOfDayIst, startOfMonthIst, endOfMonthIst, startOfWeekIst };
