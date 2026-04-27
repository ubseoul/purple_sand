let currentTab = 'all';
let saved = JSON.parse(localStorage.getItem('saved') || '[]');

const posts = [
  { title:"Reuters: Global markets update", type:"news", credibility:0.95, freshness:0.8, url:"https://www.reuters.com" },
  { title:"BBC: World headline", type:"news", credibility:0.9, freshness:0.7, url:"https://www.bbc.com/news" },
  { title:"Al Jazeera: Middle East analysis", type:"aljazeera", credibility:0.9, freshness:0.8, url:"https://www.aljazeera.com" },
  { title:"Anime News Network: New adaptation", type:"anime", credibility:0.8, freshness:0.9, url:"https://www.animenewsnetwork.com" },
  { title:"LoL Esports: Patch meta shift", type:"league", credibility:0.85, freshness:0.95, url:"https://lolesports.com" }
];

function computeScore(p){ return (p.credibility*0.6 + p.freshness*0.4).toFixed(2); }

function setTab(tab){
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  render();
}

document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click',()=>setTab(btn.dataset.tab));
});

function render(){
  const feed = document.getElementById('feed');
  feed.innerHTML = '';

  let filtered = posts;

  if(currentTab==='saved') filtered = posts.filter(p=>saved.includes(p.title));
  else if(currentTab!=='all') filtered = posts.filter(p=>p.type===currentTab);

  const search = document.getElementById('searchInput').value.toLowerCase();
  if(search) filtered = filtered.filter(p=>p.title.toLowerCase().includes(search));

  const sort = document.getElementById('sortSelect').value;
  if(sort==='signal') filtered.sort((a,b)=>computeScore(b)-computeScore(a));

  filtered.forEach(p=>{
    const t = document.getElementById('cardTemplate');
    const node = t.content.cloneNode(true);

    node.querySelector('h3').textContent = p.title;
    node.querySelector('.tag').textContent = p.type;
    node.querySelector('.score').textContent = 'signal: '+computeScore(p);
    node.querySelector('a').href = p.url;

    const btn = node.querySelector('.save-button');
    btn.textContent = saved.includes(p.title) ? 'Saved' : 'Save';

    btn.onclick = ()=>{
      if(saved.includes(p.title)) saved = saved.filter(s=>s!==p.title);
      else saved.push(p.title);
      localStorage.setItem('saved',JSON.stringify(saved));
      render();
    };

    feed.appendChild(node);
  });
}

// Weather
const weatherBtn = document.getElementById('weatherButton');
weatherBtn.onclick = ()=>{
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude, longitude} = pos.coords;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
      .then(r=>r.json())
      .then(data=>{
        document.getElementById('weatherTemp').textContent = data.current_weather.temperature + '°C';
      });
  });
};

render();
