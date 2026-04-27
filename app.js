let currentTab='all';
let posts=[];
let saved=JSON.parse(localStorage.getItem('saved')||'[]');
let prefs=JSON.parse(localStorage.getItem('prefs')||'{"news":1,"anime":1,"league":1,"aljazeera":1}');
let interactions=JSON.parse(localStorage.getItem('interactions')||'{}');

function computeScore(p){
  const prefBoost=prefs[p.type]||1;
  const interactionBoost=(interactions[p.type]||0)*0.05;
  return (p.credibility*0.5 + p.freshness*0.3 + prefBoost*0.1 + interactionBoost*0.1).toFixed(2);
}

function explain(p){
  let reasons=[];
  if(p.credibility>0.9) reasons.push('high credibility');
  if(p.freshness>0.8) reasons.push('very fresh');
  if((prefs[p.type]||1)>1) reasons.push('you boosted this topic');
  if((interactions[p.type]||0)>3) reasons.push('you engage with this often');
  return reasons.join(', ')||'balanced signal';
}

function track(type){
  interactions[type]=(interactions[type]||0)+1;
  localStorage.setItem('interactions',JSON.stringify(interactions));
}

function render(){
  const feed=document.getElementById('feed');
  feed.innerHTML='';

  let filtered=[...posts];
  if(currentTab==='saved') filtered=filtered.filter(p=>saved.includes(p.url));
  else if(currentTab!=='all') filtered=filtered.filter(p=>p.type===currentTab);

  filtered.sort((a,b)=>computeScore(b)-computeScore(a));

  filtered.forEach(p=>{
    const t=document.getElementById('cardTemplate');
    const node=t.content.cloneNode(true);

    node.querySelector('h3').textContent=p.title;
    node.querySelector('.tag').textContent=p.type;
    node.querySelector('.score').textContent='signal '+computeScore(p);
    node.querySelector('.summary').textContent=p.summary||'';
    node.querySelector('.meta').textContent=p.source||'';
    node.querySelector('.why').textContent='why: '+explain(p);

    const link=node.querySelector('a');
    link.href=p.url;
    link.onclick=()=>track(p.type);

    const btn=node.querySelector('.save-button');
    btn.textContent=saved.includes(p.url)?'Saved':'Save';
    btn.onclick=()=>{
      if(saved.includes(p.url)) saved=saved.filter(s=>s!==p.url);
      else saved.push(p.url);
      localStorage.setItem('saved',JSON.stringify(saved));
      track(p.type);
      render();
    };

    feed.appendChild(node);
  });
}

document.querySelectorAll('[data-pref]').forEach(slider=>{
  slider.value=prefs[slider.dataset.pref]||1;
  slider.oninput=()=>{
    prefs[slider.dataset.pref]=parseFloat(slider.value);
    localStorage.setItem('prefs',JSON.stringify(prefs));
    render();
  };
});

document.getElementById('resetLearning').onclick=()=>{
  interactions={};
  localStorage.removeItem('interactions');
  render();
};

loadLiveFeeds();
