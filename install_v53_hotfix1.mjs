import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("Не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const replacements=[
[
'setTableDraft({ rows, cols, cells: [...cells], header: true, fontSize: 13 });',
'setTableDraft({ rows, cols, cells: [...cells], header: true, fontSize: 13, align: "left", stripe: false, compact: false });'
],
[
'setTableDraft({ rows: item.tableRows ?? 3, cols: item.tableCols ?? 3, cells: [...(item.tableCells ?? [])], header: item.tableHeader !== false, fontSize: item.fontSize ?? 13 });',
'setTableDraft({ rows: item.tableRows ?? 3, cols: item.tableCols ?? 3, cells: [...(item.tableCells ?? [])], header: item.tableHeader !== false, fontSize: item.fontSize ?? 13, align: item.tableAlign ?? "left", stripe: item.tableStripe === true, compact: item.tableCompact === true });'
]
];
let changed=0;
for(const [from,to] of replacements){
 if(s.includes(from)){s=s.replace(from,to);changed++}
}
if(changed===0){console.error("v53 hotfix: нужные места не найдены. Возможно, исправление уже применено.");process.exit(1)}
fs.writeFileSync(p,s);
console.log(`v53 hotfix применён: исправлено мест ${changed}. Теперь запустите npm run build`);
