import { useState, useEffect } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

export type ChatBubble = {
  side: "sent" | "received";
  name?: string;       // shown under received bubbles
  lines: string[];
  isLink?: boolean;    // renders text as monospace link
};

export type Chat = { bubbles: ChatBubble[] };

// Add chats here. 2–5 bubbles each. isLink works on either side.
export const CHATS: Chat[] = [
  {
    bubbles: [
      { side: "received", name: "Alex",        lines: ["Sounds fun,", "let's plan!"] },
      { side: "sent",                           lines: ["On it!"] },
      { side: "sent",     isLink: true,         lines: ["small.management/activity/k3j9mw"] },
    ],
  },
  {
    bubbles: [
      { side: "received", name: "Sam",          lines: ["we're going to the Bahamas"] },
      { side: "sent",                           lines: ["what ???"] },
      { side: "received", name: "Frank Ocean",  lines: ["small.management/activity/h2a8dd"], isLink: true },
    ],
  },
  {
    bubbles: [
      { side: "sent",                           lines: ["Last night was fun ;)"] },
      { side: "sent",                           lines: ["We should meetup again"] },
      { side: "sent",     isLink: true,         lines: ["small.management/activity/k3j9mw"] },
      { side: "sent",                           lines: ["hello ?"] },
    ],
  },
  {
    bubbles: [
      { side: "received", name: "Mom",          lines: ["Your goldfish died yesterday"] },
      { side: "sent",                           lines: ["Nooo 😭"] },
      { side: "received", name: "Dad",          lines: ["small.management/activity/k3j9mw"], isLink: true },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function chatTime(offsetMinutes: number) {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// CSS keyframes bubble-1…bubble-5 are defined in index.css.
// Each owns the full 10 s cycle so they all loop in sync.
function bubbleAnim(idx: number) {
  return `bubble-${Math.min(idx + 1, 5)} 10s ease-in-out infinite`;
}

export default function ChatIllustration() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % CHATS.length), 10_000);
    return () => clearInterval(id);
  }, []);

  const { bubbles } = CHATS[i];

  return (
    <div className="flex items-center justify-center py-8 md:py-0 select-none" aria-hidden>
      <div style={{ animation: "chat-float 5s ease-in-out infinite" }}>
        <div
          key={i}
          className="flex flex-col gap-2 w-full max-w-[260px] [transform-style:preserve-3d]"
          style={{ transform: "perspective(700px) rotateY(-20deg) rotateX(20deg)" }}
        >
          {bubbles.map((b, idx) => (
            <Bubble key={idx} bubble={b} anim={bubbleAnim(idx)} timeOffset={bubbles.length - idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({ bubble: b, anim, timeOffset }: { bubble: ChatBubble; anim: string; timeOffset: number }) {
  const received = b.side === "received";
  const text = b.lines.join("\n");

  return (
    <div
      className={[
        "max-w-[86%] overflow-hidden px-4 py-2.5 rounded-2xl border shadow-sm",
        received
          ? "self-start bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-tl-sm shadow-md"
          : "self-end   bg-emerald-100 dark:bg-emerald-900 border-emerald-200 dark:border-emerald-800 rounded-br-sm",
      ].join(" ")}
      style={{ animation: anim }}
    >
      {b.isLink ? (
        <p className="text-[12px] font-mono text-blue-600 dark:text-blue-400 truncate">{text}</p>
      ) : (
        <p className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100 leading-snug whitespace-pre-line">{text}</p>
      )}
      <p className={`text-[11px] text-zinc-400 mt-1 ${received ? "" : "text-right"}`}>
        {received && b.name ? `${b.name} · ` : ""}{chatTime(timeOffset)}
      </p>
    </div>
  );
}
