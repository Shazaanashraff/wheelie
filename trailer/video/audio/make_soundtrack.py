"""Synthesizes the Wheelie trailer score + sound design, synced to src/timeline.json.

Run:  python3 audio/make_soundtrack.py   -> public/soundtrack.wav (48 kHz stereo)
Everything is generated from scratch, so there are no licensing questions.
"""
import json
import math
import os

import numpy as np
from scipy import signal

SR = 48000
DUR = 60.0
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, '..', 'src', 'timeline.json')))
FPS = TL['fps']
rng = np.random.default_rng(7)


def fr(f):
    return f / FPS


def stereo():
    return np.zeros((N, 2), dtype=np.float64)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def place(buf, x, at, gain=1.0, pan=0.0):
    """mix mono or stereo array x into buf at time `at` (sec)."""
    i = int(at * SR)
    if i >= N or i + len(x) <= 0:
        return
    x = np.array(x, dtype=np.float64, copy=True)
    fo = min(len(x) // 4, int(0.004 * SR))
    fi = min(len(x) // 4, int(0.0007 * SR))
    if fo > 0:
        ramp = np.linspace(1, 0, fo)
        x[-fo:] = x[-fo:] * (ramp if x.ndim == 1 else ramp[:, None])
    if fi > 0:
        ramp = np.linspace(0, 1, fi)
        x[:fi] = x[:fi] * (ramp if x.ndim == 1 else ramp[:, None])
    if x.ndim == 1:
        l = math.cos((pan + 1) * math.pi / 4)
        r = math.sin((pan + 1) * math.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], axis=1)
    s = max(0, -i)
    e = min(len(x), N - i)
    buf[i + s:i + e] += x[s:e] * gain


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def adsr(n, a=0.005, d=0.1, s=0.7, r=0.1):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na, endpoint=False)
    d_end = min(n, na + nd)
    e[na:d_end] = np.linspace(1, s, d_end - na, endpoint=False)
    if nr > 0 and n > nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low')
    return signal.lfilter(b, a, x, axis=0)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x, axis=0)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x, axis=0)


def noise(d):
    return rng.standard_normal(int(d * SR))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def make_ir(d=2.2, damp=3.2):
    n = int(d * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], axis=1) * np.exp(-t * damp)[:, None]
    ir = lp(ir, 6000)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(axis=0))


IR = make_ir()


def reverb(x, wet=0.25):
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    y = np.stack([signal.fftconvolve(x[:, 0], IR[:, 0])[: len(x)], signal.fftconvolve(x[:, 1], IR[:, 1])[: len(x)]], axis=1)
    return x * (1 - wet) + y * wet * 1.6


# ---------------------------------------------------------------- instruments
def kick(level=1.0, tail=0.38):
    t = t_axis(tail)
    f = 48 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.16)
    x[:200] += np.linspace(1, 0, 200) * 0.6 * rng.standard_normal(200)
    return np.tanh(x * 1.6) * level


def clap(level=1.0):
    d = 0.32
    n = noise(d)
    e = np.zeros(len(n))
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        e[i:] += env_exp(len(n) - i, 0.008 if k < 2 else 0.09)
    x = bp(n * e, 900, 3200)
    return x * level * 2.2


def snare(level=1.0):
    t = t_axis(0.22)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    nz = bp(noise(0.22), 1500, 7000) * np.exp(-t / 0.07)
    return (body * 0.6 + nz * 1.2) * level


def hat(level=1.0, open_=False):
    d = 0.25 if open_ else 0.06
    x = hp(noise(d), 7500) * env_exp(int(d * SR), 0.09 if open_ else 0.018)
    return x * level


def pluck(m, d=0.45, bright=1.0, level=1.0):
    """FM mallet/pluck."""
    t = t_axis(d)
    f = midi(m)
    idx = 2.2 * bright * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 4 * t)) * np.exp(-t / (d * 0.35))
    x += 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.08)
    a = int(0.002 * SR)
    x[:a] *= np.linspace(0, 1, a)
    return x * level


def bass(m, d, level=1.0, cutoff=900):
    t = t_axis(d)
    f = midi(m)
    saw = signal.sawtooth(2 * np.pi * f * t)
    x = lp(saw, cutoff) * 0.6 + np.sin(2 * np.pi * f * t) * 0.8
    return x * adsr(len(t), 0.004, 0.12, 0.6, 0.05) * level


