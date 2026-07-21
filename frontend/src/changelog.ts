/** Hand-written, user-language changelog — the single source for the landing
 * section, the /changelog page, and the "news" dot in the nav.
 * Add a new entry at the TOP when tagging a release. */

export type ChangelogEntry = {
  version: string;
  date: string; // ISO, YYYY-MM-DD
  title: string;
  items: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v0.0.9",
    date: "2026-07-21",
    title: "See what's new",
    items: [
      "A Changelog page, linked from the profile menu, lists every release in plain language.",
      "A small dot on the menu lets you know when there's something new since your last visit.",
    ],
  },
  {
    version: "v0.0.8",
    date: "2026-07-10",
    title: "Make it yours",
    items: [
      "Customize your avatar: pick your letters, colors, one of six shapes, and a rotation — it shows up everywhere you vote and comment.",
      "Your name appears in your chosen color on comments and member lists.",
      "Change your password from the new profile dialog (other sessions get signed out for safety).",
      "Rename your account, or delete it — both password-protected.",
    ],
  },
  {
    version: "v0.0.7",
    date: "2026-07-06",
    title: "Everything before",
    items: [
      "Choice, date, and range polls with paint-to-vote calendars.",
      "Events with RSVPs and calendar export.",
      "Comment threads on every card, cycles for recurring groups, and an activity log.",
      "Guest voting with no account, claimable later from any member list.",
      "A votable demo feed right on the landing page.",
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;
