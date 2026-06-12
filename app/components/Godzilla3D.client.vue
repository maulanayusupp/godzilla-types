<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { KaijuAudio } from '~/utils/kaijuAudio'
import type { Godzilla } from '~/types'

const props = defineProps<{
  godzilla: Godzilla
}>()

// ===== Profil perilaku per varian =====
type AttackKind =
  | 'beam'
  | 'sweep'
  | 'double'
  | 'burst'
  | 'spiral'
  | 'meltdown'
  | 'backBeams'
  | 'charge'
  | 'pulse'
  | 'punch'

interface Behavior {
  attack: AttackKind
  label: string
  scale: number
  speed: number // pengali kecepatan gerakan idle
  tailAmp: number
  headSway: number
  rotate: number // kecepatan auto-rotate kamera
  lean: number // postur condong ke depan
  beamWidth: number
  walkSpeed: number // kecepatan keliling arena (rad/detik)
  strideFreq: number // frekuensi langkah
  roarPitch: number // nada raungan (kecil = lebih dalam)
  twitchy?: boolean
  rings?: boolean
  stomper?: boolean // menghentak tanah saat mengancam
}

const DEFAULT_BEHAVIOR: Behavior = {
  attack: 'beam',
  label: 'Atomic Breath',
  scale: 1,
  speed: 1,
  tailAmp: 1,
  headSway: 0.16,
  rotate: 1.7,
  lean: 0.05,
  beamWidth: 1,
  walkSpeed: 0.18,
  strideFreq: 2.2,
  roarPitch: 1,
}

const BEHAVIORS: Record<string, Partial<Behavior>> = {
  'showa-1954': { attack: 'sweep', label: 'Sapuan Atomic Breath', speed: 0.8, tailAmp: 0.8, headSway: 0.12, rotate: 1.2, walkSpeed: 0.13, strideFreq: 1.7, stomper: true, roarPitch: 0.9 },
  'showa-hero': { attack: 'punch', label: 'Petarung Jarak Dekat', speed: 1.3, tailAmp: 1.2, headSway: 0.2, rotate: 1.8, lean: 0.04, walkSpeed: 0.24, strideFreq: 2.7, roarPitch: 1.05 },
  'heisei': { attack: 'spiral', label: 'Spiral Ray', scale: 1.05, speed: 0.9, tailAmp: 0.9, rotate: 1.4, beamWidth: 1.1, walkSpeed: 0.15, strideFreq: 1.9, roarPitch: 0.95 },
  'burning': { attack: 'meltdown', label: 'Meltdown Nuklir', scale: 1.05, speed: 1.1, rotate: 1.5, beamWidth: 1.15, walkSpeed: 0.12, strideFreq: 1.8, roarPitch: 1.0 },
  'millennium': { attack: 'double', label: 'Tembakan Ganda', speed: 1.3, tailAmp: 1.4, headSway: 0.18, rotate: 2.2, lean: 0.06, walkSpeed: 0.26, strideFreq: 2.8, roarPitch: 1.1 },
  'gmk': { attack: 'beam', label: 'Teror Arwah', speed: 0.45, tailAmp: 0.6, headSway: 0.34, rotate: 0.9, lean: 0.03, walkSpeed: 0.1, strideFreq: 1.5, roarPitch: 0.75 },
  'shin': { attack: 'backBeams', label: 'Sinar Punggung & Ekor', scale: 1.08, headSway: 0.1, rotate: 1.1, lean: 0.2, beamWidth: 0.6, twitchy: true, walkSpeed: 0.11, strideFreq: 1.8, roarPitch: 1.15 },
  'ultima': { attack: 'beam', label: 'Medan Distorsi', speed: 1.2, tailAmp: 1.6, rotate: 1.6, lean: 0.08, beamWidth: 0.9, rings: true, walkSpeed: 0.2, strideFreq: 2.4, roarPitch: 1.1 },
  'minus-one': { attack: 'charge', label: 'Isian Daya Sirip', scale: 0.97, speed: 0.9, tailAmp: 0.9, headSway: 0.13, rotate: 1.3, lean: 0.07, beamWidth: 1.7, walkSpeed: 0.16, strideFreq: 2.0, roarPitch: 0.9 },
  'earth': { attack: 'pulse', label: 'Gelombang Elektromagnetik', scale: 1.3, speed: 0.5, tailAmp: 0.5, headSway: 0.08, rotate: 0.8, lean: 0.03, walkSpeed: 0.08, strideFreq: 1.25, stomper: true, roarPitch: 0.55 },
  'legendary': { attack: 'beam', label: 'Atomic Breath Alpha', scale: 1.12, headSway: 0.15, rotate: 1.6, lean: 0, beamWidth: 1.35, walkSpeed: 0.17, strideFreq: 2.0, roarPitch: 0.85 },
  'evolved': { attack: 'burst', label: 'Burst Cepat', speed: 1.45, tailAmp: 1.5, headSway: 0.2, rotate: 2.4, lean: 0.04, beamWidth: 0.9, walkSpeed: 0.32, strideFreq: 3.3, roarPitch: 1.25 },
}

const bh: Behavior = { ...DEFAULT_BEHAVIOR, ...(BEHAVIORS[props.godzilla.id] ?? {}) }

function fireWindows(kind: AttackKind): Array<[number, number]> {
  switch (kind) {
    case 'sweep':
      return [[0.6, 2.6]]
    case 'double':
      return [
        [0.55, 1.05],
        [1.45, 1.95],
      ]
    case 'burst':
      return [
        [0.45, 0.75],
        [1.0, 1.3],
        [1.55, 1.85],
      ]
    case 'spiral':
    case 'meltdown':
      return [[0.6, 2.3]]
    case 'backBeams':
      return [[0.6, 2.2]]
    case 'charge':
      return [[1.7, 2.9]]
    case 'punch':
    case 'pulse':
      return []
    default:
      return [[0.55, 2.15]]
  }
}

