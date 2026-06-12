<script setup lang="ts">
import type { Godzilla } from '~/types'

const props = defineProps<{
  godzilla: Godzilla | null
}>()

const emit = defineEmits<{
  close: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

watch(
  () => props.godzilla,
  (g) => {
    if (import.meta.client) document.body.style.overflow = g ? 'hidden' : ''
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="godzilla" class="overlay" @click.self="emit('close')">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="godzilla.name"
          :style="{ '--c': godzilla.color, '--glow': godzilla.glow }"
        >
          <button class="close" aria-label="Tutup" @click="emit('close')">&times;</button>

          <div class="banner">
            <Godzilla3D :key="godzilla.id" :godzilla="godzilla" />
          </div>

          <div class="body">
            <div class="meta">
              <span class="era">{{ godzilla.era }}</span>
              <span class="year">{{ godzilla.year }}</span>
            </div>
            <h2 class="name">{{ godzilla.name }}</h2>
            <p class="alias">"{{ godzilla.alias }}"</p>

            <div class="stats">
              <div class="stat">
                <span class="label">Tinggi</span>
                <span class="value">{{ godzilla.height }}</span>
              </div>
              <div class="stat">
                <span class="label">Berat</span>
                <span class="value">{{ godzilla.weight }}</span>
              </div>
              <div class="stat">
                <span class="label">Era</span>
                <span class="value">{{ godzilla.era }}</span>
              </div>
              <div class="stat">
                <span class="label">Tahun</span>
                <span class="value">{{ godzilla.year }}</span>
              </div>
            </div>

            <h3 class="section-title">Kemampuan</h3>
            <div class="abilities">
              <span v-for="a in godzilla.abilities" :key="a" class="tag">{{ a }}</span>
            </div>

            <p class="desc">{{ godzilla.description }}</p>
            <p class="film">🎬 {{ godzilla.film }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(3, 5, 4, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.dialog {
  position: relative;
  width: 100%;
  max-width: 580px;
  max-height: 88vh;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--glow) 35%, var(--border));
  border-radius: 22px;
  box-shadow: 0 24px 80px color-mix(in srgb, var(--glow) 18%, rgba(0, 0, 0, 0.6));
}

.close {
  position: absolute;
  top: 0.7rem;
  right: 0.95rem;
  z-index: 2;
  background: rgba(0, 0, 0, 0.35);
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: var(--text);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;
}

.close:hover {
  background: rgba(0, 0, 0, 0.6);
}

.banner {
  position: relative;
  height: 330px;
  overflow: hidden;
  background: #0a0e0b;
  border-bottom: 1px solid var(--border);
}

.body {
  padding: 1.5rem 1.8rem 2rem;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.era {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--glow);
  background: color-mix(in srgb, var(--glow) 14%, transparent);
  padding: 0.18rem 0.7rem;
  border-radius: 999px;
}

.year {
  font-size: 0.82rem;
  color: var(--text-dim);
}

.name {
  font-size: 1.7rem;
  font-weight: 700;
}

.alias {
  color: var(--text-dim);
  font-style: italic;
  margin-bottom: 1.1rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(115px, 1fr));
  gap: 0.7rem;
  margin-bottom: 1.25rem;
}

.stat {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.6rem 0.85rem;
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-dim);
}

.value {
  font-weight: 600;
  font-size: 0.95rem;
}

.section-title {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 1.1rem;
}

.tag {
  font-size: 0.8rem;
  color: var(--glow);
  background: color-mix(in srgb, var(--glow) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--glow) 30%, transparent);
  padding: 0.22rem 0.75rem;
  border-radius: 999px;
}

.desc {
  color: var(--text);
  font-size: 0.96rem;
}

.film {
  color: var(--text-dim);
  font-size: 0.86rem;
  margin-top: 1.1rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--border);
}

/* Transisi buka/tutup */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}

.modal-enter-active .dialog,
.modal-leave-active .dialog {
  transition: transform 0.22s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .dialog,
.modal-leave-to .dialog {
  transform: translateY(14px) scale(0.97);
}
</style>