def pad(ms, d, level=1.0, cutoff=2200, attack=0.4):
    t = t_axis(d)
    L = np.zeros(len(t))
    R = np.zeros(len(t))
    for m in ms:
        f = midi(m)
        for det, side in [(-0.11, 0), (0.0, 2), (0.12, 1)]:
            ff = f * 2 ** (det / 12)
            ph = rng.random() * 2 * np.pi
            w = signal.sawtooth(2 * np.pi * ff * t + ph)
            if side in (0, 2):
                L += w
            if side in (1, 2):
                R += w
    x = np.stack([L, R], axis=1) / (len(ms) * 2)
    x = lp(x, cutoff)
    e = adsr(len(t), attack, 0.3, 0.85, min(0.6, d * 0.3))
    return x * e[:, None] * level


def whoosh(d=0.6, up=True, level=1.0, lo=300, hi=4000):
    n = noise(d)
    t = np.linspace(0, 1, len(n))
    out = np.zeros(len(n))
    seg = 256
    for i in range(0, len(n), seg):
        k = t[i]
        fc = lo + (hi - lo) * (k if up else 1 - k)
        b, a = signal.butter(2, [max(50, fc * 0.6) / (SR / 2), min(SR / 2 - 100, fc * 1.4) / (SR / 2)], 'band')
        out[i:i + seg] = signal.lfilter(b, a, n[max(0, i - 2048):i + seg])[-len(n[i:i + seg]):]
    e = np.sin(np.pi * t) ** (1.5 if up else 0.8)
    return out * e * level * 2


def blip(f0=880, f1=1320, d=0.09, level=1.0, wave='sine'):
    t = t_axis(d)
    f = np.geomspace(f0, f1, len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) if wave == 'sine' else signal.square(ph) * 0.4
    return x * env_exp(len(t), d * 0.35) * level


def pop(level=1.0, pitch=1.0):
    t = t_axis(0.12)
    f = (900 * pitch) * np.exp(-t / 0.02) + 250 * pitch
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03)
    return x * level


def click(level=1.0, bright=4000):
    x = bp(noise(0.03), bright * 0.6, min(bright * 2, 20000)) * env_exp(int(0.03 * SR), 0.004)
    return x * level * 3


def bell(m, d=1.2, level=1.0):
    t = t_axis(d)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t + 1.5 * np.exp(-t / 0.3) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / 0.4)
    return x * level


def impact(level=1.0, d=1.6):
    t = t_axis(d)
    f = 30 + 70 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5)
    nz = lp(noise(d), 1800) * np.exp(-t / 0.18)
    return np.tanh((sub * 1.2 + nz * 0.5) * 1.5) * level


def riser(d, level=1.0):
    t = t_axis(d)
    f = np.geomspace(120, 1400, len(t))
    saw = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR)
    nz = whoosh(d, True, 0.7, 400, 9000)[: len(t)]
    e = (t / d) ** 2
    return (lp(saw, 3000) * 0.35 + nz) * e * level


# ---------------------------------------------------------------- stems
music = stereo()
drums = stereo()
sfx = stereo()

BEAT = 0.5
BAR = 2.0

# ---- Act 1: playful groove, A minor, 0 – 15 s
A1_CH = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]
for bar in range(8):
    t0 = bar * BAR
    if t0 >= 15:
        break
    root, ch = A1_CH[bar % 4]
    # bass: 1, &2, 3, 4&
    for off, dur in [(0, 0.4), (0.75, 0.2), (1.0, 0.4), (1.75, 0.2)]:
        if t0 + off < 15:
            place(music, bass(root - 12, dur, 0.55, 700), t0 + off)
    # marimba arp 8ths
    patt = [0, 2, 1, 2, 0, 2, 1, 2]
    for k in range(8):
        tt = t0 + k * 0.25
        if tt >= 15 or tt < 0.25:
            continue
        m = ch[patt[k]] + 12 + (12 if k in (3, 7) else 0)
        place(music, pluck(m, 0.35, 0.9, 0.22), tt, pan=-0.3 + 0.6 * (k % 2))
    # drums from 1 s
    for b in range(4):
        tt = t0 + b * BEAT
        if tt >= 15 or tt < 1.0:
            continue
        place(drums, kick(0.75), tt)
        if b % 2 == 1 and tt >= 2:
            place(drums, clap(0.35), tt)
        place(drums, hat(0.18), tt + 0.25, pan=0.3)
        if tt >= 4:
            place(drums, hat(0.1), tt, pan=-0.3)

