<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { Godzilla } from '~/types'

const props = defineProps<{
  godzilla: Godzilla
}>()

const container = ref<HTMLDivElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let controls: OrbitControls | null = null
let scene: THREE.Scene | null = null
let rafId = 0
let resizeObserver: ResizeObserver | null = null

// Bagian yang dianimasikan tiap frame
let chest: THREE.Mesh | null = null
let jaw: THREE.Group | null = null
let head: THREE.Group | null = null
let beam: THREE.Group | null = null
let beamOuterMat: THREE.MeshBasicMaterial | null = null
let beamCoreMat: THREE.MeshBasicMaterial | null = null
let mouthLight: THREE.PointLight | null = null
let tailSegments: THREE.Group[] = []
let glowMat: THREE.MeshStandardMaterial | null = null
let kaiju: THREE.Group | null = null
let particles: THREE.Points | null = null
let particleBase: Float32Array | null = null
let bumpTex: THREE.CanvasTexture | null = null

/**
 * Geser tiap vertex sepanjang normalnya dengan noise deterministik —
 * membuat permukaan halus jadi berbonggol organik seperti kulit kaiju.
 */
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
    pos.setXYZ(
      i,
      x + nor.getX(i) * d * amt,
      y + nor.getY(i) * d * amt,
      z + nor.getZ(i) * d * amt,
    )
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

/** Tekstur bump dari kanvas: bintik acak agar kulit terlihat bersisik. */
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

