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

export function snifferIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M2 10 q8-7 16 0 q-8 7 -16 0z" fill="none" stroke="var(--danger)"
          stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="10" cy="10" r="3" fill="var(--danger)"/>
    <circle cx="11" cy="9" r="1" fill="var(--bg)"/>
  </svg>`;
}

export function cloakIcon(size = 20, color = 'var(--copy)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 2 L17 5 v5 q0 5 -7 8 q-7-3 -7-8 V5 z" fill="none"
          stroke="${color}" stroke-width="1.9" stroke-linejoin="round"/>
    <rect x="7.5" y="8.5" width="5" height="4.5" rx="1.2" fill="${color}"/>
    <path d="M8.5 8.5 v-1.5 a1.5 1.5 0 0 1 3 0 v1.5" fill="none"
          stroke="${color}" stroke-width="1.5"/>
  </svg>`;
}

export function jamIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M2 5 h5 q3 0 4 3 q1 3 4 3 h3" fill="none" stroke="var(--hazard)"
          stroke-width="2" stroke-linecap="round"/>
    <path d="M2 15 h5 q3 0 4-3 q1-3 4-3 h3" fill="none" stroke="var(--hazard)"
          stroke-width="2" stroke-linecap="round"/>
    <circle cx="4.5" cy="10" r="1.5" fill="var(--fragment)"/>
    <circle cx="8" cy="10" r="1.5" fill="var(--fragment)" opacity="0.7"/>
  </svg>`;
}

export function skipIcon(size = 20, color = 'var(--deadline)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 4 l7 6 -7 6 z" fill="${color}"/>
    <path d="M13 4 v12" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M16 6 q2 4 0 8" fill="none" stroke="${color}" stroke-width="1.5"
          stroke-linecap="round" opacity="0.5"/>
  </svg>`;
}

export function letterIcon(size = 26) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.5" y="5" width="19" height="14" rx="3" fill="none"
          stroke="var(--pip)" stroke-width="2"/>
    <path d="M3.5 7 12 13.5 20.5 7" fill="none" stroke="var(--pip)"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function callIcon(size = 26) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.5" y="5.5" width="13" height="13" rx="3" fill="none"
          stroke="var(--fragment)" stroke-width="2"/>
    <path d="M15.5 10 21 7 v10 l-5.5-3" fill="none" stroke="var(--fragment)"
          stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}

export function rerouteIcon(size = 20, color = 'var(--safe)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 16 V8 a4 4 0 0 1 4-4 h6" fill="none" stroke="${color}"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11.5 1 14.5 4 11.5 7" fill="none" stroke="${color}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15.5 12 v1.5 a3 3 0 0 1-3 3 H9" fill="none" stroke="${color}"
          stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
  </svg>`;
}

export function bufferIcon(size = 20, color = 'var(--fragment)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M3 4 h14 M5.5 4 l3 5 v6 l3 2 v-8 l3-5" fill="none" stroke="${color}"
          stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function rapidsIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M2.5 7 q2.5-2.5 5 0 t5 0 t5 0" fill="none" stroke="var(--fragment)"
          stroke-width="2" stroke-linecap="round"/>
    <path d="M2.5 11.5 q2.5-2.5 5 0 t5 0 t5 0" fill="none" stroke="var(--fragment)"
          stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
    <path d="M2.5 15.5 q2.5-2.5 5 0 t5 0 t5 0" fill="none" stroke="var(--fragment)"
          stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>
  </svg>`;
}

export function staticIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10 l2.5-3 2 2 2.5-4 2 3 3-2" fill="none" stroke="var(--danger)"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.5 14 l3-2 2 1.5 3-3 2.5 2 2.5-1.5" fill="none" stroke="var(--danger)"
          stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    <circle cx="5" cy="6" r="1" fill="var(--danger)"/>
    <circle cx="15.5" cy="16" r="1" fill="var(--danger)" opacity="0.7"/>
  </svg>`;
}

export function checksumIcon(size = 20, color = 'var(--safe)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="${color}" stroke-width="2"/>
    <path d="M13 13 L17.5 17.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    <path d="M6 8.5 l1.8 1.8 3-3.4" fill="none" stroke="${color}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function repairIcon(size = 20, color = 'var(--pip)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M12.5 3.5 a4.5 4.5 0 0 0-5.2 6.2 L3 14 a1.8 1.8 0 0 0 2.5 2.5 l4.3-4.3
             a4.5 4.5 0 0 0 6.2-5.2 l-2.8 2.8 -2.5-0.7 -0.7-2.5 z"
          fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"/>
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