# snare roll 9.5 – 11
for k in range(24):
    tt = 9.5 + k * (1.5 / 24)
    place(drums, snare(0.12 + 0.4 * k / 24), tt)

# meltdown 11 – 15: tape-stop the music bus between 13.0 and 15.0
seg = music[int(11 * SR):int(15 * SR)].copy()
seg_t = np.arange(len(seg)) / SR
rate = np.ones(len(seg))
k0 = int(2.0 * SR)
rate[k0:] = np.linspace(1, 0.25, len(seg) - k0)
pos = np.cumsum(rate)
pos = np.clip(pos, 0, len(seg) - 1)
warped = np.stack([np.interp(pos, np.arange(len(seg)), seg[:, c]) for c in range(2)], axis=1)
music[int(11 * SR):int(15 * SR)] = warped
dseg = drums[int(11 * SR):int(15 * SR)].copy()
dw = np.stack([np.interp(pos, np.arange(len(dseg)), dseg[:, c]) for c in range(2)], axis=1)
drums[int(11 * SR):int(15 * SR)] = dw
# distortion grows
for buf in (music, drums):
    s, e = int(11 * SR), int(15 * SR)
    drive = np.linspace(1, 4, e - s)[:, None]
    buf[s:e] = np.tanh(buf[s:e] * drive) / np.sqrt(drive)

# fan whine + fire bed 11 – 15
d = 4.0
t = t_axis(d)
fan = np.sin(2 * np.pi * np.cumsum(np.linspace(600, 2400, len(t))) / SR) * 0.08 * (t / d)
fan += bp(noise(d), 800, 3000) * 0.25 * (t / d)
fire = lp(noise(d), 2500) * 0.25
crk = np.zeros(len(t))
for i in rng.integers(0, len(t), 260):
    crk[i:i + 60] += rng.standard_normal(min(60, len(t) - i)) * 0.7
fire = (fire + hp(crk, 1500)) * np.clip((t - 0.6) / 1.4, 0, 1)
place(sfx, np.stack([fan + fire * 0.8, fan * 0.9 + fire], axis=1), 11.0, 0.9)
# alarm beeps
for k in range(12):
    place(sfx, blip(1250, 1250, 0.12, 0.13, 'square'), 11.6 + k * 0.28, pan=0.4 if k % 2 else -0.4)
# error dunks for dialogs
for f in TL['act1']['dialogs']:
    place(sfx, blip(520, 380, 0.25, 0.35), fr(f))
    place(sfx, blip(390, 290, 0.28, 0.25), fr(f) + 0.02)

# ---- Act 1 sfx
place(sfx, bell(84, 0.8, 0.22), fr(TL['act1']['invoiceToast']) + 0.05, pan=0.5)
place(sfx, bell(91, 0.8, 0.16), fr(TL['act1']['invoiceToast']) + 0.15, pan=0.5)
place(sfx, click(0.5), fr(TL['act1']['calcClick']))
for k in TL['act1']['keystrokes']:
    place(sfx, click(0.35, 2600), fr(k), pan=-0.1)
ct = fr(TL['act1']['chatToast'])
place(sfx, bell(88, 0.7, 0.28), ct, pan=0.6)
place(sfx, bell(93, 0.9, 0.24), ct + 0.11, pan=0.6)
# record scratch
sc = noise(0.35)
scr = bp(sc, 600, 2400) * np.sin(np.linspace(0, 3 * np.pi, len(sc))) ** 2
place(sfx, scr * 0.7, ct + 0.02)
place(sfx, click(0.5), fr(TL['act1']['alarmClick']))
for i, w in enumerate(TL['act1']['windows']):
    if w['app'] == 'calc':
        continue
    place(sfx, pop(0.55, 0.9 + 0.08 * (i % 5)), fr(w['open']), pan=(w['x'] + w['w'] / 2) / 960 - 1)
