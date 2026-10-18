import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BODY,
  Browser,
  C,
  Caption,
  Cursor,
  EASE,
  Fade,
  Garment,
  HEAD,
  Icon,
  Lock,
  PRODUCTS,
  ramp,
  Rise,
  Stage,
  StoreHeader,
  useSpring,
} from "./ui";

/* ---------- 1. Logo intro ---------- */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const slash = ramp(frame, 4, 34, EASE);
  const wipe = ramp(frame, 22, 58, EASE);
  const tag = useSpring(56);
  const zoom = interpolate(frame, [0, 130], [1.08, 1]);
  return (
    <Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
        {/* accent slash sweeping across */}
        <div
          style={{
            position: "absolute",
            width: 2600,
            height: 160,
            background: C.accent,
            transform: `rotate(-12deg) translateX(${interpolate(slash, [0, 1], [-2600, 0])}px) scaleY(${1 - wipe * 0.97})`,
            opacity: 1 - wipe * 0.4,
          }}
        />
        <div style={{ position: "relative", clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
          <Img src={staticFile("izaven-logo-white.png")} style={{ width: 760 }} />
        </div>
        <div style={{ position: "absolute", top: 640, display: "flex", gap: 18, alignItems: "center", opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>
          <span style={{ width: 40 * tag, height: 2, background: C.accent }} />
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, letterSpacing: 8, color: "rgba(255,255,255,.8)" }}>TRAINING APPAREL, MADE TO ORDER</span>
          <span style={{ width: 40 * tag, height: 2, background: C.accent }} />
        </div>
        <div style={{ position: "absolute", bottom: 90, fontFamily: BODY, fontSize: 22, letterSpacing: 6, color: "rgba(255,255,255,.4)", opacity: ramp(frame, 80, 100) }}>
          HOW TO SHOP IZAVEN.COM
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ---------- 2. Homepage + menu ---------- */
export const Home: React.FC = () => {
  const frame = useCurrentFrame();
  const menu = useSpring(118, 22);
  const camT = ramp(frame, 100, 150, EASE);
  const cam = { s: 1 + camT * 0.25, x: -camT * 20, y: -camT * 10 };
  const scrim = ramp(frame, 118, 135);
  return (
    <Stage>
      <Caption n="01" title={"Start on\nthe homepage"} text="Pick Women or Men from the menu — or jump straight into Running and Training." />
      <Browser enterDelay={4} cam={cam}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <StoreHeader activeNav={frame > 112 ? "WOMEN" : undefined} />
          {/* Hero */}
          <div style={{ position: "absolute", top: 94, left: 0, right: 0, bottom: 0, background: "linear-gradient(120deg,#1b1c1f 0%,#3a3b3f 55%,#26272a 100%)", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -60, top: 30, width: 640, height: 640, display: "flex", gap: 20, transform: `translateX(${interpolate(frame, [0, 210], [40, -30])}px)` }}>
              <Garment {...PRODUCTS.leggings} style={{ width: 300, height: 420, borderRadius: 4, marginTop: 60 }} />
              <Garment {...PRODUCTS.rash} style={{ width: 300, height: 420, borderRadius: 4 }} />
            </div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.65) 30%, transparent 75%)" }} />
            <div style={{ position: "absolute", left: 56, top: 140 }}>
              <Fade delay={20}>
                <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 13, letterSpacing: 2.4, color: "#fff", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ width: 5, height: 14, background: C.accent, transform: "skewX(-18deg)" }} /> NEW SEASON
                </div>
              </Fade>
              {["TRAIN IN IT.", "LIFT IN IT."].map((l, i) => (
                <Rise key={l} delay={24 + i * 6}>
                  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, lineHeight: 0.95, letterSpacing: -3, color: "#fff", marginTop: i ? 0 : 16 }}>{l}</div>
                </Rise>
              ))}
              <Fade delay={38}>
                <div style={{ fontFamily: BODY, fontSize: 18, color: "rgba(255,255,255,.8)", marginTop: 22, maxWidth: 420, lineHeight: 1.5 }}>
                  Performance training wear, printed for you. Nothing wasted.
                </div>
              </Fade>
              <Fade delay={46}>
                <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
                  <div style={{ background: "#fff", color: C.ink, fontFamily: BODY, fontWeight: 700, fontSize: 13, letterSpacing: 1.4, padding: "16px 28px" }}>SHOP WOMEN →</div>
                  <div style={{ border: "1.5px solid #fff", color: "#fff", fontFamily: BODY, fontWeight: 700, fontSize: 13, letterSpacing: 1.4, padding: "16px 28px" }}>SHOP MEN</div>
                </div>
              </Fade>
            </div>
          </div>
          {/* Mega menu */}
          <div style={{ position: "absolute", top: 94, left: 0, right: 0, bottom: 0, background: `rgba(0,0,0,${scrim * 0.35})` }} />
          <div
            style={{
              position: "absolute",
              top: 94,
              left: 0,
              right: 0,
              height: 300,
              background: "#fff",
              borderBottom: `1px solid ${C.border}`,
              clipPath: `inset(0 0 ${(1 - menu) * 100}% 0)`,
              display: "flex",
              padding: "34px 32px",
              gap: 70,
            }}
          >
            {[
              ["SHOP WOMEN", ["Leggings", "Tops", "Shorts", "Shoes", "Hoodies"]],
              ["BY ACTIVITY", ["Training", "Running", "New arrivals", "Featured"]],
            ].map(([h, items], ci) => (
              <div key={h as string} style={{ opacity: ramp(frame, 128 + ci * 5, 145 + ci * 5), transform: `translateY(${(1 - ramp(frame, 128 + ci * 5, 145 + ci * 5)) * 12}px)` }}>
                <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 12, letterSpacing: 1.6, color: C.muted, marginBottom: 18 }}>{h}</div>
                {(items as string[]).map((it) => (
                  <div
                    key={it}
                    style={{
                      fontFamily: BODY,
                      fontWeight: it === "Leggings" && frame > 165 ? 700 : 500,
                      fontSize: 17,
                      color: C.ink,
                      marginBottom: 12,
                      textDecoration: it === "Leggings" && frame > 165 ? "underline" : "none",
                      textUnderlineOffset: 5,
                    }}
                  >
                    {it}
                  </div>
                ))}
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 16, opacity: ramp(frame, 138, 158) }}>
              {[PRODUCTS.bra, PRODUCTS.leggings].map((p) => (
                <div key={p.name}>
                  <Garment {...p} style={{ width: 190, height: 190 }} />
                  <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 12, letterSpacing: 1.2, marginTop: 10 }}>{p.name.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
          <Cursor
            points={[
              [60, 800, 600],
              [104, 52, 66],
              [150, 52, 66],
              [178, 70, 166],
              [215, 70, 166],
            ]}
            clicks={[184]}
          />
        </AbsoluteFill>
      </Browser>
    </Stage>
  );
};

