import fs from "node:fs";
for(const p of ["src/App.tsx","src/boardModel.ts","src/App.css"])if(!fs.existsSync(p)){console.error("v52: не найден "+p);process.exit(1)}

let m=fs.readFileSync("src/boardModel.ts","utf8");
m=m.replace('  fontSize?: number;\n  shapeType?: ShapeType;','  fontSize?: number;\n  textAlign?: "left" | "center" | "right";\n  fontWeight?: "normal" | "bold";\n  fontStyle?: "normal" | "italic";\n  textDecoration?: "none" | "underline";\n  shapeType?: ShapeType;');
const validateMarker='    if (i.kind === "table") {';
if(!m.includes('Повреждено выравнивание текста'))m=m.replace(validateMarker,`    if (i.kind === "text" || i.kind === "sticky") {
      if (i.textAlign != null && !["left","center","right"].includes(i.textAlign)) throw new Error("Повреждено выравнивание текста");
      if (i.fontWeight != null && !["normal","bold"].includes(i.fontWeight)) throw new Error("Повреждена насыщенность текста");
      if (i.fontStyle != null && !["normal","italic"].includes(i.fontStyle)) throw new Error("Повреждено начертание текста");
      if (i.textDecoration != null && !["none","underline"].includes(i.textDecoration)) throw new Error("Повреждено подчёркивание текста");
    }
${validateMarker}`);
fs.writeFileSync("src/boardModel.ts",m);

let a=fs.readFileSync("src/App.tsx","utf8");
const fnMarker='  const setSelectedConnectorStyle = (style: ConnectorStyle) => {';
if(!a.includes('const setSelectedTextStyle ='))a=a.replace(fnMarker,`  const setSelectedTextStyle = (patch: Partial<Pick<Item, "textAlign" | "fontWeight" | "fontStyle" | "textDecoration">>) => {
    if (!singleSelected || selectionLocked || (singleSelected.kind !== "text" && singleSelected.kind !== "sticky")) return;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, ...patch } : item));
  };

${fnMarker}`);

a=a.replace('...(tool === "sticky" ? { color: "#fff3a6", fontSize: 20 } : {}),\n        ...(tool === "text" ? { fontSize: 20 } : {}),',
'...(tool === "sticky" ? { color: "#fff3a6", fontSize: 20, textAlign: "left" as const, fontWeight: "normal" as const, fontStyle: "normal" as const, textDecoration: "none" as const } : {}),\n        ...(tool === "text" ? { fontSize: 20, textAlign: "left" as const, fontWeight: "normal" as const, fontStyle: "normal" as const, textDecoration: "none" as const } : {}),');

const editorStyle='{ fontSize: item.fontSize ?? (item.kind === "cover" ? 17 : 20) }';
a=a.replace(editorStyle,'{ fontSize: item.fontSize ?? (item.kind === "cover" ? 17 : 20), ...(item.kind === "text" || item.kind === "sticky" ? { textAlign: item.textAlign ?? "left", fontWeight: item.fontWeight ?? "normal", fontStyle: item.fontStyle ?? "normal", textDecoration: item.textDecoration ?? "none" } : {}) }');

a=a.replace('<div className="text-display" style={{ fontSize: item.fontSize ?? 20 }}>',
'<div className="text-display" style={{ fontSize: item.fontSize ?? 20, textAlign: item.textAlign ?? "left", fontWeight: item.fontWeight ?? "normal", fontStyle: item.fontStyle ?? "normal", textDecoration: item.textDecoration ?? "none" }}>');

const fontStart=a.indexOf('<span className="font-size-controls"');
if(fontStart<0){console.error("v52: не найдена панель размера текста");process.exit(1)}
const connectorStart=a.indexOf('{singleSelected?.kind === "connector"',fontStart);
if(connectorStart<0){console.error("v52: не найдена панель соединителя");process.exit(1)}
if(!a.slice(fontStart,connectorStart).includes('text-format-controls')){
 const controls=`{(singleSelected?.kind === "text" || singleSelected?.kind === "sticky") && !selectionLocked && (
                <span className="text-format-controls" title="Форматирование текста">
                  <button className={singleSelected.fontWeight === "bold" ? "active" : ""} onClick={() => setSelectedTextStyle({ fontWeight: singleSelected.fontWeight === "bold" ? "normal" : "bold" })} title="Полужирный"><b>B</b></button>
                  <button className={singleSelected.fontStyle === "italic" ? "active" : ""} onClick={() => setSelectedTextStyle({ fontStyle: singleSelected.fontStyle === "italic" ? "normal" : "italic" })} title="Курсив"><i>I</i></button>
                  <button className={singleSelected.textDecoration === "underline" ? "active" : ""} onClick={() => setSelectedTextStyle({ textDecoration: singleSelected.textDecoration === "underline" ? "none" : "underline" })} title="Подчёркивание"><u>U</u></button>
                  <span className="connector-control-separator" />
                  <button className={(singleSelected.textAlign ?? "left") === "left" ? "active" : ""} onClick={() => setSelectedTextStyle({ textAlign: "left" })} title="По левому краю">≡</button>
                  <button className={singleSelected.textAlign === "center" ? "active" : ""} onClick={() => setSelectedTextStyle({ textAlign: "center" })} title="По центру">≣</button>
                  <button className={singleSelected.textAlign === "right" ? "active" : ""} onClick={() => setSelectedTextStyle({ textAlign: "right" })} title="По правому краю">≡</button>
                </span>
              )}
              `;
 a=a.slice(0,connectorStart)+controls+a.slice(connectorStart);
}
fs.writeFileSync("src/App.tsx",a);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v52 · text formatting */"))c+=`
/* v52 · text formatting */
.text-format-controls{display:inline-flex;align-items:center;gap:3px;padding-left:4px;border-left:1px solid rgba(70,72,88,.14)}.text-format-controls button{min-width:27px;height:27px;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer;font-size:11px}.text-format-controls button:hover{background:rgba(91,93,196,.08)}.text-format-controls button.active{background:rgba(91,93,196,.14);color:#5355c9}.text-display,.text-editor{white-space:pre-wrap;overflow-wrap:anywhere}
`;
fs.writeFileSync("src/App.css",c);
console.log("v52 установлен. Запустите npm run build");
