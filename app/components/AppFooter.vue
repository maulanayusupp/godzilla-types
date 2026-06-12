<template>
  <footer class="footer">
    <GodzillaLogo class="mark" />
    <p>Dibuat untuk para penggemar kaiju — data bersifat ringkasan dari berbagai film Godzilla.</p>
    <p class="tech">Dibangun dengan Nuxt &amp; Vue</p>
  </footer>
</template>

<style scoped>
.footer {
  text-align: center;
  color: var(--text-dim);
  font-size: 0.88rem;
  padding: 2.5rem 1.25rem 3rem;
  border-top: 1px solid var(--border);
  margin-top: 3.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.mark {
  width: 30px;
  height: 30px;
  opacity: 0.75;
}

.tech {
  font-size: 0.78rem;
  opacity: 0.7;
}
</style>
