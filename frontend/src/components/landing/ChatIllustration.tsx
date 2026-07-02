import { useState, useEffect } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

export type ChatBubble = {
  side: "sent" | "received";
  name?: string;
  lines: string[];
  isLink?: boolean;
};

export type Chat = { bubbles: ChatBubble[] };

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

const NAME_COLORS = [
  "text-blue-500", "text-violet-500", "text-rose-500",
  "text-emerald-500", "text-amber-500", "text-cyan-500",
];

function nameColor(name: string) {
  const hash = name.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  return NAME_COLORS[hash % NAME_COLORS.length];
}

function chatTime(offsetMinutes: number) {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatIllustration() {
  const [scenario, setScenario] = useState(0);
  const [shown, setShown] = useState(0);

  // Advance scenario every 10s
  useEffect(() => {
    const id = setInterval(() => setScenario((n) => (n + 1) % CHATS.length), 10_000);
    return () => clearInterval(id);
  }, []);

  // When scenario changes, reveal bubbles one by one
  useEffect(() => {
    setShown(0);
    const { bubbles } = CHATS[scenario];
    const ids = bubbles.map((_, i) =>
      window.setTimeout(() => setShown(i + 1), i * 1600 + 500)
    );
    return () => ids.forEach(window.clearTimeout);
  }, [scenario]);

  const { bubbles } = CHATS[scenario];

  return (
    <div className="flex items-center justify-center py-8 md:py-0 select-none" aria-hidden>
      {/* overflow:hidden here clips the 3D child from the top when content is tall */}
      <div
        style={{
          animation: "chat-float 5s ease-in-out infinite",
          position: "relative",
          height: "220px",
          width: "min(80vw, 300px)",
        }}
      >
        {/* absolute bottom:0 anchors to bottom and grows upward freely — no squishing */}
        <div
          key={scenario}
          className="flex flex-col gap-2 [transform-style:preserve-3d]"
          style={{
            transform: "perspective(700px) rotateY(-20deg) rotateX(20deg)",
            transformOrigin: "bottom center",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {bubbles.slice(0, shown).map((b, idx) => (
            <Bubble key={`${scenario}-${idx}`} bubble={b} timeOffset={shown - idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({ bubble: b, timeOffset }: { bubble: ChatBubble; timeOffset: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(id);
  }, []);

  const received = b.side === "received";
  const text = b.lines.join("\n");

  // Wrapper expands max-height 0→160px — flex siblings glide up as layout reflows
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        maxHeight: visible ? "160px" : "0px",
        opacity: visible ? 1 : 0,
        transition: "max-height 0.5s ease, opacity 0.4s ease",
      }}
    >
      <div
        className={[
          "max-w-[86%] px-4 py-2.5 rounded-2xl border shadow-sm",
          received
            ? "self-start bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-tl-sm shadow-md"
            : "self-end bg-emerald-100 dark:bg-emerald-900 border-emerald-200 dark:border-emerald-800 rounded-br-sm",
        ].join(" ")}
      >
        {b.isLink ? (
          <p className="text-[12px] font-mono text-blue-600 dark:text-blue-400 truncate">{text}</p>
        ) : (
          <p className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100 leading-snug whitespace-pre-line">{text}</p>
        )}
        <p className={`text-[11px] text-zinc-400 mt-1 ${received ? "" : "text-right"}`}>
          {received && b.name && (
            <span className={`font-medium ${nameColor(b.name)}`}>{b.name} · </span>
          )}
          {chatTime(timeOffset)}
        </p>
      </div>
    </div>
  );
}
