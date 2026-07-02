// icons.js — tiny inline-SVG icon builders shared by meters, belt, prompts.
// All art is drawn in code (design/08). Icons are strings for innerHTML use;
// every icon takes a pixel size and inherits color via currentColor unless
// a token color is baked in (hazard family stays amber everywhere).

export function boltIcon(size = 14, color = 'var(--bw)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M9 1 3 9h4l-1 6 6-8H8l1-6z" fill="${color}"/>
  </svg>`;
}

export function clockIcon(size = 14, color = 'var(--deadline)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6.4" fill="none" stroke="${color}" stroke-width="1.8"/>
    <path d="M8 4.6V8l2.5 1.8" fill="none" stroke="${color}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function stormIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5.5 11.5a3.5 3.5 0 0 1 .6-6.95A4.5 4.5 0 0 1 14.7 6a3 3 0 0 1-.2 5.5z"
          fill="var(--hazard)"/>
    <path d="M10.5 11 8 15h2l-1 4 3.5-5h-2l1-3z" fill="var(--pip)"/>
  </svg>`;
}

export function drizzleIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5.5 11.5a3.5 3.5 0 0 1 .6-6.95A4.5 4.5 0 0 1 14.7 6a3 3 0 0 1-.2 5.5z"
          fill="var(--hazard)" opacity="0.75"/>
    <path d="M7 14v2.5M10.5 13.5V16M14 14v2.5" stroke="var(--fragment)"
          stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}

export function copyIcon(size = 12, color = 'currentColor') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 14 14" aria-hidden="true">
    <rect x="1.5" y="4" width="8" height="8.5" rx="2" fill="none" stroke="${color}" stroke-width="1.6"/>
    <rect x="4.5" y="1.5" width="8" height="8.5" rx="2" fill="${color}" opacity="0.85"/>
  </svg>`;
}

export function speakerIcon(size = 18, on = true) {
  const waves = on
    ? `<path d="M10.5 5.5 q3 2.5 0 5 M12.5 3.5 q5 4.5 0 9" fill="none"
         stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`
    : `<path d="M10.5 5.5 15 10.5 M15 5.5 10.5 10.5" fill="none"
         stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 6 h2.5 L8 3 v10 L4.5 10 H2 z" fill="currentColor"/>
    ${waves}
  </svg>`;
}

// Pip's canonical spark shape (r=10, centered at 0,0) — one geometry shared
// by the SVG avatar and the canvas live layer (via Path2D), so Pip never drifts.
export const PIP_SPARK_D =
  'M0 -10 Q3.5 -3.5 10 0 Q3.5 3.5 0 10 Q-3.5 3.5 -10 0 Q-3.5 -3.5 0 -10 Z';

export function pipAvatar(size = 40) {
  return `<svg width="${size}" height="${size}" viewBox="-14 -14 28 28" aria-label="Pip">
    <path d="${PIP_SPARK_D}" fill="var(--pip)" transform="scale(1.25)"/>
    <circle cx="-2.6" cy="-1" r="1.2" fill="#3a2c00"/>
    <circle cx="2.6" cy="-1" r="1.2" fill="#3a2c00"/>
    <path d="M-2.4 2.2 q2.4 2.2 4.8 0" fill="none" stroke="#3a2c00"
          stroke-width="1.1" stroke-linecap="round"/>
  </svg>`;
}

export function retransmitIcon(size = 20, color = 'var(--fragment)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M16.5 8.5A6.6 6.6 0 0 0 4.2 6.6" fill="none" stroke="${color}"
          stroke-width="2" stroke-linecap="round"/>
    <path d="M4 2.8v4h4" fill="none" stroke="${color}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.5 11.5a6.6 6.6 0 0 0 12.3 1.9" fill="none" stroke="${color}"
          stroke-width="2" stroke-linecap="round"/>
    <path d="M16 17.2v-4h-4" fill="none" stroke="${color}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
