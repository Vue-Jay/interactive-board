import fs from "node:fs";
for(const p of ["src/App.tsx","src/App.css","src/boardModel.ts"])if(!fs.existsSync(p)){console.error("v75: не найден "+p);process.exit(1)}
fs.copyFileSync("linkMedia.tsx","src/linkMedia.tsx");

let m=fs.readFileSync("src/boardModel.ts","utf8");
m=m.replace('"cover";','"cover" | "linkmedia";');
m=m.replace('  coverOpen?: boolean;','  coverOpen?: boolean;\n  mediaUrl?: string;\n  mediaTitle?: string;');
m=m.replace('"flashcard","cover"];','"flashcard","cover","linkmedia"];');
const validateAnchor='    if (i.kind === "cover") {';
if(!m.includes(validateAnchor)){console.error("v75: validation anchor не найден");process.exit(1)}
m=m.replace(validateAnchor,`    if (i.kind === "linkmedia") {
      if (typeof i.mediaUrl !== "string" || i.mediaUrl.length > 5000 || !/^https?:\\/\\//i.test(i.mediaUrl)) throw new Error("Повреждена ссылка мультимедиа");
      if (i.mediaTitle != null && (typeof i.mediaTitle !== "string" || i.mediaTitle.length > 500)) throw new Error("Повреждено название мультимедиа");
    }
${validateAnchor}`);
const mapAnchor='      ...(i.kind === "cover" ? {';
m=m.replace(mapAnchor,`      ...(i.kind === "linkmedia" ? { mediaUrl: i.mediaUrl, ...(typeof i.mediaTitle === "string" ? { mediaTitle: i.mediaTitle.slice(0,500) } : {}) } : {}),
${mapAnchor}`);
fs.writeFileSync("src/boardModel.ts",m);

let a=fs.readFileSync("src/App.tsx","utf8");
a=a.replace('import { getBoardHistoryVersion, listBoardHistory, type BoardHistoryEntry } from "./historyStore";','import { getBoardHistoryVersion, listBoardHistory, type BoardHistoryEntry } from "./historyStore";\nimport { LinkMediaPlayer, resolveLinkMedia } from "./linkMedia";');
a=a.replace('  | "media";','  | "media"\n  | "linkmedia";');
a=a.replace('    case "media": return <><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5.5 17 4.2-4 3.1 2.8 2.3-2.2 3.4 3.4"/></>;',
'    case "media": return <><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5.5 17 4.2-4 3.1 2.8 2.3-2.2 3.4 3.4"/></>;\n    case "linkmedia": return <><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/><path d="M6 18 18 6"/></>;');
a=a.replace('{ id: "media", icon: "media", label: "Фото / PDF · I / Ш" },','{ id: "media", icon: "media", label: "Фото / PDF · I / Ш" },\n  { id: "linkmedia", icon: "linkmedia", label: "Видео / аудио по ссылке · L / Д" },');
a=a.replace('  KeyI: "media",','  KeyI: "media",\n  KeyL: "linkmedia",');
a=a.replace('  if (item.kind === "pdf") return item.name || "PDF";','  if (item.kind === "pdf") return item.name || "PDF";\n  if (item.kind === "linkmedia") return item.mediaTitle || "Мультимедиа";');
a=a.replace('  if (item.kind === "pdf") return "PDF";','  if (item.kind === "pdf") return "PDF";\n  if (item.kind === "linkmedia") return "Видео / аудио по ссылке";');
a=a.replace('  if (item.kind === "image" || item.kind === "pdf") return "media";','  if (item.kind === "image" || item.kind === "pdf") return "media";\n  if (item.kind === "linkmedia") return "linkmedia";');
a=a.replace('  const mediaInput = useRef<HTMLInputElement>(null);','  const mediaInput = useRef<HTMLInputElement>(null);\n  const [linkMediaOpen,setLinkMediaOpen]=useState(false);\n  const [linkMediaUrl,setLinkMediaUrl]=useState("");\n  const [linkMediaTitle,setLinkMediaTitle]=useState("");\n  const [linkMediaEditId,setLinkMediaEditId]=useState<string|null>(null);');

const mediaEnd='  useEffect(()=>{if(!canEdit)return;let raw=sessionStorage.getItem("onlinerepetitor.material.pick");';
const idx=a.indexOf(mediaEnd);
if(idx<0){console.error("v75: media function anchor не найден");process.exit(1)}
const funcs=`  const openLinkMediaEditor=(item?:Item)=>{setLinkMediaEditId(item?.kind==="linkmedia"?item.id:null);setLinkMediaUrl(item?.kind==="linkmedia"?item.mediaUrl??"":"");setLinkMediaTitle(item?.kind==="linkmedia"?item.mediaTitle??"":"");setLinkMediaOpen(true)};
  const saveLinkMedia=()=>{if(!canEdit)return;const info=resolveLinkMedia(linkMediaUrl);if(!info){setNotice("Нужна корректная ссылка http/https");return}const title=linkMediaTitle.trim()||({youtube:"YouTube",vimeo:"Vimeo",audio:"Аудио",video:"Видео",web:"Медиа по ссылке"} as const)[info.kind];if(linkMediaEditId){commit(itemsRef.current.map(i=>i.id===linkMediaEditId?{...i,mediaUrl:info.sourceUrl,mediaTitle:title}:i));setNotice("Ссылка мультимедиа обновлена")}else{const rect=board.current?.getBoundingClientRect();const center=world({x:(rect?.width??800)/2,y:(rect?.height??600)/2});const audio=info.kind==="audio";const item:Item={id:crypto.randomUUID(),kind:"linkmedia",x:center.x-240,y:center.y-(audio?70:150),width:480,height:audio?140:300,text:"",mediaUrl:info.sourceUrl,mediaTitle:title};commit([...itemsRef.current,item]);setSelected([item.id]);setNotice("Мультимедиа добавлено без загрузки файла в хранилище")}setLinkMediaOpen(false);setLinkMediaEditId(null);setTool("select")};

`;
a=a.slice(0,idx)+funcs+a.slice(idx);

