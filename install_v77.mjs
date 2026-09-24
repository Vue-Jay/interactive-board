import fs from "node:fs";
for(const p of ["src/App.tsx","src/ShareDialog.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v77: не найден "+p);process.exit(1)}

let a=fs.readFileSync("src/App.tsx","utf8");
const old='const [presentation, setPresentation] = useState(false);';
const neu='const [presentation, setPresentation] = useState(() => new URLSearchParams(window.location.search).get("present")==="1");';
if(!a.includes(old)){console.error("v77: presentation state не найден");process.exit(1)}
a=a.replace(old,neu);
const joinNav='navigate(`/board/${redeemed.board_id}`);';
if(!a.includes(joinNav)){console.error("v77: переход после share redeem не найден");process.exit(1)}
a=a.replace(joinNav,'navigate(`/board/${redeemed.board_id}${new URLSearchParams(window.location.search).get("present")==="1"?"?present=1":""}`);');
const exit='onClick={()=>setPresentation(false)}';
if(a.includes(exit))a=a.replaceAll(exit,'onClick={()=>{setPresentation(false);const u=new URL(window.location.href);if(u.searchParams.get("present")==="1"){u.searchParams.delete("present");window.history.replaceState({},"",u.pathname+u.search+u.hash)}}}');
fs.writeFileSync("src/App.tsx",a);

let s=fs.readFileSync("src/ShareDialog.tsx","utf8");
s=s.replace('const [created, setCreated] = useState<{ id: string; url: string } | null>(null);','const [created, setCreated] = useState<{ id: string; url: string; presentationUrl?: string } | null>(null);');
const setCreated='setCreated({ id: link.id, url: `${window.location.origin}/join/${link.token}` });';
if(!s.includes(setCreated)){console.error("v77: created link anchor не найден");process.exit(1)}
s=s.replace(setCreated,'const url=`${window.location.origin}/join/${link.token}`; setCreated({ id: link.id, url, ...(linkRole==="viewer"?{presentationUrl:`${url}?present=1`}:{}) });');
const createdBlock='{created && <div className="share-created"><label>Скопируйте сейчас: ссылка показывается только при создании.<input readOnly value={created.url} onFocus={e => e.target.select()} aria-label="Новая ссылка"/></label><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(created.url); setNotice("Ссылка скопирована"); })}>Копировать ссылку</button></div>}';
if(!s.includes(createdBlock)){console.error("v77: created block не найден");process.exit(1)}
const newBlock=`{created && <div className="share-created"><label>Обычная ссылка<input readOnly value={created.url} onFocus={e => e.target.select()} aria-label="Новая ссылка"/></label><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(created.url); setNotice("Ссылка скопирована"); })}>Копировать</button>{created.presentationUrl&&<><label>Ссылка-презентация<input readOnly value={created.presentationUrl} onFocus={e=>e.target.select()} aria-label="Ссылка-презентация"/></label><button disabled={busy} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(created.presentationUrl!);setNotice("Ссылка-презентация скопирована")})}>Копировать презентацию</button><small>Откроется сразу в чистом режиме показа. Доступ остаётся «Только просмотр».</small></>}</div>}`;
s=s.replace(createdBlock,newBlock);
fs.writeFileSync("src/ShareDialog.tsx",s);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v77 · presentation links */"))c+=`
/* v77 · presentation links */
.share-created{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.share-created label{min-width:0}.share-created small{grid-column:1/-1;color:#777b86}.presentation-mode.viewer-mode .presentation-topbar .presentation-exit{display:none}
@media(max-width:650px){.share-created{grid-template-columns:1fr}.share-created small{grid-column:auto}}
`;
fs.writeFileSync("src/App.css",c);
console.log("v77 установлен. Запустите npm run build");
