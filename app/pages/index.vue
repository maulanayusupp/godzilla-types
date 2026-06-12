<script setup lang="ts">
import { ERAS, GODZILLAS } from '~/data/godzillas'
import type { Era, Godzilla } from '~/types'

const search = ref('')
const activeEra = ref<Era | 'all'>('all')
const selected = ref<Godzilla | null>(null)

const yearOf = (g: Godzilla) => parseInt(g.year.match(/\d{4}/)?.[0] ?? '9999')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return GODZILLAS.filter((g) => {
    const matchEra = activeEra.value === 'all' || g.era === activeEra.value
    const matchSearch =
      !q || [g.name, g.alias, g.era, g.description].some((v) => v.toLowerCase().includes(q))
    return matchEra && matchSearch
  }).sort((a, b) => yearOf(a) - yearOf(b)) // urut kronologis untuk linimasa
})

const eraOptions = computed(() => [
  { key: 'all', label: 'Semua', count: GODZILLAS.length },
  ...ERAS.map((era) => ({
    key: era,
    label: era,
    count: GODZILLAS.filter((g) => g.era === era).length,
  })),
])

// ===== SEO =====
const SITE_TITLE = 'Godzilla Types — Ensiklopedia Raja Monster'
const SITE_DESC =
  'Ensiklopedia macam-macam Godzilla: 12 inkarnasi dari era Showa, Heisei, Millennium, Reiwa, hingga MonsterVerse. Lengkap dengan tinggi, berat, kemampuan, dan film asalnya.'

useSeoMeta({
  title: SITE_TITLE,
  description: SITE_DESC,
  ogTitle: SITE_TITLE,
  ogDescription: SITE_DESC,
  ogType: 'website',
  ogSiteName: 'Godzilla Types',
  ogLocale: 'id_ID',
  ogImage: '/og-image.png',
  twitterCard: 'summary_large_image',
  twitterTitle: SITE_TITLE,
  twitterDescription: SITE_DESC,
  twitterImage: '/og-image.png',
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Macam-Macam Godzilla',
        description: SITE_DESC,
        numberOfItems: GODZILLAS.length,
        itemListElement: GODZILLAS.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Thing',
            name: g.name,
            alternateName: g.alias,
            description: g.description,
          },
        })),
      }),
    },
  ],
})
</script>

<template>
  <div>
    <HeroSection :total="GODZILLAS.length" :eras="ERAS.length" />

    <main class="container">
      <section class="controls" aria-label="Pencarian dan filter">
        <SearchBar v-model="search" />
        <EraFilter v-model="activeEra" :options="eraOptions" />
      </section>

      <p class="count" role="status">
        Menampilkan <strong>{{ filtered.length }}</strong> dari {{ GODZILLAS.length }} Godzilla
        <span class="swipe-hint">— geser ke samping →</span>
      </p>

      <section v-if="filtered.length" class="strip" aria-label="Linimasa Godzilla">
        <div
          v-for="(g, i) in filtered"
          :key="g.id"
          class="strip-item"
          :style="{ '--dotc': g.glow }"
        >
          <div class="year-marker">
            <span class="year">{{ g.year }}</span>
            <span class="dot" />
          </div>
          <GodzillaCard :godzilla="g" :index="i" @select="selected = $event" />
        </div>
      </section>

      <p v-else class="empty">Tidak ada Godzilla yang cocok. Coba kata kunci lain... 🦖</p>
    </main>

    <AppFooter />

    <GodzillaModal :godzilla="selected" @close="selected = null" />
  </div>
</template>

<style scoped>
.controls {
  position: sticky;
  top: 0.75rem;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  margin-bottom: 1.25rem;
  background: rgba(10, 14, 11, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.count {
  color: var(--text-dim);
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
  padding-left: 0.25rem;
}

.count strong {
  color: var(--accent);
}

.swipe-hint {
  opacity: 0.8;
}

/* Linimasa horizontal: tahun + titik di rel, kartu digeser ke samping */
.strip {
  display: flex;
  gap: 1.1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  margin: 0 -1.25rem;
  padding: 0.25rem 1.25rem 1.4rem;
  scroll-padding: 0 1.25rem;
  -webkit-overflow-scrolling: touch;
}

.strip-item {
  position: relative;
  flex: 0 0 min(82vw, 310px);
  scroll-snap-align: center;
  display: flex;
  flex-direction: column;
}

/* Rel garis waktu yang menyambung antar kartu */
.strip-item::before {
  content: '';
  position: absolute;
  top: 37px;
  left: -1.1rem;
  right: 0;
  height: 2px;
  background: var(--border);
}

.strip-item:first-child::before {
  left: 0;
}

.year-marker {
  position: relative;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
}

.year {
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 0.35rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dotc, var(--accent));
  box-shadow: 0 0 10px var(--dotc, var(--accent));
  border: 2px solid var(--bg);
}

.strip-item :deep(.scene) {
  flex: 1;
  margin-top: 0.6rem;
}

.strip::-webkit-scrollbar {
  height: 7px;
}

.strip::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 999px;
}

.strip::-webkit-scrollbar-track {
  background: transparent;
}

.empty {
  text-align: center;
  color: var(--text-dim);
  padding: 4rem 1rem;
  font-size: 1.1rem;
}
</style>
