<script setup lang="ts">
import { ERAS, GODZILLAS } from '~/data/godzillas'
import type { Era, Godzilla } from '~/types'

const search = ref('')
const activeEra = ref<Era | 'all'>('all')
const selected = ref<Godzilla | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return GODZILLAS.filter((g) => {
    const matchEra = activeEra.value === 'all' || g.era === activeEra.value
    const matchSearch =
      !q || [g.name, g.alias, g.era, g.description].some((v) => v.toLowerCase().includes(q))
    return matchEra && matchSearch
  })
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
      </p>

      <section v-if="filtered.length" class="grid">
        <GodzillaCard
          v-for="(g, i) in filtered"
          :key="g.id"
          :godzilla="g"
          :index="i"
          @select="selected = $event"
        />
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

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 1.4rem;
  padding-bottom: 1rem;
}

.empty {
  text-align: center;
  color: var(--text-dim);
  padding: 4rem 1rem;
  font-size: 1.1rem;
}
</style>
