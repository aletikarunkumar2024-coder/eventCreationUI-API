Feature: Allure Cucumber status mapping

  @report-failed-hook
  Scenario: A failed setup hook produces a failed Allure result
    Given a status mapping scenario step

  @report-pending
  Scenario: A pending scenario remains skipped in Allure
    Given a pending status mapping step

  @report-skipped-hook
  Scenario: An intentionally skipped setup hook remains skipped in Allure
    Given a status mapping scenario step
