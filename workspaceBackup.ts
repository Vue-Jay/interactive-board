import type { AuthUser } from "./authStore";
import { getAsset, putAsset } from "./assetStore";
import { createBoard, getUserBoards, boardStorageKey, type BoardSummary } from "./boardStore";
import { getRemoteBoardDocument, isRemoteBackendEnabled, saveRemoteBoardDocument } from "./backend";
import { parseDocument, type DocumentData } from "./boardModel";
import { validatePortableBundle, type PortableAsset, type PortableBoardBundle } from "./backupStore";

export type WorkspaceBoard={title:string;document:DocumentData;assets:PortableAsset[]};
export type WorkspaceBackup={format:"onlinerepetitor-workspace";version:1;app:"OnlineRepetitor";exportedAt:string;boards:WorkspaceBoard[]};
const blobToDataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(blob)});

async function loadDocument(board:BoardSummary):Promise<DocumentData>{
 if(isRemoteBackendEnabled()){
  const row=await getRemoteBoardDocument(board.id);
  if(row?.document)return parseDocument(JSON.stringify(row.document));
 }
 const raw=localStorage.getItem(boardStorageKey(board.id));
 if(raw)return parseDocument(raw);
 return {version:1,title:board.title,view:{x:0,y:0,zoom:1},items:[]};
}
export async function exportWorkspace(user:AuthUser,onProgress?:(s:string)=>void):Promise<WorkspaceBackup>{
 const owned=(await getUserBoards(user)).filter(b=>b.role==="owner");
 const result:WorkspaceBoard[]=[];
 for(let bi=0;bi<owned.length;bi++){
  const board=owned[bi];onProgress?.(`Доска ${bi+1}/${owned.length}: ${board.title}`);
  const document=await loadDocument(board);const assets:PortableAsset[]=[];const seen=new Set<string>();
  for(const item of document.items){
   if((item.kind!=="image"&&item.kind!=="pdf")||!item.assetId||seen.has(item.assetId))continue;
   seen.add(item.assetId);const blob=await getAsset(item.assetId,board.id);
   if(!blob)throw new Error(`В «${board.title}» не найдено вложение «${item.name??item.assetId}»`);
   assets.push({id:item.assetId,name:item.name??"file",mime:item.mime??blob.type??"application/octet-stream",size:blob.size,data:await blobToDataUrl(blob)});
  }
  result.push({title:document.title||board.title,document,assets});
 }
 return{format:"onlinerepetitor-workspace",version:1,app:"OnlineRepetitor",exportedAt:new Date().toISOString(),boards:result};
}
export function validateWorkspaceBackup(value:unknown):WorkspaceBackup{
 if(!value||typeof value!=="object")throw new Error("Некорректная копия пространства");
 const w=value as Partial<WorkspaceBackup>;
 if(w.format!=="onlinerepetitor-workspace"||w.version!==1||!Array.isArray(w.boards)||w.boards.length>200)throw new Error("Неподдерживаемая копия пространства");
 for(const b of w.boards){
  if(!b||typeof b.title!=="string"||!b.document||!Array.isArray(b.assets))throw new Error("Повреждена одна из досок");
  validatePortableBundle({format:"onlinerepetitor-board",version:2,app:"OnlineRepetitor",exportedAt:w.exportedAt??new Date().toISOString(),document:b.document,assets:b.assets});
 }
 return w as WorkspaceBackup;
}
export async function importWorkspace(user:AuthUser,workspace:WorkspaceBackup,onProgress?:(s:string)=>void):Promise<{created:BoardSummary[];failed:string[]}>{
 const created:BoardSummary[]=[],failed:string[]=[];
 for(let bi=0;bi<workspace.boards.length;bi++){
  const source=workspace.boards[bi];onProgress?.(`Восстановление ${bi+1}/${workspace.boards.length}: ${source.title}`);
  let board:BoardSummary|undefined;
  try{
   board=await createBoard(user,source.title);const idMap=new Map<string,string>();
   for(const asset of source.assets){
    if(!source.document.items.some(i=>i.assetId===asset.id))continue;
    const blob=await fetch(asset.data).then(r=>r.blob());const item=source.document.items.find(i=>i.assetId===asset.id);const id=crypto.randomUUID();
    await putAsset(id,item?.kind==="pdf"?blob.slice(0,blob.size,"application/pdf"):blob,board.id);idMap.set(asset.id,id);
   }
   const data:DocumentData={...source.document,title:source.title,items:source.document.items.map(i=>i.assetId&&idMap.has(i.assetId)?{...i,assetId:idMap.get(i.assetId)!}:i)};
   if(isRemoteBackendEnabled()){const current=await getRemoteBoardDocument(board.id);const saved=await saveRemoteBoardDocument(board.id,data,current?.version??null);if(!saved.ok)throw new Error("сервер не сохранил документ")}
   else localStorage.setItem(boardStorageKey(board.id),JSON.stringify(data));
   created.push(board);
  }catch(e){failed.push(`${source.title}: ${e instanceof Error?e.message:"ошибка"}`)}
 }
 return{created,failed};
}
export const workspaceFileName=()=>`OnlineRepetitor_backup_${new Date().toISOString().slice(0,10)}.orworkspace`;