const ATTACK_HOLD: Record<AttackKind, number> = {
  beam: 2.2,
  sweep: 2.65,
  double: 2.0,
  burst: 1.9,
  spiral: 2.35,
  meltdown: 2.35,
  backBeams: 2.25,
  charge: 2.95,
  pulse: 2.4,
  punch: 2.2,
}

const container = ref<HTMLDivElement | null>(null)
const stateLabel = ref('Berjalan mengelilingi arena')

// ===== Suara =====
let audio: KaijuAudio | null = null
const soundOn = ref(true)

function toggleSound() {
  soundOn.value = !soundOn.value
  audio?.setMuted(!soundOn.value)
  if (import.meta.client) localStorage.setItem('g3d-sound', soundOn.value ? '1' : '0')
}

let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let controls: OrbitControls | null = null
let scene: THREE.Scene | null = null
let rafId = 0
let resizeObserver: ResizeObserver | null = null

// ===== Rig artikulasi =====
interface LegRig {
  hip: THREE.Group
  knee: THREE.Group
  ankle: THREE.Group
}

let kaiju: THREE.Group | null = null
let pelvis: THREE.Group | null = null
let spineLower: THREE.Group | null = null
let spineUpper: THREE.Group | null = null
let head: THREE.Group | null = null
let jaw: THREE.Group | null = null
let legs: LegRig[] = []
let arms: THREE.Group[] = []
let tailSegments: THREE.Group[] = []
let chest: THREE.Mesh | null = null

// Efek
let beam: THREE.Group | null = null
let beamOuterMat: THREE.MeshBasicMaterial | null = null
let beamCoreMat: THREE.MeshBasicMaterial | null = null
let mouthLight: THREE.PointLight | null = null
let glowMat: THREE.MeshStandardMaterial | null = null
let bodyMatRef: THREE.MeshStandardMaterial | null = null
let particles: THREE.Points | null = null
let particleBase: Float32Array | null = null
let bumpTex: THREE.CanvasTexture | null = null
let spiral: THREE.Mesh | null = null
let backBeams: THREE.Group[] = []
let pulseShells: THREE.Mesh[] = []
let chargeFinMats: THREE.MeshStandardMaterial[] = []
let distortRings: THREE.Mesh[] = []
let stompRing: THREE.Mesh | null = null

/** Acak deterministik agar durasi tiap siklus bervariasi tanpa Math.random di loop. */
function rnd(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

function roughen(geo: THREE.BufferGeometry, amt: number, freq = 1): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const nor = geo.attributes.normal as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const d =
      (Math.sin(x * 11 * freq + 1.3) +
        Math.sin(y * 13 * freq + 4.1) +
        Math.sin(z * 12 * freq + 2.2)) /
      3
    pos.setXYZ(i, x + nor.getX(i) * d * amt, y + nor.getY(i) * d * amt, z + nor.getZ(i) * d * amt)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

function makeBumpTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgb(128,128,128)'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1400; i++) {
    const v = 95 + Math.floor(Math.random() * 80)
    ctx.fillStyle = `rgba(${v},${v},${v},0.6)`
    ctx.beginPath()
    ctx.arc(Math.random() * 256, Math.random() * 256, 0.6 + Math.random() * 2.6, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 3)
  return tex
}

function makeFinGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  s.moveTo(-0.5, 0)
  const pts: Array<[number, number]> = [
    [-0.42, 0.34],
    [-0.3, 0.2],
    [-0.18, 0.6],
    [-0.04, 0.38],
    [0.08, 0.78],
    [0.2, 0.42],
    [0.32, 0.56],
    [0.42, 0.22],
    [0.5, 0],
  ]
  for (const [x, y] of pts) s.lineTo(x, y)
  s.closePath()
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  })
}

function makeMiniBeam(color: string, length: number): THREE.Group {
  const grp = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.012, length, 8), mat)
  m.rotation.x = Math.PI / 2
  m.position.z = length / 2
  grp.add(m)
  grp.visible = false
  return grp
}

