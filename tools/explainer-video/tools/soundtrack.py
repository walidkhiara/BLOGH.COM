"""Synthesise an original, royalty-free 120 BPM track for the 9:16 campaign.

One beat = 0.5 s = 15 frames at 30 fps, so every cut in Campaign.tsx lands on the grid.
Run: python3 tools/soundtrack.py public/campaign-track.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 25.0
BEAT = 0.5
N = int(SR * DUR)
out = np.zeros((N, 2))
rng = np.random.default_rng(7)


def at(t):
    return int(t * SR)


def add(sig, t, gain=1.0, pan=0.0):
    i = at(t)
    j = min(N, i + len(sig))
    l, r = (1 - max(pan, 0)), (1 + min(pan, 0))
    out[i:j, 0] += sig[: j - i] * gain * l
    out[i:j, 1] += sig[: j - i] * gain * r


def env(n, a=0.002, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def kick():
    n = at(0.45)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(1.6 * np.sin(ph) * env(n, 0.001, 0.16))


def hat(open_=False):
    n = at(0.25 if open_ else 0.06)
    s = rng.standard_normal(n)
    s = np.diff(s, prepend=0)  # crude high-pass
    return s * env(n, 0.0005, 0.08 if open_ else 0.018) * 0.5


def clap():
    n = at(0.3)
    s = np.diff(rng.standard_normal(n), prepend=0)
    e = env(n, 0.001, 0.09) + 0.6 * np.roll(env(n, 0.001, 0.02), at(0.012)) + 0.5 * np.roll(env(n, 0.001, 0.02), at(0.024))
    return s * e * 0.35


def boom(length=2.4):
    n = at(length)
    t = np.arange(n) / SR
    f = 32 + 60 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    noise = np.convolve(rng.standard_normal(n), np.ones(60) / 60, "same")
    return np.tanh(1.4 * (s + 0.6 * noise)) * env(n, 0.002, 0.9)


def whoosh(length=0.6, rise=True):
    n = at(length)
    t = np.linspace(0, 1, n)
    k = np.maximum(2, (6 + 50 * (t if rise else 1 - t)).astype(int))
    base = rng.standard_normal(n)
    cs = np.cumsum(np.insert(base, 0, 0))
    idx = np.arange(n)
    lo = np.maximum(0, idx - k)
    s = (cs[idx + 1] - cs[lo]) / k
    shape = np.sin(np.pi * t) ** 2 if not rise else t ** 2.5
    return s * shape * 1.8


def pad(t0, t1, freqs, gain):
    n = at(t1 - t0)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for i, f in enumerate(freqs))
    fade = np.minimum(1, t / 1.2) * np.minimum(1, (t1 - t0 - t) / 1.0)
    add(s / len(freqs) * fade, t0, gain, 0)


def bass(t, f, length=0.45):
    n = at(length)
    tt = np.arange(n) / SR
    s = np.tanh(2.2 * np.sin(2 * np.pi * f * tt)) * env(n, 0.004, 0.22)
    add(s, t, 0.32)


# --- arrangement (beats) ---
add(boom(), 0.0, 0.9)                     # hook impact on frame 0
add(whoosh(0.5, False), 0.0, 0.25)
pad(0.0, 22.0, [55, 82.4, 110, 130.8], 0.10)   # A minor drone under everything
pad(11.0, 22.0, [65.4, 98, 130.8, 164.8], 0.06)

for b in range(2, 44):                     # main groove: beats 2..43 (1.0s..21.5s)
    t = b * BEAT
    if 26 <= b < 27:                      # one-beat drop before the montage
        continue
    add(kick(), t, 0.85)
    add(hat(), t + BEAT / 2, 0.55, 0.3)
    if b % 2 == 1 and b >= 6:
        add(clap(), t, 0.9, -0.1)
    if b >= 14:
        add(hat(), t + BEAT * 0.75, 0.25, -0.3)
    if b >= 27 and b % 4 == 3:
        add(hat(True), t + BEAT / 2, 0.3, 0.2)
    root = [55, 55, 65.4, 49][(b // 4) % 4]
    bass(t + BEAT / 2, root)

# transitions: whoosh rising into each major cut, impact on it
for cut in [3.5, 7.0, 13.5, 17.5, 22.0]:
    add(whoosh(0.7, True), cut - 0.7, 0.35, 0.2)
add(whoosh(1.8, True), 13.5 - 1.8, 0.45)   # riser into the montage
add(boom(1.6), 13.5, 0.7)
add(boom(3.0), 22.0, 1.0)                  # logo hit
add(whoosh(0.5, False), 22.0, 0.3)

# master: gentle glue + limiter, fade out last 0.6s
out *= 0.7
out = np.tanh(out * 1.3) / np.tanh(1.3)
tail = np.ones(N)
tail[-at(0.6):] = np.linspace(1, 0, at(0.6))
out *= tail[:, None]
out /= max(1e-9, np.abs(out).max()) / 0.89

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype("<i2").tobytes())
print("wrote", sys.argv[1], DUR, "s")
