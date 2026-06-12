<script setup lang="ts">
// Halaman uji sementara untuk melihat model 3D tanpa membuka modal.
import { GODZILLAS } from '~/data/godzillas'

const g = GODZILLAS.find((x) => x.id === 'legendary')!
</script>

<template>
  <div style="width: 100vw; height: 100vh">
    <Godzilla3D :godzilla="g" />
  </div>
</template>
