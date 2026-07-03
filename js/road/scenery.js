// scenery.js — road-view backdrop layers per act biome, as SVG template
// strings (no DOM, no engine). Transcribed from the Gate P1 PASS mock
// (mocks/road-act1.html, reviewer round 2) with the two art nits applied:
// tree crowns carry a top-rim highlight; the bolt is a sharper zigzag.
// Act 1 only for now — the renderer falls back to the map view elsewhere.

export const SCENE_DEFS = `
  <linearGradient id="rv-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0"    stop-color="#14395e"/>
    <stop offset="0.42" stop-color="#276b8c"/>
    <stop offset="0.72" stop-color="#a86487"/>
    <stop offset="0.88" stop-color="#f3c2a0"/>
    <stop offset="1"    stop-color="#ffe9b0"/>
  </linearGradient>
  <radialGradient id="rv-homeGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0"   stop-color="#ffe6a8" stop-opacity="0.85"/>
    <stop offset="0.5" stop-color="#ffd166" stop-opacity="0.35"/>
    <stop offset="1"   stop-color="#ffd166" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="rv-meadow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2f6d49"/>
    <stop offset="1" stop-color="#123524"/>
  </linearGradient>
  <linearGradient id="rv-road" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4f9668"/>
    <stop offset="1" stop-color="#74c288"/>
  </linearGradient>
  <radialGradient id="rv-hazardLight" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#f4a259" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#f4a259" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="rv-fragGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#6ee7ff" stop-opacity="0.5"/>
    <stop offset="1" stop-color="#6ee7ff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="rv-pipGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#ffe9b0" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#ffd166" stop-opacity="0"/>
  </radialGradient>
  <filter id="rv-soft" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="7"/>
  </filter>
  <filter id="rv-soft2" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="14"/>
  </filter>`;

function tree(x, y, s) {
  return `
  <g transform="translate(${x},${y}) scale(${s})">
    <ellipse cx="0" cy="46" rx="32" ry="6.5" fill="#0c2c1e" opacity="0.5"/>
    <rect x="-5" y="16" width="10" height="30" rx="4" fill="#1d4a38"/>
    <circle r="34" fill="#2f7a52"/>
    <circle cx="17" cy="9" r="21" fill="#2f7a52"/>
    <circle cx="-13" cy="-11" r="21" fill="#4cb173"/>
    <path d="M-26 -20 q22 -18 44 -4" fill="none" stroke="#7fd9a0"
          stroke-width="5" stroke-linecap="round" opacity="0.8"/>
  </g>`;
}

