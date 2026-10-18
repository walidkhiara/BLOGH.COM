import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BODY, C, HEAD } from "./ui";

/*
 * 9:16 campaign cut. 30 fps, 120 BPM: one beat = 15 frames; every cut sits on the grid
 * and the big moments (3.5s, 7s, 13.5s, 17.5s, 22s) line up with impacts in campaign-track.wav.
 * Copy only uses claims taken from the live product descriptions / store policy.
 */

const IN = Easing.bezier(0.7, 0, 0.84, 0);
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type ShotProps = {
  src: string;
  from: number; // seconds into the source clip
  pos?: string; // object-position for the 9:16 crop
  rate?: number;
  zoom?: [number, number]; // scale over the shot
  punch?: boolean; // quick scale-in on entry (smash zoom)
  dur: number;
  grade?: number; // 0..1 darkening for text legibility
};

const Shot: React.FC<ShotProps> = ({ src, from, pos = "50% 50%", rate = 1, zoom = [1.04, 1.12], punch, dur, grade = 0.25 }) => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, dur], zoom, { ...clamp, easing: Easing.bezier(0.33, 0, 0.67, 1) });
  const p = punch ? interpolate(frame, [0, 9], [1.14, 1], { ...clamp, easing: OUT }) : 1;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(src)}
        startFrom={Math.round(from * 30)}
        playbackRate={rate}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, transform: `scale(${z * p})` }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,${grade * 0.6}) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 50%, rgba(0,0,0,${grade * 2.2}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* Word-by-word mask reveal; exits upward at `out`. */
const Headline: React.FC<{
  lines: string[];
  delay?: number;
  stagger?: number;
  size?: number;
  out?: number;
  align?: "left" | "center";
  accentLast?: boolean;
}> = ({ lines, delay = 0, stagger = 4, size = 150, out, align = "left", accentLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start" }}>
      {lines.map((l, i) => {
        const s = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 200, stiffness: 180 } });
        const o = out === undefined ? 0 : interpolate(frame, [out + i * 2, out + 8 + i * 2], [0, 1], { ...clamp, easing: IN });
        const track = interpolate(s, [0, 1], [0.12, -0.02]);
        return (
          <div key={i} style={{ overflow: "hidden", padding: "0 6px", marginBottom: -size * 0.1 }}>
            <div
              style={{
                fontFamily: HEAD,
                fontWeight: 900,
                fontSize: size,
                lineHeight: 1,
                letterSpacing: `${track}em`,
                color: accentLast && i === lines.length - 1 ? C.accent : "#fff",
                textTransform: "uppercase",
                transform: `translateY(${(1 - s) * 105 - o * 105}%) skewY(${(1 - s) * 6}deg)`,
                textShadow: "0 6px 40px rgba(0,0,0,.35)",
                whiteSpace: "nowrap",
              }}
            >
              {l}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* Small product label chip with a lime slash. */
const Label: React.FC<{ text: string; delay?: number; out?: number; sub?: string }> = ({ text, delay = 0, out, sub }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [delay, delay + 12], [0, 1], { ...clamp, easing: OUT });
  const o = out === undefined ? 0 : interpolate(frame, [out, out + 8], [0, 1], { ...clamp, easing: IN });
  return (
    <div style={{ opacity: a * (1 - o), transform: `translateX(${(1 - a) * -30}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ width: 12, height: 40, background: C.accent, transform: "skewX(-18deg)" }} />
        <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: "#fff" }}>{text}</span>
      </div>
      {sub && <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: "rgba(255,255,255,.78)", marginTop: 14, marginLeft: 28 }}>{sub}</div>}
    </div>
  );
};

/* Diagonal lime slash that sweeps across a cut. */
const SlashWipe: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at - 8, at + 8], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  if (t <= 0 || t >= 1) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: -600,
          top: interpolate(t, [0, 1], [2400, -900]),
          width: 2400,
          height: 520,
          background: C.accent,
          transform: "rotate(-24deg)",
          boxShadow: "0 0 80px rgba(215,255,58,.4)",
        }}
      />
    </AbsoluteFill>
  );
};

/* Fast flash on hard cuts (subtle, 3 frames). */
const Flash: React.FC<{ at: number[] }> = ({ at }) => {
  const frame = useCurrentFrame();
  const v = Math.max(0, ...at.map((a) => (frame >= a && frame < a + 4 ? 1 - (frame - a) / 4 : 0)));
  return <AbsoluteFill style={{ background: "#fff", opacity: v * 0.22, pointerEvents: "none" }} />;
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.16 }}>
      <svg width="100%" height="100%">
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

const Pad = ({ children, bottom = 300, top }: { children: React.ReactNode; bottom?: number; top?: number }) => (
  <AbsoluteFill style={{ padding: "0 70px", justifyContent: top !== undefined ? "flex-start" : "flex-end", paddingBottom: bottom, paddingTop: top }}>
    {children}
  </AbsoluteFill>
);

/* Two promise cards that slide up over footage. */
const PromiseCards: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    ["MADE TO ORDER", "Printed for you. Nothing wasted."],
    ["14-DAY RETURNS", "Free return label included."],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {items.map(([h, s], i) => {
        const p = spring({ frame: frame - 18 - i * 10, fps, config: { damping: 200 } });
        return (
          <div
            key={h}
            style={{
              background: i === 0 ? C.accent : "rgba(11,11,12,.82)",
              border: i === 0 ? "none" : "1.5px solid rgba(255,255,255,.18)",
              padding: "34px 40px",
              opacity: p,
              transform: `translateY(${(1 - p) * 80}px)`,
              clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
            }}
          >
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, letterSpacing: -1, color: i === 0 ? C.ink : "#fff" }}>{h}</div>
            <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 32, marginTop: 8, color: i === 0 ? "rgba(11,11,12,.75)" : "rgba(255,255,255,.75)" }}>{s}</div>
          </div>
        );
      })}
    </div>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(frame, [4, 26], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const logoS = interpolate(frame, [0, 90], [1.08, 1], clamp);
  const btn = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const sub = spring({ frame: frame - 22, fps, config: { damping: 200 } });
  const outro = interpolate(frame, [78, 90], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", opacity: outro }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(215,255,58,.10), transparent 60%)" }} />
      <div style={{ clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`, transform: `scale(${logoS})` }}>
        {/* Supplied logo file, unaltered. */}
        <Img src={staticFile("izaven-logo-white.png")} style={{ width: 820 }} />
      </div>
      <div style={{ marginTop: 60, fontFamily: BODY, fontWeight: 600, fontSize: 34, letterSpacing: 10, color: "rgba(255,255,255,.75)", opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
        TRAINING APPAREL, MADE TO ORDER
      </div>
      <div
        style={{
          marginTop: 90,
          background: C.accent,
          color: C.ink,
          fontFamily: HEAD,
          fontWeight: 900,
          fontSize: 54,
          letterSpacing: 2,
          padding: "34px 64px",
          transform: `scale(${0.6 + btn * 0.4})`,
          opacity: Math.min(1, btn * 2),
        }}
      >
        SHOP IZAVEN.COM →
      </div>
    </AbsoluteFill>
  );
};

/* shot list: [start frame, duration, props] */
const SHOTS: [number, number, Omit<ShotProps, "dur">][] = [
  [0, 36, { src: "v-compression.mp4", from: 2.0, pos: "46% 50%", zoom: [1.25, 1.45], grade: 0.35 }],
  [36, 24, { src: "v-gym.mp4", from: 5.0, pos: "48% 50%", zoom: [1.35, 1.15], punch: true }],
  [60, 45, { src: "v-compression.mp4", from: 6.8, pos: "60% 50%", rate: 0.8, zoom: [1.05, 1.15], grade: 0.4 }],
  [105, 105, { src: "v-compression.mp4", from: 8.0, pos: "50% 40%", rate: 0.85, zoom: [1.0, 1.12], grade: 0.5 }],
  [210, 60, { src: "v-gym.mp4", from: 0.3, pos: "50% 50%", zoom: [1.12, 1.0], punch: true, grade: 0.45 }],
  [270, 45, { src: "v-compression.mp4", from: 4.0, pos: "48% 50%", zoom: [1.1, 1.2], grade: 0.45 }],
  [315, 45, { src: "v-women.mp4", from: 0.6, pos: "50% 50%", zoom: [1.0, 1.08], punch: true, grade: 0.45 }],
  [360, 45, { src: "v-women.mp4", from: 4.0, pos: "55% 50%", zoom: [1.05, 1.15], grade: 0.45 }],
  // montage
  [405, 15, { src: "v-campaign.mp4", from: 0.2, pos: "49% 50%", zoom: [1.2, 1.1], punch: true, grade: 0.4 }],
  [420, 15, { src: "v-campaign.mp4", from: 2.2, pos: "50% 50%", zoom: [1.15, 1.05], grade: 0.4 }],
  [435, 15, { src: "v-campaign.mp4", from: 18.0, pos: "50% 50%", zoom: [1.3, 1.15], grade: 0.4 }],
  [450, 15, { src: "v-campaign.mp4", from: 4.0, pos: "50% 50%", zoom: [1.15, 1.05], grade: 0.4 }],
  [465, 15, { src: "v-gym.mp4", from: 7.2, pos: "60% 50%", zoom: [1.1, 1.02], grade: 0.4 }],
  [480, 15, { src: "v-campaign.mp4", from: 20.0, pos: "50% 40%", zoom: [1.15, 1.05], grade: 0.4 }],
  [495, 30, { src: "v-campaign.mp4", from: 15.0, pos: "40% 50%", rate: 0.8, zoom: [1.1, 1.0], grade: 0.45 }],
  // purchase motivation
  [525, 90, { src: "v-women.mp4", from: 8.0, pos: "50% 50%", zoom: [1.12, 1.0], grade: 0.55 }],
  [615, 45, { src: "v-gym.mp4", from: 9.0, pos: "44% 50%", zoom: [1.0, 1.1], punch: true, grade: 0.55 }],
];

export const CAMPAIGN_FRAMES = 750;

export const Campaign: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Audio src={staticFile("campaign-track.wav")} />
    {SHOTS.map(([s, d, p]) => (
      <Sequence key={s} from={s} durationInFrames={d} premountFor={30}>
        <Shot {...p} dur={d} />
      </Sequence>
    ))}

    {/* 0–3.5s HOOK */}
    <Sequence from={0} durationInFrames={60}>
      <Pad bottom={380}>
        <Headline lines={["Built", "for your", "next rep."]} delay={2} stagger={7} size={168} out={50} accentLast />
      </Pad>
    </Sequence>
    <Sequence from={60} durationInFrames={45}>
      <Pad bottom={330}>
        <Headline lines={["Designed", "to move", "with you."]} delay={0} stagger={4} size={150} out={37} />
      </Pad>
    </Sequence>

    {/* 3.5–7s PRODUCT REVEAL */}
    <Sequence from={105} durationInFrames={105}>
      <Pad top={260}>
        <RevealLogo />
      </Pad>
      <Pad bottom={330}>
        <Headline lines={["Performance", "sportswear."]} delay={14} stagger={5} size={108} out={95} />
        <div style={{ height: 40 }} />
        <Label text="FOR MEN & WOMEN" sub="Compression · Leggings · Sports bras · Hoodies" delay={30} out={92} />
      </Pad>
    </Sequence>

    {/* 7–13.5s BENEFITS */}
    <Sequence from={210} durationInFrames={60}>
      <Pad bottom={330}>
        <Label text="RASH GUARD" delay={4} out={52} />
        <div style={{ height: 34 }} />
        <Headline lines={["Four-way", "stretch."]} delay={6} size={160} out={50} />
      </Pad>
    </Sequence>
    <Sequence from={270} durationInFrames={45}>
      <Pad bottom={330}>
        <Headline lines={["Second", "skin."]} delay={0} size={190} out={37} accentLast />
      </Pad>
    </Sequence>
    <Sequence from={315} durationInFrames={45}>
      <Pad bottom={330}>
        <Label text="LEGGINGS" delay={2} out={37} />
        <div style={{ height: 34 }} />
        <Headline lines={["Sculpted.", "Smooth."]} delay={3} size={160} out={37} />
      </Pad>
    </Sequence>
    <Sequence from={360} durationInFrames={45}>
      <Pad bottom={330}>
        <Label text="LONGLINE SPORTS BRA" delay={2} out={37} />
        <div style={{ height: 34 }} />
        <Headline lines={["Lock in.", "Lift heavy."]} delay={3} size={150} out={37} accentLast />
      </Pad>
    </Sequence>

    {/* 13.5–17.5s BRAND MONTAGE */}
    <Sequence from={405} durationInFrames={60}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Headline lines={["Your", "training."]} delay={0} stagger={5} size={150} out={52} align="center" />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={465} durationInFrames={60}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Headline lines={["Your", "standard."]} delay={0} stagger={5} size={142} out={52} align="center" accentLast />
      </AbsoluteFill>
    </Sequence>

    {/* 17.5–22s PURCHASE MOTIVATION */}
    <Sequence from={525} durationInFrames={90}>
      <Pad bottom={320}>
        <PromiseCards />
      </Pad>
    </Sequence>
    <Sequence from={615} durationInFrames={45}>
      <Pad bottom={330}>
        <Headline lines={["Find your next", "training", "essential."]} delay={0} stagger={4} size={100} out={40} accentLast />
      </Pad>
    </Sequence>

    {/* 22–25s CTA */}
    <Sequence from={660} durationInFrames={90}>
      <EndCard />
    </Sequence>

    <SlashWipe at={105} />
    <SlashWipe at={525} />
    <Flash at={[36, 60, 210, 270, 315, 360, 405, 420, 435, 450, 465, 480, 495, 615]} />
    <Grain />
    <AbsoluteFill style={{ pointerEvents: "none", boxShadow: "inset 0 0 260px rgba(0,0,0,.55)" }} />
  </AbsoluteFill>
);

const RevealLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [6, 26], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const o = interpolate(frame, [92, 102], [1, 0], clamp);
  return (
    <div style={{ clipPath: `inset(0 ${(1 - w) * 100}% 0 0)`, opacity: o, alignSelf: "center" }}>
      <Img src={staticFile("izaven-logo-white.png")} style={{ width: 560 }} />
    </div>
  );
};
