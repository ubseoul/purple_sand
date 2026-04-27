const state = {
  mode: localStorage.getItem('mode') || 'balanced',
  posts: [],
  visibleCount: 12,
  sourceStatus: {},
  prefs: JSON.parse(localStorage.getItem('prefs') || '{"news":1,"aljazeera":1,"anime":1,"league":1,"nhk":1,"weather":1}'),
  interactions: JSON.parse(localStorage.getItem('interactions') || '{}'),
  isLoading: false,
  weatherPost: null
};

const sources = [
  { name: 'BBC World', type: 'news', credibility: 0.91, rss: 'https://feeds.bbci.co.uk/news/world/rss.xml', homepage: 'https://www.bbc.com/news/world', image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80' },
  { name: 'NPR News', type: 'news', credibility: 0.88, rss: 'https://feeds.npr.org/1001/rss.xml', homepage: 'https://www.npr.org/sections/news/', image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Al Jazeera', type: 'aljazeera', credibility: 0.89, rss: 'https://www.aljazeera.com/xml/rss/all.xml', homepage: 'https://www.aljazeera.com', image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Anime News Network', type: 'anime', credibility: 0.82, rss: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us', homepage: 'https://www.animenewsnetwork.com', image: 'https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?auto=format&fit=crop&w=1200&q=80' },
  { name: 'League of Legends', type: 'league', credibility: 0.90, rss: 'https://www.leagueoflegends.com/en-us/news/rss.xml', homepage: 'https://www.leagueoflegends.com/en-us/news/', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80' },
  { name: 'LoL Esports', type: 'league', credibility: 0.86, rss: 'https://lolesports.com/rss.xml', homepage: 'https://lolesports.com', image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80' }
];

const nhkLiveCard = {
  id: 'nhk-live',
  title: 'NHK WORLD-JAPAN Live',
  type: 'nhk',
  source: 'NHK WORLD-JAPAN',
  credibility: 0.9,
  freshness: 1,
  published: new Date().toISOString(),
  url: 'https://www3.nhk.or.jp/nhkworld/en/live/',
  summary: 'Live international news stream. Use this as the “what is happening right now?” window inside your scroll.',
  image: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
  embed: 'https://www3.nhk.or.jp/nhkworld/en/live/',
  pinned: true
};

const fallbackPosts = sources.map(source => ({
  id: `${source.name}-fallback`,
  title: source.name,
  type: source.type,
  source: source.name,
  credibility: source.credibility,
  freshness: 0.45,
  published: null,
  url: source.homepage,
  summary: `Open ${source.name} directly. Live RSS may be temporarily blocked or unavailable.`,
  image: source.image,
  fallback: true
}));

const modeProfiles = {
  balanced: { news: 1, aljazeera: 1, anime: 1, league: 1, nhk: 1.18, weather: 1, credibility: 1, freshness: 1, personal: 1 },
  focus: { news: 1.35, aljazeera: 1.25, anime: 0.45, league: 0.45, nhk: 1.45, weather: 1.05, credibility: 1.35, freshness: 0.95, personal: 0.7 },
  culture: { news: 0.65, aljazeera: 0.75, anime: 1.45, league: 1.35, nhk: 0.9, weather: 0.85, credibility: 0.9, freshness: 1.05, personal: 1.15 },
  night: { news: 0.55, aljazeera: 0.65, anime: 1.55, league: 1.3, nhk: 0.8, weather: 1.15, credibility: 0.85, freshness: 0.85, personal: 1.25 }
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
    .trim();
}

function extractImage(item, source) {
  const candidates = [
    item.thumbnail,
    item.enclosure?.link,
    item.enclosure?.url,
    item.content,
    item.description
  ].filter(Boolean);

  for (const value of candidates) {
    if (typeof value === 'string' && /^https?:\/\/.*\.(jpg|jpeg|png|webp)/i.test(value)) return value;
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
  return clamp(1 - ageHours / 120, 0.15, 1);
}

function getPersonalSignal(post) {
  const typeSignal = state.interactions[`type:${post.type}`] || 0;
  const sourceSignal = state.interactions[`source:${post.source}`] || 0;
  return clamp((typeSignal * 0.35 + sourceSignal * 0.45) / 10, 0, 1.25);
}

function getClickbaitPenalty(post) {
  const text = `${post.title} ${post.summary}`.toLowerCase();
  const triggers = ['shocking', 'you won\'t believe', 'destroyed', 'obliterated', 'insane', 'secret', 'exposed'];
  return triggers.some(word => text.includes(word)) ? 0.12 : 0;
}

function getModeWeight(post) {
  const profile = modeProfiles[state.mode] || modeProfiles.balanced;
  return profile[post.type] ?? 1;
}

function computeScore(post) {
  if (post.pinned) return 2;
  const profile = modeProfiles[state.mode] || modeProfiles.balanced;
  const userPref = state.prefs[post.type] ?? 1;
  const personal = getPersonalSignal(post);
  const penalty = getClickbaitPenalty(post);

  const score = (
    post.credibility * 0.48 * profile.credibility +
    post.freshness * 0.26 * profile.freshness +
    userPref * 0.12 +
    getModeWeight(post) * 0.10 +
    personal * 0.04 * profile.personal -
    penalty
  );

  return clamp(score, 0, 2);
}

function explain(post) {
  if (post.pinned) return 'pinned live context · useful for seeing what is happening now';
  const reasons = [];
  if (post.credibility >= 0.9) reasons.push('trusted source');
  if (post.freshness >= 0.78) reasons.push('fresh');
  if (getModeWeight(post) > 1.15) reasons.push(`${state.mode} mode favors this`);
  if (getClickbaitPenalty(post)) reasons.push('clickbait penalty applied');
  if (post.fallback) reasons.push('fallback source card');
  return reasons.length ? reasons.join(' · ') : 'curated for credibility, freshness, and fit';
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
  state.visibleCount = 12;
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
      return data.items.slice(0, 12).map(item => ({
        id: item.guid || item.link || `${source.name}-${item.title}`,
        title: cleanText(item.title) || source.name,
        type: source.type,
        source: source.name,
        credibility: source.credibility,
        freshness: getFreshness(item.pubDate),
        published: item.pubDate,
        url: item.link || source.homepage,
        summary: cleanText(item.description || item.content || '').slice(0, 220),
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
  state.posts = [nhkLiveCard, ...(state.weatherPost ? [state.weatherPost] : []), ...livePosts, ...fallbackPosts].filter(post => {
    const key = post.id || post.url || post.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  state.isLoading = false;
  renderSourceStrip();
  render();
}

function getCuratedPosts() {
  const curated = [...state.posts];
  curated.sort((a, b) => computeScore(b) - computeScore(a));
  return curated;
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
  strip.innerHTML = ['NHK Live', ...sources.map(source => source.name)].map(name => {
    const status = name === 'NHK Live' ? 'live' : (state.sourceStatus[name] || 'waiting');
    return `<span class="source-chip ${status}">${name}<b>${status}</b></span>`;
  }).join('');

  const postCount = $('#postCount');
  if (postCount) postCount.textContent = `${state.posts.length || 0} curated items`;
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
    const mediaWrap = node.querySelector('.media-wrap');

    if (post.embed) {
      card.classList.add('live-card');
      mediaWrap.innerHTML = `<iframe title="NHK WORLD-JAPAN Live" src="${post.embed}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      image.src = post.image;
      image.alt = `${post.source} article image`;
    }

    node.querySelector('h2').textContent = post.title;
    node.querySelector('.tag').textContent = post.type;
    node.querySelector('.score').textContent = `#${index + 1} · ${score.toFixed(2)}`;
    node.querySelector('.summary').textContent = post.summary || 'Open the original source for the full story.';
    node.querySelector('.meta').textContent = `${post.source} · ${relativeDate(post.published)}`;
    node.querySelector('.why').textContent = explain(post);

    const readLink = node.querySelector('.read-link');
    readLink.href = post.url;
    readLink.textContent = post.embed ? 'Open NHK live' : 'Open story';
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
  state.visibleCount = 12;
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
          freshness: 1,
          published: new Date().toISOString(),
          url: 'https://open-meteo.com/',
          summary: `${Math.round(current.windspeed)} mph wind. This local weather card is folded into your scroll instead of taking up a giant block.`,
          image: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1200&q=80'
        };
        button.textContent = 'Weather loaded';
        state.posts = [nhkLiveCard, state.weatherPost, ...state.posts.filter(post => post.id !== 'nhk-live' && post.id !== 'local-weather')];
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
