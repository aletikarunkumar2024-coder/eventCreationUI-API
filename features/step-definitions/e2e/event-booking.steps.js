const assert = require('node:assert/strict');
const { Given, Then, When } = require('@cucumber/cucumber');
const { getEventHubConfig } = require('../../../src/config/eventhub.config');
const { AdminEventsPage } = require('../../../src/pages/admin-events.page');
const { BookingPage } = require('../../../src/pages/booking.page');
const { EventsPage } = require('../../../src/pages/events.page');
const { login } = require('../../../src/pages/login.page');
const { getCache, removeCache, setCache } = require('../../../src/utils/global-cache');

Given('I am logged into EventHub', async function () {
  this.eventHubConfig = getEventHubConfig();
  await login(this.page);
});

When('I create a new event for booking', async function () {
  this.eventTitle = `Test Event ${Date.now()}`;
  this.adminEventsPage = new AdminEventsPage(this.page, this.eventHubConfig);
  await this.adminEventsPage.open();
  await this.adminEventsPage.createEvent(
    this.eventTitle,
    `Automated seat inventory verification for ${this.eventTitle}`,
  );
});

Then("I capture the new event's initial seat count", async function () {
  this.eventsPage = new EventsPage(this.page, this.eventHubConfig);
  await this.eventsPage.open();
  this.eventCard = await this.eventsPage.findEventCard(this.eventTitle);
  this.seatsBeforeBooking = await this.eventsPage.readSeatCount(this.eventCard);
});

When('I start booking the new event', async function () {
  await this.eventsPage.startBooking(this.eventCard);
  this.bookingPage = new BookingPage(this.page, this.eventHubConfig);
});

When('I complete a one-ticket booking for the new event', async function () {
  await this.bookingPage.expectDefaultTicketCount();
  await this.bookingPage.confirmBooking();
});

Then('I capture the booking confirmation reference', async function () {
  this.bookingRef = await this.bookingPage.readBookingReference();
  await setCache('bookingId', this.bookingRef);
  await setCache('bookingReference', this.bookingRef);
  await setCache('eventTitle', this.eventTitle);
});

Then('I can find this booking in My Bookings', async function () {
  await this.bookingPage.openMyBookings();
  this.bookingCard = await this.bookingPage.findBookingCard(this.bookingRef);
  await this.bookingPage.expectBookingContainsEvent(this.bookingCard, this.eventTitle);
});

Then('exactly one seat has been deducted from the new event', async function () {
  await this.eventsPage.open();
  this.eventCard = await this.eventsPage.findEventCard(this.eventTitle);
  this.seatsAfterBooking = await this.eventsPage.readSeatCount(this.eventCard);

  const expectedSeatCount = this.seatsBeforeBooking - 1;
  assert.equal(
    this.seatsAfterBooking,
    expectedSeatCount,
    `Seat inventory mismatch for "${this.eventTitle}": ` +
      `initial=${this.seatsBeforeBooking}, final=${this.seatsAfterBooking}, ` +
      `expected=${expectedSeatCount}.`,
  );
});

When('I find the booking stored in the global cache in My Bookings', async function () {
  this.bookingRef = await getCache('bookingReference');
  if (!this.bookingRef) this.bookingRef = await getCache('bookingId');
  if (!this.bookingRef) {
    throw new Error('No booking reference is stored under "bookingReference" or "bookingId".');
  }

  this.eventTitle = await getCache('eventTitle');
  this.eventHubConfig = this.eventHubConfig || getEventHubConfig();
  this.bookingPage = new BookingPage(this.page, this.eventHubConfig);
  await this.bookingPage.openMyBookings();
  this.bookingCard = await this.bookingPage.findBookingCard(this.bookingRef);
  if (this.eventTitle) {
    await this.bookingPage.expectBookingContainsEvent(this.bookingCard, this.eventTitle);
  }
});

Then('I remove the booking values from the global cache after verification', async function () {
  await removeCache('bookingId');
  await removeCache('bookingReference');
  await removeCache('eventTitle');
});
