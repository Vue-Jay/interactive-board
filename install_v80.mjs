import fs from "node:fs";
for(const p of ["src/backend.ts","src/boardStore.ts","src/BoardsScreen.tsx"])if(!fs.existsSync(p)){console.error("v80: не найден "+p);process.exit(1)}

let b=fs.readFileSync("src/backend.ts","utf8");
const old=`export const listRemoteStorageObjects=async(bucket:string,prefix:string):Promise<RemoteStorageObject[]>=>{
 const session=await getRemoteSession();if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const response=await fetch(\`\${url}/storage/v1/object/list/\${bucket}\`,{method:"POST",headers:{apikey:anonKey,Authorization:\`Bearer \${session.access_token}\`,"Content-Type":"application/json"},body:JSON.stringify({prefix,limit:1000,offset:0,sortBy:{column:"name",order:"asc"}})});
 if(!response.ok)throw new Error(await errorMessage(response));return response.json();
};`;
const neu=`export const listRemoteStorageObjects=async(bucket:string,prefix:string):Promise<RemoteStorageObject[]>=>{
 const session=await getRemoteSession();if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const all:RemoteStorageObject[]=[];const limit=1000;
 for(let offset=0;;offset+=limit){
  const response=await fetch(\`\${url}/storage/v1/object/list/\${bucket}\`,{method:"POST",headers:{apikey:anonKey,Authorization:\`Bearer \${session.access_token}\`,"Content-Type":"application/json"},body:JSON.stringify({prefix,limit,offset,sortBy:{column:"name",order:"asc"}})});
  if(!response.ok)throw new Error(await errorMessage(response));
  const page=await response.json() as RemoteStorageObject[];all.push(...page);if(page.length<limit)break;
 }
 return all;
};`;
if(!b.includes(old)){console.error("v80: storage listing anchor не найден");process.exit(1)}
b=b.replace(old,neu);fs.writeFileSync("src/backend.ts",b);

let s=fs.readFileSync("src/boardStore.ts","utf8");
s=s.replace('export type BoardSummary={id:string;title:string;ownerId:string;role:BoardRole;createdAt:string;updatedAt:string;deletedAt?:string|null;purgeAfter?:string|null};',
'export type BoardSummary={id:string;title:string;ownerId:string;role:BoardRole;createdAt:string;updatedAt:string;deletedAt?:string|null;purgeAfter?:string|null;purgeQueued?:boolean;purgeAssetCount?:number};');
s=s.replace('purgeAfter:row.purge_after??null});','purgeAfter:row.purge_after??null,purgeQueued:!!row.purge_queued,purgeAssetCount:Number(row.purge_asset_count??0)});');
fs.writeFileSync("src/boardStore.ts",s);

let u=fs.readFileSync("src/BoardsScreen.tsx","utf8");
const oldWarn='<div className="trash-warning">Доски в корзине помечаются сроком хранения 30 дней. Автоматическое удаление пока не включено. При ручном окончательном удалении приложение сначала очищает приватные файлы доски в Storage и только затем удаляет саму доску. Нужно точно ввести название доски.</div>';
const newWarn='<div className="trash-warning">Доски хранятся в корзине 30 дней. После срока сервер ставит их в очередь автоматической очистки. Доска без файлов удаляется автоматически; если остались приватные файлы Storage, она безопасно остаётся в очереди до их очистки. Ручное окончательное удаление по-прежнему сначала очищает Storage и требует точного названия доски.</div>';
if(!u.includes(oldWarn)){console.error("v80: trash warning anchor не найден");process.exit(1)}
u=u.replace(oldWarn,newWarn);
u=u.replace('{board.purgeAfter?` · срок хранения до ${fmt(board.purgeAfter)}`:""}</span>',
'{board.purgeAfter?` · срок хранения до ${fmt(board.purgeAfter)}`:""}{board.purgeQueued?` · в очереди очистки${board.purgeAssetCount?` · файлов: ${board.purgeAssetCount}`:""}`:""}</span>');
fs.writeFileSync("src/BoardsScreen.tsx",u);
console.log("v80 установлен. Выполните supabase/v80_trash_lifecycle.sql, затем npm run build.");