// Everything BEHIND the road: sky, hills, destination, meadow.
export function backLayers() {
  return `
  <rect width="1280" height="314" fill="url(#rv-sky)"/>
  <g fill="#eafff2">
    <circle class="rv-twinkle"  cx="120" cy="60"  r="1.8"/>
    <circle class="rv-twinkle2" cx="240" cy="128" r="1.3"/>
    <circle class="rv-twinkle"  cx="420" cy="52"  r="1.5"/>
    <circle class="rv-twinkle2" cx="560" cy="100" r="1.2"/>
    <circle class="rv-twinkle"  cx="900" cy="64"  r="1.7"/>
    <circle class="rv-twinkle2" cx="1060" cy="40" r="1.4"/>
    <circle class="rv-twinkle"  cx="1180" cy="120" r="1.6"/>
  </g>
  <g stroke="#122c40" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.75">
    <path d="M950 120 q8 -8 16 0 M966 122 q8 -8 16 0"/>
    <path d="M986 108 q7 -7 14 0"/>
  </g>
  <path d="M0 268 Q140 216 300 252 Q430 280 560 250 Q700 216 840 248 Q1000 282 1120 244 Q1210 222 1280 240 L1280 322 L0 322 Z"
        fill="#153c50"/>
  <path d="M0 268 Q140 216 300 252 Q430 280 560 250 Q700 216 840 248 Q1000 282 1120 244 Q1210 222 1280 240"
        fill="none" stroke="#f2a58c" stroke-width="3" opacity="0.5"/>
  <path d="M0 296 Q170 258 340 288 Q480 312 640 296 Q820 272 980 298 Q1140 322 1280 294 L1280 384 L0 384 Z"
        fill="#175a44"/>
  <g transform="translate(206,238)" stroke="#0d3a34" fill="none" stroke-width="5" stroke-linecap="round">
    <path d="M0 62 L10 0 L20 62 M-14 62 h68 M2 40 h16 M5 22 h10"/>
    <circle class="rv-blink" cx="10" cy="-6" r="5" fill="#ff8b6b" stroke="none"/>
  </g>
  <g transform="translate(1030,304)">
    <path d="M0 34 v-18 l26 -18 26 18 v18 z" fill="#0f473b"/>
    <rect x="18" y="18" width="9" height="9" rx="2" fill="#fff3c4"/>
    <path d="M64 34 v-14 l20 -14 20 14 v14 z" fill="#0f473b"/>
    <rect x="78" y="22" width="8" height="8" rx="2" fill="#fff3c4" opacity="0.9"/>
  </g>
  <g filter="url(#rv-soft2)" opacity="0.5">
    <ellipse cx="420" cy="326" rx="230" ry="26" fill="#cfeee0" opacity="0.3"/>
    <ellipse cx="900" cy="332" rx="260" ry="24" fill="#cfeee0" opacity="0.24"/>
  </g>
  <rect y="314" width="1280" height="486" fill="url(#rv-meadow)"/>
  <g fill="#8deda2" opacity="0.55">
    <circle cx="150" cy="420" r="3"/><circle cx="260" cy="500" r="4"/>
    <circle cx="90" cy="610" r="5"/><circle cx="330" cy="660" r="5"/>
    <circle cx="1080" cy="470" r="4"/><circle cx="1180" cy="560" r="5"/>
    <circle cx="990" cy="640" r="5"/><circle cx="1240" cy="690" r="6"/>
  </g>
  <g fill="#ffd166" opacity="0.6">
    <circle cx="205" cy="465" r="3"/><circle cx="1130" cy="520" r="3"/>
    <circle cx="60" cy="530" r="3"/><circle cx="1035" cy="580" r="4"/>
  </g>
  <g fill="#ff9bb5" opacity="0.55">
    <circle cx="285" cy="560" r="3.5"/><circle cx="140" cy="500" r="3"/>
    <circle cx="1210" cy="620" r="4"/><circle cx="945" cy="560" r="3"/>
  </g>`;
}

// The destination house. state: 'unknown' (DNS pending) | 'known'
// dockFilled: 0..5 slots lit during the win beat. address: plate text.
export function destinationHouse({ state = 'known', dockFilled = 0, address = null, label = "Grandma's" } = {}) {
  const dim = state === 'unknown';
  const slots = [-20, -10, 0, 10, 20].map((dx, i) =>
    `<rect x="${dx - 4}" y="26" width="8" height="8" rx="2"
       fill="${i < dockFilled ? 'var(--fragment, #6ee7ff)' : '#0e2f42'}"
       stroke="${i < dockFilled ? 'var(--fragment, #6ee7ff)' : '#3d6b80'}" stroke-width="1.4"/>`).join('');
  return `
  <circle cx="742" cy="300" r="104" fill="url(#rv-homeGlow)" opacity="${dim ? 0.25 : 1}"/>
  <g transform="translate(742,294) scale(1.15)" opacity="${dim ? 0.6 : 1}" class="rv-house">
    <ellipse cx="0" cy="23" rx="34" ry="5" fill="#0e2f42" opacity="0.6"/>
    <path d="M-22 18 v-14 l22 -15 22 15 v14 z" fill="#1a4257"
          stroke="${dim ? '#5d7a8a' : '#ffd166'}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="-6" y="6" width="12" height="12" rx="2" fill="${dim ? '#39586b' : '#ffd166'}"/>
    <rect x="-17" y="4" width="7" height="7" rx="1.5" fill="${dim ? '#39586b' : '#ffe9b0'}" opacity="0.9"/>
    <rect x="10" y="4" width="7" height="7" rx="1.5" fill="${dim ? '#39586b' : '#ffe9b0'}" opacity="0.9"/>
    ${dockFilled ? slots : ''}
    ${dim
    ? `<g class="rv-plate"><rect x="-11" y="-38" width="22" height="18" rx="5" fill="#12352b"
           stroke="#ffd166" stroke-width="2"/>
         <text y="-24" text-anchor="middle" font-size="13" font-weight="800"
               fill="#ffd166" font-family="ui-rounded, system-ui">?</text></g>`
    : (address
      ? `<g class="rv-plate"><rect x="-40" y="-40" width="80" height="16" rx="5" fill="#12352b"
             stroke="#3d6b80" stroke-width="1.6"/>
           <text y="-28" text-anchor="middle" font-size="10" font-weight="700"
                 fill="#9dbcaa" font-family="ui-monospace, Menlo, monospace">${address}</text></g>`
      : '')}
  </g>
  ${!dim && label ? `<text x="742" y="344" text-anchor="middle" font-size="15" font-weight="700"
      fill="#eafff2" font-family="ui-rounded, system-ui" paint-order="stroke"
      stroke="#0e2f42" stroke-width="3.5" stroke-linejoin="round">${label}</text>` : ''}`;
}

