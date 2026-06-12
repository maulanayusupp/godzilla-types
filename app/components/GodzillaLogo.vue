<template>
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac" />
        <stop offset="100%" stop-color="#22c55e" />
      </linearGradient>
      <filter id="logo-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <!-- Sirip punggung Godzilla -->
    <path
      d="M10 48 L17 22 L24 39 L32 10 L40 39 L47 22 L54 48 Z"
      fill="url(#logo-grad)"
      filter="url(#logo-glow)"
    />
    <rect x="10" y="50" width="44" height="3.5" rx="1.75" fill="#22c55e" opacity="0.55" />
  </svg>
</template>
