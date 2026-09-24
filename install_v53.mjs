import fs from "node:fs";
for(const p of ["src/App.tsx","src/boardModel.ts","src/App.css"])if(!fs.existsSync(p)){console.error("v53: не найден "+p);process.exit(1)}

let m=fs.readFileSync("src/boardModel.ts","utf8");
m=m.replace('  tableHeader?: boolean;\n  resolved?: boolean;','  tableHeader?: boolean;\n  tableAlign?: "left" | "center" | "right";\n  tableStripe?: boolean;\n  tableCompact?: boolean;\n  resolved?: boolean;');
if(!m.includes('Повреждено выравнивание таблицы'))m=m.replace('      if (i.tableHeader != null && typeof i.tableHeader !== "boolean") throw new Error("Повреждён заголовок таблицы");',
'      if (i.tableHeader != null && typeof i.tableHeader !== "boolean") throw new Error("Повреждён заголовок таблицы");\n      if (i.tableAlign != null && !["left","center","right"].includes(i.tableAlign)) throw new Error("Повреждено выравнивание таблицы");\n      if (i.tableStripe != null && typeof i.tableStripe !== "boolean") throw new Error("Повреждено чередование строк таблицы");\n      if (i.tableCompact != null && typeof i.tableCompact !== "boolean") throw new Error("Повреждён компактный режим таблицы");');
fs.writeFileSync("src/boardModel.ts",m);

let a=fs.readFileSync("src/App.tsx","utf8");
const oldType='useState<{ rows: number; cols: number; cells: string[]; header: boolean; fontSize: number } | null>(null)';
a=a.replace(oldType,'useState<{ rows: number; cols: number; cells: string[]; header: boolean; fontSize: number; align: "left" | "center" | "right"; stripe: boolean; compact: boolean } | null>(null)');
a=a.replaceAll('setTableDraft({ rows, cols, cells, header: item.tableHeader !== false, fontSize: item.fontSize ?? 13 });',
'setTableDraft({ rows, cols, cells, header: item.tableHeader !== false, fontSize: item.fontSize ?? 13, align: item.tableAlign ?? "left", stripe: item.tableStripe === true, compact: item.tableCompact === true });');

a=a.replace('      fontSize: Math.max(9, Math.min(32, Math.round(tableDraft.fontSize))),\n    } : item));',
'      fontSize: Math.max(9, Math.min(32, Math.round(tableDraft.fontSize))),\n      tableAlign: tableDraft.align,\n      tableStripe: tableDraft.stripe,\n      tableCompact: tableDraft.compact,\n    } : item));');

a=a.replace('<div className="table-view" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, fontSize: item.fontSize ?? 13 }}>',
'<div className={`table-view ${item.tableStripe ? "table-striped" : ""} ${item.tableCompact ? "table-compact" : ""}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, fontSize: item.fontSize ?? 13, textAlign: item.tableAlign ?? "left" }}>');

const resizeMarker='  const saveTableEditor = () => {';
if(!a.includes('const addTableRowAt ='))a=a.replace(resizeMarker,`  const addTableRowAt = (at: number) => setTableDraft((current) => {
    if (!current || current.rows >= 20) return current;
    const row = Math.max(0, Math.min(current.rows, at));
    const cells = [...current.cells];
    cells.splice(row * current.cols, 0, ...Array(current.cols).fill(""));
    return { ...current, rows: current.rows + 1, cells };
  });
  const removeTableRowAt = (at: number) => setTableDraft((current) => {
    if (!current || current.rows <= 1) return current;
    const row = Math.max(0, Math.min(current.rows - 1, at));
    const cells = [...current.cells];
    cells.splice(row * current.cols, current.cols);
    return { ...current, rows: current.rows - 1, cells };
  });
  const addTableColAt = (at: number) => setTableDraft((current) => {
    if (!current || current.cols >= 12) return current;
    const col = Math.max(0, Math.min(current.cols, at));
    const nextCols = current.cols + 1;
    const cells = Array.from({ length: current.rows * nextCols }, (_, index) => {
      const row = Math.floor(index / nextCols), nextCol = index % nextCols;
      if (nextCol === col) return "";
      const oldCol = nextCol > col ? nextCol - 1 : nextCol;
      return current.cells[row * current.cols + oldCol] ?? "";
    });
    return { ...current, cols: nextCols, cells };
  });
  const removeTableColAt = (at: number) => setTableDraft((current) => {
    if (!current || current.cols <= 1) return current;
    const col = Math.max(0, Math.min(current.cols - 1, at));
    const nextCols = current.cols - 1;
    const cells = Array.from({ length: current.rows * nextCols }, (_, index) => {
      const row = Math.floor(index / nextCols), nextCol = index % nextCols;
      const oldCol = nextCol >= col ? nextCol + 1 : nextCol;
      return current.cells[row * current.cols + oldCol] ?? "";
    });
    return { ...current, cols: nextCols, cells };
  });

${resizeMarker}`);