/* ---------- 3. Catalog ---------- */
const GRID = ["leggings", "bra", "shorts", "hoodie", "wshoe", "mleggings", "rash", "tank"] as const;
const FILTERS = ["All", "Leggings", "Tops", "Shorts", "Shoes"];

export const Catalog: React.FC = () => {
  const frame = useCurrentFrame();
  const scroll = interpolate(frame, [70, 150], [0, -250], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const pill = interpolate(frame, [40, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const pillX = [32, 102];
  const pillW = [58, 100];
  const hoverT = ramp(frame, 158, 172);
  const camT = ramp(frame, 160, 210, EASE);
  return (
    <Stage>
      <Caption n="02" title={"Browse the\ncatalog"} text="Every collection has filters for category, size and colour. Tap a product to see it up close." />
      <Browser still url="izaven.com/collections/women" cam={{ s: 1 + camT * 0.12, x: -camT * 20, y: -camT * 40 }}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <StoreHeader activeNav="WOMEN" />
          <div style={{ position: "absolute", top: 94, left: 0, right: 0, transform: `translateY(${scroll}px)` }}>
            <div style={{ padding: "34px 32px 0" }}>
              <Fade delay={2}>
                <div style={{ fontFamily: BODY, fontSize: 13, color: C.muted }}>Home / Women</div>
              </Fade>
              <Rise delay={6}>
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, letterSpacing: -2, color: C.ink, marginTop: 8 }}>WOMEN</div>
              </Rise>
              <div style={{ display: "flex", alignItems: "center", marginTop: 20, position: "relative", height: 40 }}>
                <div
                  style={{
                    position: "absolute",
                    left: interpolate(pill, [0, 1], [0, pillX[1] - pillX[0]]),
                    width: interpolate(pill, [0, 1], pillW),
                    height: 36,
                    borderRadius: 18,
                    background: C.ink,
                    opacity: ramp(frame, 14, 26),
                  }}
                />
                {FILTERS.map((f, i) => (
                  <div
                    key={f}
                    style={{
                      position: "relative",
                      padding: "0 18px",
                      height: 36,
                      lineHeight: "36px",
                      fontFamily: BODY,
                      fontWeight: 600,
                      fontSize: 14,
                      color: (i === 0 && pill < 0.5) || (i === 1 && pill >= 0.5) ? "#fff" : C.ink,
                      opacity: ramp(frame, 14 + i * 3, 28 + i * 3),
                    }}
                  >
                    {f}
                  </div>
                ))}
                <div style={{ marginLeft: "auto", fontFamily: BODY, fontWeight: 600, fontSize: 14, display: "flex", gap: 8, alignItems: "center", opacity: ramp(frame, 26, 40) }}>
                  <Icon d="M4 6h16M7 12h10M10 18h4" size={18} /> Filter & sort
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "22px 32px" }}>
              {GRID.map((k, i) => {
                const p = PRODUCTS[k];
                const dimmed = pill > 0.5 && p.kind !== "leggings" ? 0.25 * ramp(frame, 50, 64) : 0;
                const enter = ramp(frame, 18 + i * 4, 46 + i * 4);
                const hover = i === 0 ? hoverT : 0;
                return (
                  <div key={k} style={{ opacity: enter * (1 - dimmed), transform: `translateY(${(1 - enter) * 50}px)` }}>
                    <div style={{ position: "relative", overflow: "hidden" }}>
                      <Garment {...p} style={{ height: 340, transform: `scale(${1 + hover * 0.06})` }} />
                      {p.tag && (
                        <span style={{ position: "absolute", left: 10, top: 10, background: C.accent, fontFamily: BODY, fontWeight: 800, fontSize: 11, letterSpacing: 1.2, padding: "4px 8px" }}>
                          {p.tag}
                        </span>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          left: 10,
                          right: 10,
                          bottom: 10,
                          background: "#fff",
                          fontFamily: BODY,
                          fontWeight: 700,
                          fontSize: 12,
                          letterSpacing: 1.2,
                          textAlign: "center",
                          padding: "11px 0",
                          transform: `translateY(${(1 - hover) * 60}px)`,
                        }}
                      >
                        QUICK ADD +
                      </div>
                    </div>
                    <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, color: C.ink, marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontFamily: BODY, fontSize: 14, color: C.muted, marginTop: 3 }}>{p.price}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <Cursor
            points={[
              [10, 700, 600],
              [36, 150, 228],
              [60, 150, 228],
              [150, 170, 430],
              [176, 170, 430],
            ]}
            clicks={[44, 186]}
          />
        </AbsoluteFill>
      </Browser>
    </Stage>
  );
};

/* ---------- 4. Product page ---------- */
const SIZES = ["XS", "S", "M", "L", "XL"];
export const ProductPage: React.FC<{ drawer?: boolean }> = ({ drawer }) => {
  const frame = useCurrentFrame();
  const f = drawer ? 999 : frame;
  const p = PRODUCTS.leggings;
  const sizePick = ramp(f, 88, 100, EASE);
  const added = ramp(f, 170, 182, EASE);
  const bump = drawer ? 0 : Math.max(0, 1 - Math.abs(frame - 186) / 8);
  const thumb = Math.floor(interpolate(f, [20, 70], [0, 2.99], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const galleryShift = interpolate(f, [20, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <StoreHeader activeNav="WOMEN" bag={added > 0.5 ? 1 : 0} bump={bump} />
      <div style={{ position: "absolute", top: 94, left: 0, bottom: 0, width: 640, display: "flex", gap: 10, padding: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Garment
              key={i}
              {...p}
              color={i === 2 ? "#1d1e21" : p.color}
              bg={i === 2 ? "#e4e5e7" : p.bg}
              style={{ width: 84, height: 106, outline: thumb === i ? `2px solid ${C.ink}` : "none", outlineOffset: -2 }}
            />
          ))}
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <Garment {...p} style={{ position: "absolute", inset: 0, transform: `scale(${1.04 - galleryShift * 0.04})` }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 94, left: 680, right: 40, paddingTop: 34 }}>
        <Fade delay={drawer ? -99 : 4}>
          <div style={{ fontFamily: BODY, fontSize: 13, color: C.muted }}>Home / Women / Leggings</div>
        </Fade>
        <Rise delay={drawer ? -99 : 8}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, letterSpacing: -1.5, color: C.ink, marginTop: 8 }}>LEGGINGS</div>
        </Rise>
        <Fade delay={drawer ? -99 : 14}>
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 22, marginTop: 6 }}>{p.price}</div>
        </Fade>
        <Fade delay={drawer ? -99 : 24}>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 13, letterSpacing: 1.4, marginTop: 30 }}>
            SIZE <span style={{ color: C.muted, fontWeight: 500 }}>{sizePick > 0.5 ? "M" : "Select a size"}</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {SIZES.map((s) => {
              const on = s === "M" ? sizePick : 0;
              return (
                <div
                  key={s}
                  style={{
                    width: 72,
                    height: 50,
                    border: `1.5px solid ${on > 0 ? C.ink : C.border}`,
                    position: "relative",
                    overflow: "hidden",
                    fontFamily: BODY,
                    fontWeight: 700,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: on > 0.5 ? "#fff" : C.ink,
                  }}
                >
                  <div style={{ position: "absolute", inset: 0, background: C.ink, transform: `scaleY(${on})`, transformOrigin: "bottom" }} />
                  <span style={{ position: "relative" }}>{s}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: BODY, fontSize: 13, color: C.ink, marginTop: 12, textDecoration: "underline", textUnderlineOffset: 4 }}>Size guide</div>
        </Fade>
        <Fade delay={drawer ? -99 : 32}>
          <div style={{ marginTop: 26, height: 58, background: added > 0 ? C.accent : C.ink, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: C.ink, transform: `translateX(${added * 101}%)` }} />
            <span style={{ position: "relative", fontFamily: BODY, fontWeight: 800, fontSize: 15, letterSpacing: 1.6, color: added > 0.5 ? C.ink : "#fff" }}>
              {added > 0.5 ? "✓  ADDED TO BAG" : "ADD TO BAG"}
            </span>
          </div>
        </Fade>
        <div style={{ marginTop: 22, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "14px 0", display: "grid", gap: 12 }}>
          {[
            ["M3 7h11v9H3zM14 10h4l3 3v3h-7", "Made to order · delivery in 5–7 business days"],
            ["M4 9h11a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4", "14-day returns with a free return label"],
            ["M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2", "See the fit notes in the description"],
          ].map(([d, t], i) => (
            <Fade key={t} delay={drawer ? -99 : 40 + i * 5} y={10}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: BODY, fontSize: 14, color: C.ink }}>
                <Icon d={d} size={20} /> {t}
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Product: React.FC = () => {
  const frame = useCurrentFrame();
  const z1 = ramp(frame, 60, 100, EASE) - ramp(frame, 120, 150, EASE);
  const z2 = ramp(frame, 130, 160, EASE);
  const cam = { s: 1 + z1 * 0.28 + z2 * 0.12, x: -z1 * 230 - z2 * 120, y: -z1 * 120 - z2 * 60 };
  return (
    <Stage>
      <Caption n="03" title={"Choose your\nsize & add"} text="Check the size guide, pick your size and add it to your bag. The bag icon updates instantly." />
      <Browser still url="izaven.com/products/leggings" cam={cam}>
        <ProductPage />
        <Cursor
          points={[
            [6, 420, 420],
            [70, 896, 386],
            [110, 896, 386],
            [160, 980, 478],
            [200, 980, 478],
            [228, 1222, 70],
          ]}
          clicks={[92, 168]}
        />
      </Browser>
    </Stage>
  );
};

/* ---------- 5. Cart drawer + checkout ---------- */
export const Cart: React.FC = () => {
  const frame = useCurrentFrame();
  const open = useSpring(8, 24);
  const checkout = ramp(frame, 120, 134, EASE);
  const secure = useSpring(140, 14);
  const p = PRODUCTS.leggings;
  return (
    <Stage>
      <Caption n="04" title={"Check out\nsecurely"} text="Review your bag, then check out with your card, Apple Pay or Shop Pay — all on Shopify's secure checkout." />
      <Browser still url="izaven.com/cart">
        <ProductPage drawer />
        <AbsoluteFill style={{ background: `rgba(11,11,12,${open * 0.45})`, zIndex: 15 }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 470,
            zIndex: 20,
            background: "#fff",
            transform: `translateX(${(1 - open) * 100}%)`,
            boxShadow: "-30px 0 60px rgba(0,0,0,.18)",
            padding: "28px 30px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 26, letterSpacing: -0.5 }}>YOUR BAG (1)</div>
            <Icon d="M6 6l12 12M18 6L6 18" />
          </div>
          <div style={{ marginTop: 16, background: C.surface, height: 6, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${ramp(frame, 24, 60) * 100}%`, height: "100%", background: C.ink }} />
          </div>
          <div style={{ fontFamily: BODY, fontSize: 13, color: C.muted, marginTop: 8, opacity: ramp(frame, 30, 44) }}>Made to order for you — ships in 5–7 business days</div>
          <div style={{ display: "flex", gap: 16, marginTop: 26, opacity: ramp(frame, 20, 38), transform: `translateX(${(1 - ramp(frame, 20, 40)) * 40}px)` }}>
            <Garment {...p} style={{ width: 110, height: 140 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 16 }}>Leggings</div>
              <div style={{ fontFamily: BODY, fontSize: 14, color: C.muted, marginTop: 4 }}>Size M</div>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.border}`, width: 110, height: 38, marginTop: 18, justifyContent: "space-around", fontFamily: BODY, fontWeight: 600 }}>
                <span>−</span>1<span>+</span>
              </div>
            </div>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 16 }}>{p.price}</div>
          </div>
          <div style={{ marginTop: "auto", borderTop: `1px solid ${C.border}`, paddingTop: 18, opacity: ramp(frame, 34, 50) }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: BODY, fontWeight: 700, fontSize: 17 }}>
              <span>Subtotal</span>
              <span>{p.price}</span>
            </div>
            <div style={{ fontFamily: BODY, fontSize: 13, color: C.muted, marginTop: 6 }}>Shipping calculated at checkout.</div>
            <div
              style={{
                marginTop: 18,
                height: 58,
                background: C.ink,
                color: "#fff",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transform: `scale(${1 - Math.max(0, 1 - Math.abs(frame - 118) / 6) * 0.03})`,
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: C.accent, transform: `scaleX(${checkout})`, transformOrigin: "left" }} />
              <span style={{ position: "relative", display: "flex", gap: 10, alignItems: "center", fontFamily: BODY, fontWeight: 800, fontSize: 15, letterSpacing: 1.6, color: checkout > 0.5 ? C.ink : "#fff" }}>
                <Lock size={16} /> CHECKOUT
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
              {["VISA", "Mastercard", "Apple Pay", "Shop Pay"].map((t, i) => (
                <span key={t} style={{ fontFamily: BODY, fontWeight: 700, fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", color: C.ink, opacity: ramp(frame, 50 + i * 4, 62 + i * 4) }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* secure checkout confirmation toast */}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 300,
            width: 520,
            zIndex: 30,
            background: C.ink,
            color: "#fff",
            padding: "26px 30px",
            display: "flex",
            gap: 20,
            alignItems: "center",
            transform: `scale(${0.8 + secure * 0.2})`,
            opacity: secure,
            boxShadow: "0 30px 60px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 28, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} strokeDashoffset={24 * (1 - ramp(frame, 146, 162))} />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 24 }}>SECURE CHECKOUT</div>
            <div style={{ fontFamily: BODY, fontSize: 15, color: "rgba(255,255,255,.7)", marginTop: 4 }}>Encrypted payment, powered by Shopify</div>
          </div>
        </div>
        <Cursor
          points={[
            [14, 500, 560],
            [90, 1045, 636],
            [124, 1045, 636],
          ]}
          clicks={[118]}
        />
      </Browser>
    </Stage>
  );
};

/* ---------- 6. Promise ---------- */
export const Pledge: React.FC = () => {
  const frame = useCurrentFrame();
  const days = Math.round(interpolate(frame, [30, 70], [0, 7], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }));
  const ret = Math.round(interpolate(frame, [40, 80], [0, 14], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }));
  const cards = [
    { big: "1 OF 1", label: "MADE TO ORDER", text: "Printed for you after you order. Nothing wasted." },
    { big: `5–${Math.max(5, days)}`, label: "BUSINESS DAYS", text: "Estimated delivery, straight to your door." },
    { big: `${ret}`, label: "DAY RETURNS", text: "Changed your mind? Free return label included." },
  ];
  return (
    <Stage>
      <AbsoluteFill style={{ padding: "0 120px", justifyContent: "center" }}>
        <Rise delay={0}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 88, letterSpacing: -3, color: "#fff" }}>THE IZAVEN PROMISE</div>
        </Rise>
        <div style={{ height: 6, width: 220 * ramp(frame, 8, 30), background: C.accent, marginTop: 18, transform: "skewX(-18deg)" }} />
        <div style={{ display: "flex", gap: 30, marginTop: 70 }}>
          {cards.map((c, i) => {
            const p = ramp(frame, 14 + i * 7, 44 + i * 7);
            return (
              <div
                key={c.label}
                style={{
                  flex: 1,
                  height: 380,
                  background: i === 1 ? C.accent : "#18181a",
                  color: i === 1 ? C.ink : "#fff",
                  padding: 44,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  opacity: p,
                  transform: `perspective(1400px) rotateX(${(1 - p) * 30}deg) translateY(${(1 - p) * 80}px)`,
                  border: i === 1 ? "none" : "1px solid rgba(255,255,255,.08)",
                }}
              >
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 130, lineHeight: 0.9, letterSpacing: -5, fontVariantNumeric: "tabular-nums" }}>{c.big}</div>
                <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 22, letterSpacing: 3, marginTop: 18 }}>{c.label}</div>
                <div style={{ fontFamily: BODY, fontSize: 20, lineHeight: 1.45, marginTop: 12, opacity: 0.72 }}>{c.text}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ---------- 7. End card ---------- */
export const End: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = useSpring(2, 18);
  const url = "izaven.com";
  const typed = Math.floor(interpolate(frame, [26, 56], [0, url.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${0.85 + logo * 0.15})`, opacity: logo }}>
          <Img src={staticFile("izaven-logo-white.png")} style={{ width: 640 }} />
        </div>
        <div style={{ marginTop: 50, display: "flex", alignItems: "center", gap: 18, background: "#fff", padding: "18px 34px", opacity: ramp(frame, 18, 30), transform: `translateY(${(1 - ramp(frame, 18, 34)) * 30}px)` }}>
          <Icon d="M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14zM16 16l5 5" size={26} />
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: C.ink, minWidth: 250 }}>
            {url.slice(0, typed)}
            <span style={{ opacity: caret ? 1 : 0, color: C.ink }}>|</span>
          </span>
        </div>
        <Fade delay={56}>
          <div style={{ marginTop: 40, fontFamily: BODY, fontWeight: 600, fontSize: 26, letterSpacing: 8, color: "rgba(255,255,255,.7)" }}>SHOP THE COLLECTION</div>
        </Fade>
      </AbsoluteFill>
    </Stage>
  );
};
