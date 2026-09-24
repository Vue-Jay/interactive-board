import type { AuthUser } from "./authStore";
import { getUserBoards, getBoardAccess } from "./boardStore";

export type StudentSession = {
  id: string;
  studentId: string;
  boardId: string;
  boardTitle: string;
  date: string;
  durationMinutes: number;
  topic: string;
  homework: string;
  result: string;
};

export type StudentRecord = {
  userId: string;
  name: string;
  email: string;
  boardIds: string[];
  boardTitles: string[];
  lastBoardAt: string;
  note: string;
  tags: string[];
  sessions: StudentSession[];
};

const NOTES_KEY="onlinerepetitor.student-notes.v1";
const TAGS_KEY="onlinerepetitor.student-tags.v1";
const SESSIONS_KEY="onlinerepetitor.student-sessions.v1";

const readObject=<T,>(key:string,fallback:T):T=>{
  try{const value=JSON.parse(localStorage.getItem(key)||"");return value??fallback}catch{return fallback}
};
const write=(key:string,value:unknown)=>localStorage.setItem(key,JSON.stringify(value));

export const saveStudentNote=(userId:string,note:string)=>{
  const all=readObject<Record<string,string>>(NOTES_KEY,{});
  all[userId]=note;write(NOTES_KEY,all);
};
export const saveStudentTags=(userId:string,tags:string[])=>{
  const all=readObject<Record<string,string[]>>(TAGS_KEY,{});
  all[userId]=tags;write(TAGS_KEY,all);
};

export const getStudentSessions=(studentId:string):StudentSession[]=>{
  const all=readObject<StudentSession[]>(SESSIONS_KEY,[]);
  return all.filter(s=>s.studentId===studentId).sort((a,b)=>b.date.localeCompare(a.date));
};
export const saveStudentSession=(session:StudentSession)=>{
  const all=readObject<StudentSession[]>(SESSIONS_KEY,[]);
  const next=all.some(s=>s.id===session.id)?all.map(s=>s.id===session.id?session:s):[...all,session];
  write(SESSIONS_KEY,next);
};
export const deleteStudentSession=(id:string)=>{
  write(SESSIONS_KEY,readObject<StudentSession[]>(SESSIONS_KEY,[]).filter(s=>s.id!==id));
};

export async function getStudentsForTeacher(user:AuthUser):Promise<StudentRecord[]>{
  const boards=(await getUserBoards(user)).filter(board=>board.role==="owner");
  const notes=readObject<Record<string,string>>(NOTES_KEY,{});
  const tags=readObject<Record<string,string[]>>(TAGS_KEY,{});
  const byUser=new Map<string,StudentRecord>();

  for(const board of boards){
    try{
      const access=await getBoardAccess(user.id,board.id);
      for(const member of access.members){
        if(!member.user)continue;
        const previous=byUser.get(member.userId);
        const next:StudentRecord=previous??{
          userId:member.userId,name:member.user.name||"Ученик",email:member.user.email||"",
          boardIds:[],boardTitles:[],lastBoardAt:board.updatedAt,
          note:notes[member.userId]||"",tags:tags[member.userId]||[],sessions:getStudentSessions(member.userId),
        };
        if(!next.boardIds.includes(board.id)){next.boardIds.push(board.id);next.boardTitles.push(board.title)}
        if(board.updatedAt>next.lastBoardAt)next.lastBoardAt=board.updatedAt;
        byUser.set(member.userId,next);
      }
    }catch{/* inaccessible board is skipped */}
  }
  return [...byUser.values()].sort((a,b)=>a.name.localeCompare(b.name,"ru",{sensitivity:"base"}));
}