function buildKaiju(bodyColor: string, glowColor: string): THREE.Group {
  const g = new THREE.Group()
  bumpTex = makeBumpTexture()

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.95,
    metalness: 0.02,
    bumpMap: bumpTex,
    bumpScale: 0.55,
  })
  bodyMatRef = bodyMat
  if (bh.attack === 'meltdown') {
    bodyMat.emissive = new THREE.Color('#ff3a1a')
    bodyMat.emissiveIntensity = 0.08
  }
  const bellyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bodyColor).lerp(new THREE.Color('#cfc6a5'), 0.35),
    roughness: 0.9,
    bumpMap: bumpTex,
    bumpScale: 0.4,
  })
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x23291f, roughness: 0.35 })
  glowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 1.0,
    roughness: 0.45,
  })

  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    parent: THREE.Object3D = g,
  ) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...pos)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }

  // ===== Rangka badan: panggul → punggung bawah → punggung atas =====
  pelvis = new THREE.Group()
  pelvis.position.set(0, 1.05, 0)
  g.add(pelvis)
  const hips = add(roughen(new THREE.SphereGeometry(0.54, 24, 18), 0.03, 1.4), bodyMat, [0, 0, 0], pelvis)
  hips.scale.set(1, 0.88, 0.95)

  spineLower = new THREE.Group()
  spineLower.position.set(0, 0.3, 0)
  pelvis.add(spineLower)
  const belly = add(
    roughen(new THREE.CylinderGeometry(0.44, 0.52, 0.8, 20, 6), 0.03, 1.6),
    bodyMat,
    [0, 0.2, 0],
    spineLower,
  )
  belly.scale.set(1, 1, 0.92)
  const plates = add(
    roughen(new THREE.CylinderGeometry(0.3, 0.4, 1.05, 14, 8), 0.02, 3.2),
    bellyMat,
    [0, 0.15, 0.17],
    spineLower,
  )
  plates.scale.set(0.82, 1, 0.55)

  spineUpper = new THREE.Group()
  spineUpper.position.set(0, 0.55, 0)
  spineLower.add(spineUpper)
  chest = add(roughen(new THREE.SphereGeometry(0.48, 24, 18), 0.03, 1.5), bodyMat, [0, 0.12, 0], spineUpper)
  chest.scale.set(1, 0.95, 0.85)
  const neck = add(
    roughen(new THREE.CylinderGeometry(0.2, 0.32, 0.6, 16, 4), 0.025, 2),
    bodyMat,
    [0, 0.55, 0.08],
    spineUpper,
  )
  neck.rotation.x = 0.25

  // ===== Kepala =====
  const h = new THREE.Group()
  head = h
  h.position.set(0, 0.9, 0.18)
  spineUpper.add(h)
  const skull = add(roughen(new THREE.SphereGeometry(0.27, 22, 16), 0.02, 2.4), bodyMat, [0, 0, 0], h)
  skull.scale.set(1, 0.85, 1.15)
  const snout = add(roughen(new THREE.SphereGeometry(0.18, 18, 14), 0.015, 3), bodyMat, [0, -0.05, 0.34], h)
  snout.scale.set(0.85, 0.55, 1.35)
  for (const s of [1, -1]) {
    add(new THREE.SphereGeometry(0.022, 8, 6), clawMat, [s * 0.06, 0.03, 0.55], h)
  }

  const toothMat = new THREE.MeshStandardMaterial({ color: 0xf3eedd, roughness: 0.4 })
  const upperTeeth: Array<[number, number]> = [
    [-0.08, 0.52],
    [0, 0.55],
    [0.08, 0.52],
    [-0.11, 0.42],
    [0.11, 0.42],
    [-0.13, 0.3],
    [0.13, 0.3],
    [-0.14, 0.19],
    [0.14, 0.19],
  ]
  upperTeeth.forEach(([x, z], i) => {
    const len = 0.06 + (i % 3) * 0.012
    const tooth = add(new THREE.ConeGeometry(0.02, len, 6), toothMat, [x, -0.13, z], h)
    tooth.rotation.x = Math.PI
    tooth.rotation.z = (i % 2 ? 1 : -1) * 0.08
  })

  jaw = new THREE.Group()
  jaw.position.set(0, -0.15, 0.06)
  h.add(jaw)
  const jawMesh = add(roughen(new THREE.SphereGeometry(0.16, 16, 12), 0.012, 3), bodyMat, [0, -0.02, 0.22], jaw)
  jawMesh.scale.set(0.78, 0.42, 1.35)
  const lowerTeeth: Array<[number, number]> = [
    [0, 0.42],
    [-0.07, 0.39],
    [0.07, 0.39],
    [-0.09, 0.28],
    [0.09, 0.28],
    [-0.1, 0.18],
    [0.1, 0.18],
  ]
  lowerTeeth.forEach(([x, z], i) => {
    add(new THREE.ConeGeometry(0.018, 0.055 + (i % 2) * 0.012, 6), toothMat, [x, 0.04, z], jaw)
  })

  for (const s of [1, -1]) {
    add(new THREE.SphereGeometry(0.05, 10, 8), glowMat, [s * 0.18, 0.05, 0.21], h)
    const brow = add(roughen(new THREE.SphereGeometry(0.09, 10, 8), 0.012, 3), bodyMat, [s * 0.17, 0.13, 0.2], h)
    brow.scale.set(1, 0.5, 1.25)
  }

  // ===== Sinar atom dari mulut =====
  const b = new THREE.Group()
  beam = b
  b.position.set(0, -0.1, 0.45)
  b.rotation.x = 0.08
  b.visible = false
  h.add(b)
  beamOuterMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.05, 7, 10, 1, true), beamOuterMat)
  outer.rotation.x = Math.PI / 2
  outer.position.z = 3.5
  b.add(outer)
  beamCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 7, 8), beamCoreMat)
  core.rotation.x = Math.PI / 2
  core.position.z = 3.5
  b.add(core)
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), beamCoreMat)
  muzzle.position.set(0, 0, 0.1)
  b.add(muzzle)
  mouthLight = new THREE.PointLight(glowColor, 0, 7)
  mouthLight.position.set(0, 0, 0.6)
  b.add(mouthLight)

  if (bh.attack === 'spiral' || bh.attack === 'meltdown') {
    const helixPts: THREE.Vector3[] = []
    for (let i = 0; i <= 110; i++) {
      const zz = (i / 110) * 7
      const ang = (i / 110) * Math.PI * 10
      helixPts.push(new THREE.Vector3(Math.cos(ang) * 0.14, Math.sin(ang) * 0.14, zz))
    }
    const helixGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 110, 0.024, 6)
    spiral = new THREE.Mesh(
      helixGeo,
      new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    b.add(spiral)
  }

  // ===== Lengan (berporos di bahu, menempel ke punggung atas) =====
  arms = []
  for (const s of [1, -1]) {
    const arm = new THREE.Group()
    arm.position.set(s * 0.37, 0.23, 0.1)
    spineUpper.add(arm)
    add(roughen(new THREE.SphereGeometry(0.13, 12, 10), 0.015, 3), bodyMat, [0, 0, 0], arm)
    const upper = add(
      roughen(new THREE.CylinderGeometry(0.075, 0.1, 0.36, 12, 3), 0.015, 3),
      bodyMat,
      [s * 0.06, -0.13, 0.08],
      arm,
    )
    upper.rotation.set(0.5, 0, s * -0.45)
    add(roughen(new THREE.SphereGeometry(0.08, 10, 8), 0.012, 3), bodyMat, [s * 0.11, -0.23, 0.17], arm)
    const fore = add(
      roughen(new THREE.CylinderGeometry(0.055, 0.075, 0.3, 12, 3), 0.012, 3),
      bodyMat,
      [s * 0.13, -0.29, 0.29],
      arm,
    )
    fore.rotation.set(1.15, 0, s * -0.2)
    for (let i = -1; i <= 1; i++) {
      const claw = add(
        new THREE.ConeGeometry(0.022, 0.09, 6),
        clawMat,
        [s * 0.14 + i * 0.035, -0.39, 0.42],
        arm,
      )
      claw.rotation.x = 1.9
    }
    arms.push(arm)
  }

  // ===== Kaki berartikulasi: pinggul → lutut → pergelangan =====
  legs = []
  for (const s of [1, -1]) {
    const hip = new THREE.Group()
    hip.position.set(s * 0.31, 1.02, 0)
    g.add(hip)
    const thigh = add(
      roughen(new THREE.CylinderGeometry(0.18, 0.27, 0.6, 16, 4), 0.025, 2),
      bodyMat,
      [0, -0.3, 0],
      hip,
    )
    thigh.rotation.z = s * -0.08

    const knee = new THREE.Group()
    knee.position.set(s * 0.03, -0.58, 0.03)
    hip.add(knee)
    add(
      roughen(new THREE.CylinderGeometry(0.13, 0.18, 0.48, 14, 3), 0.02, 2.4),
      bodyMat,
      [0, -0.08, 0.01],
      knee,
    )

    const ankle = new THREE.Group()
    ankle.position.set(0, -0.3, 0.03)
    knee.add(ankle)
    const foot = add(roughen(new THREE.SphereGeometry(0.19, 14, 10), 0.02, 2.6), bodyMat, [0, -0.04, 0.06], ankle)
    foot.scale.set(0.95, 0.55, 1.5)
    for (let i = -1; i <= 1; i++) {
      const claw = add(new THREE.ConeGeometry(0.04, 0.14, 6), clawMat, [i * 0.1, -0.08, 0.32], ankle)
      claw.rotation.x = 1.35
    }
    legs.push({ hip, knee, ankle })
  }

  // ===== Ekor (menempel ke panggul) =====
  tailSegments = []
  const tailFinMats: THREE.MeshStandardMaterial[] = []
  let parent: THREE.Object3D = pelvis
  const finGeo = makeFinGeometry()
  const finMatFor = (store: THREE.MeshStandardMaterial[]): THREE.MeshStandardMaterial => {
    if (bh.attack === 'charge') {
      const m = glowMat!.clone()
      store.push(m)
      return m
    }
    return glowMat!
  }
  for (let i = 0; i < 10; i++) {
    const seg = new THREE.Group()
    if (i === 0) seg.position.set(0, -0.03, -0.44)
    else seg.position.set(0, i < 4 ? -0.025 : 0.02, -0.29)
    parent.add(seg)
    const r = Math.max(0.3 - i * 0.028, 0.04)
    const ball = add(roughen(new THREE.SphereGeometry(r, 14, 10), r * 0.08, 2.2), bodyMat, [0, 0, 0], seg)
    ball.scale.set(1, 0.9, 1.3)
    if (i < 5) {
      const fin = new THREE.Mesh(finGeo, finMatFor(tailFinMats))
      const fs = 0.34 - i * 0.05
      fin.scale.set(fs, fs, fs)
      fin.position.set(0, r * 0.8, 0)
      fin.rotation.y = Math.PI / 2
      fin.castShadow = true
      seg.add(fin)
    }
    tailSegments.push(seg)
    parent = seg
  }

  // ===== Sirip punggung: ikut melengkung bersama tulang belakang =====
  const spineFinMats: THREE.MeshStandardMaterial[] = []
  const spineDefs: Array<[number, number, number]> = [
    [2.5, -0.26, 0.42],
    [2.18, -0.46, 0.66],
    [1.84, -0.58, 0.9],
    [1.48, -0.62, 0.95],
    [1.14, -0.6, 0.7],
  ]
  for (const [wy, z, fs] of spineDefs) {
    // Sirip atas menempel ke punggung atas (poros dunia y=1.9),
    // sirip bawah ke punggung bawah (poros dunia y=1.35)
    const toUpper = wy >= 1.6
    const host = toUpper ? spineUpper! : spineLower!
    const relY = toUpper ? wy - 1.9 : wy - 1.35
    const mat = finMatFor(spineFinMats)
    const fin = new THREE.Mesh(finGeo, mat)
    fin.scale.set(fs, fs, fs)
    fin.position.set(0, relY, z)
    fin.rotation.y = Math.PI / 2
    fin.castShadow = true
    host.add(fin)
    for (const s of [1, -1]) {
      const small = new THREE.Mesh(finGeo, mat)
      small.scale.set(fs * 0.45, fs * 0.45, fs * 0.45)
      small.position.set(s * 0.15, relY - 0.08, z + 0.06)
      small.rotation.y = Math.PI / 2
      host.add(small)
    }
  }
  chargeFinMats = [...tailFinMats.reverse(), ...spineFinMats.reverse()]

  // Sinar punggung & ekor Shin
  backBeams = []
  if (bh.attack === 'backBeams') {
    spineDefs.forEach(([wy, z], i) => {
      const toUpper = wy >= 1.6
      const host = toUpper ? spineUpper! : spineLower!
      const relY = (toUpper ? wy - 1.9 : wy - 1.35) + 0.25
      const mini = makeMiniBeam(glowColor, 3)
      mini.position.set(0, relY, z)
      mini.rotation.x = -2.25 + i * 0.12
      host.add(mini)
      backBeams.push(mini)
    })
    const tailBeam = makeMiniBeam(glowColor, 3.5)
    tailBeam.position.set(0, 0, -0.15)
    tailBeam.rotation.x = Math.PI * 0.94
    tailSegments[tailSegments.length - 1]!.add(tailBeam)
    backBeams.push(tailBeam)
  }

  // Cincin hentakan kaki / gelombang tanah
  stompRing = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.52, 48),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  stompRing.rotation.x = -Math.PI / 2
  stompRing.position.y = 0.02
  stompRing.visible = false
  g.add(stompRing)

  // Cincin distorsi Ultima mengikuti tubuh
  distortRings = []
  if (bh.rings) {
    for (let i = 0; i < 2; i++) {
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.35 + i * 0.35, 0.012, 8, 90),
        new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      ringMesh.position.y = 1.5
      g.add(ringMesh)
      distortRings.push(ringMesh)
    }
  }

  // Cangkang gelombang kejut Earth mengikuti tubuh
  pulseShells = []
  if (bh.attack === 'pulse') {
    for (let i = 0; i < 3; i++) {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 16),
        new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
      shell.position.y = 1.4
      shell.visible = false
      g.add(shell)
      pulseShells.push(shell)
    }
  }

  g.scale.setScalar(bh.scale)
  return g
}

