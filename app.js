const state = {
  tab: 'all',
  mode: localStorage.getItem('mode') || 'balanced',
  posts: [],
  sourceStatus: {},
  saved: JSON.parse(localStorage.getItem('saved') || '[]'),
  prefs: JSON.parse(localStorage.getItem('prefs') || '{"news":1,"aljazeera":1,"anime":1,"league":1}'),
  interactions: JSON.parse(localStorage.getItem('interactions') || '{}'),
  hiddenSources: JSON.parse(localStorage.getItem('hiddenSources') || '[]'),
  isLoading: false
};

const sources = [
  { name: 'BBC World', type: 'news', credibility: 0.91, rss: 'https://feeds.bbci.co.uk/news/world/rss.xml', homepage: 'https://www.bbc.com/news/world' },
  { name: 'NPR News', type: 'news', credibility: 0.88, rss: 'https://feeds.npr.org/1001/rss.xml', homepage: 'https://www.npr.org/sections/news/' },
  { name: 'Al Jazeera', type: 'aljazeera', credibility: 0.89, rss: 'https://www.aljazeera.com/xml/rss/all.xml', homepage: 'https://www.aljazeera.com' },
  { name: 'Anime News Network', type: 'anime', credibility: 0.82, rss: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us', homepage: 'https://www.animenewsnetwork.com' },
  { name: 'League of Legends', type: 'league', credibility: 0.90, rss: 'https://www.leagueoflegends.com/en-us/news/rss.xml', homepage: 'https://www.leagueoflegends.com/en-us/news/' },
  { name: 'LoL Esports', type: 'league', credibility: 0.86, rss: 'https://lolesports.com/rss.xml', homepage: 'https://lolesports.com' }
];

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
  fallback: true
}));

const modeProfiles = {
  balanced: { news: 1, aljazeera: 1, anime: 1, league: 1, credibility: 1, freshness: 1, personal: 1 },
  focus: { news: 1.35, aljazeera: 1.25, anime: 0.45, league: 0.45, credibility: 1.35, freshness: 0.9, personal: 0.75 },
  culture: { news: 0.65, aljazeera: 0.75, anime: 1.45, league: 1.35, credibility: 0.9, freshness: 1.05, personal: 1.25 },
  night: { news: 0.55, aljazeera: 0.65, anime: 1.55, league: 1.3, credibility: 0.85, freshness: 0.85, personal: 1.45 }
};

const proxy = url => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cleanText(text = '') {
  const div = document.createElement('div');
  div.innerHTML = text;
  return (div.textContent || div.innerText || '')
    .replace(/\s+/g, ' ')
    .replace(/Read more.*$/i, '')
    .trim();
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
  const saveSignal = state.saved.includes(post.url) ? 4 : 0;
  return clamp((typeSignal * 0.35 + sourceSignal * 0.45 + saveSignal) / 10, 0, 1.25);
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
  const profile = modeProfiles[state.mode] || modeProfiles.balanced;
  const userPref = state.prefs[post.type] ?? 1;
  const personal = getPersonalSignal(post);
  const penalty = getClickbaitPenalty(post);
  const sourcePenalty = state.hiddenSources.includes(post.source) ? 0.25 : 0;

  const score = (
    post.credibility * 0.42 * profile.credibility +
    post.freshness * 0.24 * profile.freshness +
    userPref * 0.12 +
    getModeWeight(post) * 0.10 +
    personal * 0.12 * profile.personal -
    penalty -
    sourcePenalty
  );

  return clamp(score, 0, 1.5);
}

