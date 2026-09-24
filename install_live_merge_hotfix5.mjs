import fs from "node:fs";

const p = "src/App.tsx";
if (!fs.existsSync(p)) {
  console.error("hotfix 5: не найден " + p);
  process.exit(1);
}

let s = fs.readFileSync(p, "utf8");

const dangling = "    setConflictBusy(false);";
const count = s.split(dangling).length - 1;

if (count !== 1) {
  console.error(`hotfix 5: ожидался ровно один остаточный setConflictBusy(false), найдено: ${count}. Файл не изменён.`);
  process.exit(1);
}

s = s.replace(dangling + "\r\n", "");
s = s.replace(dangling + "\n", "");

const leftovers = [
  "setConflictBusy(",
  "conflictBusy",
  "setConflictDetailsOpen(",
  "conflictDetailsOpen",
  "keepLocalChanges",
  "useRemoteChanges",
  "exportConflictBackup"
];

const found = leftovers.filter((needle) => s.includes(needle));
if (found.length) {
  console.error("hotfix 5: после исправления остались старые conflict-символы:", found.join(", "));
  console.error("Файл не записан.");
  process.exit(1);
}

fs.writeFileSync(p, s);
console.log("hotfix 5 установлен: удалён последний вызов setConflictBusy(false) и проверены остатки старого ручного conflict UI.");
console.log("Теперь запустите npm run build.");
