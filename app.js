const state={data:[],watched:new Set(JSON.parse(localStorage.getItem("hdvc-watched")||"[]")),archiveBattle:null};
const $=s=>document.querySelector(s);
const els={
  search:$("#search"),year:$("#year"),round:$("#round"),role:$("#role"),clear:$("#clear"),results:$("#results"),resultCount:$("#resultCount"),watchedCount:$("#watchedCount"),archiveCount:$("#archiveCount"),tpl:$("#cardTemplate"),
  dialog:$("#playerDialog"),dialogTitle:$("#dialogTitle"),dialogMeta:$("#dialogMeta"),player:$("#player"),sourceLinks:$("#sourceLinks"),close:$("#closeDialog"),
  driveStatus:$("#driveStatus"),driveConnect:$("#driveConnect"),driveDisconnect:$("#driveDisconnect"),driveSettings:$("#driveSettings"),driveFolderLink:$("#driveFolderLink"),
  archiveDialog:$("#archiveDialog"),archiveTitle:$("#archiveTitle"),archiveExisting:$("#archiveExisting"),archiveFile:$("#archiveFile"),archiveUpload:$("#archiveUpload"),archiveOpen:$("#archiveOpen"),archiveProgress:$("#archiveProgress"),archiveMessage:$("#archiveMessage"),closeArchive:$("#closeArchiveDialog"),
  setupDialog:$("#driveSetupDialog"),googleClientId:$("#googleClientId"),saveDriveSetup:$("#saveDriveSetup"),closeDriveSetup:$("#closeDriveSetup")
};
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
function makeBadge(text,className="badge"){const s=document.createElement("span");s.className=className;s.textContent=text;return s}
function formatBytes(bytes){
  const n=Number(bytes||0);if(!n)return "";
  const units=["B","KB","MB","GB","TB"];let value=n,i=0;while(value>=1024&&i<units.length-1){value/=1024;i++}return `${value.toFixed(i<2?0:1)} ${units[i]}`;
}
function setMessage(message,type=""){els.archiveMessage.textContent=message;els.archiveMessage.dataset.type=type}

