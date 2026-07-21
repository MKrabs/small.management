// Run: node frontend/src/components/poll/monthBars.selfcheck.ts
import assert from "node:assert";
import { monthWeeks, splitRangeByWeek, maxLaneIndexPerRow, rowHeightPx, packLanes, BASE_ROW_PX, BAR_PX, BAR_GAP_PX } from "./monthBars.ts";

// July 2026: 1st is a Wednesday -> 2 leading blanks, 31 days -> 5 weeks, padded to 5*7=35
const july2026 = new Date(2026, 6, 1);
const weeks = monthWeeks(july2026);
assert.equal(weeks.length, 5, "July 2026 should lay out in 5 week-rows");
assert.equal(weeks[0].filter((d) => d === null).length, 2, "2 leading blanks before Wed Jul 1");
assert.equal(weeks[0][2]?.getDate(), 1, "first real day lands at column index 2 (Wed)");

// 2026-07-04 is a Saturday, 2026-07-05 is a Sunday, 2026-07-06 is a Monday
const segs = splitRangeByWeek(weeks, "2026-07-04", "2026-07-08");
assert.equal(segs.length, 2, "range crossing Sat->Mon splits into 2 week-row segments");
assert.equal(segs[0].endCol, 7, "first segment ends at Sunday (col 7)");
assert.equal(segs[0].roundedEnd, false, "first segment's end is a mid-range wrap, not the true end");
assert.equal(segs[0].roundedStart, true, "first segment's start is the true start (Sat)");
assert.equal(segs[1].startCol, 1, "second segment starts at Monday (col 1)");
assert.equal(segs[1].roundedStart, false, "second segment's start is a mid-range wrap, not the true start");
assert.equal(segs[1].roundedEnd, true, "second segment's end is the true end");
assert.ok(segs[1].weekRow === segs[0].weekRow + 1, "segments land in adjacent week-rows");

// A range fully inside one week -> one segment, both ends true
const single = splitRangeByWeek(weeks, "2026-07-06", "2026-07-08");
assert.equal(single.length, 1);
assert.equal(single[0].roundedStart, true);
assert.equal(single[0].roundedEnd, true);

// Row heights
assert.equal(rowHeightPx(-1), BASE_ROW_PX, "no bars that week floors to the default row height");
assert.equal(rowHeightPx(0), BASE_ROW_PX + (BAR_PX + BAR_GAP_PX), "one lane adds exactly one bar slot");
assert.ok(rowHeightPx(1) > rowHeightPx(0), "row height increases monotonically per lane");

// maxLaneIndexPerRow picks the max lane touching a row, not the count
const maxLanes = maxLaneIndexPerRow(3, [
  { weekRow: 0, lane: 0 },
  { weekRow: 0, lane: 3 },
  { weekRow: 1, lane: 1 },
]);
assert.deepEqual(maxLanes, [3, 1, -1]);

// packLanes: two overlapping ranges (even from the same "owner", which this
// function doesn't know or care about) must land in different lanes —
// otherwise their fills paint over each other and read as one merged bar
const overlapping = packLanes([
  { key: "a", startDate: "2026-07-01", endDate: "2026-07-08" },
  { key: "b", startDate: "2026-07-03", endDate: "2026-07-10" },
]);
assert.notEqual(overlapping.get("a"), overlapping.get("b"), "overlapping ranges must get different lanes");

// two non-overlapping (even directly adjacent) ranges should share a lane
// instead of wasting a second one
const adjacent = packLanes([
  { key: "a", startDate: "2026-07-01", endDate: "2026-07-05" },
  { key: "b", startDate: "2026-07-06", endDate: "2026-07-10" },
]);
assert.equal(adjacent.get("a"), adjacent.get("b"), "adjacent non-overlapping ranges should reuse the same lane");
assert.equal(adjacent.get("a"), 0);

// three mutually overlapping ranges need three distinct lanes
const triple = packLanes([
  { key: "a", startDate: "2026-07-01", endDate: "2026-07-10" },
  { key: "b", startDate: "2026-07-02", endDate: "2026-07-09" },
  { key: "c", startDate: "2026-07-03", endDate: "2026-07-08" },
]);
assert.equal(new Set([triple.get("a"), triple.get("b"), triple.get("c")]).size, 3);

console.log("monthBars self-check: all assertions passed");
