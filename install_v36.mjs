import fs from "node:fs";
const cssPath="src/App.css";
if(!fs.existsSync(cssPath)){console.error("v36: не найден src/App.css");process.exit(1)}
let css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("/* v36 · student history */")){
css+=`

/* v36 · student history */
.student-stat-grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.student-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:22px;border-top:1px solid #ececf2;padding-top:14px}
.student-section-head h3{font-size:13px;margin:0}.student-section-head button{border:0;border-radius:8px;padding:7px 10px;background:#ecebff;color:#4d4fb2;font-size:10px;font-weight:800;cursor:pointer}
.student-history{display:grid;gap:7px;margin-top:8px}.student-history-empty{padding:16px;border-radius:10px;background:#f8f8fb;color:#888b98;font-size:11px;text-align:center}
.student-session{display:flex;justify-content:space-between;gap:12px;padding:11px;border:1px solid #ececf3;border-radius:10px;background:#fbfbfd}.student-session>div:first-child{display:flex;flex-direction:column;min-width:0}.student-session b{font-size:12px}.student-session span{font-size:10px;color:#898c99;margin-top:2px}.student-session p{font-size:11px;line-height:1.35;margin:7px 0 0;color:#555866}.student-session p strong{font-size:10px}.student-session>div:last-child{display:flex;gap:5px;align-items:flex-start}.student-session button{border:0;border-radius:6px;padding:5px 7px;font-size:9px;font-weight:750;cursor:pointer}.student-session button.danger{background:#fff0f0;color:#a84141}
.student-session-modal{max-width:650px}.session-form{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px}.session-form label{display:grid;gap:5px}.session-form label.wide{grid-column:1/-1}.session-form span{font-size:10px;font-weight:800;color:#606372}.session-form input,.session-form select,.session-form textarea{width:100%;box-sizing:border-box;border:1px solid #dddde7;border-radius:8px;padding:9px 10px;font:inherit;background:#fff;resize:vertical}.session-actions{display:flex;gap:8px;margin-top:16px}.session-actions .students-primary{min-height:36px}
@media(max-width:820px){.student-stat-grid-4{grid-template-columns:1fr 1fr}.session-form{grid-template-columns:1fr}.session-form label.wide{grid-column:auto}.student-session{flex-direction:column}}
`;
fs.writeFileSync(cssPath,css,"utf8");
}
console.log("v36 установлен: история занятий, прогресс и домашние задания в карточке ученика.");
console.log("Выполните npm run build");
