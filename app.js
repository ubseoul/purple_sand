let currentTab = 'all';
let posts = [];
let saved = JSON.parse(localStorage.getItem('saved') || '[]');

const fallbackPosts = [
  { title: 'Reuters', type: 'news', source: 'Reuters', credibility: 0.95, freshness: 0.7, url: 'https://www.reuters.com', summary: 'Open Reuters directly if the live feed is unavailable.' },
  { title: 'BBC World News', type: 'news', source: 'BBC', credibility: 0.9, freshness: 0.7, url: 'https://www.bbc.com/news/world', summary: 'Open BBC World directly if the live feed is unavailable.' },
  { title: 'Al Jazeera', type: 'aljazeera', source: 'Al Jazeera', credibility: 0.9, freshness: 0.7, url: 'https://www.aljazeera.com', summary: 'Open Al Jazeera directly if the live feed is unavailable.' },
  { title: 'Anime News Network', type: 'anime', source: 'ANN', credibility: 0.82, freshness: 0.7, url: 'https://www.animenewsnetwork.com', summary: 'Open Anime News Network directly if the live feed is unavailable.' },
  { title: 'League of Legends News', type: 'league', source: 'Riot Games', credibility: 0.9, freshness: 0.7, url: 'https://www.leagueoflegends.com/en-us/news/', summary: 'Open Riot League news directly if the live feed is unavailable.' }
];

const sources = [
  { name: 'Reuters World', type: 'news', credibility: 0.95, rss: 'https://feeds.reuters.com/reuters/worldNews' },
  { name: 'BBC World', type: 'news', credibility: 0.9, rss: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'NPR News', type: 'news', credibility: 0.88, rss: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'Al Jazeera', type: 'aljazeera', credibility: 0.9, rss: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'Anime News Network', type: 'anime', credibility: 0.82, rss: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us' },
  { name: 'Crunchyroll News', type: 'anime', credibility: 0.78, rss: 'https://www.crunchyroll.com/newsrss' },
  { name: 'League of Legends', type: 'league', credibility: 0.9, rss: 'https://www.leagueoflegends.com/en-us/news/rss.xml' },
  { name: 'LoL Esports', type: 'league', credibility: 0.86, rss: 'https://lolesports.com/rss.xml' }
];

const proxy = url => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;

function computeFreshness(dateString) {
  if (!dateString) return 0.55;
  const ageHours = Math.max(1, (Date.now() - new Date(dateString).getTime()) / 36e5);
  return Math.max(0.25, Math.min(1, 1 - ageHours / 168));
}

function computeScore(p) {
  return Number((p.credibility * 0.6 + p.freshness * 0.4).toFixed(2));
}

function cleanText(text = '') {
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

async function loadLiveFeeds() {
  renderLoading();

  const requests = sources.map(async source => {
    try {
      const res = await fetch(proxy(source.rss));
      if (!res.ok) throw new Error('Feed request failed');
      const data = await res.json();
      if (!data.items) throw new Error('No items returned');

      return data.items.slice(0, 6).map(item => ({
        title: cleanText(item.title),
        type: source.type,
        source: source.name,
        credibility: source.credibility,
        freshness: computeFreshness(item.pubDate),
        published: item.pubDate,
        url: item.link,
        summary: cleanText(item.description || item.content || '').slice(0, 180)
      }));
    } catch (error) {
      console.warn(`${source.name} unavailable`, error);
      return [];
    }
  });

  const results = await Promise.allSettled(requests);
  posts = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);

  if (!posts.length) posts = fallbackPosts;
  render();
}

function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const active = document.querySelector(`[data-tab="${tab}"]`);
  if (active) active.classList.add('active');
  render();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('sortSelect').addEventListener('change', render);

function renderLoading() {
  const feed = document.getElementById('feed');
  feed.innerHTML = Array.from({ length: 6 }).map(() => `
    <article class="card skeleton-card">
      <div class="skeleton short"></div>
      <div class="skeleton title"></div>
      <div class="skeleton line"></div>
      <div class="skeleton line"></div>
    </article>
  `).join('');
}

function render() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '';

  let filtered = [...posts];

  if (currentTab === 'saved') filtered = filtered.filter(p => saved.includes(p.url));
  else if (currentTab !== 'all') filtered = filtered.filter(p => p.type === currentTab);

  const search = document.getElementById('searchInput').value.toLowerCase();
  if (search) {
    filtered = filtered.filter(p =>
      [p.title, p.summary, p.source, p.type].join(' ').toLowerCase().includes(search)
    );
  }

  const sort = document.getElementById('sortSelect').value;
  if (sort === 'signal') filtered.sort((a, b) => computeScore(b) - computeScore(a));
  if (sort === 'newest') filtered.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
  if (sort === 'credibility') filtered.sort((a, b) => b.credibility - a.credibility);

  if (!filtered.length) {
    feed.innerHTML = '<article class="card"><h3>No posts here yet.</h3><p class="summary">Try another tab, search, or refresh the page.</p></article>';
    return;
  }

  filtered.forEach(p => {
    const t = document.getElementById('cardTemplate');
    const node = t.content.cloneNode(true);

    node.querySelector('h3').textContent = p.title;
    node.querySelector('.tag').textContent = p.type;
    node.querySelector('.score').textContent = `signal: ${computeScore(p)}`;
    node.querySelector('.summary').textContent = p.summary || 'Fresh source item. Open the original story for details.';
    node.querySelector('.meta').textContent = `${p.source || 'Source'}${p.published ? ' • ' + new Date(p.published).toLocaleDateString() : ''}`;
    node.querySelector('a').href = p.url;

    const btn = node.querySelector('.save-button');
    btn.textContent = saved.includes(p.url) ? 'Saved' : 'Save';

    btn.onclick = () => {
      if (saved.includes(p.url)) saved = saved.filter(s => s !== p.url);
      else saved.push(p.url);
      localStorage.setItem('saved', JSON.stringify(saved));
      render();
    };

    feed.appendChild(node);
  });
}

const weatherBtn = document.getElementById('weatherButton');
weatherBtn.onclick = () => {
  if (!navigator.geolocation) {
    document.getElementById('weatherTemp').textContent = 'Location unavailable';
    return;
  }

  weatherBtn.textContent = 'Loading...';

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`)
      .then(r => r.json())
      .then(data => {
        const temp = Math.round(data.current_weather.temperature);
        const wind = Math.round(data.current_weather.windspeed);
        document.getElementById('weatherTemp').textContent = `${temp}°F · ${wind} mph wind`;
        weatherBtn.textContent = 'Refresh weather';
      })
      .catch(() => {
        document.getElementById('weatherTemp').textContent = 'Weather unavailable';
        weatherBtn.textContent = 'Try again';
      });
  }, () => {
    document.getElementById('weatherTemp').textContent = 'Location blocked';
    weatherBtn.textContent = 'Try again';
  });
};

loadLiveFeeds();
