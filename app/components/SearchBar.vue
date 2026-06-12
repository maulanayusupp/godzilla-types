<script setup lang="ts">
const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="search">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" stroke-linecap="round" />
    </svg>
    <input
      v-model="model"
      type="search"
      placeholder="Cari Godzilla... (contoh: Shin, Burning, Heisei)"
      aria-label="Cari Godzilla"
    />
  </label>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.8rem 1.1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
}

.icon {
  width: 18px;
  height: 18px;
  color: var(--text-dim);
  flex-shrink: 0;
}

input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
}

input::placeholder {
  color: var(--text-dim);
}
</style>
