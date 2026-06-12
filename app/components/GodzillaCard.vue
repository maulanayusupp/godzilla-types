<script setup lang="ts">
import type { Godzilla } from '~/types'

defineProps<{
  godzilla: Godzilla
  index?: number
}>()

const emit = defineEmits<{
  select: [godzilla: Godzilla]
}>()

const card = ref<HTMLElement | null>(null)
const tilt = reactive({ rx: 0, ry: 0, gx: 50, gy: 50 })

function onMove(e: MouseEvent) {
  const el = card.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  tilt.rx = (0.5 - py) * 12
  tilt.ry = (px - 0.5) * 12
  tilt.gx = px * 100
  tilt.gy = py * 100
}

function reset() {
  tilt.rx = 0
  tilt.ry = 0
  tilt.gx = 50
  tilt.gy = 50
}
</script>

<template>
  <div class="scene" :style="{ '--i': index ?? 0 }">
    <article
      ref="card"
      class="card"
      :style="{
        '--glow': godzilla.glow,
        '--gx': tilt.gx + '%',
        '--gy': tilt.gy + '%',
        transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
      }"
      tabindex="0"
      role="button"
      :aria-label="`Lihat detail ${godzilla.name}`"
      @click="emit('select', godzilla)"
      @keydown.enter.prevent="emit('select', godzilla)"
      @keydown.space.prevent="emit('select', godzilla)"
      @mousemove="onMove"
      @mouseleave="reset"
    >
      <div class="banner">
        <img
          class="poster"
          :src="godzilla.image"
          :alt="`Poster ${godzilla.film}`"
          loading="lazy"
        />
        <div class="shade" />
      </div>

      <div class="content">
        <div class="meta">
          <span class="era">{{ godzilla.era }}</span>
          <span class="year">{{ godzilla.year }}</span>
        </div>
        <h2 class="name">{{ godzilla.name }}</h2>
        <p class="alias">"{{ godzilla.alias }}"</p>
        <p class="desc">{{ godzilla.description }}</p>
        <span class="more">Lihat detail →</span>
      </div>

      <!-- Kilau cahaya yang mengikuti kursor -->
      <div class="glare" />
    </article>
  </div>
</template>

<style scoped>
.scene {
  perspective: 900px;
  animation: rise 0.55s both;
  animation-delay: calc(var(--i) * 55ms);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.12s linear, border-color 0.25s, box-shadow 0.25s;
  will-change: transform;
}

.card:hover,
.card:focus-visible {
  border-color: var(--glow);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--glow) 25%, transparent);
  outline: none;
}

.banner {
  position: relative;
  height: 240px;
  overflow: hidden;
  background: #0a0e0b;
}

.poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  transition: transform 0.35s ease;
}

.card:hover .poster {
  transform: scale(1.07);
}

.shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 55%, rgba(15, 21, 18, 0.96));
  pointer-events: none;
}

.glare {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--gx) var(--gy),
    rgba(255, 255, 255, 0.16),
    transparent 55%
  );
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.card:hover .glare {
  opacity: 1;
}

.content {
  padding: 1rem 1.3rem 1.35rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.55rem;
}

.era {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--glow);
  background: color-mix(in srgb, var(--glow) 14%, transparent);
  padding: 0.18rem 0.65rem;
  border-radius: 999px;
}

.year {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.name {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 0.1rem;
}

.alias {
  color: var(--text-dim);
  font-size: 0.88rem;
  font-style: italic;
  margin-bottom: 0.6rem;
}

.desc {
  color: var(--text-dim);
  font-size: 0.92rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.9rem;
}

.more {
  margin-top: auto;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--glow);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.25s, transform 0.25s;
}

.card:hover .more,
.card:focus-visible .more {
  opacity: 1;
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .scene {
    animation: none;
  }

  .card {
    transition: border-color 0.25s, box-shadow 0.25s;
  }
}
</style>