place(sfx, pop(0.55, 0.85), fr(96), pan=0)

# silence 15 – 16.67 (room tone + heartbeat)
for k in range(3):
    place(sfx, kick(0.25, 0.3), 15.2 + k * 0.55)
A2 = TL['act2']
place(sfx, click(0.8, 3000), fr(A2['click']))
place(sfx, bell(96, 0.6, 0.15), fr(A2['click']) + 0.01)

# ---- Act 2: rescue
place(sfx, whoosh(0.55, True, 0.6, 400, 5000), fr(A2['emerge']))
place(sfx, pop(0.8, 0.5), fr(1036))
place(sfx, kick(0.6), fr(1036))
# tire screech
d = 0.8
t = t_axis(d)
scf = 2600 + 300 * np.sin(2 * np.pi * 9 * t)
screech = np.sin(2 * np.pi * np.cumsum(scf) / SR) * 0.25 + bp(noise(d), 2000, 4500) * 0.6
screech *= np.exp(-t / 0.35) * np.clip(t / 0.02, 0, 1)
place(sfx, screech * 0.55, fr(A2['screech']), pan=0.2)
place(sfx, click(0.6, 1500), fr(A2['extinguisher']))
place(sfx, blip(300, 900, 0.12, 0.25), fr(A2['extinguisher']) + 0.05)
# foam spray
d = fr(1188 - A2['foamStart']) + 0.3
t = t_axis(d)
spray = hp(noise(d), 1200) * 0.5 + lp(noise(d), 600) * 0.4
spray *= np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.25, 0, 1)
place(sfx, np.stack([spray, spray * 0.8], axis=1), fr(A2['foamStart']), 0.9)
place(sfx, whoosh(0.9, False, 0.5, 200, 3000), fr(1190))
# hero drums + bass 17.33 – 23
H0 = fr(1036)
H_CH = [(57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [48, 55, 60, 64])]
for bar in range(3):
    t0 = H0 + bar * BAR
    root, ch = H_CH[bar % 3]
    place(music, pad(ch, BAR + 0.3, 0.32, 1800, 0.2), t0)
    place(music, bass(root - 12, BAR * 0.95, 0.5, 500), t0)
    for b in range(4):
        tt = t0 + b * BEAT
        if tt > 23.0:
            break
        if b in (0, 2):
            place(drums, kick(0.85), tt)
        if b in (1, 3):
            place(drums, snare(0.35), tt)
        place(drums, hat(0.1), tt + 0.25)
# scanner beeps at each tag
O = (352, 618)
for w in TL['act1']['windows']:
    a = math.atan2(w['y'] + w['h'] / 2 - O[1], w['x'] + w['w'] / 2 - O[0])
    if a >= 0.38:
        continue
    start = 1250 + round(((a + 0.75) / 1.13) * 120)
    start = max(1250, start)
    place(sfx, blip(1600, 2200, 0.07, 0.2), fr(start), pan=(w['x'] / 960) - 1)
# scan hum
d = fr(1385 - 1245)
t = t_axis(d)
hum = np.sin(2 * np.pi * 220 * t) * 0.05 + np.sin(2 * np.pi * 330 * t + np.sin(2 * np.pi * 6 * t)) * 0.03
place(sfx, hum * np.sin(np.pi * t / d), fr(1245))
# fusion riser and spin
place(sfx, riser(fr(A2['flash'] - 1390), 0.6), fr(1390))
d = fr(A2['flash'] - 1400)
t = t_axis(d)
spin_f = 2 + 28 * (t / d) ** 2
wob = (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(spin_f) / SR))
place(sfx, bp(noise(d), 300, 2000) * wob * 0.35 * (t / d), fr(1400))
place(sfx, impact(0.95), fr(A2['flash']))
place(sfx, bell(84, 2.0, 0.18), fr(A2['flash']) + 0.02, pan=-0.3)
place(sfx, bell(91, 2.0, 0.14), fr(A2['flash']) + 0.04, pan=0.3)

