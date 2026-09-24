import fs from "node:fs";
const p="src/studentsStore.ts";
if(!fs.existsSync(p)){console.error("Не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old=`export async function saveStudentProfile(userId:string,note:string,tags:string[]){
 saveLocal(NOTES_KEY,userId,note);saveLocal(TAGS_KEY,userId,tags);
 if(!isRemoteBackendEnabled())return;
 await remoteRequest("/rest/v1/student_profiles?on_conflict=teacher_id,student_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({student_id:userId,note,tags})});
}`;
const next=`export async function saveStudentProfile(userId:string,note:string,tags:string[]){
 const notes=readObject<Record<string,string>>(NOTES_KEY,{});
 const allTags=readObject<Record<string,string[]>>(TAGS_KEY,{});
 notes[userId]=note;
 allTags[userId]=tags;
 write(NOTES_KEY,notes);
 write(TAGS_KEY,allTags);
 if(!isRemoteBackendEnabled())return;
 await remoteRequest("/rest/v1/student_profiles?on_conflict=teacher_id,student_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({student_id:userId,note,tags})});
}`;
if(!s.includes(old)){console.error("Фрагмент v48 saveStudentProfile не найден. Файл уже изменён или патч не установлен.");process.exit(1)}
fs.writeFileSync(p,s.replace(old,next));
console.log("v48 hotfix 1 установлен");
