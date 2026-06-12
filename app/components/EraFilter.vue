<script setup lang="ts">
defineProps<{
  options: { key: string; label: string; count: number }[]
}>()

const model = defineModel<string>({ default: 'all' })
</script>

<template>
  <div class="filters" role="group" aria-label="Filter berdasarkan era">
    <button
      v-for="opt in options"
      :key="opt.key"
      class="chip"
      :class="{ active: model === opt.key }"
      @click="model = opt.key"
    >
      {{ opt.label }}
      <span class="num">{{ opt.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 1rem;
  font-size: 0.88rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  border-color: #3a4f42;
  color: var(--text);
}

.chip.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.num {
  font-size: 0.72rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
}

.chip.active .num {
  background: rgba(74, 222, 128, 0.2);
}
</style>
