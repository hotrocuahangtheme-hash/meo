"""Procedural background music for the AEMOD videos (no samples, no external assets).
Usage: python3 music.py <v1|v2> <out.wav>
v1: 96 BPM, D major, cinematic (48 bars = 120 s).  v2: 120 BPM, A minor, tech/data (60 bars = 120 s).
"""
import sys, wave
import numpy as np
import scipy.signal as sg

SR = 48000
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def env_adsr(n, a, d, s, r_len):
    """Envelope for a note of n samples (sustain part) plus release tail r_len (seconds)."""
    A, D, R = int(a * SR), int(d * SR), int(r_len * SR)
    e = np.full(n + R, s, dtype=np.float64)
    A = max(1, min(A, n)); e[:A] = np.linspace(0, 1, A)
    D = max(1, min(D, max(1, n - A))); e[A:A + D] = np.linspace(1, s, D)[: len(e[A:A + D])]
    lvl = e[n - 1] if n > 0 else s
    e[n:] = lvl * np.exp(-np.linspace(0, 6, R)) if R > 0 else e[n:]
    return e


def saw(freq, n, ph0=0.0):
    """PolyBLEP band-limited sawtooth."""
    dt = freq / SR
    ph = (ph0 + dt * np.arange(n)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    t = ph[m] / dt
    y[m] -= t + t - t * t - 1
    m = ph > 1 - dt
    t = (ph[m] - 1) / dt
    y[m] -= t * t + t + t + 1
    return y


def lp(x, fc, order=2):
    b, a = sg.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low')
    return sg.lfilter(b, a, x, axis=-1)


def hp(x, fc, order=2):
    b, a = sg.butter(order, fc / (SR / 2), 'high')
    return sg.lfilter(b, a, x, axis=-1)


def bp(x, f1, f2, order=2):
    b, a = sg.butter(order, [f1 / (SR / 2), f2 / (SR / 2)], 'band')
    return sg.lfilter(b, a, x, axis=-1)


class Track:
    def __init__(self, n):
        self.buf = np.zeros((2, n))

    def add(self, start_s, sig, pan=0.0, gain=1.0):
        i = int(start_s * SR)
        if i >= self.buf.shape[1]:
            return
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            sig = np.vstack([sig * l * 1.4142, sig * r * 1.4142])
        j = min(self.buf.shape[1], i + sig.shape[1])
        self.buf[:, i:j] += gain * sig[:, : j - i]


# ---------------------------------------------------------------- instruments
def pad_note(m, dur, bright=1.0):
    n = int(dur * SR)
    e = env_adsr(n, 0.9, 0.5, 0.85, 1.8)
    N = len(e)
    L = np.zeros(N); R = np.zeros(N)
    for k, det in enumerate((-9, -3, 4, 10)):
        f = hz(m + det / 100.0)
        v = saw(f, N, rng.random())
        if k % 2: L += v
        else: R += v
    sub = np.sin(2 * np.pi * hz(m - 12) * np.arange(N) / SR) * 0.35
    out = np.vstack([L + sub, R + sub]) * e * 0.18
    return lp(out, 900 + 1500 * bright)


def pluck(m, dur=0.45, bright=1.0, harm=(1, 2, 3, 4, 5, 6)):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    y = np.zeros(n)
    for h in harm:
        if f * h > SR * 0.45:
            break
        y += np.sin(2 * np.pi * f * h * t + rng.random()) * (1.0 / h ** (1.3 - 0.4 * bright)) * np.exp(-t * (6 + 5 * h))
    att = np.minimum(1, t / 0.003)
    return y * att * 0.35


def bell(m, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 1.2 * np.exp(-t * 3)
    y = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.2)
    y += 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)
    return y * np.minimum(1, t / 0.004) * 0.3


def bass_note(m, dur):
    n = int(dur * SR)
    e = env_adsr(n, 0.01, 0.15, 0.7, 0.12)
    t = np.arange(len(e)) / SR
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.12 * saw(f, len(e))
    return lp(np.tanh(1.5 * y) * e * 0.42, 700)


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(n) * np.exp(-t * 300), 2500) * 0.25
    return np.tanh(1.6 * (y + click)) * 0.8


