const assert = require('node:assert/strict');
const test = require('node:test');
const { futureDateValue } = require('../../src/utils/date.utils');
const { parseSeatCount } = require('../../src/utils/seat-count.utils');

test('futureDateValue returns a future local datetime value', () => {
  const now = new Date(2026, 0, 1, 9, 30, 0, 0);
  const value = futureDateValue(now);
  const [datePart, timePart] = value.split('T');
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(timePart, '12:00');
  assert.ok(new Date(`${datePart}T${timePart}:00`) > now);
});

test('futureDateValue advances across month boundaries', () => {
  const value = futureDateValue(new Date(2026, 0, 28, 23, 0, 0, 0));
  assert.match(value, /^2026-02-04T12:00$/);
});

test('parseSeatCount parses the requested seat label formats', () => {
  assert.equal(parseSeatCount('50 seats'), 50);
  assert.equal(parseSeatCount('50 seats left'), 50);
  assert.equal(parseSeatCount('Seats: 50'), 50);
  assert.equal(parseSeatCount('1 seat available'), 1);
  assert.equal(parseSeatCount('1,250 seats left'), 1250);
});

test('parseSeatCount reports unreadable labels clearly', () => {
  assert.throws(() => parseSeatCount('Sold out'), /Could not parse a seat count/);
});