/** Sirip punggung bergerigi khas Godzilla (bidang pipih, bukan kerucut). */
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

  // ===== Torso: tumpukan bentuk organik yang di-roughen =====
  const hips = add(roughen(new THREE.SphereGeometry(0.54, 24, 18), 0.03, 1.4), bodyMat, [0, 1.05, 0])
  hips.scale.set(1, 0.88, 0.95)
  const belly = add(
    roughen(new THREE.CylinderGeometry(0.44, 0.52, 0.8, 20, 6), 0.03, 1.6),
    bodyMat,
    [0, 1.55, 0],
  )
  belly.scale.set(1, 1, 0.92)
  chest = add(roughen(new THREE.SphereGeometry(0.48, 24, 18), 0.03, 1.5), bodyMat, [0, 2.02, 0])
  chest.scale.set(1, 0.95, 0.85)
  // Plat perut yang lebih terang
  const plates = add(
    roughen(new THREE.CylinderGeometry(0.3, 0.4, 1.05, 14, 8), 0.02, 3.2),
    bellyMat,
    [0, 1.5, 0.17],
  )
  plates.scale.set(0.82, 1, 0.55)
  const neck = add(
    roughen(new THREE.CylinderGeometry(0.2, 0.32, 0.6, 16, 4), 0.025, 2),
    bodyMat,
    [0, 2.45, 0.08],
  )
  neck.rotation.x = 0.25

  // ===== Kepala reptilian =====
  const h = new THREE.Group()
  head = h
  h.position.set(0, 2.8, 0.18)
  g.add(h)
  const skull = add(roughen(new THREE.SphereGeometry(0.27, 22, 16), 0.02, 2.4), bodyMat, [0, 0, 0], h)
  skull.scale.set(1, 0.85, 1.15)
  // Moncong membulat
  const snout = add(roughen(new THREE.SphereGeometry(0.18, 18, 14), 0.015, 3), bodyMat, [0, -0.05, 0.34], h)
  snout.scale.set(0.85, 0.55, 1.35)
  // Lubang hidung
  for (const s of [1, -1]) {
    add(new THREE.SphereGeometry(0.022, 8, 6), clawMat, [s * 0.06, 0.03, 0.55], h)
  }

  const toothMat = new THREE.MeshStandardMaterial({ color: 0xf3eedd, roughness: 0.4 })

  // Gigi atas: kerucut kecil dengan variasi ukuran
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
  // Gigi bawah: ikut bergerak dengan rahang
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

  // Mata menyala + alis tebal
  for (const s of [1, -1]) {
    add(new THREE.SphereGeometry(0.05, 10, 8), glowMat, [s * 0.18, 0.05, 0.21], h)
    const brow = add(roughen(new THREE.SphereGeometry(0.09, 10, 8), 0.012, 3), bodyMat, [s * 0.17, 0.13, 0.2], h)
    brow.scale.set(1, 0.5, 1.25)
  }

  // ===== Sinar atom dari mulut (muncul saat mengaum) =====
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

  // ===== Lengan berotot dengan cakar =====
  for (const s of [1, -1]) {
    add(roughen(new THREE.SphereGeometry(0.13, 12, 10), 0.015, 3), bodyMat, [s * 0.37, 2.13, 0.1])
    const upper = add(
      roughen(new THREE.CylinderGeometry(0.075, 0.1, 0.36, 12, 3), 0.015, 3),
      bodyMat,
      [s * 0.43, 2.0, 0.18],
    )
    upper.rotation.set(0.5, 0, s * -0.45)
    add(roughen(new THREE.SphereGeometry(0.08, 10, 8), 0.012, 3), bodyMat, [s * 0.48, 1.9, 0.27])
    const fore = add(
      roughen(new THREE.CylinderGeometry(0.055, 0.075, 0.3, 12, 3), 0.012, 3),
      bodyMat,
      [s * 0.5, 1.84, 0.39],
    )
    fore.rotation.set(1.15, 0, s * -0.2)
    // Cakar tangan
    for (let i = -1; i <= 1; i++) {
      const claw = add(new THREE.ConeGeometry(0.022, 0.09, 6), clawMat, [s * 0.51 + i * 0.035, 1.74, 0.52])
      claw.rotation.x = 1.9
    }
  }

  // ===== Kaki kekar dengan cakar =====
  for (const s of [1, -1]) {
    const thigh = add(
      roughen(new THREE.CylinderGeometry(0.18, 0.27, 0.6, 16, 4), 0.025, 2),
      bodyMat,
      [s * 0.31, 0.72, 0],
    )
    thigh.rotation.z = s * -0.08
    add(
      roughen(new THREE.CylinderGeometry(0.13, 0.18, 0.48, 14, 3), 0.02, 2.4),
      bodyMat,
      [s * 0.34, 0.36, 0.04],
    )
    const foot = add(roughen(new THREE.SphereGeometry(0.19, 14, 10), 0.02, 2.6), bodyMat, [s * 0.34, 0.1, 0.12])
    foot.scale.set(0.95, 0.55, 1.5)
    // Cakar kaki
    for (let i = -1; i <= 1; i++) {
      const claw = add(new THREE.ConeGeometry(0.04, 0.14, 6), clawMat, [s * 0.34 + i * 0.1, 0.06, 0.38])
      claw.rotation.x = 1.35
    }
  }

  // ===== Ekor: rantai segmen organik =====
  tailSegments = []
  let parent: THREE.Object3D = g
  const finGeo = makeFinGeometry()
  for (let i = 0; i < 10; i++) {
    const seg = new THREE.Group()
    if (i === 0) seg.position.set(0, 1.02, -0.44)
    else seg.position.set(0, i < 4 ? -0.025 : 0.02, -0.29)
    parent.add(seg)
    const r = Math.max(0.3 - i * 0.028, 0.04)
    const ball = add(roughen(new THREE.SphereGeometry(r, 14, 10), r * 0.08, 2.2), bodyMat, [0, 0, 0], seg)
    ball.scale.set(1, 0.9, 1.3)
    // Sirip kecil di pangkal ekor
    if (i < 5) {
      const fin = new THREE.Mesh(finGeo, glowMat!)
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

  // ===== Sirip punggung utama (bidang bergerigi seperti aslinya) =====
  const spine: Array<[number, number, number]> = [
    // [y, z, skala]
    [2.5, -0.26, 0.42],
    [2.18, -0.46, 0.66],
    [1.84, -0.58, 0.9],
    [1.48, -0.62, 0.95],
    [1.14, -0.6, 0.7],
  ]
  for (const [y, z, fs] of spine) {
    const fin = new THREE.Mesh(finGeo, glowMat!)
    fin.scale.set(fs, fs, fs)
    fin.position.set(0, y, z)
    fin.rotation.y = Math.PI / 2
    fin.castShadow = true
    g.add(fin)
    // Baris sekunder kiri-kanan yang lebih kecil
    for (const s of [1, -1]) {
      const small = new THREE.Mesh(finGeo, glowMat!)
      small.scale.set(fs * 0.45, fs * 0.45, fs * 0.45)
      small.position.set(s * 0.15, y - 0.08, z + 0.06)
      small.rotation.y = Math.PI / 2
      g.add(small)
    }
  }

  // Postur sedikit condong ke depan seperti predator
  g.rotation.x = 0.05

  return g
}

function init() {
  const el = container.value
  if (!el) return
  const w = el.clientWidth || 560
  const h = el.clientHeight || 330

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e0b)
  scene.fog = new THREE.Fog(0x0a0e0b, 9, 18)

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50)
  camera.position.set(3.4, 2.3, 4.4)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.setClearColor(0x0a0e0b)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  el.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.45, 0)
  controls.enableDamping = true
  controls.enablePan = false
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.7
  controls.minDistance = 2.5
  controls.maxDistance = 8
  controls.maxPolarAngle = 1.5

  // Pencahayaan sinematik: langit redup, lampu kunci dengan bayangan,
  // fill dingin, dan rim light warna aura
  scene.add(new THREE.HemisphereLight(0x6b7f72, 0x05080a, 0.5))
  const key = new THREE.DirectionalLight(0xfff3e0, 1.6)
  key.position.set(3.5, 6, 3)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = key.shadow.camera.bottom = -4.5
  key.shadow.camera.right = key.shadow.camera.top = 4.5
  key.shadow.camera.near = 1
  key.shadow.camera.far = 14
  key.shadow.bias = -0.002
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x3a4a66, 0.5)
  fill.position.set(-4, 2.5, -2)
  scene.add(fill)
  const rim = new THREE.PointLight(props.godzilla.glow, 30, 14)
  rim.position.set(-2.6, 2.6, -2.6)
  scene.add(rim)

  // Lantai arena
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x0c1310, roughness: 1 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 2.72, 64),
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
  const grid = new THREE.GridHelper(7, 14, 0x1d2a22, 0x141f19)
  grid.position.y = 0.005
  scene.add(grid)

  kaiju = buildKaiju(props.godzilla.color, props.godzilla.glow)
  scene.add(kaiju)

  // Partikel energi melayang naik di sekitar tubuh
  const pCount = 90
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

  const t0 = performance.now()
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    const t = (performance.now() - t0) / 1000

    // Napas
    if (chest) {
      const s = 0.018 * Math.sin(t * 1.8)
      chest.scale.set(1 + s, 0.95 + s, 0.85 + s)
    }

    // Siklus mengaum tiap 7 detik: kepala mendongak, rahang terbuka
    // lebar, lalu sinar atom menyembur dari mulut.
    const phase = t % 7
    let env = phase < 0.5 ? phase / 0.5 : phase < 2.2 ? 1 : phase < 2.8 ? (2.8 - phase) / 0.6 : 0
    env = env * env * (3 - 2 * env)
    const firing = phase > 0.55 && phase < 2.15
    const flicker = 0.7 + 0.3 * Math.sin(t * 48)

    if (jaw) {
      const idle = Math.pow(0.5 + 0.5 * Math.sin(t * 0.9), 3) * 0.1
      jaw.rotation.x = 0.06 + idle * (1 - env) + 0.55 * env
    }
    if (head) {
      head.rotation.x = -0.42 * env
      // Saat idle, kepala menoleh pelan seperti mengamati sekitar
      head.rotation.y = 0.16 * Math.sin(t * 0.45) * (1 - env)
    }
    if (beam) {
      beam.visible = firing
      beam.scale.set(flicker, flicker, 1)
    }
    if (beamOuterMat) beamOuterMat.opacity = 0.1 + 0.45 * flicker
    if (beamCoreMat) beamCoreMat.opacity = 0.85 * flicker
    if (mouthLight) mouthLight.intensity = firing ? 55 * flicker : 0

    // Ekor melambai
    tailSegments.forEach((seg, i) => {
      seg.rotation.y = Math.sin(t * 1.7 - i * 0.5) * 0.13
      seg.rotation.x = Math.sin(t * 1.1 - i * 0.4) * 0.03
    })

    // Sirip berdenyut — menyala makin terang saat mengaum
    if (glowMat) glowMat.emissiveIntensity = 0.9 + 0.35 * Math.sin(t * 2.3) + 1.0 * env

    // Badan bergoyang halus: napas + perpindahan berat badan
    if (kaiju) {
      kaiju.position.y = 0.012 * Math.sin(t * 1.8)
      kaiju.rotation.z = 0.012 * Math.sin(t * 0.9)
    }

    // Partikel energi naik perlahan sambil melayang
    if (particles && particleBase) {
      const pos = particles.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const bx = particleBase[i * 3]!
        const by = particleBase[i * 3 + 1]!
        const bz = particleBase[i * 3 + 2]!
        pos.setXYZ(
          i,
          bx + 0.08 * Math.sin(t * 0.7 + i),
          (by + t * 0.22 + i * 0.041) % 3.8,
          bz + 0.08 * Math.cos(t * 0.6 + i * 1.3),
        )
      }
      pos.needsUpdate = true
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
  tailSegments = []
  chest = null
  jaw = null
  head = null
  beam = null
  beamOuterMat = null
  beamCoreMat = null
  mouthLight = null
  glowMat = null
  kaiju = null
  particles = null
  particleBase = null
  bumpTex = null
}

// Komponen .client.vue: template baru ter-render satu tick setelah mounted,
// jadi tunggu nextTick agar ref container terisi.
onMounted(async () => {
  await nextTick()
  init()
})

onBeforeUnmount(cleanup)
</script>

<template>
  <div ref="container" class="viewer">
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
