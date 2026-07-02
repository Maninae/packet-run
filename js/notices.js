// notices.js — sequences engine events into transient flashes + sfx between
// beats. One nameable job: the world just acted; say what happened, briefly,
// truthfully (accuracy captions live here — keep design/07 in mind).

import { flashPrompt } from './hud.js';
import { sfx } from './sound.js';
import { names } from './prompts.js';

const $ = (sel) => document.querySelector(sel);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = (ms) => (reduced() ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

// one stutter notice per run, not per beat
const stutterShown = new WeakSet();

function shake() {
  const stage = $('#stage');
  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');
}

async function impactNotice(e) {
  if (e.kind === 'sniffer') {
    if (e.foiled) {
      sfx.pop();
      flashPrompt('cloak', 'The sniffer watched your sealed fragments pass — and read nothing.');
    } else {
      sfx.static();
      flashPrompt('sniffer', 'The sniffer touched one of your fragments — something\'s scrambled.');
    }
    await delay(1000);
    return;
  }
  if (e.kind === 'trench') {
    if (e.cut) {
      sfx.fail();
      flashPrompt('trench', 'SNAP — the cable is cut! Home reissues the party from the junction.');
    } else {
      sfx.chime();
      flashPrompt('trench', 'The deep-sea cable hums — <strong>+3 energy</strong> from the giant pipe.');
    }
    await delay(1000);
    return;
  }
  if (e.kind === 'satellite') {
    sfx.mud();
    flashPrompt('satellite', e.flaky
      ? 'Up and over by satellite — and solar weather adds a tick. Space is far.'
      : 'Up and over by satellite — the long way costs a tick.');
    await delay(900);
    return;
  }
  if (e.kind === 'offline') {
    sfx.mud();
    flashPrompt('clock', 'The router blinks off… and back on. One beat lost — uptime isn\'t a given out here.');
    await delay(900);
    return;
  }
  if (e.kind === 'ddos') {
    sfx.static();
    shake();
    flashPrompt('swarm', 'A swarm floods the pipe! Only two of yours can squeeze through per beat.');
    await delay(1000);
    return;
  }
  if (e.kind === 'congestion') {
    sfx.mud();
    flashPrompt('jam', 'A jam! This pipe only fits so many per beat — start small.');
    await delay(900);
    return;
  }
  if (e.kind === 'rapids') {
    sfx.splash();
    const list = e.stragglers.map((s) => `<strong>#${s.fragment}</strong>`).join(' and ');
    flashPrompt('rapids', `Splash! The rapids scattered the party — ${list} fell behind.`);
    await delay(1000);
    return;
  }
  if (e.kind === 'static') {
    sfx.static();
    shake();
    flashPrompt('static',
      'Kzzt! The Static scrambled one of your fragments — you can\'t tell which.');
    await delay(1000);
    return;
  }
  if (e.swept.length) {
    sfx.sweep();
    shake();
    flashPrompt(e.kind === 'storm' ? 'storm' : 'drizzle',
      `The ${e.kind} hit! It swept ${names(e.swept)}.`);
    await delay(900);
  }
  if (e.saved.length) {
    sfx.pop();
    flashPrompt('copy', `A copy stepped in — ${names(e.saved)} ${e.saved.length > 1 ? 'are' : 'is'} safe!`);
    await delay(900);
  }
  if (e.gust) {
    if (e.gust.saved) sfx.pop(); else sfx.sweep();
    flashPrompt(e.gust.saved ? 'copy' : 'storm', e.gust.saved
      ? `A gust hit <strong>#${e.gust.fragment}</strong> — its copy took the hit!`
      : `A gust swept <strong>#${e.gust.fragment}</strong> too!`);
    await delay(900);
  }
}

export async function playNotices(run, batch) {
  for (const e of batch) {
    switch (e.type) {
      case 'impact':
        await impactNotice(e);
        break;
      case 'rejoin':
        sfx.chime();
        flashPrompt('retransmit', `${names(e.fragments)} caught back up!`);
        await delay(700);
        break;
      case 'checksum':
        sfx.scan();
        flashPrompt('checksum', `Found it — ${names(e.found)} is scrambled! Repair can fix it.`);
        await delay(900);
        break;
      case 'repair':
        sfx.chime();
        flashPrompt('repair', `<strong>#${e.fragment}</strong> is clean again.`);
        await delay(700);
        break;
      case 'pickup':
        sfx.chime();
        flashPrompt('bolt', `A friendly relay tops you up — <strong>+${e.amount} energy</strong>.`);
        await delay(700);
        break;
      case 'fog-reveal': {
        if (e.cost > 0) sfx.mud();
        const line = e.cost === 0
          ? 'The mist clears — the last stretch looks smooth!'
          : e.cost === 1
            ? 'The mist clears — a muddy stretch ahead will cost <strong>+1 tick</strong>.'
            : 'The mist clears — deep mud ahead: <strong>+2 ticks</strong>.';
        flashPrompt('clock', line);
        await delay(900);
        break;
      }
      case 'stragglers-lost':
        sfx.sweep();
        flashPrompt('rapids', `You pressed on — ${names(e.fragments)} fell too far behind.`);
        await delay(900);
        break;
      case 'skip':
        sfx.bloop();
        flashPrompt('rapids', `You waved <strong>#${e.fragment}</strong> goodbye — the call moves on.`);
        await delay(600);
        break;
      case 'stutter':
        if (!stutterShown.has(run)) {
          stutterShown.add(run);
          sfx.mud();
          flashPrompt('rapids',
            `The call is stuttering over the missing frames — Skip them to steady it.`);
          await delay(900);
        }
        break;
      case 'wait':
        sfx.bloop();
        break;
      case 'reroute':
        sfx.whoosh();
        flashPrompt('bolt', 'You told home to try a different road — the party reappears at the junction.');
        await delay(900);
        break;
      case 'send':
        if (e.bounced > 0) {
          sfx.sweep();
          flashPrompt('jam', `Too many at once! <strong>${e.bounced}</strong> bounced back — ease off.`);
          await delay(800);
        } else {
          sfx.bloop();
          flashPrompt('jam', `<strong>${e.crossed}</strong> slipped through — the pipe holds. Push harder?`);
          await delay(650);
        }
        break;
      case 'siege-over':
        sfx.chime();
        flashPrompt('swarm', 'The flood breaks up — the road is yours again.');
        await delay(900);
        break;
      case 'push':
        sfx.bloop();
        break;
      case 'siege-beat':
        break;
      case 'congestion-cleared':
        sfx.chime();
        flashPrompt('jam', `Everyone's through — the pipe flows again!`);
        await delay(800);
        break;
      case 'handshake':
        flashPrompt('cloak', 'Sealing handshake… one tick. Your fragments now travel encrypted.');
        await delay(800);
        break;
      case 'dns-lookup':
        sfx.chime();
        localStorage.setItem('packet-run-dns', '8');
        flashPrompt('bolt',
          `Found it — Grandma's is at <strong>${e.address}</strong>! Your device will remember for a while.`);
        await delay(1100);
        break;
      case 'reward-taken':
        sfx.chime();
        if (e.kind === 'tool') {
          flashPrompt('bolt', `<strong>${e.tool[0].toUpperCase()}${e.tool.slice(1)}</strong> joins your belt${e.replaced ? ` — ${e.replaced} swapped out` : ''}.`);
          await delay(800);
        } else {
          flashPrompt('bolt', `<strong>+${e.amount} energy</strong> banked.`);
          await delay(600);
        }
        break;
      case 'event-hiccup':
        sfx.splash();
        flashPrompt('rapids', `The old router hiccuped — <strong>#${e.fragment}</strong> fell a beat behind.`);
        await delay(900);
        break;
      case 'cache-jump':
        sfx.chime();
        flashPrompt('bolt', 'The cache serves its copy from nearby — you skip ahead!');
        await delay(900);
        break;
      case 'item-used': {
        sfx.chime();
        localStorage.setItem('packet-run-pouch', JSON.stringify(run.pouch));
        const lines = {
          boost: '<strong>+3 energy</strong> from the Signal Boost.',
          spare: `<strong>#${e.fragment}</strong> pops back — good as new!`,
          stamp: `<strong>#${e.fragment}</strong> wears the Priority Stamp — the next sweep can't touch it.`,
        };
        flashPrompt('bolt', lines[e.item]);
        await delay(800);
        break;
      }
      case 'copies-discarded':
        flashPrompt('copy',
          `The dock keeps one of each number — spare ${names(e.fragments)} not needed.`);
        await delay(800);
        break;
    }
  }
}