function render(){
  const list=filtered(); els.results.innerHTML=""; els.resultCount.textContent=list.length; els.watchedCount.textContent=state.watched.size;
  els.archiveCount.textContent=DriveArchive.getStatus().archiveCount;
  if(!list.length){els.results.innerHTML='<div class="empty">No matches. Try a dancer name, another year, or another round.</div>';syncUrl();return}
  list.forEach(b=>{
    const node=els.tpl.content.cloneNode(true);
    const badges=node.querySelector(".badges");
    badges.append(makeBadge(b.year),makeBadge(b.roundLabel));
    const archived=DriveArchive.getArchive(b.id);
    if(archived)badges.append(makeBadge("Drive backup","badge archive-ok"));
    node.querySelector("h2").textContent=battleTitle(b);
    const p=node.querySelector(".people");
    p.textContent=b.judges?.length?`Judges: ${b.judges.join(", ")}`:"";
    const note=node.querySelector(".note"); note.textContent=b.note||""; if(!b.note)note.remove();
    const cb=node.querySelector('input[type="checkbox"]'); cb.checked=state.watched.has(b.id); cb.addEventListener("change",()=>{cb.checked?state.watched.add(b.id):state.watched.delete(b.id);persist()});
    node.querySelector(".watch-button").addEventListener("click",()=>openBattle(b));
    const archiveButton=node.querySelector(".archive-button");
    archiveButton.textContent=archived?"Backup":"Archive";
    archiveButton.addEventListener("click",()=>openArchiveFlow(b));
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
  const archive=DriveArchive.getArchive(b.id);
  if(archive?.webViewLink)links.push(["My Drive backup",archive.webViewLink]);
  if(b.archiveUrl)links.push(["Legacy archive link",b.archiveUrl]);
  if(!b.youtubeId)links.push(["Search YouTube",`https://www.youtube.com/results?search_query=${encodeURIComponent(battleTitle(b)+" House Dance Forever "+b.year)}`]);
  links.forEach(([t,u])=>{const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener";a.textContent=t+" ↗";els.sourceLinks.append(a)});
  els.dialog.showModal();
}

function updateDriveUI(){
  const s=DriveArchive.getStatus();
  els.archiveCount.textContent=s.archiveCount;
  els.driveDisconnect.hidden=!s.connected;
  els.driveConnect.hidden=s.connected;
  els.driveFolderLink.hidden=!s.rootFolderUrl;
  if(s.rootFolderUrl)els.driveFolderLink.href=s.rootFolderUrl;
  if(s.connected){
    els.driveStatus.textContent=`Connected · ${s.archiveCount} battle backup${s.archiveCount===1?"":"s"}. Private index is stored in your Drive.`;
  }else if(s.configured){
    els.driveStatus.textContent="Drive is configured but not connected in this browser session.";
  }else{
    els.driveStatus.textContent="One-time Google OAuth setup required. Official videos still play normally.";
  }
}

async function connectDrive(){
  if(!DriveArchive.getStatus().configured){openDriveSetup();return false;}
  const old=els.driveConnect.textContent;
  els.driveConnect.disabled=true;els.driveConnect.textContent="Connecting…";
  try{
    await DriveArchive.connect();
    updateDriveUI();render();return true;
  }catch(error){
    if(error.code==="CLIENT_ID_MISSING"){openDriveSetup();return false;}
    alert(`Google Drive connection failed: ${error.message}`);return false;
  }finally{els.driveConnect.disabled=false;els.driveConnect.textContent=old}
}

function openDriveSetup(){
  els.googleClientId.value=DriveArchive.getClientId();
  if(!els.setupDialog.open)els.setupDialog.showModal();
}

async function openArchiveFlow(b){
  state.archiveBattle=b;
  if(!DriveArchive.getStatus().connected){
    const connected=await connectDrive();
    if(!connected)return;
  }
  showArchiveDialog(b);
}

function showArchiveDialog(b){
  state.archiveBattle=b;
  els.archiveTitle.textContent=`${b.year} · ${b.roundLabel} · ${battleTitle(b)}`;
  els.archiveFile.value="";els.archiveProgress.value=0;els.archiveProgress.hidden=true;
  const existing=DriveArchive.getArchive(b.id);
  els.archiveExisting.innerHTML="";
  if(existing){
    const strong=document.createElement("strong");strong.textContent="Backed up";
    const detail=document.createElement("span");detail.textContent=[existing.name,formatBytes(existing.size)].filter(Boolean).join(" · ");
    els.archiveExisting.append(strong,detail);
    els.archiveOpen.hidden=false;els.archiveOpen.href=existing.webViewLink;
    els.archiveUpload.textContent="Replace Drive backup";
    setMessage("Choose a file to replace the indexed backup for this battle.");
  }else{
    els.archiveExisting.innerHTML='<span class="muted">No private backup indexed for this battle yet.</span>';
    els.archiveOpen.hidden=true;els.archiveOpen.removeAttribute("href");
    els.archiveUpload.textContent="Upload to My Drive";
    setMessage("The file goes directly from this browser to your Google Drive. It is not uploaded to this website or GitHub.");
  }
  els.archiveUpload.disabled=false;
  if(!els.archiveDialog.open)els.archiveDialog.showModal();
}

async function uploadCurrentArchive(){
  const b=state.archiveBattle,file=els.archiveFile.files?.[0];
  if(!b)return;
  if(!file){setMessage("Choose the local video file for this battle first.","error");return;}
  els.archiveUpload.disabled=true;els.archiveFile.disabled=true;els.archiveProgress.hidden=false;els.archiveProgress.value=0;
  setMessage(`Uploading ${file.name} directly to your Google Drive…`);
  try{
    const entry=await DriveArchive.uploadBattle(b,file,p=>{els.archiveProgress.value=p});
    setMessage(`Backup complete: ${entry.name}${entry.size?` · ${formatBytes(entry.size)}`:""}.`,"success");
    els.archiveOpen.hidden=false;els.archiveOpen.href=entry.webViewLink;
    els.archiveExisting.innerHTML=`<strong>Backed up</strong><span>${entry.name}${entry.size?` · ${formatBytes(entry.size)}`:""}</span>`;
    els.archiveUpload.textContent="Replace Drive backup";
    render();updateDriveUI();
  }catch(error){
    setMessage(`Upload failed: ${error.message}`,"error");
  }finally{els.archiveUpload.disabled=false;els.archiveFile.disabled=false}
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
els.driveConnect.addEventListener("click",connectDrive);
els.driveDisconnect.addEventListener("click",()=>{DriveArchive.disconnect();updateDriveUI();render()});
els.driveSettings.addEventListener("click",openDriveSetup);
els.closeDriveSetup.addEventListener("click",()=>els.setupDialog.close());
els.saveDriveSetup.addEventListener("click",()=>{
  try{DriveArchive.setClientId(els.googleClientId.value);els.setupDialog.close();updateDriveUI()}
  catch(error){alert(error.message)}
});
els.closeArchive.addEventListener("click",()=>els.archiveDialog.close());
els.archiveUpload.addEventListener("click",uploadCurrentArchive);
els.archiveDialog.addEventListener("click",e=>{if(e.target===els.archiveDialog)els.archiveDialog.close()});
els.setupDialog.addEventListener("click",e=>{if(e.target===els.setupDialog)els.setupDialog.close()});
window.addEventListener("drivearchivechange",()=>{updateDriveUI();render()});

updateDriveUI();
const catalogFiles=["2025","2024","2023","2022"].map(y=>`./data/battles-${y}.json`);
Promise.all(catalogFiles.map(url=>fetch(url).then(r=>{if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()})))
  .then(parts=>{state.data=parts.flatMap(x=>x.battles||[]);hydrateUrl();render()})
  .catch(err=>{els.results.innerHTML=`<div class="empty">Failed to load catalog: ${err.message}</div>`});
