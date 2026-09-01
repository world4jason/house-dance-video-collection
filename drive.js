(()=>{
  const DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
  const CLIENT_ID_KEY="hdvc-google-client-id";
  const ROOT_FOLDER="House Dance Archive";
  const INDEX_FILE=".house-dance-index.json";
  const FOLDER_MIME="application/vnd.google-apps.folder";
  const DRIVE_API="https://www.googleapis.com/drive/v3";
  const DRIVE_UPLOAD="https://www.googleapis.com/upload/drive/v3";
  const CHUNK_SIZE=8*1024*1024;

  let accessToken=null;
  let expiresAt=0;
  let tokenClient=null;
  let rootFolder=null;
  let indexFile=null;
  let folderCache=new Map();
  let archiveIndex={version:1,updatedAt:null,archives:{}};

  const emit=(name,detail={})=>window.dispatchEvent(new CustomEvent(name,{detail}));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const qEscape=value=>String(value).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
  const cleanName=value=>String(value||"").replace(/[\\/\0]/g,"-").replace(/\s+/g," ").trim();
  const battleTitle=b=>b.teams.map(team=>team.join(" & ")).join(" vs ");

  function getClientId(){
    return (localStorage.getItem(CLIENT_ID_KEY)||window.HDVC_CONFIG?.googleClientId||"").trim();
  }

  function setClientId(value){
    const v=String(value||"").trim();
    if(v && !v.endsWith(".apps.googleusercontent.com")) throw new Error("That does not look like a Google Web OAuth client ID.");
    if(v)localStorage.setItem(CLIENT_ID_KEY,v); else localStorage.removeItem(CLIENT_ID_KEY);
    accessToken=null; expiresAt=0; tokenClient=null; rootFolder=null; indexFile=null; folderCache=new Map();
    archiveIndex={version:1,updatedAt:null,archives:{}};
    emit("drivearchivechange",getStatus());
  }

  async function waitForGIS(timeoutMs=10000){
    const started=Date.now();
    while(!window.google?.accounts?.oauth2){
      if(Date.now()-started>timeoutMs) throw new Error("Google Identity Services did not load. Check network/content blockers and retry.");
      await sleep(50);
    }
  }

  async function requestToken(){
    const clientId=getClientId();
    if(!clientId){
      const err=new Error("Google OAuth client ID is not configured.");
      err.code="CLIENT_ID_MISSING";
      throw err;
    }
    if(accessToken && Date.now()<expiresAt-60000)return accessToken;
    await waitForGIS();
    return new Promise((resolve,reject)=>{
      tokenClient=google.accounts.oauth2.initTokenClient({
        client_id:clientId,
        scope:DRIVE_SCOPE,
        include_granted_scopes:true,
        callback:response=>{
          if(response?.error){
            accessToken=null; expiresAt=0;
            reject(new Error(response.error_description||response.error));
            return;
          }
          accessToken=response.access_token;
          expiresAt=Date.now()+(Number(response.expires_in||3600)*1000);
          emit("drivearchivetoken",{expiresAt});
          resolve(accessToken);
        },
        error_callback:error=>reject(new Error(error?.message||error?.type||"Google authorization was interrupted."))
      });
      tokenClient.requestAccessToken();
    });
  }

  async function authorizedFetch(url,options={}){
    const token=await requestToken();
    const headers=new Headers(options.headers||{});
    headers.set("Authorization",`Bearer ${token}`);
    const response=await fetch(url,{...options,headers});
    if(response.status===401){accessToken=null;expiresAt=0;}
    return response;
  }

  async function apiJson(url,options={}){
    const response=await authorizedFetch(url,options);
    if(!response.ok){
      let detail="";
      try{detail=(await response.json())?.error?.message||""}catch{}
      throw new Error(detail||`Google Drive request failed (${response.status}).`);
    }
    if(response.status===204)return null;
    return response.json();
  }

  async function listFiles(query){
    const params=new URLSearchParams({q:query,spaces:"drive",pageSize:"100",fields:"files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime,appProperties)"});
    return (await apiJson(`${DRIVE_API}/files?${params}`)).files||[];
  }

  async function createFolder(name,parentId=null){
    const body={name,mimeType:FOLDER_MIME};
    if(parentId)body.parents=[parentId];
    return apiJson(`${DRIVE_API}/files?fields=id,name,mimeType,webViewLink`,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
    });
  }

  async function ensureFolder(name,parentId=null){
    const cacheKey=`${parentId||"root"}/${name}`;
    if(folderCache.has(cacheKey))return folderCache.get(cacheKey);
    const clauses=[`name='${qEscape(name)}'`,`mimeType='${FOLDER_MIME}'`,`trashed=false`];
    if(parentId)clauses.push(`'${qEscape(parentId)}' in parents`);
    const found=(await listFiles(clauses.join(" and ")))[0]||await createFolder(name,parentId);
    folderCache.set(cacheKey,found);
    return found;
  }

  async function ensureRoot(){
    if(rootFolder)return rootFolder;
    rootFolder=await ensureFolder(ROOT_FOLDER);
    return rootFolder;
  }

  async function uploadJsonContent(fileId,value){
    const response=await authorizedFetch(`${DRIVE_UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media`,{
      method:"PATCH",headers:{"Content-Type":"application/json; charset=UTF-8"},body:JSON.stringify(value,null,2)
    });
    if(!response.ok)throw new Error(`Could not update private archive index (${response.status}).`);
  }

  async function createIndexFile(){
    const root=await ensureRoot();
    const created=await apiJson(`${DRIVE_API}/files?fields=id,name,mimeType,webViewLink`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name:INDEX_FILE,mimeType:"application/json",parents:[root.id],appProperties:{hdvcType:"archive-index"}})
    });
    indexFile=created;
    await uploadJsonContent(created.id,archiveIndex);
    return created;
  }

  async function loadIndex(){
    const root=await ensureRoot();
    const files=await listFiles(`name='${qEscape(INDEX_FILE)}' and '${qEscape(root.id)}' in parents and trashed=false`);
    indexFile=files[0]||null;
    if(!indexFile){await createIndexFile();return archiveIndex;}
    const response=await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(indexFile.id)}?alt=media`);
    if(!response.ok)throw new Error(`Could not read private archive index (${response.status}).`);
    const loaded=await response.json();
    archiveIndex={version:Number(loaded.version||1),updatedAt:loaded.updatedAt||null,archives:loaded.archives||{}};
    return archiveIndex;
  }

  async function saveIndex(){
    if(!indexFile)await createIndexFile();
    archiveIndex.updatedAt=new Date().toISOString();
    await uploadJsonContent(indexFile.id,archiveIndex);
    emit("drivearchivechange",getStatus());
  }

  async function connect(){
    await requestToken();
    await ensureRoot();
    await loadIndex();
    emit("drivearchiveconnected",getStatus());
    emit("drivearchivechange",getStatus());
    return getStatus();
  }

  function disconnect(){
    accessToken=null;expiresAt=0;tokenClient=null;rootFolder=null;indexFile=null;folderCache=new Map();
    archiveIndex={version:1,updatedAt:null,archives:{}};
    emit("drivearchivechange",getStatus());
  }

  async function ensureBattleFolder(battle){
    const root=await ensureRoot();
    const sdf=await ensureFolder("Summer Dance Forever",root.id);
    const year=await ensureFolder(String(battle.year),sdf.id);
    const house=await ensureFolder("House",year.id);
    return ensureFolder(cleanName(battle.roundLabel||battle.round||"Battles"),house.id);
  }

  function archiveFilename(battle,file){
    const dot=file.name.lastIndexOf(".");
    const ext=dot>=0?file.name.slice(dot):"";
    return cleanName(`SDF ${battle.year} House ${battle.roundLabel} - ${battleTitle(battle)}`)+ext;
  }

  async function initiateUpload(battle,file,parentId){
    const token=await requestToken();
    const metadata={
      name:archiveFilename(battle,file),mimeType:file.type||"application/octet-stream",parents:[parentId],
      appProperties:{hdvcBattleId:battle.id,hdvcEvent:"summer-dance-forever",hdvcStyle:"house",hdvcYear:String(battle.year),hdvcRound:String(battle.round)}
    };
    const params=new URLSearchParams({uploadType:"resumable",fields:"id,name,mimeType,size,webViewLink,md5Checksum,createdTime"});
    const response=await fetch(`${DRIVE_UPLOAD}/files?${params}`,{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":file.type||"application/octet-stream","X-Upload-Content-Length":String(file.size)},
      body:JSON.stringify(metadata)
    });
    if(!response.ok){
      let detail="";try{detail=(await response.json())?.error?.message||""}catch{}
      throw new Error(detail||`Could not start upload (${response.status}).`);
    }
    const session=response.headers.get("Location");
    if(!session)throw new Error("Google Drive did not return a resumable upload URL.");
    return session;
  }

  async function uploadChunks(sessionUrl,file,onProgress=()=>{}){
    let start=0;
    onProgress(0);
    while(start<file.size){
      const end=Math.min(start+CHUNK_SIZE,file.size);
      const chunk=file.slice(start,end);
      const response=await fetch(sessionUrl,{
        method:"PUT",
        headers:{"Content-Range":`bytes ${start}-${end-1}/${file.size}`},
        body:chunk
      });
      if(response.status===308){
        const range=response.headers.get("Range");
        if(range){const match=range.match(/bytes=0-(\d+)/);start=match?Number(match[1])+1:end;}else start=end;
        onProgress(Math.min(start/file.size,0.999));
        continue;
      }
      if(response.ok){onProgress(1);return response.json();}
      let detail="";try{detail=(await response.json())?.error?.message||""}catch{}
      throw new Error(detail||`Upload failed (${response.status}).`);
    }
    throw new Error("Upload ended without a Google Drive file response.");
  }

  async function getFile(fileId){
    return apiJson(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webViewLink,md5Checksum,createdTime,modifiedTime`);
  }

  async function uploadBattle(battle,file,onProgress=()=>{}){
    if(!battle?.id)throw new Error("Battle metadata is missing an id.");
    if(!(file instanceof File))throw new Error("Choose a local video file first.");
    await requestToken();
    if(!rootFolder||!indexFile){await ensureRoot();await loadIndex();}
    const folder=await ensureBattleFolder(battle);
    const session=await initiateUpload(battle,file,folder.id);
    let uploaded=await uploadChunks(session,file,onProgress);
    if(!uploaded.webViewLink)uploaded=await getFile(uploaded.id);
    const entry={
      provider:"google-drive",fileId:uploaded.id,name:uploaded.name||archiveFilename(battle,file),mimeType:uploaded.mimeType||file.type||null,
      size:Number(uploaded.size||file.size),md5Checksum:uploaded.md5Checksum||null,webViewLink:uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`,
      uploadedAt:new Date().toISOString()
    };
    archiveIndex.archives[battle.id]=entry;
    await saveIndex();
    return entry;
  }

  function getArchive(battleId){return archiveIndex.archives?.[battleId]||null;}
  function getArchives(){return {...(archiveIndex.archives||{})};}
  function getStatus(){
    return {
      configured:Boolean(getClientId()),connected:Boolean(accessToken&&Date.now()<expiresAt),expiresAt:expiresAt||null,
      rootFolderId:rootFolder?.id||null,rootFolderUrl:rootFolder?`https://drive.google.com/drive/folders/${rootFolder.id}`:null,
      archiveCount:Object.keys(archiveIndex.archives||{}).length,indexUpdatedAt:archiveIndex.updatedAt||null
    };
  }

  window.DriveArchive={
    scope:DRIVE_SCOPE,getClientId,setClientId,connect,disconnect,getStatus,getArchive,getArchives,uploadBattle,
    getRootFolderUrl:()=>rootFolder?`https://drive.google.com/drive/folders/${rootFolder.id}`:null
  };
})();
