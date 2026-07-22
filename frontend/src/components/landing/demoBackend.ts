// In-memory fake backend for the landing-page demo feed. Lets the REAL
// PollCard/ChoicePoll/DatePoll/RangePoll/EventCard components run unmodified
// (via ApiOverrideContext/ActivityOverrideContext), so the demo can never
// drift from what those components actually do — see DemoFeed.tsx.
import type { Activity, Comment, Event, Member, Poll, PollOption, RSVP, Slot } from "@/api/types";
import type { Api } from "@/hooks/useApi";
import { toDateStr } from "@/components/poll/monthBars";
import { parseLocalDate } from "@/lib/utils";

export const DEMO_ACTIVITY_ID = "demo";

export type DemoStore = {
  activity: Activity;
  choicePoll: Poll;
  datePoll: Poll;
  rangePoll: Poll;
  event: Event;
  nextId: number;
};

const AGO = new Date(Date.now() - 2 * 3600e3).toISOString(); // byline reads "2h ago"

function member(id: string, display_name: string): Member {
  return { id, display_name, is_anonymous: true, avatar: null, joined_at: AGO };
}

const ME = member("me", "You");
const ALEX = member("p1", "Alex");
const SAM = member("p2", "Sam");
const PRIYA = member("p3", "Priya");
const JO = member("p4", "Jo");
const MAREK = member("p5", "Marek");

function shiftDay(day: string, n: number): string {
  const d = parseLocalDate(day);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function voterRef(m: Member): PollOption["voters"][number] {
  return { id: m.id, display_name: m.display_name, avatar: m.avatar };
}

function option(id: number, label: string, voters: Member[]): PollOption {
  return { id, label, created_by: ALEX, voters: voters.map(voterRef), my_vote: false, created_at: AGO, deleted_at: null };
}

function slot(id: number, m: Member, date: string, date_end: string | null = null): Slot {
  return { id, member: m, status: "yes", date, date_end, time_start: null, time_end: null, note: "", created_at: AGO, deleted_at: null };
}

function rsvp(id: number, m: Member, status: RSVP["status"]): RSVP {
  return { id, member: m, status, comment: "", created_at: AGO, updated_at: AGO };
}

function comment(
  id: number,
  m: Member,
  body: string,
  target: { poll_id?: number; event_id?: number; parent_id?: number; replyCount?: number },
): Comment {
  return {
    id, member: m, body,
    parent_id: target.parent_id ?? null,
    poll_id: target.poll_id ?? null,
    event_id: target.event_id ?? null,
    reply_count: target.replyCount ?? 0,
    created_at: AGO, deleted_at: null,
  };
}

function choiceVoterCount(options: PollOption[]): number {
  const ids = new Set<string>();
  for (const o of options) for (const v of o.voters) ids.add(v.id);
  return ids.size;
}

function slotVoterCount(slots: Slot[]): number {
  return new Set(slots.map((s) => s.member.id)).size;
}

export function seedDemo(): DemoStore {
  const today = toDateStr(new Date());

  const choiceOptions = [
    option(101, "Pizza night at Sam's", [ALEX, SAM]),
    option(102, "Ramen bar downtown", [PRIYA, JO, MAREK]),
    option(103, "Remove me to see something cool ;)", []),
  ];
  const choicePoll: Poll = {
    id: 1, cycle_id: null, kind: "choice", allow_multiple: false,
    title: "Where should we celebrate the season finale?",
    created_by: ALEX, voter_count: choiceVoterCount(choiceOptions),
    options: choiceOptions, slots: null,
    comment_count: 0, latest_comments: [], created_at: AGO, deleted_at: null, locked_at: null,
  };

  const dateSlots = [
    slot(201, ALEX, shiftDay(today, 4)),
    slot(202, SAM, shiftDay(today, 4)),
    slot(203, SAM, shiftDay(today, 5)),
    slot(204, PRIYA, shiftDay(today, 5)),
    slot(205, PRIYA, shiftDay(today, 12)),
    slot(206, JO, shiftDay(today, 12)),
  ];
  const dateComments = [
    comment(601, JO, "Does the 2nd weekend work for everyone, or should we lock the 1st?", { poll_id: 2, replyCount: 1 }),
    comment(602, ALEX, "2nd weekend works great for me!", { poll_id: 2, parent_id: 601 }),
  ];
  const datePoll: Poll = {
    id: 2, cycle_id: null, kind: "date", allow_multiple: false,
    title: "When works for the weekend getaway?",
    created_by: SAM, voter_count: slotVoterCount(dateSlots),
    options: null, slots: dateSlots,
    comment_count: dateComments.length, latest_comments: dateComments, created_at: AGO, deleted_at: null, locked_at: null,
  };

  // overlapping ranges around "today" — enough overlap to force lane-packing
  // into multiple lanes and show off the legend/hide-show/spotlight
  const rangeSlots = [
    slot(301, ALEX, shiftDay(today, 3), shiftDay(today, 7)),
    slot(302, PRIYA, shiftDay(today, 5), shiftDay(today, 10)),
    slot(303, MAREK, shiftDay(today, 6), shiftDay(today, 8)),
  ];
  const rangePoll: Poll = {
    id: 3, cycle_id: null, kind: "range", allow_multiple: false,
    title: "Which week for the cabin trip?",
    created_by: PRIYA, voter_count: slotVoterCount(rangeSlots),
    options: null, slots: rangeSlots,
    comment_count: 0, latest_comments: [], created_at: AGO, deleted_at: null, locked_at: null,
  };

  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + (((6 - eventDate.getDay()) % 7) || 7)); // next Saturday
  const event: Event = {
    id: 4, cycle_id: null, poll_id: null,
    date: toDateStr(eventDate), time_start: "15:00:00", time_end: null,
    note: "Lakeside cabin — bring board games.",
    created_by: SAM,
    rsvps: [rsvp(401, ALEX, "going"), rsvp(402, SAM, "going"), rsvp(403, PRIYA, "going"), rsvp(404, JO, "maybe")],
    comment_count: 1,
    latest_comments: [comment(501, MAREK, "Count me in, I'll bring the grill!", { event_id: 4 })],
    created_at: AGO, deleted_at: null,
  };

  const activity: Activity = {
    id: DEMO_ACTIVITY_ID, short_id: DEMO_ACTIVITY_ID, title: "Weekend getaway", slug: "weekend-getaway",
    has_pin: false, pin: null, member_count: 6, is_member: true, me: ME,
    created_at: AGO, archived_at: null,
  };

  return { activity, choicePoll, datePoll, rangePoll, event, nextId: 1000 };
}