# ---- Act 3: main theme from the flash to 50 s (C major)
M0 = fr(A2['flash'])
M_CH = [(53, [53, 57, 60, 64]), (55, [55, 59, 62, 67]), (52, [52, 55, 59, 64]), (57, [57, 60, 64, 67])]
nerd_s, nerd_e = fr(TL['act3']['nerdsStart']), fr(TL['act3']['launchStart'])
end_m = 50.0
bar = 0
while True:
    t0 = M0 + bar * BAR
    if t0 >= end_m:
        break
    root, ch = M_CH[bar % 4]
    breakdown = nerd_s - 0.1 <= t0 < nerd_e - 0.1
    place(music, pad(ch, BAR + 0.4, 0.26 if not breakdown else 0.34, 2600 if not breakdown else 1200, 0.15), t0)
    # bass 8ths pumping
    for k in range(8):
        tt = t0 + k * 0.25
        if tt >= end_m:
            break
        if breakdown and k % 2:
            continue
        place(music, bass(root - 12 + (12 if k in (3, 6) else 0), 0.22, 0.42 if not breakdown else 0.3, 800), tt)
    # arpeggio 16ths
    arp = [0, 1, 2, 3, 2, 1, 2, 3]
    for k in range(16):
        tt = t0 + k * 0.125
        if tt >= end_m:
            break
        if breakdown and k % 2:
            continue
        m = ch[arp[k % 8]] + 12
        place(music, pluck(m, 0.25, 0.7, 0.12), tt, pan=0.35 if k % 2 else -0.35)
    # lead hook every other bar
    if bar % 2 == 0 and not breakdown:
        hook = [(0, 76, 0.4), (0.5, 79, 0.25), (0.75, 81, 0.25), (1.0, 79, 0.5), (1.5, 76, 0.4)]
        if bar % 4 == 2:
            hook = [(0, 74, 0.4), (0.5, 76, 0.25), (0.75, 79, 0.25), (1.0, 76, 0.75)]
        for off, m, dd in hook:
            if t0 + off < end_m:
                place(music, pluck(m, dd + 0.3, 1.2, 0.2), t0 + off)
    # drums
    for b in range(4):
        tt = t0 + b * BEAT
        if tt >= end_m:
            break
        if not breakdown:
            place(drums, kick(0.8), tt)
            if b % 2 == 1:
                place(drums, clap(0.4), tt)
            place(drums, hat(0.13, open_=True), tt + 0.25, pan=0.25)
            for s16 in (0.125, 0.375):
                place(drums, hat(0.06), tt + s16, pan=-0.25)
        else:
            place(drums, hat(0.1), tt, pan=0.2)
            place(drums, hat(0.07), tt + 0.25, pan=-0.2)
            if b == 0:
                place(drums, kick(0.5), tt)
    bar += 1
# build into launch
for k in range(16):
    place(drums, snare(0.08 + 0.3 * k / 16), nerd_e - 1.0 + k / 16)
place(sfx, riser(1.0, 0.35), nerd_e - 1.0)

A3 = TL['act3']
for i in range(8):
    place(sfx, click(0.45, 5000), fr(1650 + i * A3['slotEvery']), pan=math.sin(i / 8 * 2 * math.pi) * 0.6)
    place(sfx, blip(1800 + i * 90, 1900 + i * 90, 0.05, 0.08), fr(1650 + i * A3['slotEvery']))
place(sfx, bell(84, 1.5, 0.12), fr(1745))
place(sfx, bell(88, 1.5, 0.1), fr(1752))
place(sfx, bell(91, 1.8, 0.1), fr(1759))
# tools
place(sfx, click(0.5), fr(1888))
place(sfx, whoosh(0.35, True, 0.45, 600, 5000), fr(1890), pan=0.4)
for k in range(8):
    place(sfx, click(0.15, 6000), fr(1905) + k * 0.05)
for sw in A3['toolSwitch'][1:]:
    place(sfx, click(0.5), fr(sw - 4))
    place(sfx, whoosh(0.3, True, 0.4, 800, 6000), fr(sw - 6), pan=0.4)