def snare(clap=False):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 1200, 7000)
    if clap:
        e = np.zeros(n)
        for k, off in enumerate((0, 0.011, 0.023)):
            i = int(off * SR)
            e[i:] += np.exp(-(t[: n - i]) * (90 if k < 2 else 14)) * (0.7 if k < 2 else 1)
        y = noise * e * 0.45
    else:
        y = noise * np.exp(-t * 18) * 0.4 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.35
    return y


def hat(open_=False):
    n = int((0.3 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500) * np.exp(-t * (12 if open_ else 70)) * 0.22


def shaker():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 4500, 11000) * np.sin(np.pi * t / t[-1]) ** 2 * 0.12


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    y = rng.standard_normal(n)
    # sweep by blending progressively brighter filtered copies
    lo, mid, hi = lp(y, 600), bp(y, 1500, 5000), hp(y, 5000)
    out = lo * (1 - x) + mid * np.minimum(1, 2 * x) + hi * x ** 2
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * x ** 2) / SR) * 0.15
    return (out * 0.18 + sweep) * x ** 2


def impact():
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    nz = lp(rng.standard_normal(n), 1800) * np.exp(-t * 4) * 0.35
    return np.tanh(1.3 * (boom + nz)) * 0.7


def reverb(x, seconds=2.8, predelay=0.02, damp=4500):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    irs = []
    for ch in range(2):
        nz = rng.standard_normal(n) * np.exp(-t * (6.9 / seconds))
        nz = lp(nz, damp, 1)
        irs.append(np.concatenate([np.zeros(int(predelay * SR)), nz]))
    irs = np.array(irs)
    irs /= np.sqrt((irs ** 2).sum(axis=1, keepdims=True))
    return np.vstack([sg.fftconvolve(x[c], irs[c])[: x.shape[1]] for c in range(2)])


def sidechain(n, kick_times, depth=0.55, rel=0.18):
    g = np.ones(n)
    t = np.arange(int(0.6 * SR)) / SR
    shape = 1 - depth * np.exp(-t / rel) * np.minimum(1, t / 0.004 + 0.6)
    for kt in kick_times:
        i = int(kt * SR)
        j = min(n, i + len(shape))
        if i < n:
            g[i:j] = np.minimum(g[i:j], shape[: j - i])
    return g


