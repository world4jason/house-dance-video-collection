const state={data:[],watched:new Set(JSON.parse(localStorage.getItem("hdvc-watched")||"[]"))};
const $=s=>document.querySelector(s);
const els={search:$("#search"),year:$("#year"),round:$("#round"),role:$("#role"),clear:$("#clear"),results:$("#results"),resultCount:$("#resultCount"),watchedCount:$("#watchedCount"),tpl:$("#cardTemplate"),dialog:$("#playerDialog"),dialogTitle:$("#dialogTitle"),dialogMeta:$("#dialogMeta"),player:$("#player"),sourceLinks:$("#sourceLinks"),close:$("#closeDialog")};
const roundOrder={top24:1,top12:2,top6:3,judge:4,semi:5,final:6,full:7};

function norm(v=""){return v.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function battleTitle(b){return b.teams.map(t=>t.join(" & ")).join(" vs ")}
function searchable(b,role){
  const base=[String(b.year),b.roundLabel];
  if(role==="judged") return [...base,...(b.judges||[])];
  if(role==="all") return [...base,...(b.dancers||[]),...(b.judges||[])];
  return [...base,...(b.dancers||[])];
}
function filtered(){
  const q=norm(els.search.value);
  return state.data.filter(b=>{
    if(els.year.value && String(b.year)!==els.year.value)return false;
    if(els.round.value && b.round!==els.round.value)return false;
    if(q && !norm(searchable(b,els.role.value).join(" ")).includes(q))return false;
    return true;
  }).sort((a,b)=>b.year-a.year||(roundOrder[a.round]||99)-(roundOrder[b.round]||99)||battleTitle(a).localeCompare(battleTitle(b)));
}
function persist(){localStorage.setItem("hdvc-watched",JSON.stringify([...state.watched]));render()}
function makeBadge(text){const s=document.createElement("span");s.className="badge";s.textContent=text;return s}
function render(){
  const list=filtered(); els.results.innerHTML=""; els.resultCount.textContent=list.length; els.watchedCount.textContent=state.watched.size;
  if(!list.length){els.results.innerHTML='<div class="empty">No matches. Try a dancer name, another year, or another round.</div>';syncUrl();return}
  list.forEach(b=>{
    const node=els.tpl.content.cloneNode(true);
    node.querySelector(".badges").append(makeBadge(b.year),makeBadge(b.roundLabel));
    node.querySelector("h2").textContent=battleTitle(b);
    const p=node.querySelector(".people");
    p.textContent=b.judges?.length?`Judges: ${b.judges.join(", ")}`:"";
    const note=node.querySelector(".note"); note.textContent=b.note||""; if(!b.note)note.remove();
    const cb=node.querySelector('input[type="checkbox"]'); cb.checked=state.watched.has(b.id); cb.addEventListener("change",()=>{cb.checked?state.watched.add(b.id):state.watched.delete(b.id);persist()});
    node.querySelector(".watch-button").addEventListener("click",()=>openBattle(b));
    const off=node.querySelector(".official-link");
    const href=b.officialUrl||(b.youtubeId?`https://www.youtube.com/watch?v=${b.youtubeId}`:null);
    if(href)off.href=href; else off.remove();
    els.results.append(node);
  });
  syncUrl();
}
function openBattle(b){
  els.dialogTitle.textContent=battleTitle(b); els.dialogMeta.textContent=`${b.year} · ${b.roundLabel}`;
  els.player.innerHTML="";
  if(b.youtubeId){
    const iframe=document.createElement("iframe");
    const params=new URLSearchParams({rel:"0",modestbranding:"1"});
    if(b.start)params.set("start",b.start); if(b.end)params.set("end",b.end);
    iframe.src=`https://www.youtube.com/embed/${b.youtubeId}?${params}`;
    iframe.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen=true; els.player.append(iframe);
  } else {
    els.player.innerHTML="<p>No direct player URL indexed yet. Use the source/search link below.</p>";
  }
  els.sourceLinks.innerHTML="";
  const links=[];
  if(b.youtubeId)links.push(["YouTube",`https://www.youtube.com/watch?v=${b.youtubeId}`]);
  if(b.officialUrl && !b.officialUrl.includes("youtube.com/watch"))links.push(["SDF official page",b.officialUrl]);
  if(b.archiveUrl)links.push(["Archive copy",b.archiveUrl]);
  if(!b.youtubeId)links.push(["Search YouTube",`https://www.youtube.com/results?search_query=${encodeURIComponent(battleTitle(b)+" House Dance Forever "+b.year)}`]);
  links.forEach(([t,u])=>{const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener";a.textContent=t+" ↗";els.sourceLinks.append(a)});
  els.dialog.showModal();
}
function syncUrl(){
  const p=new URLSearchParams();
  if(els.search.value)p.set("q",els.search.value);if(els.year.value)p.set("year",els.year.value);if(els.round.value)p.set("round",els.round.value);if(els.role.value!=="danced")p.set("role",els.role.value);
  history.replaceState(null,"",location.pathname+(p.size?`?${p}`:""));
}
function hydrateUrl(){const p=new URLSearchParams(location.search);els.search.value=p.get("q")||"";els.year.value=p.get("year")||"";els.round.value=p.get("round")||"";els.role.value=p.get("role")||"danced"}
[els.search,els.year,els.round,els.role].forEach(el=>el.addEventListener("input",render));
els.clear.addEventListener("click",()=>{els.search.value="";els.year.value="";els.round.value="";els.role.value="danced";render()});
els.close.addEventListener("click",()=>els.dialog.close());
els.dialog.addEventListener("close",()=>els.player.innerHTML="");
els.dialog.addEventListener("click",e=>{if(e.target===els.dialog)els.dialog.close()});

const catalogFiles=["2025","2024","2023","2022"].map(y=>`./data/battles-${y}.json`);
Promise.all(catalogFiles.map(url=>fetch(url).then(r=>{if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()})))
  .then(parts=>{state.data=parts.flatMap(x=>x.battles||[]);hydrateUrl();render()})
  .catch(err=>{els.results.innerHTML=`<div class="empty">Failed to load catalog: ${err.message}</div>`});
