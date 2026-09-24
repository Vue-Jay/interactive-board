import fs from "node:fs";
const p="src/boardStore.ts";
if(!fs.existsSync(p)){console.error("v71 hotfix: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old='import { claimRemoteInvitations, isRemoteBackendEnabled, remoteRequest } from "./backend";';
const neu='import { claimRemoteInvitations, deleteRemoteStorageObjects, isRemoteBackendEnabled, listRemoteStorageObjects, remoteRequest } from "./backend";';
if(s.includes(old))s=s.replace(old,neu);
else if(!s.includes("listRemoteStorageObjects")){console.error("v71 hotfix: импорт backend не найден");process.exit(1)}
fs.writeFileSync(p,s);
console.log("v71 hotfix 1 установлен. Запустите npm run build");