a=a.replace('} else if (tool === "media") { mediaInput.current?.click(); setTool("select"); return;',
'} else if (tool === "media") { mediaInput.current?.click(); setTool("select"); return;\n    } else if (tool === "linkmedia") { openLinkMediaEditor(); return;');

a=a.replace('{(item.kind === "image" || item.kind === "pdf") && <Media item={item} boardId={boardSummary.id}/>}','{(item.kind === "image" || item.kind === "pdf") && <Media item={item} boardId={boardSummary.id}/>}\n                {item.kind === "linkmedia" && <LinkMediaPlayer item={item}/>}');

const selAnchor='{singleSelected?.kind === "frame" && !selectionLocked && (';
a=a.replace(selAnchor,`{singleSelected?.kind === "linkmedia" && !selectionLocked && (<span className="linkmedia-selection-controls"><button onClick={()=>openLinkMediaEditor(singleSelected)} title="Изменить ссылку"><Icon name="rename" size={15}/><span>Ссылка</span></button><a href={singleSelected.mediaUrl} target="_blank" rel="noreferrer" onPointerDown={e=>e.stopPropagation()} title="Открыть источник"><Icon name="open" size={15}/></a></span>)}
              ${selAnchor}`);

const modalAnchor='      {sharing && <ShareDialog';
if(!a.includes(modalAnchor)){console.error("v75: modal anchor не найден");process.exit(1)}
const modal=`      {linkMediaOpen&&<div className="access-backdrop link-media-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setLinkMediaOpen(false)}}><section className="access-modal link-media-dialog"><div className="access-head"><div><h2>{linkMediaEditId?"Изменить мультимедиа":"Мультимедиа по ссылке"}</h2><p>Файл не загружается в OnlineRepetitor и не занимает Storage.</p></div><button onClick={()=>setLinkMediaOpen(false)}>×</button></div><label className="link-media-field"><span>Ссылка</span><input autoFocus value={linkMediaUrl} onChange={e=>setLinkMediaUrl(e.target.value)} placeholder="YouTube, Vimeo, MP3, MP4 или другая http/https ссылка"/></label><label className="link-media-field"><span>Название</span><input value={linkMediaTitle} onChange={e=>setLinkMediaTitle(e.target.value)} placeholder="Необязательно"/></label><div className="link-media-support"><strong>Внутренний плеер</strong><span>YouTube и Vimeo открываются внутри доски. Прямые ссылки на MP3/MP4/WebM и другие поддерживаемые браузером файлы используют встроенный HTML5-плеер. Для остальных ссылок показывается безопасная карточка перехода.</span></div><div className="access-actions"><button onClick={()=>setLinkMediaOpen(false)}>Отмена</button><button className="boards-create" onClick={saveLinkMedia}>{linkMediaEditId?"Сохранить":"Добавить на доску"}</button></div></section></div>}\n\n`;
a=a.replace(modalAnchor,modal+modalAnchor);
fs.writeFileSync("src/App.tsx",a);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v75 · linked multimedia */"))c+=`
/* v75 · linked multimedia */
.link-media-cover,.link-media-frame,.link-direct-video,.link-audio-player,.link-web-card{width:100%;height:100%;border:0;border-radius:10px;overflow:hidden}.link-media-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:linear-gradient(145deg,#20232a,#111318);color:#fff;cursor:pointer}.link-media-cover small{opacity:.68}.link-media-play{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:#fff;color:#17191e;font-size:20px;padding-left:3px}.link-media-frame{background:#111}.link-direct-video{display:block;background:#111;object-fit:contain}.link-audio-player{display:flex;flex-direction:column;justify-content:center;gap:12px;padding:18px;background:#f5f6f8}.link-audio-player audio{width:100%}.link-audio-player small,.link-web-card span,.link-web-card small{color:#7c808b}.link-web-card{display:flex;flex-direction:column;justify-content:center;gap:9px;padding:20px;background:#f6f7f9}.link-web-card a{font-weight:700}.link-media-dialog{width:min(620px,calc(100vw - 28px))}.link-media-field{display:grid;gap:6px;margin:12px 0}.link-media-field span{font-size:12px;font-weight:700}.link-media-field input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d9dbe2;border-radius:10px}.link-media-support{display:grid;gap:5px;padding:12px;border-radius:11px;background:#f5f6f8;font-size:13px}.link-media-support span{color:#6f7380;line-height:1.45}.linkmedia-selection-controls{display:flex;gap:5px}.linkmedia-selection-controls a{display:inline-flex;align-items:center;justify-content:center}
`;
fs.writeFileSync("src/App.css",c);
console.log("v75 установлен. Запустите npm run build");
