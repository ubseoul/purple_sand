const state = {
  mode: localStorage.getItem('mode') || 'balanced',
  posts: [],
  visibleCount: 14,
  sourceStatus: {},
  interactions: JSON.parse(localStorage.getItem('interactions') || '{}'),
  isLoading: false,
  weatherPost: null
};

const fallbackImages = {
  news: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
  aljazeera: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',
  japan: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80',
  tech: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  accountability: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
  anime: 'https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?auto=format&fit=crop&w=1200&q=80',
  league: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
  weather: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80'
};

const sources = [
  { name: 'BBC World', type: 'news', credibility: 0.93, depth: 0.86, rss: 'https://feeds.bbci.co.uk/news/world/rss.xml', homepage: 'https://www.bbc.com/news/world' },
  { name: 'NPR News', type: 'news', credibility: 0.90, depth: 0.84, rss: 'https://feeds.npr.org/1001/rss.xml', homepage: 'https://www.npr.org/sections/news/' },
  { name: 'PBS NewsHour', type: 'news', credibility: 0.91, depth: 0.88, rss: 'https://www.pbs.org/newshour/feeds/rss/headlines', homepage: 'https://www.pbs.org/newshour/' },
  { name: 'The Guardian World', type: 'news', credibility: 0.87, depth: 0.82, rss: 'https://www.theguardian.com/world/rss', homepage: 'https://www.theguardian.com/world' },
  { name: 'France 24', type: 'news', credibility: 0.86, depth: 0.80, rss: 'https://www.france24.com/en/rss', homepage: 'https://www.france24.com/en/' },
  { name: 'DW World', type: 'news', credibility: 0.86, depth: 0.80, rss: 'https://rss.dw.com/rdf/rss-en-all', homepage: 'https://www.dw.com/en/top-stories/s-9097' },
  { name: 'Al Jazeera', type: 'aljazeera', credibility: 0.89, depth: 0.86, rss: 'https://www.aljazeera.com/xml/rss/all.xml', homepage: 'https://www.aljazeera.com' },
  { name: 'NHK WORLD-JAPAN', type: 'japan', credibility: 0.90, depth: 0.82, rss: 'https://www3.nhk.or.jp/nhkworld/en/rss/news.xml', homepage: 'https://www3.nhk.or.jp/nhkworld/en/news/' },
  { name: 'The Japan Times', type: 'japan', credibility: 0.84, depth: 0.78, rss: 'https://www.japantimes.co.jp/feed/', homepage: 'https://www.japantimes.co.jp/' },
  { name: 'Rest of World', type: 'tech', credibility: 0.86, depth: 0.88, rss: 'https://restofworld.org/feed/latest/', homepage: 'https://restofworld.org/' },
  { name: 'ProPublica', type: 'accountability', credibility: 0.94, depth: 0.95, rss: 'https://www.propublica.org/feeds/propublica/main', homepage: 'https://www.propublica.org/' },
  { name: 'Anime News Network', type: 'anime', credibility: 0.82, depth: 0.70, rss: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us', homepage: 'https://www.animenewsnetwork.com' },
  { name: 'Crunchyroll News', type: 'anime', credibility: 0.76, depth: 0.62, rss: 'https://www.crunchyroll.com/newsrss', homepage: 'https://www.crunchyroll.com/news' },
  { name: 'League of Legends', type: 'league', credibility: 0.90, depth: 0.70, rss: 'https://www.leagueoflegends.com/en-us/news/rss.xml', homepage: 'https://www.leagueoflegends.com/en-us/news/' },
  { name: 'LoL Esports', type: 'league', credibility: 0.86, depth: 0.68, rss: 'https://lolesports.com/rss.xml', homepage: 'https://lolesports.com' }
].map(source => ({ ...source, image: fallbackImages[source.type] || fallbackImages.default }));

const nhkContextCard = {
  id: 'nhk-context',
  kind: 'source-card',
  title: 'NHK WORLD-JAPAN',
  type: 'japan',
  source: 'NHK WORLD-JAPAN',
  credibility: 0.90,
  depth: 0.82,
  freshness: 1,
  published: new Date().toISOString(),
  url: 'https://www3.nhk.or.jp/nhkworld/en/live/',
  summary: 'Official Japan-based international news stream and live context. No embedded frame — open directly when you want a real-time world/Japan view.',
  image: fallbackImages.japan,
  pinned: true
};

const fallbackPosts = sources.map(source => ({
  id: `${source.name}-fallback`,
  title: source.name,
  type: source.type,
  source: source.name,
  credibility: source.credibility,
  depth: source.depth,
  freshness: 0.45,
  published: null,
  url: source.homepage,
  summary: `Open ${source.name} directly. Live RSS may be temporarily blocked or unavailable.`,
  image: source.image,
  fallback: true
}));

const modeProfiles = {
  balanced: { news: 1, aljazeera: 1, japan: 1.08, tech: 0.95, accountability: 1.05, anime: 0.95, league: 0.95, weather: 1, credibility: 1, depth: 1, freshness: 1, personal: 0.8 },
  focus: { news: 1.35, aljazeera: 1.22, japan: 1.18, tech: 1.05, accountability: 1.35, anime: 0.35, league: 0.35, weather: 1.05, credibility: 1.35, depth: 1.3, freshness: 0.92, personal: 0.55 },
  culture: { news: 0.72, aljazeera: 0.78, japan: 1.18, tech: 0.88, accountability: 0.72, anime: 1.5, league: 1.35, weather: 0.8, credibility: 0.95, depth: 0.85, freshness: 1.05, personal: 1.05 },
  night: { news: 0.58, aljazeera: 0.65, japan: 1.05, tech: 0.8, accountability: 0.55, anime: 1.45, league: 1.25, weather: 1.18, credibility: 0.9, depth: 0.82, freshness: 0.82, personal: 1.15 }
};

const proxy = url => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function cleanText(text = '') {
  const div = document.createElement('div');
  div.innerHTML = text;
  return (div.textContent || div.innerText || '')
    .replace(/\s+/g, ' ')
    .replace(/Read more.*$/i, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
}

function extractImage(item, source) {
  const candidates = [item.thumbnail, item.enclosure?.link, item.enclosure?.url, item.content, item.description].filter(Boolean);
  for (const value of candidates) {
    if (typeof value === 'string' && /^https?:\/\/.*\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(value)) return value;
    if (typeof value === 'string') {
      const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match?.[1]) return match[1];
    }
  }
  return source.image;
}

function getFreshness(dateString) {
  if (!dateString) return 0.45;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0.45;
  const ageHours = Math.max(0, (Date.now() - date.getTime()) / 36e5);
  return clamp(1 - ageHours / 144, 0.12, 1);
}

function getPersonalSignal(post) {
  const typeSignal = state.interactions[`type:${post.type}`] || 0;
  const sourceSignal = state.interactions[`source:${post.source}`] || 0;
  return clamp((typeSignal * 0.25 + sourceSignal * 0.45) / 10, 0, 1.1);
}

function getClickbaitPenalty(post) {
  const text = `${post.title} ${post.summary}`.toLowerCase();
  const triggers = ['shocking', 'you won\'t believe', 'destroyed', 'obliterated', 'insane', 'secret', 'exposed', 'slams'];
  return triggers.some(word => text.includes(word)) ? 0.16 : 0;
}

function getModeWeight(post) {
  const profile = modeProfiles[state.mode] || modeProfiles.balanced;
  return profile[post.type] ?? 1;
}

function computeScore(post) {
  if (post.kind === 'daily-brief') return 3;
  if (post.kind === 'pulse') return 1.98;
  if (post.pinned) return 1.96;

  const profile = modeProfiles[state.mode] || modeProfiles.balanced;
  const personal = getPersonalSignal(post);
  const penalty = getClickbaitPenalty(post);

  const score = (
    post.credibility * 0.38 * profile.credibility +
    (post.depth || 0.7) * 0.24 * profile.depth +
    post.freshness * 0.22 * profile.freshness +
    getModeWeight(post) * 0.12 +
    personal * 0.04 * profile.personal -
    penalty
  );

  return clamp(score, 0, 2);
}

function explain(post) {
  if (post.kind === 'daily-brief') return 'editorial overview · built from the strongest items in the current feed';
  if (post.kind === 'pulse') return 'pulse card · groups related items so the scroll feels curated, not random';
  if (post.pinned) return 'pinned context · official source for live Japan/world updates';

  const reasons = [];
  if (post.credibility >= 0.9) reasons.push('high-trust source');
  if ((post.depth || 0) >= 0.86) reasons.push('depth source');
  if (post.freshness >= 0.78) reasons.push('fresh');
  if (getModeWeight(post) > 1.15) reasons.push(`${state.mode} mode favors this`);
  if (getClickbaitPenalty(post)) reasons.push('clickbait penalty applied');
  if (post.fallback) reasons.push('fallback source card');
  return reasons.length ? reasons.join(' · ') : 'curated for credibility, depth, freshness, and fit';
}

function track(key, amount = 1) {
  state.interactions[key] = (state.interactions[key] || 0) + amount;
  localStorage.setItem('interactions', JSON.stringify(state.interactions));
}

function relativeDate(dateString) {
  if (!dateString) return 'Source homepage';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Fresh item';
  const diffHours = Math.max(1, Math.round((Date.now() - date.getTime()) / 36e5));
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

async function loadLiveFeeds() {
  state.isLoading = true;
  state.visibleCount = 14;
  renderLoading();
  renderSourceStrip();

  const requests = sources.map(async source => {
    state.sourceStatus[source.name] = 'loading';
    try {
      const response = await fetch(proxy(source.rss));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('No RSS items');

      state.sourceStatus[source.name] = 'live';
      return data.items.slice(0, 10).map(item => ({
        id: item.guid || item.link || `${source.name}-${item.title}`,
        title: cleanText(item.title) || source.name,
        type: source.type,
        source: source.name,
        credibility: source.credibility,
        depth: source.depth,
        freshness: getFreshness(item.pubDate),
        published: item.pubDate,
        url: item.link || source.homepage,
        summary: cleanText(item.description || item.content || '').slice(0, 260),
        image: extractImage(item, source)
      }));
    } catch (error) {
      console.warn(`${source.name} failed`, error);
      state.sourceStatus[source.name] = 'fallback';
      return [];
    }
  });

  const results = await Promise.allSettled(requests);
  const livePosts = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);

  const seen = new Set();
  state.posts = [nhkContextCard, ...(state.weatherPost ? [state.weatherPost] : []), ...livePosts, ...fallbackPosts].filter(post => {
    const key = post.id || post.url || post.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  state.isLoading = false;
  renderSourceStrip();
  render();
}

function baseCuratedPosts() {
  const posts = [...state.posts];
  posts.sort((a, b) => computeScore(b) - computeScore(a));
  return diversify(posts);
}

function diversify(posts) {
  const result = [];
  const queue = [...posts];
  const recentTypes = [];
  while (queue.length) {
    let index = queue.findIndex(post => !recentTypes.slice(-2).includes(post.type));
    if (index < 0) index = 0;
    const [chosen] = queue.splice(index, 1);
    result.push(chosen);
    recentTypes.push(chosen.type);
  }
  return result;
}

function buildDailyBrief(posts) {
  const top = posts.filter(post => !post.fallback && !post.kind).slice(0, 6);
  const world = top.find(post => ['news', 'aljazeera', 'accountability'].includes(post.type));
  const japan = top.find(post => post.type === 'japan') || nhkContextCard;
  const culture = top.find(post => ['anime', 'league'].includes(post.type));
  const depth = top.find(post => (post.depth || 0) >= 0.88);

  return {
    id: 'daily-brief',
    kind: 'daily-brief',
    title: 'Daily Brief',
    type: 'brief',
    source: 'Purple Sand editorial layer',
    credibility: 0.95,
    depth: 0.95,
    freshness: 1,
    published: new Date().toISOString(),
    url: world?.url || japan.url,
    image: world?.image || fallbackImages.news,
    summary: [
      world ? `World: ${world.title}` : 'World: major feeds are still loading.',
      japan ? `Japan/NHK: ${japan.title}` : '',
      culture ? `Culture: ${culture.title}` : 'Culture: anime and League items will rise when fresh.',
      depth ? `Depth: ${depth.source} has a stronger context piece in the mix.` : ''
    ].filter(Boolean).join(' ')
  };
}

function buildPulseCards(posts) {
  const groups = [
    { type: 'news', title: 'World pulse', image: fallbackImages.news },
    { type: 'japan', title: 'Japan / NHK pulse', image: fallbackImages.japan },
    { type: 'anime', title: 'Anime pulse', image: fallbackImages.anime },
    { type: 'league', title: 'League pulse', image: fallbackImages.league },
    { type: 'accountability', title: 'Accountability pulse', image: fallbackImages.accountability },
    { type: 'tech', title: 'Tech / internet pulse', image: fallbackImages.tech }
  ];

  return groups.map(group => {
    const items = posts.filter(post => post.type === group.type && !post.kind).slice(0, 3);
    if (!items.length) return null;
    return {
      id: `pulse-${group.type}`,
      kind: 'pulse',
      title: group.title,
      type: group.type,
      source: `${items.length} curated items`,
      credibility: 0.88,
      depth: 0.85,
      freshness: Math.max(...items.map(item => item.freshness)),
      published: new Date().toISOString(),
      url: items[0].url,
      image: items[0].image || group.image,
      summary: items.map(item => `• ${item.title}`).join(' ')
    };
  }).filter(Boolean);
}

function getCuratedPosts() {
  const core = baseCuratedPosts();
  const brief = buildDailyBrief(core);
  const pulses = buildPulseCards(core);
  const stream = [brief];
  let pulseIndex = 0;

  core.forEach((post, index) => {
    stream.push(post);
    if ((index + 1) % 8 === 0 && pulseIndex < pulses.length) {
      stream.push(pulses[pulseIndex]);
      pulseIndex += 1;
    }
  });

  return stream;
}

function renderLoading() {
  $('#feed').innerHTML = Array.from({ length: 8 }).map(() => `
    <article class="card article-card skeleton-card">
      <div class="media-wrap skeleton-media"></div>
      <div class="card-body">
        <div class="skeleton short"></div>
        <div class="skeleton title"></div>
        <div class="skeleton line"></div>
        <div class="skeleton line"></div>
      </div>
    </article>
  `).join('');
}

function renderSourceStrip() {
  const strip = $('#sourceStrip');
  if (!strip) return;
  strip.innerHTML = ['NHK Link', ...sources.map(source => source.name)].map(name => {
    const status = name === 'NHK Link' ? 'live' : (state.sourceStatus[name] || 'waiting');
    return `<span class="source-chip ${status}">${name}<b>${status}</b></span>`;
  }).join('');

  const postCount = $('#postCount');
  if (postCount) postCount.textContent = `${state.posts.length || 0} sourced items`;
}

function render() {
  if (state.isLoading) return;
  const feed = $('#feed');
  const curated = getCuratedPosts();
  const visible = curated.slice(0, state.visibleCount);
  feed.innerHTML = '';

  visible.forEach((post, index) => {
    const node = $('#cardTemplate').content.cloneNode(true);
    const score = computeScore(post);
    const card = node.querySelector('.card');
    const image = node.querySelector('.post-image');

    if (post.kind) card.classList.add(`${post.kind}-card`);
    image.src = post.image || fallbackImages[post.type] || fallbackImages.default;
    image.alt = `${post.source} image`;

    node.querySelector('h2').textContent = post.title;
    node.querySelector('.tag').textContent = post.type;
    node.querySelector('.score').textContent = post.kind ? post.source : `#${index + 1} · ${score.toFixed(2)}`;
    node.querySelector('.summary').textContent = post.summary || 'Open the original source for the full story.';
    node.querySelector('.meta').textContent = `${post.source} · ${relativeDate(post.published)}`;
    node.querySelector('.why').textContent = explain(post);

    const readLink = node.querySelector('.read-link');
    readLink.href = post.url;
    readLink.textContent = post.kind === 'daily-brief' ? 'Open lead story' : post.pinned ? 'Open NHK' : 'Open story';
    readLink.addEventListener('click', () => {
      track(`type:${post.type}`, 1);
      track(`source:${post.source}`, 1);
    });

    feed.appendChild(node);
  });

  if (state.visibleCount < curated.length) {
    const more = document.createElement('button');
    more.className = 'load-more';
    more.textContent = 'Keep scrolling';
    more.addEventListener('click', () => {
      state.visibleCount += 10;
      render();
    });
    feed.appendChild(more);
  }
}

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem('mode', mode);
  $$('.mode-chip').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  state.visibleCount = 14;
  render();
}

function setupEvents() {
  $$('.mode-chip').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('#refreshButton').addEventListener('click', loadLiveFeeds);
  $('#weatherButton').addEventListener('click', loadWeather);

  window.addEventListener('scroll', () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 700;
    if (nearBottom && !state.isLoading) {
      const total = getCuratedPosts().length;
      if (state.visibleCount < total) {
        state.visibleCount += 6;
        render();
      }
    }
  }, { passive: true });
}

function loadWeather() {
  const button = $('#weatherButton');

  if (!navigator.geolocation) {
    button.textContent = 'Weather unavailable';
    return;
  }

  button.textContent = 'Loading weather...';
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`)
      .then(response => response.json())
      .then(data => {
        const current = data.current_weather;
        state.weatherPost = {
          id: 'local-weather',
          title: `${Math.round(current.temperature)}°F right now`,
          type: 'weather',
          source: 'Open-Meteo',
          credibility: 0.84,
          depth: 0.62,
          freshness: 1,
          published: new Date().toISOString(),
          url: 'https://open-meteo.com/',
          summary: `${Math.round(current.windspeed)} mph wind. Local weather is folded into the scroll as context, not as a giant dashboard block.`,
          image: fallbackImages.weather
        };
        button.textContent = 'Weather loaded';
        state.posts = [nhkContextCard, state.weatherPost, ...state.posts.filter(post => post.id !== 'nhk-context' && post.id !== 'local-weather')];
        render();
      })
      .catch(() => { button.textContent = 'Weather failed'; });
  }, () => { button.textContent = 'Location blocked'; });
}

function init() {
  setMode(state.mode);
  setupEvents();
  loadLiveFeeds();
}

init();
