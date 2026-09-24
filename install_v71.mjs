import fs from "node:fs";
for(const p of ["src/backend.ts","src/boardStore.ts","src/BoardsScreen.tsx"])if(!fs.existsSync(p)){console.error("v71: не найден "+p);process.exit(1)}

let be=fs.readFileSync("src/backend.ts","utf8");
if(!be.includes("export const listRemoteStorageObjects"))be+=`
export type RemoteStorageObject={name:string;id?:string;metadata?:unknown};
export const listRemoteStorageObjects=async(bucket:string,prefix:string):Promise<RemoteStorageObject[]>=>{
 const session=await getRemoteSession();if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const response=await fetch(\`\${url}/storage/v1/object/list/\${bucket}\`,{method:"POST",headers:{apikey:anonKey,Authorization:\`Bearer \${session.access_token}\`,"Content-Type":"application/json"},body:JSON.stringify({prefix,limit:1000,offset:0,sortBy:{column:"name",order:"asc"}})});
 if(!response.ok)throw new Error(await errorMessage(response));return response.json();
};
export const deleteRemoteStorageObjects=async(bucket:string,paths:string[])=>{
 if(paths.length===0)return;
 const session=await getRemoteSession();if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const response=await fetch(\`\${url}/storage/v1/object/\${bucket}\`,{method:"DELETE",headers:{apikey:anonKey,Authorization:\`Bearer \${session.access_token}\`,"Content-Type":"application/json"},body:JSON.stringify({prefixes:paths})});
 if(!response.ok)throw new Error(await errorMessage(response));
};
`;
fs.writeFileSync("src/backend.ts",be);

let s=fs.readFileSync("src/boardStore.ts","utf8");
s=s.replace('import { isRemoteBackendEnabled, remoteRequest } from "./backend";',
'import { deleteRemoteStorageObjects, isRemoteBackendEnabled, listRemoteStorageObjects, remoteRequest } from "./backend";');
const old='export const deleteBoardForever=async(id:string,confirmation:string)=>{await remoteRequest("/rest/v1/rpc/delete_board_forever",{method:"POST",body:JSON.stringify({p_board_id:id,p_confirmation:confirmation})});return true};';
const neu=`export const deleteBoardForever=async(id:string,confirmation:string)=>{
 const prep=await remoteRequest<{board_id:string;asset_count:number}>("/rest/v1/rpc/prepare_board_permanent_delete",{method:"POST",body:JSON.stringify({p_board_id:id,p_confirmation:confirmation})});
 let deleted=0;
 if((prep.asset_count||0)>0){
   const prefix=\`\${id}/\`;
   const objects=await listRemoteStorageObjects("board-assets",prefix);
   const paths=objects.map(item=>prefix+item.name);
   for(let i=0;i<paths.length;i+=100){const batch=paths.slice(i,i+100);await deleteRemoteStorageObjects("board-assets",batch);deleted+=batch.length}
 }
 await remoteRequest("/rest/v1/rpc/finish_board_permanent_delete",{method:"POST",body:JSON.stringify({p_board_id:id,p_confirmation:confirmation})});
 return {deletedAssets:deleted};
};`;
if(!s.includes(old)){console.error("v71: не найден deleteBoardForever v70");process.exit(1)}
s=s.replace(old,neu);
fs.writeFileSync("src/boardStore.ts",s);

let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
const oldCall='await deleteBoardForever(board.id,confirmation);setNotice("Доска удалена окончательно");await loadTrash()';
const newCall='const result=await deleteBoardForever(board.id,confirmation);setNotice(result.deletedAssets>0?`Доска удалена окончательно. Удалено файлов: ${result.deletedAssets}`:"Доска удалена окончательно");await loadTrash()';
if(!b.includes(oldCall)){console.error("v71: не найден вызов окончательного удаления");process.exit(1)}
b=b.replace(oldCall,newCall);
b=b.replace('Сейчас автоматическое физическое удаление не включено: это будет сделано только после безопасной очистки файлов Storage. Для ручного окончательного удаления нужно точно ввести название доски.',
'Автоматическое удаление пока не включено. При ручном окончательном удалении приложение сначала очищает приватные файлы доски в Storage и только затем удаляет саму доску. Нужно точно ввести название доски.');
fs.writeFileSync("src/BoardsScreen.tsx",b);
console.log("v71 установлен. Выполните supabase/v71_trash_storage_cleanup.sql, затем npm run build");
