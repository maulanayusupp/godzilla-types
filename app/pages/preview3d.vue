<script setup lang="ts">
// Halaman uji model 3D: /preview3d?id=shin (tidak diindeks mesin pencari)
import { GODZILLAS } from '~/data/godzillas'

const route = useRoute()
const g = computed(
  () => GODZILLAS.find((x) => x.id === route.query.id) ?? GODZILLAS[0]!,
)

useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <div style="width: 100vw; height: 100vh">
    <Godzilla3D :key="g.id" :godzilla="g" />
  </div>
</template>
