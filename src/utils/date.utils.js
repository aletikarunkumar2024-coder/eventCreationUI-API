function futureDateValue(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + 7);
  date.setHours(12, 0, 0, 0);

  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

module.exports = { futureDateValue };
