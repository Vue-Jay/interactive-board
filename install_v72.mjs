import fs from "node:fs";
for(const p of ["src/App.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v72: не найден "+p);process.exit(1)}
fs.copyFileSync("backupStore.ts","src/backupStore.ts");
let a=fs.readFileSync("src/App.tsx","utf8");
a=a.replace('import { getBoardHistoryVersion, listBoardHistory, type BoardHistoryEntry } from "./historyStore";','import { getBoardHistoryVersion, listBoardHistory, type BoardHistoryEntry } from "./historyStore";\nimport { safeBackupName, validatePortableBundle, type PortableAsset, type PortableBoardBundle } from "./backupStore";');
a=a.replace('const [historyError,setHistoryError]=useState("");','const [historyError,setHistoryError]=useState("");\n  const [backupBusy,setBackupBusy]=useState(false);\n  const [backupProgress,setBackupProgress]=useState("");');

const start='  const exportBoard = async () => {', end='\n  const display = (next: Item[]) => {';
const i=a.indexOf(start), j=a.indexOf(end,i);
if(i<0||j<0){console.error("v72: блок exportBoard не найден");process.exit(1)}
const replacement=`  const exportBoard = async () => {
    const data: DocumentData={version:1,title,view,items:editing?itemsRef.current.map(i=>i.id===editing?{...i,text:draft}:i):itemsRef.current};
    setBackupBusy(true);setBackupProgress("Подготавливаем документ…");
    try{
      const assets:PortableAsset[]=[];const media=data.items.filter(i=>(i.kind==="image"||i.kind==="pdf")&&i.assetId);const seen=new Set<string>();
      let done=0;
      for(const item of media){
        if(!item.assetId||seen.has(item.assetId))continue;seen.add(item.assetId);
        setBackupProgress(\`Вложения: \${done}/\${seen.size}\`);
        const blob=await getAsset(item.assetId,boardSummary.id);
        if(!blob)throw new Error(\`Не найдено вложение «\${item.name??item.assetId}»\`);
        assets.push({id:item.assetId,name:item.name??"file",mime:item.mime??blob.type??"application/octet-stream",size:blob.size,data:await blobToDataUrl(blob)});done++;
      }
      const bundle:PortableBoardBundle={format:"onlinerepetitor-board",version:2,exportedAt:new Date().toISOString(),app:"OnlineRepetitor",document:data,assets};
      setBackupProgress("Создаём файл…");
      const url=URL.createObjectURL(new Blob([JSON.stringify(bundle)],{type:"application/vnd.onlinerepetitor.board+json"}));
      const link=document.createElement("a");link.href=url;link.download=safeBackupName(title);link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice(\`Резервная копия создана · объектов: \${data.items.length} · вложений: \${assets.length}\`);
    }catch(error){setNotice("Экспорт не выполнен: "+(error instanceof Error?error.message:"неизвестная ошибка"))}
    finally{setBackupBusy(false);setBackupProgress("")}
  };
`;
a=a.slice(0,i)+replacement+a.slice(j);

const importStart='  const importBoard = async (file: File) => {', importEnd='\n  const commit = (next: Item[]) => {';
i=a.indexOf(importStart);j=a.indexOf(importEnd,i);
if(i<0||j<0){console.error("v72: блок importBoard не найден");process.exit(1)}
replacement=`  const importBoard = async (file: File) => {
    if(!canEdit){setNotice("У вас доступ только для просмотра");return}
    setBackupBusy(true);setBackupProgress("Проверяем резервную копию…");
    try{
      if(file.size>180*1024*1024)throw new Error("Файл больше 180 МБ");
      const raw=await file.text();let data:DocumentData;let bundledAssets:{id:string;name?:string;mime?:string;data:string}[]=[];
      const parsed=JSON.parse(raw);
      if(parsed?.format==="onlinerepetitor-board"){
        const bundle=validatePortableBundle(parsed);data=parseDocument(JSON.stringify(bundle.document));bundledAssets=bundle.assets;
      }else if(parsed?.format==="interactive-board-bundle"&&parsed?.document){
        data=parseDocument(JSON.stringify(parsed.document));bundledAssets=Array.isArray(parsed.assets)?parsed.assets.filter((v:unknown):v is {id:string;name?:string;mime?:string;data:string}=>!!v&&typeof v==="object"&&typeof (v as {id?:unknown}).id==="string"&&typeof (v as {data?:unknown}).data==="string"):[];
      }else data=parseDocument(raw);
      if(!window.confirm(\`Импортировать «\${data.title||"Без названия"}»?\\n\\nОбъектов: \${data.items.length}\\nВложений в копии: \${bundledAssets.length}\\n\\nТекущее состояние останется доступно через «До импорта» и серверную историю.\`))return;
      const before=currentDocument();
      if(saveBlocked){const damaged=localStorage.getItem(storageKey);if(damaged)localStorage.setItem(storageKey+".damaged-backup",damaged)}
      localStorage.setItem(storageKey+".before-import",JSON.stringify(before));setPrevious(before);
      const importedIds=new Map<string,string>();let completed=0;
      for(const asset of bundledAssets){
        if(importedIds.has(asset.id)||!data.items.some(item=>item.assetId===asset.id))continue;
        setBackupProgress(\`Импорт вложений: \${completed+1}/\${bundledAssets.length}\`);
        if(!asset.data.startsWith("data:"))throw new Error("Некорректное вложение в копии");
        const blob=await fetch(asset.data).then(r=>r.blob());const item=data.items.find(item=>item.assetId===asset.id);const id=crypto.randomUUID();
        await putAsset(id,item?.kind==="pdf"?blob.slice(0,blob.size,"application/pdf"):blob,boardSummary.id);importedIds.set(asset.id,id);completed++;
      }
      data.items=data.items.map(item=>item.assetId&&importedIds.has(item.assetId)?{...item,assetId:importedIds.get(item.assetId)!}:item);
      await ensureBoardAssets(boardSummary.id,data);applyDocument(data);
      setNotice(\`Импорт завершён · объектов: \${data.items.length} · вложений: \${completed}\`);
    }catch(error){setNotice("Импорт отменён: "+(error instanceof Error?error.message:"не удалось прочитать файл"))}
    finally{setBackupBusy(false);setBackupProgress("")}
  };
`;
a=a.slice(0,i)+replacement+a.slice(j);

a=a.replace('accept=".json,application/json"','accept=".orboard,.json,application/json,application/vnd.onlinerepetitor.board+json"');
a=a.replace('className="lesson-button backup-button"\n            onClick={() => {','className="lesson-button backup-button"\n            disabled={backupBusy}\n            onClick={() => {',1);
a=a.replace('<button className="lesson-button backup-button" onClick={() => void exportBoard()}>','<button className="lesson-button backup-button" disabled={backupBusy} onClick={() => void exportBoard()}>');
a=a.replace('>Скачать копию</button>','>{backupBusy&&backupProgress?backupProgress:"Скачать копию"}</button>');
fs.writeFileSync("src/App.tsx",a);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v72 · portable backups */"))c+=`\n/* v72 · portable backups */\n.backup-button:disabled{opacity:.58;cursor:wait}\n`;
fs.writeFileSync("src/App.css",c);
console.log("v72 установлен. Запустите npm run build");
