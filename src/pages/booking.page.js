const { expect } = require('playwright/test');

class BookingPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.ticketCount = page.locator('#ticket-count');
    this.fullNameInput = page.getByLabel('Full Name');
    this.emailInput = page.locator('#customer-email');
    this.phoneInput = page.getByPlaceholder('+91 98765 43210');
    this.confirmBookingButton = page.locator('.confirm-booking-btn');
    this.bookingReferences = page.locator('.booking-ref');
    this.viewMyBookingsLink = page.getByRole('link', { name: 'View My Bookings' });
    this.bookingCards = page.locator('#booking-card');
  }

  async expectDefaultTicketCount() {
    await expect(this.ticketCount).toHaveText('1');
  }

  async confirmBooking() {
    await this.fullNameInput.fill(this.config.customerName);
    await this.emailInput.fill(this.config.customerEmail);
    await this.phoneInput.fill(this.config.customerPhone);
    await this.confirmBookingButton.click();
  }

  async readBookingReference() {
    const reference = this.bookingReferences.first();
    await expect(reference).toBeVisible();
    const value = (await reference.innerText()).trim();
    expect(value, 'Expected the booking confirmation to contain a non-empty reference.').not.toBe(
      '',
    );
    return value;
  }

  async openMyBookings() {
    await this.viewMyBookingsLink.click();
    await expect(this.page).toHaveURL(new URL('/bookings', `${this.config.baseUrl}/`).toString());
  }

  async findBookingCard(bookingRef) {
    await expect(this.bookingCards.first()).toBeVisible();
    for (const card of await this.bookingCards.all()) {
      const references = await card.locator('.booking-ref').allInnerTexts();
      if (references.some((reference) => reference.trim() === bookingRef)) return card;
    }
    throw new Error(`No booking card matched this scenario's booking reference "${bookingRef}".`);
  }

  async expectBookingContainsEvent(bookingCard, eventTitle) {
    await expect(bookingCard).toBeVisible();
    await expect(bookingCard).toContainText(eventTitle);
  }
}

module.exports = { BookingPage };
