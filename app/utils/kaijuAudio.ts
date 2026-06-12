/**
 * Mesin efek suara kaiju — semua suara disintesis langsung dengan
 * Web Audio API (tanpa file audio), jadi bebas hak cipta dan ringan.
 */
export class KaijuAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private beamNodes: { stop: () => void } | null = null
  private volume = 0.4
  muted = false

  /** Buat/lanjutkan AudioContext (harus setelah interaksi pengguna). */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      this.master.connect(this.ctx.destination)
      const len = this.ctx.sampleRate * 2
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const d = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  setMuted(m: boolean) {
    this.muted = m
    if (m) this.beamStop()
    if (this.master) this.master.gain.value = m ? 0 : this.volume
  }

  private noiseSrc(): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource()
    s.buffer = this.noiseBuf
    s.loop = true
    return s
  }

  /** Raungan kaiju: osilator serak + sub bass + napas, dengan distorsi. */
  roar(pitch = 1, dur = 1.6, vol = 1) {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const t = ctx.currentTime
    const out = ctx.createGain()
    out.gain.setValueAtTime(0.0001, t)
    out.gain.exponentialRampToValueAtTime(0.9 * vol, t + 0.08)
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(256)
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh(3.5 * (i / 128 - 1))
    shaper.curve = curve
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(700 * pitch, t)
    lp.frequency.exponentialRampToValueAtTime(220 * pitch, t + dur)
    shaper.connect(lp)
    lp.connect(out)
    out.connect(this.master!)

    const layers: Array<[number, number, OscillatorType, number]> = [
      [95, 55, 'sawtooth', 0.5],
      [140, 70, 'square', 0.25],
      [48, 30, 'sine', 0.6],
    ]
    for (const [f0, f1, type, g] of layers) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(f0 * pitch, t)
      o.frequency.exponentialRampToValueAtTime(f1 * pitch, t + dur * 0.85)
      const og = ctx.createGain()
      og.gain.value = g
      // Getaran "gravel" supaya terdengar seperti geraman binatang
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 28
      const lg = ctx.createGain()
      lg.gain.value = f0 * 0.18
      lfo.connect(lg)
      lg.connect(o.frequency)
      lfo.start(t)
      lfo.stop(t + dur)
      o.connect(og)
      og.connect(shaper)
      o.start(t)
      o.stop(t + dur)
    }
    const n = this.noiseSrc()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 320 * pitch
    bp.Q.value = 0.8
    const ng = ctx.createGain()
    ng.gain.value = 0.35
    n.connect(bp)
    bp.connect(ng)
    ng.connect(shaper)
    n.start(t)
    n.stop(t + dur)
  }

  /** Dengungan sinar atom (loop sampai beamStop dipanggil). */
  beamStart(pitch = 1) {
    const ctx = this.ensure()
    if (!ctx || this.muted || this.beamNodes) return
    const t = ctx.currentTime
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.06)
    g.connect(this.master!)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 120
    hp.connect(g)
    // Dua sawtooth nyaris sama frekuensi → dengungan berdenyut
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = 170 * pitch
    const o2 = ctx.createOscillator()
    o2.type = 'sawtooth'
    o2.frequency.value = 171.5 * pitch
    const og = ctx.createGain()
    og.gain.value = 0.25
    o.connect(og)
    o2.connect(og)
    og.connect(hp)
    // Desis energi
    const n = this.noiseSrc()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2400
    bp.Q.value = 1.5
    const ng = ctx.createGain()
    ng.gain.value = 0.5
    n.connect(bp)
    bp.connect(ng)
    ng.connect(hp)
    // Kedipan volume
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 16
    const lg = ctx.createGain()
    lg.gain.value = 0.12
    lfo.connect(lg)
    lg.connect(g.gain)
    o.start(t)
    o2.start(t)
    n.start(t)
    lfo.start(t)
    this.beamNodes = {
      stop: () => {
        const tt = ctx.currentTime
        g.gain.cancelScheduledValues(tt)
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.05), tt)
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.12)
        for (const x of [o, o2, n, lfo]) x.stop(tt + 0.18)
      },
    }
  }

  beamStop() {
    this.beamNodes?.stop()
    this.beamNodes = null
  }

  /** Dentuman langkah kaki; big = hentakan/stomp. */
  step(big = false) {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(big ? 90 : 70, t)
    o.frequency.exponentialRampToValueAtTime(28, t + 0.16)
    const g = ctx.createGain()
    g.gain.setValueAtTime(big ? 0.9 : 0.35, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.5 : 0.22))
    o.connect(g)
    g.connect(this.master!)
    o.start(t)
    o.stop(t + (big ? 0.55 : 0.25))
    const n = this.noiseSrc()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = big ? 500 : 300
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(big ? 0.5 : 0.15, t)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.35 : 0.12))
    n.connect(lp)
    lp.connect(ng)
    ng.connect(this.master!)
    n.start(t)
    n.stop(t + 0.4)
  }

  /** Wuss — gelombang kejut, sabetan tinju, dsb. */
  whoosh(freq = 900, dur = 0.35, vol = 0.4) {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const t = ctx.currentTime
    const n = this.noiseSrc()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(freq * 0.4, t)
    bp.frequency.exponentialRampToValueAtTime(freq, t + dur * 0.6)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    n.connect(bp)
    bp.connect(g)
    g.connect(this.master!)
    n.start(t)
    n.stop(t + dur + 0.05)
  }

  /** Nada naik saat mengisi daya (charge Minus One). */
  charge(dur = 1.4) {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(120, t)
    o.frequency.exponentialRampToValueAtTime(760, t + dur)
    const o2 = ctx.createOscillator()
    o2.type = 'triangle'
    o2.frequency.setValueAtTime(241, t)
    o2.frequency.exponentialRampToValueAtTime(1523, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.3, t + dur * 0.8)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15)
    o.connect(g)
    o2.connect(g)
    g.connect(this.master!)
    o.start(t)
    o.stop(t + dur + 0.2)
    o2.start(t)
    o2.stop(t + dur + 0.2)
  }

  dispose() {
    this.beamStop()
    this.ctx?.close().catch(() => {})
    this.ctx = null
    this.master = null
    this.noiseBuf = null
  }
}
