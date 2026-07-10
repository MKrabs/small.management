export type AvatarShape = "circle" | "square" | "trapezoid" | "cloud" | "heart" | "diamond";

export type PaletteToken =
  | "red" | "orange" | "amber" | "lime" | "green"
  | "teal" | "sky" | "blue" | "violet" | "pink";

export type AvatarConfig = {
  /** Characters shown in the avatar; "" = use name initials. */
  chars: string;
  bg: PaletteToken;
  border: PaletteToken;
  name_color: PaletteToken;
  shape: AvatarShape;
  /** Degrees, 0–345 in steps of 15. Applied to the shape only. */
  rotation: number;
};

export type User = {
  id: string;
  display_name: string;
  avatar: AvatarConfig | null;
  created_at: string;
};

export type Member = {
  id: string;
  display_name: string;
  is_anonymous: boolean;
  avatar: AvatarConfig | null;
  joined_at: string;
};

export type Activity = {
  id: string;
  short_id: string;
  title: string;
  slug: string;
  has_pin: boolean;
  /** Plaintext PIN — members only, null for outsiders or pre-plaintext PINs. */
  pin: string | null;
  member_count: number;
  is_member: boolean;
  me: Member | null;
  created_at: string;
  archived_at: string | null;
};

export type Cycle = {
  id: number;
  name: string;
  created_by: Member | null;
  created_at: string;
  archived_at: string | null;
};

export type Log = {
  id: number;
  member: Member | null;
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type Comment = {
  id: number;
  member: Member | null;
  body: string;
  parent_id: number | null;
  poll_id: number | null;
  event_id: number | null;
  reply_count: number;
  created_at: string;
  deleted_at: string | null;
};

export type PollKind = "choice" | "date" | "datetime" | "range";

export type PollOption = {
  id: number;
  label: string;
  created_by: Member | null;
  voters: { id: string; display_name: string; avatar: AvatarConfig | null }[];
  my_vote: boolean;
  created_at: string;
  deleted_at: string | null;
};

export type Poll = {
  id: number;
  cycle_id: number | null;
  kind: PollKind;
  allow_multiple: boolean;
  title: string;
  created_by: Member | null;
  voter_count: number;
  /** Requesting member's own participation — date-based kinds only. */
  my_vote: { voted: boolean; has_date: boolean; has_time: boolean } | null;
  /** Choice polls only. */
  options: PollOption[] | null;
  /** Date/range polls only — everyone's votes, for the feed-card calendar. */
  slots: Slot[] | null;
  comment_count: number;
  /** Newest top-level comments, oldest first. */
  latest_comments: Comment[];
  created_at: string;
  deleted_at: string | null;
  /** Voting finished (reversible). */
  locked_at: string | null;
};

export type Slot = {
  id: number;
  member: Member;
  status: "yes" | "maybe" | "no";
  date: string | null;
  /** Range polls: inclusive end of a from–to vote. */
  date_end: string | null;
  time_start: string | null;
  time_end: string | null;
  note: string;
  created_at: string;
  deleted_at: string | null;
};

export type RSVP = {
  id: number;
  member: Member;
  status: "going" | "maybe" | "not_going";
  comment: string;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: number;
  cycle_id: number | null;
  poll_id: number | null;
  date: string;
  time_start: string | null;
  time_end: string | null;
  note: string;
  created_by: Member | null;
  rsvps: RSVP[];
  comment_count: number;
  /** Newest comments (replies included), oldest first. */
  latest_comments: Comment[];
  created_at: string;
  deleted_at: string | null;
};

export type FeedItem =
  | { type: "cycle"; created_at: string; data: Cycle }
  | { type: "poll"; created_at: string; data: Poll }
  | { type: "event"; created_at: string; data: Event }
  | { type: "comment"; created_at: string; data: Comment }
  | { type: "log"; created_at: string; data: Log };
