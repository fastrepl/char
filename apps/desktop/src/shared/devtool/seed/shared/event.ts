import { faker } from "@faker-js/faker/locale/en";
import { DEFAULT_USER_ID, id } from "~/shared/utils";

import type { EventStorage } from "@hypr/store";

const MEETING_TITLES = [
  "Weekly Team Sync",
  "Product Roadmap Review",
  "Q4 Planning Session",
  "1:1 Check-in",
  "Sprint Planning",
  "Design Review",
  "Client Demo",
  "All Hands Meeting",
  "Engineering Standup",
  "Marketing Strategy Session",
  "Budget Review",
  "Candidate Interview",
  "Project Kickoff",
  "Quarterly Business Review",
  "Architecture Discussion",
  "User Research Debrief",
  "Sales Pipeline Review",
  "Customer Success Call",
  "Board Meeting",
  "Team Retrospective",
];

const LOCATIONS = [
  "Conference Room A",
  "Conference Room B",
  "Main Office - 3rd Floor",
  "Starbucks Downtown",
  "WeWork Coworking Space",
  "Client Office",
  "HQ Building 2",
  "Meeting Room Delta",
  "Executive Boardroom",
  "Rooftop Lounge",
];

type MeetingProvider = {
  name: string;
  domain: string;
  generateInvite: (params: {
    title: string;
    host: string;
    meetingId: string;
    passcode: string;
    link: string;
  }) => string;
};

const PROVIDERS: MeetingProvider[] = [
  {
    name: "Zoom",
    domain: "zoom.us",
    generateInvite: ({ title, host, meetingId, passcode, link }) => {
      const dialInNumbers = [
        "+1 646 931 3860",
        "+1 929 205 6099",
        "+1 301 715 8592",
      ];
      const sipAddress = `${meetingId.replace(/\s/g, "")}@zoomcrc.com`;
      const aiCompanionLink = `https://hyprnote.${PROVIDERS[0].domain}/launch/edl?muid=${faker.string.uuid()}`;
      const joinInstructionsLink = `https://hyprnote.${PROVIDERS[0].domain}/meetings/${meetingId.replace(
        /\s/g,
        "",
      )}/invitations?signature=${faker.string.alphanumeric(40)}`;

      return `<p>──────────<br/>${host} is inviting you to a scheduled Zoom meeting.<br/><br/>${title}<br/><br/>Join Zoom Meeting<br/>${link}<br/><br/>View meeting insights with Zoom AI Companion<br/>${aiCompanionLink}<br/><br/>Meeting ID: ${meetingId}<br/>Passcode: ${passcode}<br/><br/>---<br/><br/>One tap mobile<br/>${
        dialInNumbers[0]
      },,${meetingId.replace(/\s/g, "")}#,,,,*${passcode}# US<br/>${dialInNumbers[1]},,${meetingId.replace(
        /\s/g,
        "",
      )}#,,,,*${passcode}# US (New York)<br/><br/>Dial by your location<br/>${dialInNumbers
        .map((num) => `${num} US`)
        .join(
          "<br/>",
        )}<br/><br/>---<br/><br/>Join by SIP<br/>• ${sipAddress}<br/><br/>Join instructions<br/>${joinInstructionsLink}<br/><br/>──────────</p>`;
    },
  },
  {
    name: "Google Meet",
    domain: "meet.google.com",
    generateInvite: ({ title, host, link }) => {
      const phoneNumbers = ["(US) +1 570-865-7873", "(US) +1 929-436-2866"];
      const pin = faker.string.numeric(9);

      return `<p>──────────<br/>${host} has invited you to a Google Meet video call.<br/><br/>${title}<br/><br/>Join the meeting:<br/>${link}<br/><br/>Or dial:<br/>${phoneNumbers.join(
        "<br/>",
      )}<br/><br/>PIN: ${pin}#<br/><br/>More phone numbers:<br/>https://tel.meet/lookup<br/><br/>──────────</p>`;
    },
  },
  {
    name: "Microsoft Teams",
    domain: "teams.microsoft.com",
    generateInvite: ({ title, host, link }) => {
      const conferenceId = faker.string.numeric(9);
      const phoneNumbers = ["+1 323-886-7531", "+1 929-203-0582"];

      return `<p>──────────<br/>Microsoft Teams meeting<br/><br/>${title}<br/><br/>Join on your computer, mobile app or room device<br/><br/>${link}<br/><br/>Meeting ID: ${conferenceId}<br/><br/>Or call in (audio only)<br/>${phoneNumbers
        .map((num) => `${num},,${conferenceId}#`)
        .join(
          "<br/>",
        )}<br/><br/>Phone Conference ID: ${conferenceId}#<br/><br/>Find a local number | Reset PIN<br/><br/>Organized by ${host}<br/><br/>──────────</p>`;
    },
  },
];

export const createEvent = (calendar_id: string) => {
  const now = faker.defaultRefDate();
  const daysOffset = faker.number.int({ min: -365, max: 14 });
  const hoursOffset = faker.number.int({ min: 8, max: 18 });
  const startsAt = new Date(now);
  startsAt.setDate(startsAt.getDate() + daysOffset);
  startsAt.setHours(
    hoursOffset,
    faker.helpers.arrayElement([0, 15, 30, 45]),
    0,
    0,
  );

  const durationMinutes = faker.helpers.arrayElement([15, 30, 45, 60, 90, 120]);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const meetingType = faker.helpers.weightedArrayElement([
    { weight: 60, value: "online" },
    { weight: 25, value: "offline" },
    { weight: 15, value: "hybrid" },
  ]);

  const title = faker.helpers.arrayElement(MEETING_TITLES);
  const provider = faker.helpers.arrayElement(PROVIDERS);
  const host = faker.person.fullName();

  const meetingIdFormat =
    provider.name === "Zoom"
      ? `${faker.string.numeric(3)} ${faker.string.numeric(4)} ${faker.string.numeric(4)}`
      : faker.string.numeric(10);
  const passcode = faker.string.numeric(6);
  const meetingPath =
    provider.name === "Zoom"
      ? `j/${meetingIdFormat.replace(/\s/g, "")}?pwd=${faker.string.alphanumeric(40)}`
      : faker.string.alphanumeric(12);

  let meeting_link: string | undefined;
  let location: string | undefined;
  let description: string | undefined;
  let note: string | undefined;

  if (meetingType === "online" || meetingType === "hybrid") {
    meeting_link = `https://hyprnote.${provider.domain}/${meetingPath}`;
    note = provider.generateInvite({
      title,
      host,
      meetingId: meetingIdFormat,
      passcode,
      link: meeting_link,
    });
  }

  if (meetingType === "offline" || meetingType === "hybrid") {
    location = faker.helpers.arrayElement(LOCATIONS);
  }

  if (faker.datatype.boolean({ probability: 0.4 })) {
    const topics = [
      "Discuss project timeline and deliverables",
      "Review quarterly goals and metrics",
      "Align on product strategy for next release",
      "Address blockers and dependencies",
      "Review customer feedback and action items",
      "Planning session for upcoming sprint",
    ];
    description = faker.helpers.arrayElement(topics);
  }

  const eventId = id();
  return {
    id: eventId,
    data: {
      user_id: DEFAULT_USER_ID,
      tracking_id_event: `mock-${eventId}`,
      calendar_id,
      title,
      started_at: startsAt.toISOString(),
      ended_at: endsAt.toISOString(),
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      location,
      meeting_link,
      description,
      note,
      is_all_day: undefined,
    } satisfies EventStorage,
  };
};
