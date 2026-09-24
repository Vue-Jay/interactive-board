import fs from "node:fs";
for(const p of ["src/App.tsx","src/ShareDialog.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v67: не найден "+p);process.exit(1)}

let d=fs.readFileSync("src/ShareDialog.tsx","utf8");
d=d.replace('await revokeShareLink(link.id); if (created?.id === link.id) setCreated(null); await reload();',
'await revokeShareLink(link.id); setLinks(current=>current.filter(item=>item.id!==link.id)); if (created?.id === link.id) setCreated(null); setNotice("Ссылка отозвана"); await reload();');
fs.writeFileSync("src/ShareDialog.tsx",d);

let a=fs.readFileSync("src/App.tsx","utf8");
a=a.replace('  const [boardLoadError, setBoardLoadError] = useState("");',
'  const [boardLoadError, setBoardLoadError] = useState("");\n  const [sharePassword, setSharePassword] = useState("");\n  const [sharePasswordRequired, setSharePasswordRequired] = useState(false);');
a=a.replace('    setBoardLoadError("");\n    if (route.kind === "home")',
'    setBoardLoadError("");\n    setSharePasswordRequired(false);\n    if (route.kind === "home")');
a=a.replace('          const redeemed = await redeemShareLink(route.token);',
'          const redeemed = await redeemShareLink(route.token, sharePassword || undefined);');
const old=`        setBoardLoading(false);
        setBoardLoadError(route.kind === "join"
          ? "Не удалось принять ссылку. Возможно, она отозвана, истекла или сервер недоступен."
          : error instanceof Error ? error.message : "Не удалось открыть доску");`;
const neu=`        setBoardLoading(false);
        const message=error instanceof Error ? error.message : "Не удалось открыть доску";
        if(route.kind==="join" && /парол/i.test(message)){
          setSharePasswordRequired(true);
          setBoardLoadError("");
        }else{
          setSharePasswordRequired(false);
          setBoardLoadError(route.kind === "join"
            ? message || "Не удалось принять ссылку. Возможно, она отозвана, истекла или сервер недоступен."
            : message);
        }`;
if(!a.includes(old)){console.error("v67: не найден блок обработки ошибки ссылки");process.exit(1)}
a=a.replace(old,neu);
a=a.replace('  }, [route, authReady, authUser, navigate, openBoard]);','  }, [route, authReady, authUser, navigate, openBoard, sharePassword]);');
const marker=`        {boardLoading && <div className="board-server-overlay"><div className="board-server-card"><strong>Загружаем доску…</strong><span>Получаем последнюю версию с сервера.</span></div></div>}`;
const prompt=`        {sharePasswordRequired && route.kind==="join" && <div className="board-server-overlay"><form className="board-server-card share-password-card" onSubmit={e=>{e.preventDefault();if(!sharePassword.trim())return;setSharePasswordRequired(false);setRoute({...route});}}><strong>Ссылка защищена паролем</strong><span>Введите пароль, который сообщил владелец доски.</span><input type="password" autoFocus value={sharePassword} onChange={e=>setSharePassword(e.target.value)} placeholder="Пароль ссылки" autoComplete="off"/><div className="share-password-actions"><button className="primary" type="submit" disabled={!sharePassword.trim()}>Открыть доску</button><button type="button" onClick={()=>{setSharePassword("");clearPendingShare();navigate("/",true)}}>Отмена</button></div></form></div>}
${marker}`;
if(!a.includes(marker)){console.error("v67: не найдена серверная overlay-разметка");process.exit(1)}
a=a.replace(marker,prompt);
fs.writeFileSync("src/App.tsx",a);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v67 · share password */"))c+=`
/* v67 · share password */
.share-password-card{width:min(420px,calc(100vw - 32px));gap:12px}.share-password-card input{width:100%;min-height:42px;box-sizing:border-box;border:1px solid #d9dbe5;border-radius:10px;padding:9px 11px;font:inherit}.share-password-actions{display:flex;gap:8px;flex-wrap:wrap}.share-password-actions button{min-height:38px}
`;
fs.writeFileSync("src/App.css",c);
console.log("v67 установлен. Выполните supabase/v67_share_link_cleanup.sql, затем npm run build");