# offline
place(sfx, whoosh(0.4, False, 0.3, 200, 2000), fr(2104), pan=0.7)
d = fr(2140 - 2112)
t = t_axis(d)
place(sfx, lp(noise(d), 400) * 0.3 * np.sin(np.pi * t / d), fr(2112), pan=0.6)
place(sfx, whoosh(0.4, True, 0.3, 300, 3000), fr(2140), pan=0.6)
# snip: two metallic clicks + spark
place(sfx, click(0.9, 7000), fr(A3['snip']) - 0.04, pan=0.6)
place(sfx, click(1.0, 9000), fr(A3['snip']), pan=0.6)
sp_ = hp(noise(0.25), 4000) * env_exp(int(0.25 * SR), 0.05)
place(sfx, sp_ * 0.4, fr(A3['snip']), pan=0.6)
place(sfx, blip(900, 300, 0.25, 0.25), fr(A3['snip']) + 0.1)
place(sfx, pop(0.6, 0.6), fr(2178), pan=0.6)
place(sfx, bell(86, 0.6, 0.18), fr(A3['snip'] + 10), pan=0.6)
for k in range(28):
    place(sfx, click(0.12, 3500), fr(2180) + k * 0.06, pan=0.2)
place(sfx, blip(1200, 2400, 0.12, 0.25), fr(A3['saved'] + 22))
place(sfx, blip(1800, 3200, 0.12, 0.2), fr(A3['saved'] + 22) + 0.09)
place(sfx, whoosh(0.35, True, 0.6, 500, 8000), fr(2262))
place(sfx, impact(0.5, 0.8), fr(A3['nerdsStart']))
# nerds
for k in range(22):
    place(sfx, click(0.06, 5000), fr(2294) + k * 0.08)
place(sfx, blip(900, 120, 0.4, 0.4), fr(2380))
for k in range(16):
    place(sfx, click(0.18, 4500), fr(2362) + k * 0.06)
place(sfx, pop(0.6, 0.7), fr(2430))
place(sfx, bell(100, 1.0, 0.2), fr(2466), pan=0.6)
place(sfx, bell(105, 1.0, 0.1), fr(2468), pan=0.6)
# launch
place(sfx, whoosh(0.3, True, 0.4), fr(A3['launchStart']))
place(sfx, pop(0.4, 1.2), fr(2540))
for i, lt in enumerate(A3['launches']):
    place(sfx, click(0.5), fr(lt))
    place(sfx, whoosh(0.32, True, 0.45, 500, 6000), fr(lt + 2), pan=0.5)
    place(sfx, blip(500 + i * 150, 1100 + i * 150, 0.14, 0.25), fr(lt + 2))
# custom
place(sfx, whoosh(0.3, True, 0.35), fr(A3['customStart']))
for k in range(int((2840 - 2740) / 3)):
    place(sfx, click(0.12, 4000 + 1500 * rng.random()), fr(2740 + k * 3), pan=0.5)
place(sfx, lp(noise(0.6), 500) * 0.3, fr(2780), pan=0.6)
for hit in (2820, 2840, 2860):
    t = t_axis(0.4)
    clank = sum(np.sin(2 * np.pi * f * t) for f in (1800, 2650, 4100)) * np.exp(-t / 0.06) * 0.15
    place(sfx, clank, fr(hit), pan=0.4)
    place(sfx, click(0.4, 3000), fr(hit), pan=0.4)
place(sfx, whoosh(0.5, True, 0.45, 400, 7000), fr(2878), pan=-0.2)
place(sfx, click(1.0, 3000), fr(A3['snap']))
place(sfx, kick(0.6), fr(A3['snap']))
place(sfx, bell(84, 1.4, 0.2), fr(A3['snap']))
place(sfx, bell(91, 1.4, 0.15), fr(A3['snap']) + 0.06)
place(sfx, pop(0.5, 1.4), fr(A3['snap'] + 22))

# ---- Act 4
A4 = TL['act4']
# 50 – 51.5 tension: pad + sub swell
place(music, pad([48, 55, 60, 64], 1.7, 0.3, 900, 0.6), 50.0)
d = 1.5
t = t_axis(d)
place(music, np.sin(2 * np.pi * 41 * t) * (t / d) * 0.5, 50.0)
for i, kd in enumerate([A4['keyDrop'] + 16, A4['keyDrop'] + 26]):
    place(sfx, kick(0.5, 0.25), fr(kd))
    place(sfx, click(0.5, 1500), fr(kd))
