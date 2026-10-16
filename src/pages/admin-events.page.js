const { expect } = require('playwright/test');
const { futureDateValue } = require('../utils/date.utils');

class AdminEventsPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.titleInput = page.locator('#event-title-input');
    this.descriptionInput = page.locator('#admin-event-form textarea');
    this.cityInput = page.getByLabel('City');
    this.venueInput = page.getByLabel('Venue');
    this.dateInput = page.getByLabel('Event Date & Time');
    this.priceInput = page.getByLabel('Price ($)');
    this.seatsInput = page.getByLabel('Total Seats');
    this.addEventButton = page.locator('#add-event-btn');
    this.createdToast = page.getByText('Event created!', { exact: true });
  }

  async open() {
    await this.page.goto(new URL('/admin/events', `${this.config.baseUrl}/`).toString());
  }

  async createEvent(eventTitle, description) {
    await this.titleInput.fill(eventTitle);
    await this.descriptionInput.fill(this.config.eventDescription || description);
    await this.cityInput.fill(this.config.city);
    await this.venueInput.fill(this.config.venue);
    await this.dateInput.fill(futureDateValue());
    await this.priceInput.fill('100');
    await this.seatsInput.fill('50');
    await this.addEventButton.click();
    await expect(this.createdToast).toBeVisible();
  }
}

module.exports = { AdminEventsPage };