export function feedSnapshot(store: DemoStore) {
  return { choicePoll: store.choicePoll, datePoll: store.datePoll, rangePoll: store.rangePoll, event: store.event };
}

type PollKey = "choicePoll" | "datePoll" | "rangePoll";

function pollKeyById(store: DemoStore, id: number): PollKey {
  if (store.choicePoll.id === id) return "choicePoll";
  if (store.datePoll.id === id) return "datePoll";
  if (store.rangePoll.id === id) return "rangePoll";
  throw new Error(`demo api: unknown poll id ${id}`);
}

// fixed shapes matching exactly what ChoicePoll/DatePoll/RangePoll/EventCard
// call — 9 endpoints total, a generic path router isn't earned here
const OPTIONS = /^\/activities\/[^/]+\/polls\/(\d+)\/options\/$/;
const OPTION = /^\/activities\/[^/]+\/polls\/(\d+)\/options\/(\d+)\/$/;
const OPTION_VOTE = /^\/activities\/[^/]+\/polls\/(\d+)\/options\/(\d+)\/vote\/$/;
const SLOTS = /^\/activities\/[^/]+\/polls\/(\d+)\/slots\/$/;
const SLOT = /^\/activities\/[^/]+\/polls\/(\d+)\/slots\/(\d+)\/$/;
const RSVPS = /^\/activities\/[^/]+\/events\/(\d+)\/rsvps\/$/;