place(sfx, kick(1.0), fr(A4['keyPress']))
place(sfx, click(1.0, 2000), fr(A4['keyPress']))
place(sfx, pop(0.8, 1.0), fr(A4['keyPress']) + 0.02)
place(sfx, impact(0.6, 1.0), fr(A4['keyPress']))
# final groove 51.5 – 56.5
F0 = fr(A4['keyPress'])
F_CH = [(53, [53, 57, 60, 64]), (55, [55, 59, 62, 67]), (57, [57, 60, 64, 67])]
for bar in range(3):
    t0 = F0 + bar * BAR
    root, ch = F_CH[bar % 3]
    seg_end = 56.55
    place(music, pad(ch, min(BAR + 0.3, seg_end - t0 + 0.3), 0.27, 3000, 0.1), t0)
    for k in range(8):
        tt = t0 + k * 0.25
        if tt >= seg_end:
            break
        place(music, bass(root - 12, 0.22, 0.42, 900), tt)
    for k in range(16):
        tt = t0 + k * 0.125
        if tt >= seg_end:
            break
        place(music, pluck(ch[[0, 1, 2, 3, 2, 1, 2, 3][k % 8]] + 12, 0.25, 0.7, 0.12), tt, pan=0.35 if k % 2 else -0.35)
    for b in range(4):
        tt = t0 + b * BEAT
        if tt >= seg_end:
            break
        place(drums, kick(0.8), tt)
        if b % 2:
            place(drums, clap(0.4), tt)
        place(drums, hat(0.13, True), tt + 0.25)
# more tools chimes
for i in range(3):
    place(sfx, bell(79 + i * 4, 1.2, 0.14), fr(A4['moreStart'] + 30 + i * 22))
place(sfx, pop(0.45, 1.1), fr(A4['moreStart'] + 50))
place(sfx, whoosh(0.5, False, 0.5, 200, 4000), fr(3392))
# end card: roll, stop, final chord, wink
E0 = fr(A4['endStart'])
d = fr(92)
t = t_axis(d)
rollsnd = lp(noise(d), 600) * 0.35 * (1 - t / d) + bp(noise(d), 100, 300) * 0.2
place(sfx, rollsnd, E0 + 0.1, pan=0.0)
place(sfx, whoosh(1.3, True, 0.4, 300, 3000), E0)
stop = fr(A4['endStart'] + 92)
place(sfx, kick(0.7), stop)
place(sfx, impact(0.55, 2.0), stop)
place(music, pad([48, 55, 60, 64, 67], 60 - stop, 0.42, 3200, 0.02), stop)
place(music, bass(36, 60 - stop, 0.5, 400), stop)
for i, m in enumerate([72, 76, 79, 84]):
    place(music, pluck(m, 1.5, 1.0, 0.18), stop + i * 0.06)
place(sfx, bell(96, 1.0, 0.2), fr(A4['wink']))
place(sfx, bell(103, 1.0, 0.12), fr(A4['wink']) + 0.05)

# ---------------------------------------------------------------- mix
music = reverb(music, 0.22)
sfx_r = reverb(sfx, 0.12)
drums = drums

# sidechain: duck music on kicks (approx: envelope of drums low band)
low = lp(drums.mean(axis=1), 150)
envk = np.abs(signal.hilbert(low))
envk = lp(envk, 12, 1)
duck = 1 - np.clip(envk / (envk.max() + 1e-9) * 1.6, 0, 0.45)
music *= duck[:, None]

# hard silence 15.0 – 16.65 for music & drums (Act 2 opener)
s, e = int(15.0 * SR), int(17.25 * SR)
fade = int(0.03 * SR)
for buf in (music, drums):
    buf[s - fade:s] *= np.linspace(1, 0, fade)[:, None]
    buf[s:e] = 0

mix = music * 0.85 + drums * 0.9 + sfx_r * 1.0
# fade out tail
tail = int(0.35 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
# gentle master glue
mix = hp(mix, 25)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.abs(mix).max() + 1e-9
mix *= 0.89

out = os.path.join(HERE, '..', 'public', 'soundtrack_raw.wav')
from scipy.io import wavfile
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out)
