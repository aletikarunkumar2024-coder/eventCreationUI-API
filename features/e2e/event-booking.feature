Feature: Event booking seat inventory

  @e2e @ui @smoke
  Scenario: Create a new event, book one ticket, and verify that one seat is deducted
    Given I am logged into EventHub
    When I create a new event for booking
    Then I capture the new event's initial seat count
    When I start booking the new event
    And I complete a one-ticket booking for the new event
    Then I capture the booking confirmation reference
    And I can find this booking in My Bookings
    And exactly one seat has been deducted from the new event
