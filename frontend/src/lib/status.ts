// Shared yes/maybe/no styling — poll slots, proposal votes, editor pills.
export type VoteStatus = "yes" | "maybe" | "no";

export const STATUS_ICON: Record<VoteStatus, string> = {
  yes: "✓",
  maybe: "~",
  no: "✗",
};

export const STATUS_TEXT: Record<VoteStatus, string> = {
  yes: "text-green-600 dark:text-green-400",
  maybe: "text-yellow-600 dark:text-yellow-400",
  no: "text-red-500 dark:text-red-400",
};

// Selected pill / chip style
export const STATUS_CHIP: Record<VoteStatus, string> = {
  yes: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  maybe: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  no: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};
