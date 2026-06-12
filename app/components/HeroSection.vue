<script setup lang="ts">
defineProps<{
  total: number
  eras: number
}>()
</script>

<template>
  <header class="hero">
    <GodzillaLogo class="logo" />
    <p class="badge">Ensiklopedia Kaiju</p>
    <h1 class="title">GODZILLA<span class="accent">TYPES</span></h1>
    <p class="subtitle">
      Jelajahi macam-macam inkarnasi Sang Raja Monster — dari teror hitam-putih 1954 sampai Titan
    </p>
    <div class="stats">
      <div class="stat">
        <span class="value">{{ total }}</span>
        <span class="label">Inkarnasi</span>
      </div>
      <div class="stat">
        <span class="value">{{ eras }}</span>
        <span class="label">Era</span>
      </div>
      <div class="stat">
        <span class="value">70+</span>
        <span class="label">Tahun Sejarah</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 4.5rem 1.25rem 3.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.logo {
  width: 64px;
  height: 64px;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

.badge {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid rgba(74, 222, 128, 0.3);
  padding: 0.3rem 1rem;
  border-radius: 999px;
}

.title {
  font-size: clamp(2rem, 8.5vw, 5.25rem);
  font-weight: 700;
  letter-spacing: 0.06em;
}

.accent {
  background: linear-gradient(180deg, #86efac, #22c55e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 38px rgba(74, 222, 128, 0.35);
}

.subtitle {
  color: var(--text-dim);
  font-size: 1.08rem;
  max-width: 560px;
}

.stats {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.stat {
  display: flex;
  flex-direction: column;
  min-width: 110px;
  padding: 0.7rem 1.4rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
}

.label {
  font-size: 0.78rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

@media (max-width: 640px) {
  .stat {
    min-width: 0;
    flex: 1;
    padding: 0.55rem 0.9rem;
  }

  .stats {
    width: 100%;
    max-width: 360px;
  }
}
</style>
