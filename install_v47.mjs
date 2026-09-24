import fs from "node:fs";
const need=["src/App.tsx","src/BoardsScreen.tsx","src/StudentsScreen.tsx","src/AssignmentsScreen.tsx","src/ProgressScreen.tsx","src/ScheduleScreen.tsx","src/MaterialsScreen.tsx","src/App.css"];
for(const p of need)if(!fs.existsSync(p)){console.error("v47: не найден "+p);process.exit(1)}
const replace=(s,a,b,label)=>{if(s.includes(b))return s;if(!s.includes(a)){console.error("v47: не найден фрагмент "+label);process.exit(1)}return s.replace(a,b)};

let a=fs.readFileSync("src/App.tsx","utf8");
if(!a.includes('import TemplatesScreen from "./TemplatesScreen";'))a=a.replace('import MaterialsScreen from "./MaterialsScreen";','import MaterialsScreen from "./MaterialsScreen";\nimport TemplatesScreen from "./TemplatesScreen";\nimport { createTemplate,getTemplateAsset,putTemplateAsset } from "./templatesStore";');
a=replace(a,': section==="materials"\n          ? <MaterialsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />\n          : <BoardsScreen',': section==="materials"\n          ? <MaterialsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />\n          : section==="templates"\n          ? <TemplatesScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(`/board/${board.id}`)} />\n          : <BoardsScreen',"templates route");

const commitAnchor='  const commit = (next: Item[]) => {';
if(!a.includes("Шаблон применён к новой доске")){
 if(!a.includes(commitAnchor)){console.error("v47: commit anchor");process.exit(1)}
 a=a.replace(commitAnchor,`  useEffect(()=>{const raw=sessionStorage.getItem("onlinerepetitor.template.apply");if(!raw||!canEdit)return;sessionStorage.removeItem("onlinerepetitor.template.apply");(async()=>{try{const x=JSON.parse(raw);if(!x?.document?.items||!x?.templateId)return;const data={...x.document,title:boardSummary.title,view:{x:0,y:0,zoom:1}} as DocumentData;let copied=0;for(const item of data.items){if((item.kind!=="image"&&item.kind!=="pdf")||!item.assetId)continue;const blob=await getTemplateAsset(authUser.id,x.templateId,item.assetId);if(blob){await putAsset(item.assetId,blob,boardSummary.id);copied++}}applyDocument(data);setNotice(copied?\\\`Шаблон применён вместе с вложениями: \\\${copied}\\\`:"Шаблон применён к новой доске")}catch(e){setNotice(e instanceof Error?e.message:"Не удалось применить шаблон")}})()},[boardSummary.id,canEdit]);\n\n${commitAnchor}`);
}
const finishAnchor='  const finishEdit = () => {';
if(!a.includes("const saveAsTemplate=async")){
 if(!a.includes(finishAnchor)){console.error("v47: finish anchor");process.exit(1)}
 a=a.replace(finishAnchor,`  const saveAsTemplate=async()=>{if(boardSummary.role!=="owner"){setNotice("Только владелец может создавать шаблоны");return}const templateTitle=window.prompt("Название шаблона",boardSummary.title);if(!templateTitle)return;const category=window.prompt("Категория шаблона, например «Алгебра»","")??"";const description=window.prompt("Краткое описание","")??"";try{const doc=currentDocument();const template=await createTemplate(authUser.id,templateTitle,description,category,doc);let copied=0;for(const item of doc.items){if((item.kind!=="image"&&item.kind!=="pdf")||!item.assetId)continue;const blob=await getAsset(item.assetId,boardSummary.id);if(blob){await putTemplateAsset(authUser.id,template.id,item.assetId,blob);copied++}}setNotice(copied?\\\`Шаблон сохранён вместе с вложениями: \\\${copied}\\\`:"Шаблон сохранён")}catch(e){setNotice(e instanceof Error?e.message:"Не удалось сохранить шаблон")}};\n\n${finishAnchor}`);
}
if(!a.includes('onClick={()=>void saveAsTemplate()}')){
 const needle='title="Скачать резервную копию доски"';const pos=a.indexOf(needle);
 if(pos<0){console.error("v47: backup button anchor");process.exit(1)}
 const start=a.lastIndexOf("<button",pos);
 a=a.slice(0,start)+'<button className="topbar-button" onClick={()=>void saveAsTemplate()} title="Сохранить текущую доску как шаблон">Шаблон</button>'+a.slice(start);
}
fs.writeFileSync("src/App.tsx",a);

for(const f of ["src/BoardsScreen.tsx","src/StudentsScreen.tsx","src/AssignmentsScreen.tsx","src/ProgressScreen.tsx","src/ScheduleScreen.tsx","src/MaterialsScreen.tsx"]){
 let s=fs.readFileSync(f,"utf8");
 if(!s.includes('/?section=templates')){
   const needle=/<button[^>]*>Материалы<\/button>/;
   const m=s.match(needle);
   if(m)s=s.replace(m[0],m[0]+'<button onClick={()=>{window.history.pushState({},"","/?section=templates");window.dispatchEvent(new PopStateEvent("popstate"))}}>Шаблоны</button>');
 }
 fs.writeFileSync(f,s);
}
let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v46-v47 · templates */"))c+=`
/* v46-v47 · templates */
.templates-shell{min-height:100vh;background:#f6f6f9;color:#292a34}.templates-content{max-width:1180px;margin:auto;padding:22px 24px 56px}.templates-toolbar{display:grid;grid-template-columns:1fr 190px auto;gap:8px;align-items:center;margin:16px 0}.templates-toolbar input,.templates-toolbar select{border:1px solid #dedfe7;border-radius:9px;background:#fff;padding:9px}.templates-toolbar span{font-size:9px;color:#858895}.templates-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.template-card{border:1px solid #e1e2e9;border-radius:13px;background:#fff;overflow:hidden}.template-preview{height:120px;position:relative;display:grid;place-content:center;background:#fafafe;color:#5c5fc2}.template-preview .board-card-grid{position:absolute;inset:0}.template-preview b,.template-preview small{z-index:1;text-align:center}.template-preview b{font-size:22px}.template-preview small{font-size:8px}.template-card>div:last-child{padding:11px;display:grid;gap:5px}.template-card strong{font-size:11px}.template-card span{font-size:8px;color:#858895}.template-card p{font-size:9px;min-height:28px;margin:3px 0;color:#666a76}.template-card>div:last-child>div{display:flex;gap:6px}.template-card .danger{border:1px solid #eee0e0;background:#fff;border-radius:7px;color:#a64a4a;padding:6px 8px;font-size:8px}
@media(max-width:800px){.templates-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.templates-content{padding:14px}.templates-toolbar{grid-template-columns:1fr}.templates-grid{grid-template-columns:1fr}}
`;
fs.writeFileSync("src/App.css",c);
console.log("v47 установлен. Выполните SQL v47, затем npm run build");
