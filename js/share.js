// share.js — the schoolyard artifact (design/09 Phase 6): a win becomes a
// text card a kid can paste anywhere, ending in a challenge link that
// replays the EXACT same map (seed + payload + act pinned). Wordle taught
// the world this loop; ours carries a journey in it.

const HAZARD_EMOJI = {
  storm: '⛈️', drizzle: '🌧️', static: '📺', rapids: '🌊', congestion: '🚦',
  sniffer: '👁️', trench: '🌊', satellite: '🛰️', ddos: '🐝', offline: '🔌',
};

// the roads actually taken, in order — the journey line is YOUR line
function journeyLine(run) {
  const taken = run.events.filter((e) => e.type === 'road-chosen');
  const steps = taken.map((e, i) => {
    const segment = run.map.segments[Math.min(i, run.map.segments.length - 1)];
    const kind = segment?.roads[e.road]?.hazard?.kind;
    return kind ? (HAZARD_EMOJI[kind] ?? '〰️') : '〰️';
  });
  if (run.map.boss === 'static' && run.events.some((e) => e.type === 'duel-won')) {
    steps.push('👾');
  }
  return `${steps.join('')}→📬`;
}

export function buildShareCard(run, act, baseUrl) {
  const delivered = run.fragments.filter((f) => f.status === 'with-party' && !f.corrupted).length;
  const stars = '★'.repeat(run.stars) + '☆'.repeat(3 - run.stars);
  const payload = run.payload === 'udp-call' ? 'call' : 'file';
  const url = `${baseUrl}?seed=${encodeURIComponent(run.seed)}&payload=${payload}&act=${act.id}`;
  return [
    `Packet Run — Act ${act.id} · ${act.name}`,
    `${stars} · ${delivered}/5 fragments · ${run.deadline} tick${run.deadline === 1 ? '' : 's'} to spare`,
    journeyLine(run),
    `Same map, your moves: ${url}`,
  ].join('\n');
}

// clipboard with a fallback the E2E (and old tablets) can see
export async function copyShareCard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    try { document.execCommand('copy'); } catch { /* the card is still shown */ }
    area.remove();
    return false;
  }
}
