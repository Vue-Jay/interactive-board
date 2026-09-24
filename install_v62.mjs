import fs from "node:fs";
for(const p of ["src/App.tsx","src/App.css","src/main.tsx","index.html"])if(!fs.existsSync(p)){console.error("v62: не найден "+p);process.exit(1)}

let a=fs.readFileSync("src/App.tsx","utf8");
a=a.replace('  const [mobileToolsOpen,setMobileToolsOpen]=useState(false);','  const [mobileToolsOpen,setMobileToolsOpen]=useState(false);\n  const [installPrompt,setInstallPrompt]=useState<Event|null>(null);\n  const [isStandalone,setIsStandalone]=useState(()=>window.matchMedia?.("(display-mode: standalone)").matches===true);');

const effectAnchor='  const clipboard = useRef<Item[]>([]);';
if(!a.includes('beforeinstallprompt')) a=a.replace(effectAnchor,`  useEffect(()=>{const ready=(e:Event)=>{e.preventDefault();setInstallPrompt(e)};const installed=()=>{setInstallPrompt(null);setIsStandalone(true)};window.addEventListener("beforeinstallprompt",ready);window.addEventListener("appinstalled",installed);return()=>{window.removeEventListener("beforeinstallprompt",ready);window.removeEventListener("appinstalled",installed)}},[]);\n  const installApp=async()=>{const p=installPrompt as (Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})|null;if(!p)return;await p.prompt();await p.userChoice;setInstallPrompt(null)};\n`+effectAnchor);

const toggle='<button type="button" className="mobile-tools-toggle" aria-expanded={mobileToolsOpen} onClick={()=>setMobileToolsOpen(v=>!v)}><Icon name={tool} size={18}/><span>Инструменты</span></button>';
const dock=`<nav className="mobile-quick-tools" aria-label="Быстрые инструменты">
          {(["select","hand","pen","eraser","sticky"] as Tool[]).map(id=><button key={id} type="button" className={tool===id?"active":""} aria-label={tools.find(t=>t.id===id)?.label??id} onClick={()=>{finishEdit();setTool(id);setMobileToolsOpen(false)}}><Icon name={id} size={20}/></button>)}
        </nav>
        ${toggle}`;
a=a.replace(toggle,dock);

const topRight='<div className="topbar-right">';
a=a.replace(topRight,topRight+'{installPrompt&&!isStandalone&&<button type="button" className="install-app-button" onClick={()=>void installApp()} title="Установить OnlineRepetitor на устройство">Установить</button>}');

fs.writeFileSync("src/App.tsx",a);

let main=fs.readFileSync("src/main.tsx","utf8");
if(!main.includes('serviceWorker.register')) main += '\n\nif ("serviceWorker" in navigator && import.meta.env.PROD) {\n  window.addEventListener("load", () => {\n    void navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker registration failed", error));\n  });\n}\n';
fs.writeFileSync("src/main.tsx",main);

let html=fs.readFileSync("index.html","utf8");
if(!html.includes('rel="manifest"')) html=html.replace('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />','<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n    <link rel="manifest" href="/manifest.webmanifest" />\n    <link rel="apple-touch-icon" href="/pwa-icon.svg" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-status-bar-style" content="default" />');
fs.writeFileSync("index.html",html);

let css=fs.readFileSync("src/App.css","utf8");
if(!css.includes("/* v62 · mobile PWA */")) css += `
/* v62 · mobile PWA */
.install-app-button{height:36px;padding:0 11px;border-radius:9px;background:#f0f0ff;color:#4d4fc2;font-weight:700;cursor:pointer}
.mobile-quick-tools{display:none}
@media(max-width:900px){
  .mobile-tools-toggle{left:10px;bottom:62px}
  .mobile-quick-tools{display:flex;position:absolute;z-index:80;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);gap:4px;padding:5px;border:1px solid #dfe0e7;border-radius:15px;background:rgba(255,255,255,.96);box-shadow:0 6px 22px rgba(26,28,40,.16);backdrop-filter:blur(10px)}
  .mobile-quick-tools button{width:42px;height:42px;display:grid;place-items:center;border-radius:11px;background:transparent;color:#555966}
  .mobile-quick-tools button.active{background:#ededff;color:#5052c8}
  .zoom-controls{bottom:64px}
  .notice{top:auto;bottom:118px;right:8px;max-width:calc(100vw - 16px)}
  .workspace{padding-bottom:env(safe-area-inset-bottom)}
}
@media(max-width:620px){
  .install-app-button{height:32px;font-size:11px;padding:0 8px}
  .topbar-right .presence-menu,.topbar-right .save-status{flex-shrink:0}
}
@media(display-mode:standalone){
  .app{height:100dvh}
  .topbar{padding-top:env(safe-area-inset-top)}
  .mobile-quick-tools{bottom:max(10px,env(safe-area-inset-bottom))}
}
`;
fs.writeFileSync("src/App.css",css);

for(const name of ["manifest.webmanifest","sw.js","pwa-icon.svg"]){
  const src=new URL(`./v62_files/public/${name}`,import.meta.url);
  fs.copyFileSync(src,`public/${name}`);
}
console.log("v62 установлен. Запустите npm run build");