const controlsEnd='<label className="table-font-control"><span>Текст</span><input type="range" min="9" max="32" step="1" value={tableDraft.fontSize} onChange={(e) => setTableDraft({ ...tableDraft, fontSize: Number(e.target.value) })}/><strong>{tableDraft.fontSize}px</strong></label>';
if(!a.includes('table-style-controls'))a=a.replace(controlsEnd,controlsEnd+`
                <i/>
                <span className="table-style-controls">
                  <button className={tableDraft.align === "left" ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, align: "left" })} title="По левому краю">≡</button>
                  <button className={tableDraft.align === "center" ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, align: "center" })} title="По центру">≣</button>
                  <button className={tableDraft.align === "right" ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, align: "right" })} title="По правому краю">≡</button>
                  <button className={tableDraft.stripe ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, stripe: !tableDraft.stripe })} title="Чередовать строки">▤</button>
                  <button className={tableDraft.compact ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, compact: !tableDraft.compact })} title="Компактные строки">↕</button>
                </span>`);

const gridOpen='<div className="table-editor-grid" style={{ gridTemplateColumns: `repeat(${tableDraft.cols}, minmax(120px, 1fr))` }}>';
if(!a.includes('table-editor-column-tools'))a=a.replace(gridOpen,`<div className="table-editor-column-tools" style={{ gridTemplateColumns: \`repeat(\${tableDraft.cols}, minmax(120px, 1fr))\` }}>
                {Array.from({ length: tableDraft.cols }, (_, col) => <div key={col}><button onClick={() => addTableColAt(col + 1)} disabled={tableDraft.cols >= 12} title="Добавить столбец справа">+</button><button onClick={() => removeTableColAt(col)} disabled={tableDraft.cols <= 1} title="Удалить столбец">×</button></div>)}
              </div>
              ${gridOpen}`);

const textarea='<textarea key={`${tableDraft.rows}-${tableDraft.cols}-${indexValue}`} className={tableDraft.header && indexValue < tableDraft.cols ? "table-editor-header-cell" : ""} style={{ fontSize: tableDraft.fontSize }} value={cell}';
a=a.replace(textarea,'<textarea key={`${tableDraft.rows}-${tableDraft.cols}-${indexValue}`} className={`${tableDraft.header && indexValue < tableDraft.cols ? "table-editor-header-cell" : ""} ${tableDraft.stripe && Math.floor(indexValue / tableDraft.cols) % 2 === 1 ? "table-editor-striped-cell" : ""}`} style={{ fontSize: tableDraft.fontSize, textAlign: tableDraft.align, minHeight: tableDraft.compact ? 46 : undefined }} value={cell}');

const gridClose='              </div>\n              <div className="table-editor-footer">';
if(!a.includes('table-editor-row-tools'))a=a.replace(gridClose,`              </div>
              <div className="table-editor-row-tools">
                <button onClick={() => addTableRowAt(tableDraft.rows)} disabled={tableDraft.rows >= 20}><Icon name="plus" size={14}/> Добавить строку</button>
                <button onClick={() => removeTableRowAt(tableDraft.rows - 1)} disabled={tableDraft.rows <= 1}>× Последняя строка</button>
              </div>
              <div className="table-editor-footer">`);
fs.writeFileSync("src/App.tsx",a);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v53 · advanced tables */"))c+=`
/* v53 · advanced tables */
.table-view.table-striped .table-cell:nth-child(6n+4),.table-view.table-striped .table-cell:nth-child(6n+5),.table-view.table-striped .table-cell:nth-child(6n+6){background:rgba(91,93,196,.045)}.table-view.table-compact .table-cell{padding:3px 6px}.table-style-controls{display:inline-flex;gap:3px}.table-style-controls button,.table-editor-column-tools button,.table-editor-row-tools button{border:1px solid #dedfe7;background:#fff;border-radius:6px;min-width:26px;height:26px;cursor:pointer}.table-style-controls button.active{background:#ececff;border-color:#b9baf0;color:#5355c9}.table-editor-column-tools{display:grid;gap:6px;margin:8px 0 4px}.table-editor-column-tools>div{display:flex;justify-content:center;gap:4px}.table-editor-column-tools button:last-child{color:#b74455}.table-editor-row-tools{display:flex;gap:7px;margin-top:8px}.table-editor-row-tools button{padding:0 9px}.table-editor-striped-cell{background:rgba(91,93,196,.045)!important}
`;
fs.writeFileSync("src/App.css",c);
console.log("v53 установлен. Запустите npm run build");