export function createDemoApi(store: DemoStore): Api {
  return {
    get: async <T,>(): Promise<T> => {
      throw new Error("demo api: GET is not used by any of the demo's components");
    },

    post: async <T,>(path: string, body: unknown): Promise<T> => {
      let m: RegExpMatchArray | null;
      if ((m = path.match(OPTIONS))) {
        const key = pollKeyById(store, Number(m[1]));
        const opt: PollOption = {
          id: store.nextId++, label: (body as { label: string }).label,
          created_by: ME, voters: [], my_vote: false, created_at: new Date().toISOString(), deleted_at: null,
        };
        store[key] = { ...store[key], options: [...(store[key].options ?? []), opt] };
        return opt as T;
      }
      if ((m = path.match(SLOTS))) {
        const key = pollKeyById(store, Number(m[1]));
        const b = body as { date: string; date_end?: string };
        const newSlot: Slot = {
          id: store.nextId++, member: ME, status: "yes", date: b.date, date_end: b.date_end ?? null,
          time_start: null, time_end: null, note: "", created_at: new Date().toISOString(), deleted_at: null,
        };
        store[key] = { ...store[key], slots: [...(store[key].slots ?? []), newSlot] };
        return newSlot as T;
      }
      throw new Error(`demo api: unhandled POST ${path}`);
    },

    put: async <T,>(path: string, body: unknown): Promise<T> => {
      let m: RegExpMatchArray | null;
      if ((m = path.match(OPTION_VOTE))) {
        const key = pollKeyById(store, Number(m[1]));
        const optId = Number(m[2]);
        const poll = store[key];
        const singleChoice = !poll.allow_multiple;
        const options = (poll.options ?? []).map((o) => {
          if (o.id === optId) return { ...o, voters: [...o.voters, voterRef(ME)], my_vote: true };
          if (singleChoice && o.voters.some((v) => v.id === ME.id)) {
            return { ...o, voters: o.voters.filter((v) => v.id !== ME.id), my_vote: false };
          }
          return o;
        });
        store[key] = { ...poll, options, voter_count: choiceVoterCount(options) };
        return store[key] as T;
      }
      if ((m = path.match(RSVPS))) {
        const b = body as { status: RSVP["status"]; comment: string };
        const existing = store.event.rsvps.find((r) => r.member.id === ME.id);
        const nextRsvp: RSVP = existing
          ? { ...existing, status: b.status, comment: b.comment, updated_at: new Date().toISOString() }
          : { id: store.nextId++, member: ME, status: b.status, comment: b.comment, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        store.event = {
          ...store.event,
          rsvps: existing ? store.event.rsvps.map((r) => (r.member.id === ME.id ? nextRsvp : r)) : [...store.event.rsvps, nextRsvp],
        };
        return store.event as T;
      }
      throw new Error(`demo api: unhandled PUT ${path}`);
    },

    patch: async <T,>(path: string, body: unknown): Promise<T> => {
      let m: RegExpMatchArray | null;
      if ((m = path.match(OPTIONS))) {
        const key = pollKeyById(store, Number(m[1]));
        const order = (body as { order: number[] }).order;
        const options = [...(store[key].options ?? [])].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        store[key] = { ...store[key], options };
        return store[key] as T;
      }
      if ((m = path.match(SLOT))) {
        const key = pollKeyById(store, Number(m[1]));
        const slotId = Number(m[2]);
        const b = body as { date: string; date_end: string };
        const slots = (store[key].slots ?? []).map((s) => (s.id === slotId ? { ...s, date: b.date, date_end: b.date_end } : s));
        store[key] = { ...store[key], slots };
        return slots.find((s) => s.id === slotId) as T;
      }
      throw new Error(`demo api: unhandled PATCH ${path}`);
    },

    del: async <T,>(path: string): Promise<T> => {
      let m: RegExpMatchArray | null;
      if ((m = path.match(OPTION_VOTE))) {
        const key = pollKeyById(store, Number(m[1]));
        const optId = Number(m[2]);
        const options = (store[key].options ?? []).map((o) =>
          o.id === optId ? { ...o, voters: o.voters.filter((v) => v.id !== ME.id), my_vote: false } : o,
        );
        store[key] = { ...store[key], options, voter_count: choiceVoterCount(options) };
        return store[key] as T;
      }
      if ((m = path.match(OPTION))) {
        const key = pollKeyById(store, Number(m[1]));
        const optId = Number(m[2]);
        const options = (store[key].options ?? []).map((o) =>
          o.id === optId ? { ...o, deleted_at: new Date().toISOString() } : o,
        );
        store[key] = { ...store[key], options, voter_count: choiceVoterCount(options) };
        return store[key] as T;
      }
      if ((m = path.match(SLOT))) {
        const key = pollKeyById(store, Number(m[1]));
        const slotId = Number(m[2]);
        store[key] = { ...store[key], slots: (store[key].slots ?? []).filter((s) => s.id !== slotId) };
        return null as T;
      }
      if ((m = path.match(RSVPS))) {
        store.event = { ...store.event, rsvps: store.event.rsvps.filter((r) => r.member.id !== ME.id) };
        return store.event as T;
      }
      throw new Error(`demo api: unhandled DELETE ${path}`);
    },
  };
}
