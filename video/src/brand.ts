// IZAVEN design tokens, read from the live Horizon theme's
// config/settings_data.json (settings.color_palette).
export const BONE = '#F7F6F2'; // palette.background
export const INK = '#171717'; // palette.foreground
export const MUTED = '#777777'; // palette.color1
export const HAIRLINE = '#DADADA'; // palette.color2

export const FPS = 30;
export const DURATION = 120; // 4s, seamless

// Beat map (frames). The piece starts and ends on an empty bone field,
// so frame 120 matches frame 0 and the loop has no visible seam.
export const BEATS = {
  drawIn: 6,
  drawOut: 66,
  wordIn: 52,
  wordOut: 76,
  fadeIn: 96,
  fadeOut: 118,
} as const;
