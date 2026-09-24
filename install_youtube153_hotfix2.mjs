import fs from "node:fs";
for(const p of ["vercel.json","src/linkMedia.tsx"])if(!fs.existsSync(p)){console.error("hotfix2: не найден "+p);process.exit(1)}
const vercel={
  headers:[{
    source:"/(.*)",
    headers:[
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"}
    ]
  }],
  rewrites:[{source:"/(.*)",destination:"/"}]
};
fs.writeFileSync("vercel.json",JSON.stringify(vercel,null,2)+"\n");

let s=fs.readFileSync("src/linkMedia.tsx","utf8");
s=s.replace('const [activated,setActivated]=useState(false);','const [activated,setActivated]=useState(false);');
const old='<iframe className="link-media-frame" src={info.embedUrl} title={item.mediaTitle||"Видео"} referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onPointerDown={e=>e.stopPropagation()}/>';
const neu='<iframe className="link-media-frame" src={info.embedUrl} title={item.mediaTitle||"Видео"} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen onPointerDown={e=>e.stopPropagation()}/>';
if(s.includes(old))s=s.replace(old,neu);
else if(!s.includes('referrerPolicy="strict-origin-when-cross-origin"')){console.error("hotfix2: iframe после hotfix1 не найден");process.exit(1)}
fs.writeFileSync("src/linkMedia.tsx",s);
console.log("YouTube 153 hotfix 2 установлен. ВАЖНО: после npm run build нужно git push и дождаться нового Vercel deployment.");
