<script setup lang="ts">
import type { Godzilla } from '~/types'

const props = defineProps<{
  godzilla: Godzilla
  /** Pembeda id gradient ketika siluet yang sama tampil di kartu dan modal */
  uid: string
}>()

const id = computed(() => `${props.godzilla.id}-${props.uid}`)
</script>

<template>
  <svg viewBox="0 0 240 200" class="kaiju" role="img" :aria-label="`Siluet ${godzilla.name}`">
    <defs>
      <linearGradient :id="`body-${id}`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="godzilla.color" />
        <stop offset="100%" stop-color="#080b09" />
      </linearGradient>
      <filter :id="`glow-${id}`" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Bayangan tanah -->
    <ellipse cx="130" cy="187" rx="95" ry="7" :fill="godzilla.color" opacity="0.18" />

    <!-- Sirip punggung bergerigi menyala (pangkalnya tertutup badan) -->
    <path
      :fill="godzilla.glow"
      :filter="`url(#glow-${id})`"
      d="M64 50 L74 26 L84 50 L96 40 L104 68 L116 54 L122 88 L134 72 L140 112
         L154 96 L160 130 L176 118 L182 146 L198 134 L204 158 L216 150 L222 172
         L230 168 L234 182 L160 152 L120 100 L80 62 Z"
    >
      <animate attributeName="opacity" values="0.7;1;0.7" dur="3.2s" repeatCount="indefinite" />
    </path>

    <!-- Badan: kepala dengan rahang terbuka, punggung, ekor panjang, dua kaki -->
    <path
      :fill="`url(#body-${id})`"
      d="M28 62 C36 50 52 42 66 44 C78 46 86 56 90 66 C100 74 110 84 118 98
         C128 114 140 126 158 136 C185 150 210 162 234 176 L230 184
         C205 174 180 164 160 152 C150 147 144 146 140 150 L144 184 L116 184
         L121 152 C114 148 108 148 102 152 L106 184 L80 184 L86 146
         C76 128 72 112 72 98 C64 88 56 80 48 76 L30 78 L44 70 L28 62 Z"
    />

    <!-- Lengan kecil di depan dada -->
    <path :fill="`url(#body-${id})`" d="M66 88 L48 102 L56 110 L72 100 Z" />

    <!-- Mata menyala -->
    <circle cx="54" cy="56" r="2.5" :fill="godzilla.glow" />
  </svg>
</template>

<style scoped>
.kaiju {
  width: 100%;
  height: 100%;
}
</style>