function init() {
  const el = container.value
  if (!el) return
  const w = el.clientWidth || 560
  const h = el.clientHeight || 330

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e0b)
  scene.fog = new THREE.Fog(0x0a0e0b, 9, 20)

  const sc = bh.scale
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50)
  camera.position.set(3.6 * sc, 2.4 * sc, 4.6 * sc)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.setClearColor(0x0a0e0b)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.4
  el.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.45 * sc, 0)
  controls.enableDamping = true
  controls.enablePan = false
  controls.autoRotate = true
  controls.autoRotateSpeed = bh.rotate
  controls.minDistance = 2.5 * sc
  controls.maxDistance = 9 * sc
  controls.maxPolarAngle = 1.5

  scene.add(new THREE.HemisphereLight(0x6b7f72, 0x05080a, 0.7))
  const key = new THREE.DirectionalLight(0xfff3e0, 2.0)
  key.position.set(3.5, 6, 3)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = key.shadow.camera.bottom = -5.5
  key.shadow.camera.right = key.shadow.camera.top = 5.5
  key.shadow.camera.near = 1
  key.shadow.camera.far = 16
  key.shadow.bias = -0.002
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x3a4a66, 0.5)
  fill.position.set(-4, 2.5, -2)
  scene.add(fill)
  const rim = new THREE.PointLight(props.godzilla.glow, 30, 14)
  rim.position.set(-2.6, 2.6, -2.6)
  scene.add(rim)

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4 * sc, 48),
    new THREE.MeshStandardMaterial({ color: 0x0c1310, roughness: 1 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.9 * sc, 3.02 * sc, 64),
    new THREE.MeshBasicMaterial({
      color: props.godzilla.glow,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.01
  scene.add(ring)
  const grid = new THREE.GridHelper(9, 18, 0x1d2a22, 0x141f19)
  grid.position.y = 0.005
  scene.add(grid)

  kaiju = buildKaiju(props.godzilla.color, props.godzilla.glow)
  scene.add(kaiju)

  const pCount = bh.attack === 'meltdown' ? 160 : 90
  const arr = new Float32Array(pCount * 3)
  for (let i = 0; i < pCount; i++) {
    const r = 0.7 + Math.random() * 2.2
    const a = Math.random() * Math.PI * 2
    arr[i * 3] = r * Math.cos(a)
    arr[i * 3 + 1] = Math.random() * 3.8
    arr[i * 3 + 2] = r * Math.sin(a)
  }
  particleBase = arr.slice()
  const pGeo = new THREE.BufferGeometry()
  pGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: props.godzilla.glow,
      size: 0.04,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  scene.add(particles)

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.4, 0.7))
  composer.addPass(new OutputPass())

  resizeObserver = new ResizeObserver(() => {
    const nw = el.clientWidth
    const nh = el.clientHeight
    if (!nw || !nh || !renderer || !composer) return
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh)
    composer.setSize(nw, nh)
  })
  resizeObserver.observe(el)

  // ===== Mesin perilaku =====
  // berjalan → mengamati → mengancam → menyerang → memulihkan diri → ulang
  type State = 'walk' | 'idle' | 'aggro' | 'attack' | 'cool'
  const windows = fireWindows(bh.attack)
  const holdEnd = ATTACK_HOLD[bh.attack]
  const durFor = (s: State, n: number): number => {
    switch (s) {
      case 'walk':
        // Siklus pertama lebih singkat agar serangan cepat terlihat
        return n === 0 ? 3 + 1.5 * rnd(n * 4 + 1) : 6 + 5 * rnd(n * 4 + 1)
      case 'idle':
        // Siklus pertama: langsung sigap supaya serangan cepat terlihat
        return n === 0 ? 1.2 : 2.2 + 2.2 * rnd(n * 4 + 2)
      case 'aggro':
        return 1.2
      case 'attack':
        return holdEnd + 0.9
      case 'cool':
        return 1.5
    }
  }
  const NEXT: Record<State, State> = { walk: 'idle', idle: 'aggro', aggro: 'attack', attack: 'cool', cool: 'walk' }
  const LABELS: Record<State, string> = {
    walk: 'Berjalan mengelilingi arena',
    idle: 'Mengamati sekitar',
    aggro: 'Mengancam!',
    attack: 'MENYERANG!',
    cool: 'Memulihkan diri',
  }

  // Debug: ?g3d=attack mengunci state (dipakai untuk pengujian visual)
  const pinned = new URLSearchParams(window.location.search).get('g3d') as State | null

  let state: State = 'walk'
  let stateT0 = 0
  let cyc = 0
  let wWalk = 0
  let wAggro = 0
  let walkPhi = rnd(1) * Math.PI * 2 // posisi awal di lintasan
  let strideTheta = 0
  let tPrev = 0
  const R = 1.2 * sc // radius lintasan keliling arena
  const followTarget = new THREE.Vector3()

  // Pelacak pemicu suara
  let prevState: State = state
  let wasFiring = false
  let lastStepIdx = 0
  let stompPlayed = false
  let lastJabIdx = 0
  const shellWasOn = [false, false, false]

  const t0 = performance.now()
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    const t = (performance.now() - t0) / 1000
    const dt = Math.min(0.05, t - tPrev)
    tPrev = t

    // Transisi state otomatis. Setelah mengamati, kadang menyerang,
    // kadang hanya lanjut berjalan — kecuali siklus pertama selalu
    // menyerang agar cepat terlihat.
    if (t - stateT0 > durFor(state, cyc)) {
      if (state === 'cool') cyc++
      if (state === 'idle' && cyc > 0 && rnd(cyc * 7 + 3) < 0.45) {
        state = 'walk'
      } else {
        state = NEXT[state]
      }
      stateT0 = t
      stateLabel.value = LABELS[state]
    }
    if (pinned && NEXT[pinned]) {
      state = pinned
      stateT0 = Math.floor(t / durFor(pinned, 1)) * durFor(pinned, 1)
      stateLabel.value = LABELS[state]
    }
    const sT = t - stateT0

    // Suara saat berganti fase: menggeram saat mengancam, mengaum saat menyerang
    if (state !== prevState) {
      if (state === 'aggro') {
        audio?.roar(bh.roarPitch * 1.1, 1.0, 0.55)
        stompPlayed = false
      } else if (state === 'attack') {
        audio?.roar(bh.roarPitch, 1.9, 1)
        if (bh.attack === 'charge') audio?.charge(1.4)
      }
      prevState = state
    }

    // Bobot pose di-lerp agar transisi mulus tanpa patah
    const wWalkT = state === 'walk' ? 1 : 0
    const wAggroT = state === 'aggro' ? 1 : state === 'attack' ? 0.3 : 0
    wWalk += (wWalkT - wWalk) * Math.min(1, dt * 3)
    wAggro += (wAggroT - wAggro) * Math.min(1, dt * 4)

    const ts = t * bh.speed
    const ti = bh.twitchy ? ts + 0.06 * Math.sin(t * 14) : ts

    // Fase serangan (hanya berjalan saat state attack/cool)
    const phase = state === 'attack' ? sT : -1
    let env = phase < 0 ? 0 : phase < 0.5 ? phase / 0.5 : phase < holdEnd ? 1 : Math.max(0, (holdEnd + 0.6 - phase) / 0.6)
    env = smooth(env)
    const firing = phase >= 0 && windows.some(([a, b2]) => phase > a && phase < b2)
    const flicker = 0.7 + 0.3 * Math.sin(t * 48)

    // Dengungan sinar menyala/mati mengikuti semburan
    if (firing && !wasFiring) audio?.beamStart(bh.roarPitch)
    if (!firing && wasFiring) audio?.beamStop()
    wasFiring = firing

    // ===== Lokomosi: berjalan mengelilingi arena =====
    walkPhi += bh.walkSpeed * dt * wWalk
    strideTheta += bh.strideFreq * dt * wWalk
    const θ = strideTheta
    if (kaiju) {
      kaiju.position.x = R * Math.sin(walkPhi)
      kaiju.position.z = R * Math.cos(walkPhi)
      const punchTwist = bh.attack === 'punch' ? 0.1 * Math.sin(t * 9) * env : 0
      kaiju.rotation.y = walkPhi + Math.PI / 2 + punchTwist
      // Badan naik-turun mengikuti langkah + napas
      kaiju.position.y = 0.05 * Math.abs(Math.cos(θ)) * wWalk * sc + 0.012 * Math.sin(ti * 1.8) * sc
      const recoil = bh.attack === 'charge' && firing ? 0.1 * flicker : 0
      kaiju.rotation.x = bh.lean - recoil
      kaiju.rotation.z = 0.012 * Math.sin(ti * 0.9)
    }

    // Dentuman langkah kaki (satu dentuman tiap kaki menapak)
    const stepIdx = Math.floor(θ / Math.PI)
    if (stepIdx !== lastStepIdx && wWalk > 0.5) {
      audio?.step(bh.scale > 1.15)
      lastStepIdx = stepIdx
    }

    // ===== Kaki: pinggul-lutut-pergelangan =====
    const stompT = bh.stomper && state === 'aggro' ? sT / 1.2 : -1
    const stompLift = stompT >= 0 ? (stompT < 0.55 ? smooth(stompT / 0.55) : Math.max(0, 1 - (stompT - 0.55) / 0.18)) : 0
    legs.forEach((leg, i) => {
      const off = i * Math.PI
      const swing = Math.sin(θ + off)
      const liftP = Math.max(0, Math.sin(θ + off + Math.PI / 2))
      let hipX = -0.42 * swing * wWalk + 0.12 * wAggro
      let kneeX = 0.1 + 0.6 * liftP * wWalk + 0.32 * wAggro
      if (i === 0 && stompLift > 0) {
        hipX -= 0.85 * stompLift
        kneeX += 0.95 * stompLift
      }
      leg.hip.rotation.x = hipX
      leg.knee.rotation.x = kneeX
      leg.ankle.rotation.x = -(hipX + kneeX) * 0.5
    })

    // Cincin hentakan tanah saat kaki menghantam
    if (stompRing) {
      const slam = stompT >= 0 && stompT > 0.62 ? Math.min(1, (stompT - 0.62) / 0.38) : -1
      const mat = stompRing.material as THREE.MeshBasicMaterial
      if (slam >= 0) {
        if (!stompPlayed) {
          stompPlayed = true
          audio?.step(true)
          audio?.whoosh(280, 0.5, 0.5)
        }
        stompRing.visible = true
        stompRing.scale.setScalar(0.6 + 2.4 * slam)
        mat.opacity = 0.55 * (1 - slam)
      } else {
        stompRing.visible = false
        mat.opacity = 0
      }
    }

    // ===== Tulang belakang: napas, membungkuk siaga, melengkung saat mengaum =====
    if (spineLower) {
      spineLower.rotation.x = 0.04 * Math.sin(ti * 1.8) * 0.3 + 0.08 * wAggro - 0.06 * env
      spineLower.rotation.z = -0.03 * Math.sin(θ) * wWalk
    }
    if (spineUpper) {
      spineUpper.rotation.x = 0.02 * Math.sin(ti * 1.8) + 0.16 * wAggro - 0.14 * env
      spineUpper.rotation.y = 0.05 * Math.sin(θ) * wWalk
    }
    if (pelvis) {
      pelvis.rotation.z = 0.05 * Math.sin(θ) * wWalk + 0.012 * Math.sin(ti * 0.9)
      pelvis.rotation.y = 0.06 * Math.sin(θ) * wWalk
      pelvis.position.y = 1.05 - 0.1 * wAggro
    }
    if (chest) {
      const s = 0.018 * Math.sin(ti * 1.8)
      chest.scale.set(1 + s, 0.95 + s, 0.85 + s)
    }

    // ===== Kepala & rahang =====
    if (jaw) {
      const idle = Math.pow(0.5 + 0.5 * Math.sin(ti * 0.9), 3) * 0.1
      jaw.rotation.x = 0.06 + idle * (1 - env) + 0.2 * wAggro + 0.55 * env
    }
    if (head) {
      if (bh.attack === 'charge') {
        head.rotation.x = phase >= 0 && phase < 1.6 ? 0.14 * env : -0.45 * env
      } else if (bh.attack === 'sweep') {
        head.rotation.x = -0.22 * env
      } else if (bh.attack === 'punch') {
        head.rotation.x = -0.08 * env
      } else {
        head.rotation.x = -0.42 * env
      }
      head.rotation.x += 0.1 * wAggro - 0.05 * Math.sin(ti * 0.7) * (1 - env) * 0.5

      if (bh.attack === 'sweep' && firing) {
        head.rotation.y = 0.42 * Math.sin((phase - 0.6) * 2.4)
      } else {
        // Saat berhenti mengamati, kepala menoleh lebih lebar
        const sway = state === 'idle' ? bh.headSway * 1.6 : bh.headSway * 0.6
        head.rotation.y = sway * Math.sin(ti * 0.45) * (1 - env)
      }
      // Gelengan kepala saat memulihkan diri setelah menembak
      if (state === 'cool') {
        head.rotation.z = 0.1 * Math.sin(sT * 13) * Math.exp(-sT * 2.6)
      } else if (bh.twitchy) {
        head.rotation.z = 0.045 * Math.sin(t * 16) * (1 - env)
      } else {
        head.rotation.z = 0
      }
    }

    // ===== Sinar & efek serangan =====
    if (beam) {
      beam.visible = firing
      const bw = bh.beamWidth
      beam.scale.set(flicker * bw, flicker * bw, 1)
    }
    if (beamOuterMat) beamOuterMat.opacity = 0.1 + 0.45 * flicker
    if (beamCoreMat) beamCoreMat.opacity = 0.85 * flicker
    if (mouthLight) mouthLight.intensity = firing ? 55 * flicker : 0
    if (spiral) spiral.rotation.z = t * 13

    for (const mb of backBeams) {
      mb.visible = firing
      const ms = 0.8 + 0.35 * Math.sin(t * 40 + mb.position.y * 7)
      mb.scale.set(ms, ms, 1)
    }

    // Tinju Showa: jab bergantian, selain itu lengan mengayun saat berjalan
    if (bh.attack === 'punch' && env > 0.01 && arms.length === 2) {
      const jabL = Math.max(0, Math.sin(t * 9))
      const jabR = Math.max(0, Math.sin(t * 9 + Math.PI))
      arms[0]!.rotation.x = -0.06 - 1.15 * jabL * env
      arms[1]!.rotation.x = -0.06 - 1.15 * jabR * env
      // Wuss tiap sabetan tinju
      const jabIdx = Math.floor((t * 9) / Math.PI)
      if (jabIdx !== lastJabIdx && env > 0.5) {
        audio?.whoosh(1300, 0.2, 0.3)
        lastJabIdx = jabIdx
      }
    } else {
      arms.forEach((arm, i) => {
        arm.rotation.x =
          -0.05 + 0.035 * Math.sin(ti * 1.8 + i * 2.1) + 0.3 * Math.sin(θ + (i ? 0 : Math.PI)) * wWalk
      })
    }

    // Charge Minus One: sirip menyala berurutan ekor → kepala
    if (bh.attack === 'charge' && chargeFinMats.length) {
      const base = 0.5 + 0.2 * Math.sin(t * 2.3)
      if (phase > 0.2 && phase < 3.1) {
        const prog = Math.min((phase - 0.2) / 1.4, 1) * chargeFinMats.length
        chargeFinMats.forEach((m, i) => {
          m.emissiveIntensity = i < prog ? 2.7 : 0.2
        })
      } else {
        chargeFinMats.forEach((m) => (m.emissiveIntensity = base))
      }
    }

    // Gelombang kejut Earth
    pulseShells.forEach((shell, i) => {
      const start = 0.8 + i * 0.55
      const pw = phase >= 0 ? (phase - start) / 0.9 : -1
      const mat = shell.material as THREE.MeshBasicMaterial
      if (pw > 0 && pw < 1) {
        if (!shellWasOn[i]) {
          shellWasOn[i] = true
          audio?.whoosh(420, 0.7, 0.5)
        }
        shell.visible = true
        shell.scale.setScalar(0.6 + pw * 3.4)
        mat.opacity = 0.4 * (1 - pw)
      } else {
        shellWasOn[i] = false
        shell.visible = false
        mat.opacity = 0
      }
    })

    // Cincin distorsi Ultima
    distortRings.forEach((rg, i) => {
      rg.rotation.x = Math.PI / 2 + 0.35 * Math.sin(t * 0.6 + i * 1.7)
      rg.rotation.z = t * (0.35 + i * 0.2)
      rg.position.y = 1.5 + 0.15 * Math.sin(t * 0.8 + i * 2)
      const rm = rg.material as THREE.MeshBasicMaterial
      rm.opacity = 0.3 + 0.25 * env
    })

    // Ekor: melambai lebih aktif saat berjalan
    const tailW = bh.tailAmp * (1 + 0.8 * wWalk)
    tailSegments.forEach((seg, i) => {
      seg.rotation.y = Math.sin(ti * 1.7 - i * 0.5) * 0.13 * tailW
      seg.rotation.x = Math.sin(ti * 1.1 - i * 0.4) * 0.03 * tailW
    })

    // Sirip berdenyut — berkedip cepat saat mengancam
    if (glowMat && bh.attack !== 'charge') {
      glowMat.emissiveIntensity =
        0.9 + 0.35 * Math.sin(t * 2.3) + 1.0 * env + 0.6 * Math.max(0, Math.sin(t * 9)) * wAggro
    } else if (glowMat) {
      glowMat.emissiveIntensity = 0.9 + 0.35 * Math.sin(t * 2.3) + 0.6 * Math.max(0, Math.sin(t * 9)) * wAggro
    }

    if (bodyMatRef && bh.attack === 'meltdown') {
      bodyMatRef.emissiveIntensity = 0.08 + 0.45 * env + 0.06 * Math.sin(t * 30) * env
    }

    // Partikel energi
    if (particles && particleBase) {
      const pos = particles.geometry.attributes.position as THREE.BufferAttribute
      const rate = bh.attack === 'meltdown' ? 0.45 : 0.22
      for (let i = 0; i < pos.count; i++) {
        const bx = particleBase[i * 3]!
        const by = particleBase[i * 3 + 1]!
        const bz = particleBase[i * 3 + 2]!
        pos.setXYZ(
          i,
          bx + 0.08 * Math.sin(t * 0.7 + i),
          (by + t * rate + i * 0.041) % 3.8,
          bz + 0.08 * Math.cos(t * 0.6 + i * 1.3),
        )
      }
      pos.needsUpdate = true
    }

    // Kamera mengikuti Godzilla dengan halus saat ia berkeliling
    if (controls && kaiju) {
      followTarget.set(kaiju.position.x, 1.45 * sc, kaiju.position.z)
      controls.target.lerp(followTarget, Math.min(1, dt * 2.5))
    }

    controls?.update()
    composer?.render()
  }
  animate()
}

