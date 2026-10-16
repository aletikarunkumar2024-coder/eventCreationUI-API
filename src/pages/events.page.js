const { expect } = require('playwright/test');
const { parseSeatCount } = require('../utils/seat-count.utils');

class EventsPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.eventCards = page.locator('[data-testid="event-card"]');
  }

  async open() {
    await this.page.goto(new URL('/events', `${this.config.baseUrl}/`).toString());
  }

  async findEventCard(eventTitle) {
    await expect(this.eventCards.first()).toBeVisible();
    const eventCard = this.eventCards.filter({ hasText: eventTitle }).first();
    await expect(
      eventCard,
      `Expected to find an event card containing the created title "${eventTitle}".`,
    ).toBeVisible({ timeout: 5000 });
    return eventCard;
  }

  async readSeatCount(eventCard) {
    const seatLabels = await eventCard.getByText(/seat/i).allInnerTexts();
    for (const label of seatLabels) {
      try {
        return parseSeatCount(label);
      } catch {
        continue;
      }
    }

    throw new Error(
      `Could not read a seat count from event "${(await eventCard.innerText()).trim()}". ` +
        'No seat label contained a parseable count.',
    );
  }

  async startBooking(eventCard) {
    await eventCard.getByTestId('book-now-btn').click();
  }
}

module.exports = { EventsPage };
