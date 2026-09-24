import type { DocumentData } from "./boardModel";
export type PortableAsset={id:string;name:string;mime:string;size:number;data:string};
export type PortableBoardBundle={format:"onlinerepetitor-board";version:2;exportedAt:string;app:"OnlineRepetitor";document:DocumentData;assets:PortableAsset[]};
const DATA_URL=/^data:([^;,]+)?(?:;[^,]*)?;base64,/i;
export function validatePortableBundle(value:unknown):PortableBoardBundle{
 if(!value||typeof value!=="object")throw new Error("Некорректная резервная копия");
 const b=value as Partial<PortableBoardBundle>;
 if(b.format!=="onlinerepetitor-board"||b.version!==2||!b.document||!Array.isArray(b.assets))throw new Error("Неподдерживаемый формат резервной копии");
 if(b.assets.length>500)throw new Error("Слишком много вложений в резервной копии");
 const ids=new Set<string>();let total=0;
 for(const a of b.assets){if(!a||typeof a.id!=="string"||!a.id||ids.has(a.id)||typeof a.name!=="string"||a.name.length>500||typeof a.mime!=="string"||typeof a.data!=="string"||!DATA_URL.test(a.data))throw new Error("Повреждено вложение резервной копии");ids.add(a.id);if(a.data.length>75*1024*1024)throw new Error(`Вложение «${a.name}» слишком большое`);total+=a.data.length;if(total>160*1024*1024)throw new Error("Резервная копия содержит слишком много данных")}
 return b as PortableBoardBundle;
}
export const safeBackupName=(title:string)=>`${(title||"board").replace(/[\\/:*?"<>|]+/g,"_").trim().slice(0,80)||"board"}.orboard`;