// Roadside trees — drawn over the road but UNDER the signposts (a sign in
// front of a tree reads as depth; a tree over a sign reads as a bug).
export function treeLayers() {
  return `
  ${tree(316, 386, 0.76)}
  ${tree(232, 454, 1)}
  ${tree(118, 562, 1.42)}
  ${tree(1006, 398, 0.82)}
  ${tree(1132, 510, 1.24)}`;
}

// Foreground grass band + fireflies (in FRONT of everything).
export function frontLayers() {
  return `
  <path d="M0 800 L0 754 Q60 738 120 752 Q180 766 240 748 Q320 726 390 750 L390 800 Z" fill="#0c2c1e"/>
  <path d="M890 800 L890 752 Q960 730 1040 750 Q1120 768 1200 744 Q1245 732 1280 742 L1280 800 Z" fill="#0c2c1e"/>
  <g stroke="#0c2c1e" stroke-width="7" stroke-linecap="round" fill="none">
    <path d="M60 754 q-4 -22 -14 -30"/>
    <path d="M96 752 q2 -24 12 -34"/>
    <path d="M300 748 q-2 -20 -12 -28"/>
    <path d="M1000 748 q-3 -22 -13 -30"/>
    <path d="M1176 744 q3 -24 13 -32"/>
  </g>
  <g fill="#ffe08a">
    <circle class="rv-twinkle"  cx="180" cy="700" r="4"/>
    <circle class="rv-twinkle2" cx="340" cy="732" r="3"/>
    <circle class="rv-twinkle"  cx="1060" cy="712" r="4"/>
    <circle class="rv-twinkle2" cx="948" cy="690" r="3"/>
    <circle class="rv-twinkle"  cx="1216" cy="668" r="3.4"/>
  </g>`;
}

// The storm at depth: cloud + sharp zigzag bolt + ground light + crackle,
// centered where the threatened road passes. Scaled by closeness (the cloud
// grows as you approach — impacts get scarier AND more legible).
export function stormAtDepth(x, y, scale = 1.1) {
  return `
  <ellipse cx="${x}" cy="${y + 108}" rx="110" ry="24" fill="url(#rv-hazardLight)"/>
  <g stroke="#ffb867" stroke-width="3" stroke-linecap="round" opacity="0.85" fill="none">
    <path d="M${x - 32} ${y + 106} l14 -6 l8 8"/>
    <path d="M${x + 20} ${y + 112} l12 -9"/>
  </g>
  <g transform="translate(${x},${y}) scale(${scale})">
    <g class="rv-bob">
      <g filter="url(#rv-soft)" opacity="0.5">
        <ellipse cx="0" cy="10" rx="86" ry="30" fill="#a85c28"/>
      </g>
      <circle cx="-44" cy="6" r="28" fill="#ff9440"/>
      <circle cx="-11" cy="-11" r="36" fill="#ffab5e"/>
      <circle cx="27" cy="0" r="30" fill="#ff9440"/>
      <circle cx="52" cy="12" r="21" fill="#f08a38"/>
      <ellipse cx="2" cy="19" rx="62" ry="17" fill="#f08a38"/>
      <path d="M2 30 L-12 58 L0 58 L-10 96 L18 52 L6 52 L18 30 Z"
            fill="#fff6c8" stroke="#a85c28" stroke-width="2" stroke-linejoin="round"/>
      <g stroke="#ff9440" stroke-width="3.4" stroke-linecap="round" opacity="0.8">
        <path d="M-56 40 l-6 15"/><path d="M-32 44 l-6 15"/>
        <path d="M32 42 l-6 15"/><path d="M54 36 l-6 15"/>
      </g>
    </g>
  </g>`;
}
