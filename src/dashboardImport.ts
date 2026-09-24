import { createBoard, type BoardSummary } from "./boardStore";
import { getRemoteBoardDocument, isRemoteBackendEnabled, saveRemoteBoardDocument } from "./backend";
import { putAsset } from "./assetStore";
import { parseDocument, type DocumentData } from "./boardModel";
import { validatePortableBundle } from "./backupStore";
import type { AuthUser } from "./authStore";

type LegacyAsset={id:string;name?:string;mime?:string;data:string};
export type BoardImportPreview={title:string;objects:number;assets:number;format:"orboard"|"legacy"|"json";data:DocumentData;bundledAssets:LegacyAsset[]};

export async function inspectBoardImport(file:File):Promise<BoardImportPreview>{
 if(file.size>180*1024*1024)throw new Error("Файл больше 180 МБ");
 const raw=await file.text();const parsed=JSON.parse(raw);
 if(parsed?.format==="onlinerepetitor-board"){
  const bundle=validatePortableBundle(parsed);
  const data=parseDocument(JSON.stringify(bundle.document));
  return{title:data.title||"Импортированная доска",objects:data.items.length,assets:bundle.assets.length,format:"orboard",data,bundledAssets:bundle.assets};
 }
 if(parsed?.format==="interactive-board-bundle"&&parsed?.document){
  const data=parseDocument(JSON.stringify(parsed.document));
  const assets=Array.isArray(parsed.assets)?parsed.assets.filter((v:unknown):v is LegacyAsset=>!!v&&typeof v==="object"&&typeof (v as {id?:unknown}).id==="string"&&typeof (v as {data?:unknown}).data==="string"):[];
  return{title:data.title||"Импортированная доска",objects:data.items.length,assets:assets.length,format:"legacy",data,bundledAssets:assets};
 }
 const data=parseDocument(raw);
 return{title:data.title||"Импортированная доска",objects:data.items.length,assets:0,format:"json",data,bundledAssets:[]};
}

export async function importAsNewBoard(user:AuthUser,preview:BoardImportPreview,onProgress?:(s:string)=>void):Promise<BoardSummary>{
 const board=await createBoard(user,preview.title);
 try{
  const idMap=new Map<string,string>();let n=0;
  for(const asset of preview.bundledAssets){
   if(idMap.has(asset.id)||!preview.data.items.some(i=>i.assetId===asset.id))continue;
   onProgress?.(`Вложения: ${++n}/${preview.bundledAssets.length}`);
   if(!asset.data.startsWith("data:"))throw new Error("Некорректное вложение");
   const blob=await fetch(asset.data).then(r=>r.blob());
   const item=preview.data.items.find(i=>i.assetId===asset.id);
   const id=crypto.randomUUID();
   await putAsset(id,item?.kind==="pdf"?blob.slice(0,blob.size,"application/pdf"):blob,board.id);
   idMap.set(asset.id,id);
  }
  const data:DocumentData={...preview.data,title:preview.title,items:preview.data.items.map(i=>i.assetId&&idMap.has(i.assetId)?{...i,assetId:idMap.get(i.assetId)!}:i)};
  if(isRemoteBackendEnabled()){
   const current=await getRemoteBoardDocument(board.id);
   const result=await saveRemoteBoardDocument(board.id,data,current?.version??null);
   if(!result.ok)throw new Error("Не удалось сохранить импортированную доску");
  }else localStorage.setItem(`lesson-board.document.v1.board.${board.id}`,JSON.stringify(data));
  return board;
 }catch(error){
  throw new Error(`Доска создана, но импорт не завершён: ${error instanceof Error?error.message:"неизвестная ошибка"}`);
 }
}
