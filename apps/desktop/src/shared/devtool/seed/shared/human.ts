import { faker } from "@faker-js/faker/locale/en";

import type { Human } from "@hypr/store";

import { DEFAULT_USER_ID, id } from "~/shared/utils";

export const createHuman = (org_id: string) => {
  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();

  const jobTitles = [
    "Software Engineer",
    "Product Manager",
    "Designer",
    "Engineering Manager",
    "CEO",
    "CTO",
    "VP of Engineering",
    "Data Scientist",
    "Marketing Manager",
    "Sales Director",
    "Account Executive",
    "Customer Success Manager",
    "Operations Manager",
    "HR Manager",
  ];

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      job_title: faker.helpers.arrayElement(jobTitles),
      linkedin_username: faker.datatype.boolean({ probability: 0.7 })
        ? `${firstName.toLowerCase()}${lastName.toLowerCase()}`
        : undefined,
      org_id,
      pinned: false,
    } satisfies Human,
  };
};
