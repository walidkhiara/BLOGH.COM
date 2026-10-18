import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const C = {
  ink: "#0b0b0c",
  paper: "#ffffff",
  surface: "#f2f2f2",
  muted: "#6e6e73",
  border: "#e3e3e3",
  accent: "#d7ff3a",
};
export const HEAD = "'Archivo', sans-serif";
export const BODY = "'Inter', sans-serif";
export const EASE = Easing.bezier(0.65, 0, 0.35, 1);
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);

export const useSpring = (delay = 0, damping = 200, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping }, durationInFrames });
};

export const ramp = (frame: number, a: number, b: number, easing = OUT) =>
  interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/* Text that rises out of a mask. */
export const Rise: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties; dist?: number }> = ({
  delay = 0,
  children,
  style,
  dist = 110,
}) => {
  const p = useSpring(delay);
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ transform: `translateY(${(1 - p) * dist}%)` }}>{children}</div>
    </div>
  );
};

export const Fade: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties; y?: number }> = ({
  delay = 0,
  children,
  style,
  y = 24,
}) => {
  const p = useSpring(delay);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
};

/* Dark stage behind every scene: soft accent glow + slow drifting grid. */
export const Stage: React.FC<{ children?: React.ReactNode; light?: boolean }> = ({ children, light }) => {
  const frame = useCurrentFrame();
  const drift = frame * 0.35;
  return (
    <AbsoluteFill style={{ background: light ? "#f4f4f2" : C.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${light ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.045)"} 1px, transparent 1px), linear-gradient(90deg, ${
            light ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.045)"
          } 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `${drift}px ${drift * 0.6}px`,
          maskImage: "radial-gradient(ellipse at 60% 50%, black 20%, transparent 75%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: 900 + Math.sin(frame / 60) * 60,
          top: -200 + Math.cos(frame / 70) * 40,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(215,255,58,${light ? 0.22 : 0.13}) 0%, transparent 65%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/* Step caption on the left of browser scenes. */
export const Caption: React.FC<{ n: string; title: string; text: string }> = ({ n, title, text }) => {
  const line = useSpring(6);
  return (
    <div style={{ position: "absolute", left: 80, top: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Fade delay={0}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, letterSpacing: 4, color: C.accent, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-block", width: 10, height: 26, background: C.accent, transform: "skewX(-18deg)" }} />
          STEP {n}
        </div>
      </Fade>
      <div style={{ height: 3, width: 64 * line, background: "rgba(255,255,255,.25)", margin: "26px 0" }} />
      {title.split("\n").map((l, i) => (
        <Rise key={i} delay={4 + i * 4}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 70, lineHeight: 0.98, letterSpacing: -2, color: "#fff", textTransform: "uppercase" }}>
            {l}
          </div>
        </Rise>
      ))}
      <Fade delay={14}>
        <div style={{ fontFamily: BODY, fontSize: 24, lineHeight: 1.45, color: "rgba(255,255,255,.66)", marginTop: 28 }}>{text}</div>
      </Fade>
    </div>
  );
};

export const BW = 1280;
export const BH = 720;

/* Browser window. Children are laid out in a 1280x720 content box. */
export const Browser: React.FC<{ children: React.ReactNode; url?: string; enterDelay?: number; still?: boolean; cam?: { s: number; x: number; y: number } }> = ({
  children,
  url = "izaven.com",
  enterDelay = 0,
  still,
  cam = { s: 1, x: 0, y: 0 },
}) => {
  const frame = useCurrentFrame();
  const sp = useSpring(enterDelay, 26);
  const st = useSpring(enterDelay, 200, 40);
  const p = still ? 1 : sp;
  const settle = still ? 1 : st;
  const rotY = (1 - settle) * -14 + Math.sin(frame / 90) * 1.2;
  const rotX = (1 - settle) * 8 + Math.cos(frame / 110) * 0.8;
  return (
    <div style={{ position: "absolute", left: 560, top: 158, width: BW, height: BH + 44, perspective: 2400 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translateY(${(1 - p) * 120}px) scale(${0.92 + p * 0.08}) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
          opacity: Math.min(1, p * 1.5),
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 60px 140px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)",
        }}
      >
        <div style={{ height: 44, background: "#1a1a1c", display: "flex", alignItems: "center", padding: "0 18px", gap: 8 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
          ))}
          <div
            style={{
              marginLeft: 120,
              flex: 1,
              maxWidth: 760,
              height: 28,
              borderRadius: 8,
              background: "#2a2a2e",
              color: "rgba(255,255,255,.8)",
              fontFamily: BODY,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
            }}
          >
            <Lock /> {url}
          </div>
        </div>
        <div style={{ position: "relative", width: BW, height: BH, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export const Lock: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

/* Animated cursor. points: [frame, x, y] in browser-content coords. */
export const Cursor: React.FC<{ points: [number, number, number][]; clicks?: number[] }> = ({ points, clicks = [] }) => {
  const frame = useCurrentFrame();
  let x = points[0][1];
  let y = points[0][2];
  for (let i = 0; i < points.length - 1; i++) {
    const [f0, x0, y0] = points[i];
    const [f1, x1, y1] = points[i + 1];
    if (frame >= f0) {
      const t = interpolate(frame, [f0, f1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
      x = x0 + (x1 - x0) * t;
      y = y0 + (y1 - y0) * t;
    }
  }
  const visible = ramp(frame, points[0][0] - 10, points[0][0]);
  let press = 0;
  let ring = -1;
  for (const c of clicks) {
    const d = frame - c;
    if (d >= -4 && d < 6) press = Math.max(press, 1 - Math.abs(d) / 6);
    if (d >= 0 && d < 22) ring = d / 22;
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 50, opacity: visible, pointerEvents: "none" }}>
      {ring >= 0 && (
        <div
          style={{
            position: "absolute",
            left: -40 * Easing.out(Easing.cubic)(ring) - 4,
            top: -40 * Easing.out(Easing.cubic)(ring) - 4,
            width: 8 + 80 * Easing.out(Easing.cubic)(ring),
            height: 8 + 80 * Easing.out(Easing.cubic)(ring),
            borderRadius: "50%",
            border: `3px solid ${C.accent}`,
            opacity: 1 - ring,
            boxShadow: "0 0 0 1px rgba(0,0,0,.15)",
          }}
        />
      )}
      <svg width="30" height="36" viewBox="0 0 30 36" style={{ transform: `scale(${1 - press * 0.18})`, transformOrigin: "4px 4px", filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))" }}>
        <path d="M3 2 L3 29 L10 22 L15 33 L20 31 L15 20 L25 20 Z" fill="#0b0b0c" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* Stylised garment silhouettes (product photos aren't reachable from the render box). */
const PATHS: Record<string, string> = {
  tee: "M62 38 L84 28 Q100 44 116 28 L138 38 L178 72 L160 102 L146 92 L146 214 L54 214 L54 92 L40 102 L22 72 Z",
  tank: "M70 26 L84 26 Q100 64 116 26 L130 26 L134 70 Q150 92 148 120 L148 214 L52 214 L52 120 Q50 92 66 70 Z",
  rash: "M64 36 L84 26 Q100 40 116 26 L136 36 L184 150 L164 160 L144 104 L144 214 L56 214 L56 104 L36 160 L16 150 Z",
  leggings: "M64 18 L136 18 L146 222 L110 222 L100 86 L90 222 L54 222 Z",
  shorts: "M46 66 L154 66 L170 168 L110 174 L100 118 L90 174 L30 168 Z",
  bra: "M54 56 L76 24 L88 24 L100 64 L112 24 L124 24 L146 56 L150 142 L50 142 Z",
  hoodie: "M66 44 Q70 10 100 10 Q130 10 134 44 L182 82 L190 200 L164 204 L150 110 L148 216 L52 216 L50 110 L36 204 L10 200 L18 82 Z",
  shoe: "M18 152 Q24 116 62 110 L104 82 Q126 72 140 92 L178 120 Q196 134 188 160 L22 166 Z",
};

export const Garment: React.FC<{ kind: string; color: string; bg: string; style?: React.CSSProperties; detail?: string }> = ({ kind, color, bg, style, detail = "rgba(255,255,255,.18)" }) => (
  <div style={{ background: bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", ...style }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 35%, rgba(255,255,255,.55), transparent 60%)" }} />
    <svg viewBox="0 0 200 240" style={{ width: "62%", height: "62%", position: "relative", filter: "drop-shadow(0 18px 22px rgba(0,0,0,.22))" }}>
      <path d={PATHS[kind]} fill={color} />
      {kind === "shoe" && <path d="M22 166 L188 160 L186 172 Q100 182 22 176 Z" fill="#f4f4f4" />}
      {kind === "hoodie" && <path d="M100 44 L100 216" stroke={detail} strokeWidth="3" />}
      {kind === "leggings" && <path d="M64 30 L136 30" stroke={detail} strokeWidth="6" />}
      {(kind === "tee" || kind === "rash" || kind === "tank") && (
        <text x="100" y="120" textAnchor="middle" fontFamily="Archivo" fontWeight={900} fontSize="15" fill={detail} letterSpacing="2">
          IZAVEN
        </text>
      )}
    </svg>
  </div>
);

export type Product = { name: string; price: string; kind: string; color: string; bg: string; tag?: string };
export const PRODUCTS: Record<string, Product> = {
  leggings: { name: "Leggings", price: "$44.29", kind: "leggings", color: "#ff4f9a", bg: "#f6e6ee", tag: "NEW" },
  bra: { name: "Longline Sports Bra", price: "$68.74", kind: "bra", color: "#c9ab8c", bg: "#efe8e0" },
  shorts: { name: "Shorts", price: "$36.32", kind: "shorts", color: "#ff7fb6", bg: "#f7ebf1" },
  hoodie: { name: "Unisex Heavy Blend Zip Hoodie", price: "$49.41", kind: "hoodie", color: "#9a9ca1", bg: "#ececec" },
  wshoe: { name: "Women's Athletic Shoes", price: "$75.89", kind: "shoe", color: "#1b1b1d", bg: "#e9e9e7" },
  rash: { name: "Men's Rash Guard", price: "$63.91", kind: "rash", color: "#16171a", bg: "#e6e7e9" },
  mleggings: { name: "Men's Leggings", price: "$54.19", kind: "leggings", color: "#1d1e21", bg: "#e4e5e7" },
  tank: { name: "Men's Cotton Tank Top", price: "$30.55", kind: "tank", color: "#d9d4ca", bg: "#efede8" },
  mshoe: { name: "Men's Athletic Shoes", price: "$62.72", kind: "shoe", color: "#111", bg: "#e7e7e5" },
  longshorts: { name: "Men's Heavyweight Cotton Long Shorts", price: "$45.58", kind: "shorts", color: "#3b3d36", bg: "#e8e8e3" },
};

/* Store header used inside browser scenes. */
export const StoreHeader: React.FC<{ bag?: number; bump?: number; activeNav?: string }> = ({ bag = 0, bump = 0, activeNav }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 10 }}>
    <div style={{ height: 30, background: C.ink, color: "#fff", fontFamily: BODY, fontWeight: 600, fontSize: 11, letterSpacing: 1.6, display: "flex", alignItems: "center", justifyContent: "center" }}>
      MADE TO ORDER · 14-DAY RETURNS WITH A FREE RETURN LABEL
    </div>
    <div style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 32px" }}>
      <div style={{ display: "flex", gap: 28, flex: 1 }}>
        {["WOMEN", "MEN", "RUNNING", "TRAINING"].map((n) => (
          <span key={n} style={{ fontFamily: BODY, fontWeight: 700, fontSize: 13, letterSpacing: 1.2, color: C.ink, position: "relative", paddingBottom: 4 }}>
            {n}
            {activeNav === n && <span style={{ position: "absolute", left: 0, right: 0, bottom: -2, height: 2, background: C.ink }} />}
          </span>
        ))}
      </div>
      <Img src={staticFile("izaven-logo-black.png")} style={{ height: 26 }} />
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 22, alignItems: "center" }}>
        <Icon d="M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14zM16 16l5 5" />
        <Icon d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
        <div style={{ position: "relative" }}>
          <Icon d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2" />
          {bag > 0 && (
            <span
              style={{
                position: "absolute",
                right: -9,
                top: -7,
                width: 18,
                height: 18,
                borderRadius: 9,
                background: C.accent,
                color: C.ink,
                fontFamily: BODY,
                fontWeight: 800,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${1 + bump * 0.6})`,
              }}
            >
              {bag}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

export const Icon: React.FC<{ d: string; size?: number; color?: string; sw?: number }> = ({ d, size = 22, color = C.ink, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
