import { faker } from "@faker-js/faker/locale/en";

import type { Calendar } from "@hypr/store";

import { DEFAULT_USER_ID, id } from "~/shared/utils";

export const createCalendar = () => {
  const template = faker.helpers.arrayElement([
    "Work Calendar",
    "Personal Calendar",
    "Team Calendar",
    "Project Calendar",
    "Meetings",
    "Events & Conferences",
    "Family Calendar",
    `${faker.company.name()} Calendar`,
    `${faker.commerce.department()} Team`,
    "Shared Calendar",
  ]);

  const calendarId = id();
  return {
    id: calendarId,
    data: {
      user_id: DEFAULT_USER_ID,
      tracking_id_calendar: `mock-${calendarId}`,
      name: template,
      created_at: faker.date.past({ years: 1 }).toISOString(),
      enabled: faker.datatype.boolean(),
      provider: "apple",
    } satisfies Calendar,
  };
};
