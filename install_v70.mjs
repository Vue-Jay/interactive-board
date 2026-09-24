import fs from "node:fs";
for(const p of ["src/boardStore.ts","src/BoardsScreen.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v70: не найден "+p);process.exit(1)}
let s=fs.readFileSync("src/boardStore.ts","utf8");
s=s.replace('export type BoardSummary={id:string;title:string;ownerId:string;role:BoardRole;createdAt:string;updatedAt:string;deletedAt?:string|null};',
'export type BoardSummary={id:string;title:string;ownerId:string;role:BoardRole;createdAt:string;updatedAt:string;deletedAt?:string|null;purgeAfter?:string|null};');
s=s.replace('deletedAt:row.deleted_at??null});','deletedAt:row.deleted_at??null,purgeAfter:row.purge_after??null});');
s=s.replace('const rows=await remoteRequest<any[]>(`/rest/v1/boards?owner_id=eq.${encodeURIComponent(user.id)}&deleted_at=not.is.null&select=id,title,owner_id,created_at,updated_at,deleted_at&order=deleted_at.desc`);',
'const rows=await remoteRequest<any[]>("/rest/v1/rpc/list_my_trashed_boards",{method:"POST",body:"{}"});');
s=s.replace('export const deleteBoardForever=async(id:string)=>{await remoteRequest("/rest/v1/rpc/delete_board_forever",{method:"POST",body:JSON.stringify({p_board_id:id})});return true};',
'export const deleteBoardForever=async(id:string,confirmation:string)=>{await remoteRequest("/rest/v1/rpc/delete_board_forever",{method:"POST",body:JSON.stringify({p_board_id:id,p_confirmation:confirmation})});return true};');
fs.writeFileSync("src/boardStore.ts",s);

let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
const old='if(!confirm(`Удалить «${board.title}» навсегда? Это действие нельзя отменить.`))return;setBusy(true);try{await deleteBoardForever(board.id);';
const neu='const confirmation=window.prompt(`Окончательное удаление нельзя отменить.\\n\\nЧтобы удалить доску навсегда, введите её название:\\n${board.title}`);if(confirmation===null)return;if(confirmation!==board.title){setNotice("Название не совпало. Доска не удалена.");return}setBusy(true);try{await deleteBoardForever(board.id,confirmation);';
if(!b.includes(old)){console.error("v70: не найден обработчик окончательного удаления");process.exit(1)}
b=b.replace(old,neu);
b=b.replace('<span>Удалена {board.deletedAt?fmt(board.deletedAt):"недавно"}</span>',
'<span>Удалена {board.deletedAt?fmt(board.deletedAt):"недавно"}{board.purgeAfter?` · срок хранения до ${fmt(board.purgeAfter)}`:""}</span>');
b=b.replace('Окончательное удаление удаляет саму доску и связанные серверные данные. Восстановление после этого невозможно.',
'Доски в корзине помечаются сроком хранения 30 дней. Сейчас автоматическое физическое удаление не включено: это будет сделано только после безопасной очистки файлов Storage. Для ручного окончательного удаления нужно точно ввести название доски.');
fs.writeFileSync("src/BoardsScreen.tsx",b);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v70 · trash safety */"))c+=`
/* v70 · trash safety */
.trash-row span{line-height:1.45}.trash-warning{border:1px solid #f0ddd5}.trash-row .danger{font-weight:650}
`;
fs.writeFileSync("src/App.css",c);
console.log("v70 установлен. Выполните supabase/v70_trash_safety.sql, затем npm run build");