# ---------------------------------------------------------------- arrangement
def build(spec):
    bpm, bars, prog = spec['bpm'], spec['bars'], spec['prog']
    beat = 60.0 / bpm
    bar = 4 * beat
    total = bars * bar
    N = int((total + 0.0) * SR)
    T = {k: Track(N) for k in ('pad', 'arp', 'bass', 'lead', 'drums', 'fx', 'perc')}
    sec = spec['sections']  # function(bar_index) -> dict of flags

    kick_times = []
    for b in range(bars):
        f = sec(b)
        chord = prog[(b // 2) % len(prog)]
        t0 = b * bar
        # pad: one long chord every 2 bars
        if b % 2 == 0 and f.get('pad', 0) > 0:
            for m in chord['pad']:
                T['pad'].add(t0, pad_note(m, 2 * bar - 0.1, bright=f.get('bright', 0.6)), gain=f['pad'])
        # bass
        if f.get('bass', 0) > 0:
            step = beat / 2 if f.get('bass_8th') else beat
            for k in range(int(round(bar / step))):
                m = chord['bass'] + (12 if (f.get('bass_oct') and k % 2) else 0)
                T['bass'].add(t0 + k * step, bass_note(m, step * 0.85), gain=f['bass'])
        # arpeggio
        if f.get('arp', 0) > 0:
            div = f.get('arp_div', 4)
            step = beat / div
            pat = chord['arp']
            for k in range(int(round(bar / step))):
                m = pat[(k + b * 3) % len(pat)]
                acc = 1.0 if k % div == 0 else 0.7
                T['arp'].add(t0 + k * step, pluck(m, 0.5, f.get('bright', 0.6)), pan=0.35 * np.sin(k * 1.7), gain=f['arp'] * acc)
        # drums
        if f.get('kick', 0) > 0:
            pattern = f.get('kick_pat', (0, 2))
            for q in pattern:
                kt = t0 + q * beat
                T['drums'].add(kt, kick(), gain=f['kick'])
                kick_times.append(kt)
        if f.get('snare', 0) > 0:
            for q in (1, 3):
                T['drums'].add(t0 + q * beat, snare(clap=f.get('clap', False)), pan=0.05, gain=f['snare'])
        if f.get('hat', 0) > 0:
            for k in range(8):
                T['perc'].add(t0 + k * beat / 2 + (beat / 4 if f.get('hat_off') else 0), hat(open_=(k % 4 == 3 and f.get('open_hat'))), pan=0.3, gain=f['hat'] * (1 if k % 2 else 0.6))
        if f.get('shaker', 0) > 0:
            for k in range(16):
                T['perc'].add(t0 + k * beat / 4, shaker(), pan=-0.35, gain=f['shaker'] * (1 if k % 4 == 2 else 0.55))
        if f.get('riser'):
            dur = f['riser'] * bar
            T['fx'].add(t0 + bar - dur, riser(dur), gain=0.9)
        if f.get('impact'):
            T['fx'].add(t0, impact(), gain=f['impact'])
            kick_times.append(t0)
    # lead melody
    for (bar_i, beat_i, m, dur_beats, g) in spec.get('lead', []):
        T['lead'].add(bar_i * bar + beat_i * beat, bell(m, max(0.8, dur_beats * beat * 1.6)), pan=0.15, gain=g)

    sc = sidechain(N, kick_times, depth=spec.get('sc_depth', 0.5))
    pad = T['pad'].buf * sc
    arp = T['arp'].buf * (0.6 + 0.4 * sc)
    bass = T['bass'].buf * sc
    lead = T['lead'].buf
    drums = hp(T['drums'].buf, 30)
    perc = T['perc'].buf
    fx = T['fx'].buf
    dry = pad * 0.9 + arp * 0.8 + bass * 1.0 + lead * 0.8 + drums * 0.9 + perc * 0.8 + fx * 0.8
    send = pad * 0.35 + arp * 0.45 + lead * 0.6 + perc * 0.15 + fx * 0.5 + drums * 0.06
    wet = reverb(send, seconds=spec.get('rev', 2.8))
    mix = dry + wet * 0.55
    # master: gentle tilt, soft clip, fades, normalize
    mix = hp(mix, 25)
    rms = np.sqrt(np.mean(mix ** 2))
    mix = mix / (rms * 10 ** (16 / 20))  # target ~ -16 dBFS RMS
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    fade_in = int(0.8 * SR)
    mix[:, :fade_in] *= np.linspace(0, 1, fade_in)
    fo = int(spec.get('fade_out', 3.0) * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
    mix /= max(1e-9, np.abs(mix).max()) / 0.93
    return mix


def chord(bass, pad, arp):
    return {'bass': bass, 'pad': pad, 'arp': arp}


# v1: D major, vi-IV-I-V, 96 BPM, 48 bars = 120 s
V1_PROG = [
    chord(35, [54, 59, 62, 66], [71, 74, 78, 74, 66, 71, 74, 78]),       # Bm
    chord(31, [55, 59, 62, 69], [67, 71, 74, 79, 74, 71, 69, 74]),       # G(add9)
    chord(38, [54, 57, 62, 66], [66, 69, 74, 78, 74, 69, 66, 74]),       # D
    chord(33, [52, 57, 61, 64], [64, 69, 73, 76, 73, 69, 64, 73]),       # A
]


def v1_sections(b):
    if b < 4:   # intro 0-10 s
        return {'pad': 0.8, 'bright': 0.25, 'arp': 0.35 if b >= 2 else 0, 'arp_div': 2, 'riser': 2 if b == 3 else 0}
    if b < 12:  # 10-30 s
        return {'pad': 0.9, 'bright': 0.45, 'arp': 0.55, 'arp_div': 2, 'bass': 0.8, 'kick': 0.6, 'kick_pat': (0, 2), 'shaker': 0.6, 'impact': 0.8 if b == 4 else 0}
    if b < 20:  # 30-50 s
        return {'pad': 0.9, 'bright': 0.6, 'arp': 0.65, 'arp_div': 4, 'bass': 0.9, 'bass_8th': True, 'kick': 0.75, 'snare': 0.5, 'clap': True, 'hat': 0.5, 'hat_off': True, 'shaker': 0.5, 'impact': 0.6 if b == 12 else 0}
    if b < 28:  # 50-70 s breakdown
        return {'pad': 1.0, 'bright': 0.5, 'arp': 0.5, 'arp_div': 2, 'bass': 0.6, 'shaker': 0.35, 'riser': 4 if b == 27 else 0}
    if b < 36:  # 70-90 s build
        return {'pad': 0.95, 'bright': 0.7, 'arp': 0.65, 'arp_div': 4, 'bass': 0.9, 'bass_8th': True, 'kick': 0.8, 'snare': 0.55, 'clap': True, 'hat': 0.55, 'hat_off': True, 'shaker': 0.4, 'impact': 0.9 if b == 28 else 0, 'riser': 2 if b == 35 else 0}
    if b < 44:  # 90-110 s climax
        return {'pad': 1.0, 'bright': 0.85, 'arp': 0.75, 'arp_div': 4, 'bass': 1.0, 'bass_8th': True, 'bass_oct': True, 'kick': 0.85, 'kick_pat': (0, 1, 2, 3), 'snare': 0.6, 'clap': True, 'hat': 0.6, 'hat_off': True, 'open_hat': True, 'shaker': 0.4, 'impact': 1.0 if b == 36 else 0}
    if b < 46:  # 110-115 s outro
        return {'pad': 0.9, 'bright': 0.4, 'arp': 0.4 if b == 44 else 0.2, 'arp_div': 2, 'bass': 0.5 if b == 44 else 0, 'impact': 0.8 if b == 44 else 0}
    return {'pad': 0.7 if b == 46 else 0, 'bright': 0.3}


def melody_v1():
    # (bar, beat, midi, dur_beats, gain) – D major pentatonic motif, bars 20-27 and 36-43
    motif = [(0, 0, 78, 2), (0, 2, 76, 1), (0, 3, 74, 1), (1, 0, 69, 3), (2, 0, 71, 2), (2, 2, 74, 2), (3, 0, 76, 3),
             (4, 0, 78, 2), (4, 2, 81, 1), (4, 3, 78, 1), (5, 0, 76, 3), (6, 0, 74, 2), (6, 2, 76, 1), (6, 3, 73, 1), (7, 0, 74, 4)]
    out = []
    for start, g in ((20, 0.55), (36, 0.7)):
        for (b, bt, m, d) in motif:
            out.append((start + b, bt, m, d, g))
    return out


# v2: A minor, i-VI-III-VII, 120 BPM, 60 bars = 120 s
V2_PROG = [
    chord(33, [57, 60, 64, 67], [69, 72, 76, 79, 76, 72, 69, 64]),       # Am(7)
    chord(29, [57, 60, 65, 69], [65, 69, 72, 77, 72, 69, 65, 60]),       # F
    chord(36, [55, 60, 64, 67], [67, 72, 76, 79, 76, 72, 67, 64]),       # C
    chord(31, [55, 59, 62, 67], [67, 71, 74, 79, 74, 71, 67, 62]),       # G
]


def v2_sections(b):
    if b < 4:    # 0-8 s
        return {'pad': 0.75, 'bright': 0.3, 'arp': 0.4 if b >= 2 else 0, 'arp_div': 4, 'riser': 2 if b == 3 else 0}
    if b < 12:   # 8-24 s
        return {'pad': 0.85, 'bright': 0.5, 'arp': 0.55, 'arp_div': 4, 'bass': 0.85, 'bass_8th': True, 'kick': 0.7, 'hat': 0.45, 'hat_off': True, 'impact': 0.8 if b == 4 else 0}
    if b < 20:   # 24-40 s
        return {'pad': 0.85, 'bright': 0.65, 'arp': 0.6, 'arp_div': 4, 'bass': 0.95, 'bass_8th': True, 'bass_oct': True, 'kick': 0.8, 'snare': 0.5, 'clap': True, 'hat': 0.5, 'hat_off': True, 'shaker': 0.4}
    if b < 28:   # 40-56 s
        return {'pad': 0.9, 'bright': 0.7, 'arp': 0.65, 'arp_div': 4, 'bass': 0.95, 'bass_8th': True, 'kick': 0.85, 'snare': 0.55, 'clap': True, 'hat': 0.55, 'hat_off': True, 'open_hat': True, 'shaker': 0.4, 'impact': 0.7 if b == 20 else 0}
    if b < 36:   # 56-72 s breakdown
        return {'pad': 1.0, 'bright': 0.45, 'arp': 0.5, 'arp_div': 2, 'bass': 0.5, 'shaker': 0.3, 'riser': 4 if b == 35 else 0}
    if b < 48:   # 72-96 s drop
        return {'pad': 0.95, 'bright': 0.85, 'arp': 0.75, 'arp_div': 4, 'bass': 1.0, 'bass_8th': True, 'bass_oct': True, 'kick': 0.9, 'kick_pat': (0, 1, 2, 3), 'snare': 0.6, 'clap': True, 'hat': 0.6, 'hat_off': True, 'open_hat': True, 'shaker': 0.4, 'impact': 1.0 if b in (36, 44) else 0}
    if b < 56:   # 96-112 s
        return {'pad': 0.9, 'bright': 0.7, 'arp': 0.65, 'arp_div': 4, 'bass': 0.9, 'bass_8th': True, 'kick': 0.8, 'snare': 0.5, 'clap': True, 'hat': 0.5, 'hat_off': True, 'riser': 2 if b == 55 else 0}
    if b < 58:   # 112-116 s
        return {'pad': 0.85, 'bright': 0.4, 'arp': 0.35, 'arp_div': 2, 'impact': 0.9 if b == 56 else 0}
    return {'pad': 0.6 if b == 58 else 0, 'bright': 0.3}


def melody_v2():
    motif = [(0, 0, 76, 1), (0, 1.5, 79, 0.5), (0, 2, 76, 1), (0, 3, 74, 1), (1, 0, 72, 2), (1, 2, 69, 2),
             (2, 0, 72, 1), (2, 1.5, 76, 0.5), (2, 2, 79, 2), (3, 0, 74, 3), (4, 0, 76, 1), (4, 1.5, 79, 0.5), (4, 2, 81, 2),
             (5, 0, 79, 1), (5, 1, 77, 1), (5, 2, 76, 2), (6, 0, 74, 2), (6, 2, 72, 2), (7, 0, 71, 2), (7, 2, 74, 2)]
    out = []
    for start, g in ((28, 0.5), (36, 0.65), (44, 0.65)):
        for (b, bt, m, d) in motif:
            out.append((start + b, bt, m, d, g))
    return out


SPECS = {
    'v1': {'bpm': 96, 'bars': 48, 'prog': V1_PROG, 'sections': v1_sections, 'lead': melody_v1(), 'rev': 3.2, 'sc_depth': 0.4, 'fade_out': 4.0},
    'v2': {'bpm': 120, 'bars': 60, 'prog': V2_PROG, 'sections': v2_sections, 'lead': melody_v2(), 'rev': 2.4, 'sc_depth': 0.55, 'fade_out': 3.5},
}


def write_wav(path, mix):
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    which, out = sys.argv[1], sys.argv[2]
    mix = build(SPECS[which])
    write_wav(out, mix)
    print(which, 'seconds', mix.shape[1] / SR)