function explain(post) {
  const reasons = [];
  if (post.credibility >= 0.9) reasons.push('trusted source');
  if (post.freshness >= 0.78) reasons.push('fresh');
  if ((state.prefs[post.type] || 1) > 1.15) reasons.push('you boosted this topic');
  if (getPersonalSignal(post) > 0.25) reasons.push('learned from your behavior');
  if (getModeWeight(post) > 1.15) reasons.push(`${state.mode} mode favors this`);
  if (getClickbaitPenalty(post)) reasons.push('clickbait penalty applied');
  if (post.fallback) reasons.push('fallback source card');
  return reasons.length ? reasons.join(' · ') : 'balanced credibility, freshness, and taste';
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
      return data.items.slice(0, 8).map(item => ({
        id: item.guid || item.link || `${source.name}-${item.title}`,
        title: cleanText(item.title) || source.name,
        type: source.type,
        source: source.name,
        credibility: source.credibility,
        freshness: getFreshness(item.pubDate),
        published: item.pubDate,
        url: item.link || source.homepage,
        summary: cleanText(item.description || item.content || '').slice(0, 220)
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
  state.posts = [...livePosts, ...fallbackPosts]
    .filter(post => {
      const key = post.url || post.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  state.isLoading = false;
  renderSourceStrip();
  render();
}

function getFilteredPosts() {
  let filtered = [...state.posts];

  if (state.tab === 'saved') filtered = filtered.filter(post => state.saved.includes(post.url));
  else if (state.tab === 'weather') filtered = [];
  else if (state.tab !== 'all') filtered = filtered.filter(post => post.type === state.tab);

  const search = $('#searchInput')?.value.toLowerCase().trim();
  if (search) {
    filtered = filtered.filter(post => [post.title, post.summary, post.source, post.type].join(' ').toLowerCase().includes(search));
  }

  const sort = $('#sortSelect')?.value || 'signal';
  if (sort === 'signal') filtered.sort((a, b) => computeScore(b) - computeScore(a));
  if (sort === 'newest') filtered.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
  if (sort === 'credibility') filtered.sort((a, b) => b.credibility - a.credibility || computeScore(b) - computeScore(a));
  if (sort === 'personal') filtered.sort((a, b) => getPersonalSignal(b) - getPersonalSignal(a) || computeScore(b) - computeScore(a));

  return filtered;
}

function renderLoading() {
  $('#feed').innerHTML = Array.from({ length: 8 }).map(() => `
    <article class="card skeleton-card">
      <div class="skeleton short"></div>
      <div class="skeleton title"></div>
      <div class="skeleton line"></div>
      <div class="skeleton line"></div>
      <div class="skeleton pill"></div>
    </article>
  `).join('');
}

function renderSourceStrip() {
  const strip = $('#sourceStrip');
  if (!strip) return;
  strip.innerHTML = sources.map(source => {
    const status = state.sourceStatus[source.name] || 'waiting';
    return `<span class="source-chip ${status}">${source.name}<b>${status}</b></span>`;
  }).join('');

  const liveCount = Object.values(state.sourceStatus).filter(status => status === 'live').length;
  $('#sourceCount').textContent = `${liveCount}/${sources.length} live`;
  $('#postCount').textContent = `${state.posts.length} posts`;
}

function renderWeatherTab() {
  $('#feed').innerHTML = `
    <article class="card spotlight-card">
      <div class="card-topline"><span class="tag">weather</span><span class="score">local</span></div>
      <h3>Your local weather sits in the hero card.</h3>
      <p class="summary">Tap “Load local weather” above to pull live temperature and wind from Open-Meteo using your browser location.</p>
      <p class="why">why: weather is contextual, not part of the article ranking system</p>
    </article>
  `;
}

function render() {
  if (state.isLoading) return;
  if (state.tab === 'weather') {
    renderWeatherTab();
    return;
  }

  const feed = $('#feed');
  const filtered = getFilteredPosts();
  feed.innerHTML = '';

  if (!filtered.length) {
    feed.innerHTML = '<article class="card spotlight-card"><h3>No signal here yet.</h3><p class="summary">Try another tab, search, refresh, or save a few items to teach the feed.</p></article>';
    return;
  }

  filtered.forEach(post => {
    const node = $('#cardTemplate').content.cloneNode(true);
    const score = computeScore(post);
    node.querySelector('h3').textContent = post.title;
    node.querySelector('.tag').textContent = post.type;
    node.querySelector('.score').textContent = `signal ${score.toFixed(2)}`;
    node.querySelector('.summary').textContent = post.summary || 'Open the original source for the full story.';
    node.querySelector('.meta').textContent = `${post.source} · ${relativeDate(post.published)}`;
    node.querySelector('.why').textContent = `why: ${explain(post)}`;

    const readLink = node.querySelector('.read-link');
    readLink.href = post.url;
    readLink.addEventListener('click', () => {
      track(`type:${post.type}`, 1);
      track(`source:${post.source}`, 1);
    });

    const saveButton = node.querySelector('.save-button');
    saveButton.textContent = state.saved.includes(post.url) ? 'Saved' : 'Save';
    saveButton.addEventListener('click', () => {
      if (state.saved.includes(post.url)) state.saved = state.saved.filter(url => url !== post.url);
      else state.saved.push(post.url);
      localStorage.setItem('saved', JSON.stringify(state.saved));
      track(`type:${post.type}`, 2);
      track(`source:${post.source}`, 1);
      render();
    });

    node.querySelector('.boost-button').addEventListener('click', () => {
      state.prefs[post.type] = clamp((state.prefs[post.type] || 1) + 0.1, 0, 2);
      localStorage.setItem('prefs', JSON.stringify(state.prefs));
      syncPreferenceInputs();
      track(`type:${post.type}`, 1);
      render();
    });

    node.querySelector('.mute-button').addEventListener('click', () => {
      state.prefs[post.type] = clamp((state.prefs[post.type] || 1) - 0.1, 0, 2);
      localStorage.setItem('prefs', JSON.stringify(state.prefs));
      syncPreferenceInputs();
      render();
    });

    feed.appendChild(node);
  });
}

function syncPreferenceInputs() {
  $$('[data-pref]').forEach(slider => {
    slider.value = state.prefs[slider.dataset.pref] ?? 1;
  });
}

function setTab(tab) {
  state.tab = tab;
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
  render();
}

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem('mode', mode);
  $$('.mode-chip').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  render();
}

function setupEvents() {
  $$('.nav-item').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
  $$('.mode-chip').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('#searchInput').addEventListener('input', render);
  $('#sortSelect').addEventListener('change', render);
  $('#refreshButton').addEventListener('click', loadLiveFeeds);

  $$('[data-pref]').forEach(slider => {
    slider.addEventListener('input', () => {
      state.prefs[slider.dataset.pref] = parseFloat(slider.value);
      localStorage.setItem('prefs', JSON.stringify(state.prefs));
      render();
    });
  });

  $('#resetLearning').addEventListener('click', () => {
    state.interactions = {};
    state.prefs = { news: 1, aljazeera: 1, anime: 1, league: 1 };
    localStorage.setItem('prefs', JSON.stringify(state.prefs));
    localStorage.removeItem('interactions');
    syncPreferenceInputs();
    render();
  });

  $('#weatherButton').addEventListener('click', loadWeather);
}

function loadWeather() {
  const temp = $('#weatherTemp');
  const detail = $('#weatherDetail');
  const button = $('#weatherButton');

  if (!navigator.geolocation) {
    temp.textContent = 'Location unavailable';
    detail.textContent = 'Your browser does not support geolocation.';
    return;
  }

  button.textContent = 'Loading...';
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`)
      .then(response => response.json())
      .then(data => {
        const current = data.current_weather;
        temp.textContent = `${Math.round(current.temperature)}°F`;
        detail.textContent = `${Math.round(current.windspeed)} mph wind · updated now`;
        button.textContent = 'Refresh weather';
      })
      .catch(() => {
        temp.textContent = 'Weather unavailable';
        detail.textContent = 'Open-Meteo did not respond.';
        button.textContent = 'Try again';
      });
  }, () => {
    temp.textContent = 'Location blocked';
    detail.textContent = 'Allow location access to see local weather.';
    button.textContent = 'Try again';
  });
}

function init() {
  syncPreferenceInputs();
  setMode(state.mode);
  setupEvents();
  loadLiveFeeds();
}

init();