function cleanup() {
  cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  controls?.dispose()
  scene?.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    mesh.geometry?.dispose?.()
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach((m) => m?.dispose?.())
  })
  bumpTex?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
  composer = null
  scene = null
  kaiju = null
  pelvis = null
  spineLower = null
  spineUpper = null
  head = null
  jaw = null
  legs = []
  arms = []
  tailSegments = []
  chest = null
  beam = null
  beamOuterMat = null
  beamCoreMat = null
  mouthLight = null
  glowMat = null
  bodyMatRef = null
  particles = null
  particleBase = null
  bumpTex = null
  spiral = null
  backBeams = []
  pulseShells = []
  chargeFinMats = []
  distortRings = []
  stompRing = null
}

// Komponen .client.vue: template baru ter-render satu tick setelah mounted,
// jadi tunggu nextTick agar ref container terisi.
onMounted(async () => {
  await nextTick()
  audio = new KaijuAudio()
  soundOn.value = localStorage.getItem('g3d-sound') !== '0'
  audio.setMuted(!soundOn.value)
  init()
})

onBeforeUnmount(() => {
  audio?.dispose()
  audio = null
  cleanup()
})
</script>

<template>
  <div ref="container" class="viewer">
    <span class="attack-label">⚡ {{ bh.label }}</span>
    <span class="state-label">{{ stateLabel }}</span>
    <button
      class="sound-btn"
      type="button"
      :aria-label="soundOn ? 'Matikan suara' : 'Nyalakan suara'"
      @click="toggleSound"
    >
      {{ soundOn ? '🔊' : '🔇' }}
    </button>
    <span class="hint">🖱️ Seret untuk memutar · scroll untuk zoom</span>
  </div>
</template>

<style scoped>
.viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.viewer :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.attack-label {
  position: absolute;
  top: 0.7rem;
  left: 0.8rem;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text);
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.22rem 0.8rem;
  border-radius: 999px;
  pointer-events: none;
  white-space: nowrap;
}

.state-label {
  position: absolute;
  top: 0.7rem;
  right: 0.8rem;
  font-size: 0.72rem;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.22rem 0.8rem;
  border-radius: 999px;
  pointer-events: none;
  white-space: nowrap;
}

.sound-btn {
  position: absolute;
  bottom: 0.55rem;
  right: 0.7rem;
  width: 34px;
  height: 34px;
  font-size: 0.95rem;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, border-color 0.15s;
}

.sound-btn:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.35);
}

.hint {
  position: absolute;
  bottom: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.72rem;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.45);
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  pointer-events: none;
  white-space: nowrap;
}
</style>
