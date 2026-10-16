function parseSeatCount(text) {
  const normalized = String(text ?? '').replace(/,/g, '');
  const patterns = [/(\d+)\s+seats?\b/i, /\bseats?\s*(?:(?:left|available)\s*)?[:-]?\s*(\d+)\b/i];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return Number.parseInt(match[1], 10);
  }

  throw new Error(
    `Could not parse a seat count from UI text: "${String(text ?? '').trim() || '[empty]'}". ` +
      'Expected text such as "50 seats", "50 seats left", or "Seats: 50".',
  );
}

module.exports = { parseSeatCount };
