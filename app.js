const posts = [
  { title: "BBC World News", url: "https://www.bbc.com/news", type: "news" },
  { title: "Reuters Headlines", url: "https://www.reuters.com", type: "news" },
  { title: "Al Jazeera", url: "https://www.aljazeera.com", type: "aljazeera" },
  { title: "Anime News Network", url: "https://www.animenewsnetwork.com", type: "anime" },
  { title: "MyAnimeList News", url: "https://myanimelist.net/news", type: "anime" },
  { title: "LoL Esports", url: "https://lolesports.com", type: "league" },
  { title: "Dexerto LoL", url: "https://www.dexerto.com/league-of-legends/", type: "league" },
  { title: "Check Weather", url: "https://open-meteo.com", type: "weather" }
];

let currentTab = 'all';

function setTab(tab) {
  currentTab = tab;
  render();
}

function render() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '';

  const filtered = currentTab === 'all'
    ? posts
    : posts.filter(p => p.type === currentTab);

  filtered.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<h3>${p.title}</h3><a href="${p.url}" target="_blank">Open</a>`;
    feed.appendChild(div);
  });
}

render();
