export type AiTool="assignment"|"quiz"|"flashcards";
export type AiDifficulty="easy"|"medium"|"hard";
export type AiDraft={id:string;tool:AiTool;topic:string;title:string;body:string;createdAt:string};

const KEY="onlinerepetitor.ai.local-history.v189";
const USAGE_KEY="onlinerepetitor.ai.local-usage.v190";
const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;


export type AiUsage={month:string;used:number};
const currentMonth=()=>new Date().toISOString().slice(0,7);
export function getAiUsage():AiUsage{
 try{
  const x=JSON.parse(localStorage.getItem(USAGE_KEY)||"{}") as Partial<AiUsage>;
  return x.month===currentMonth()?{month:x.month,used:Math.max(0,Number(x.used)||0)}:{month:currentMonth(),used:0};
 }catch{return {month:currentMonth(),used:0}}
}
export function remainingAiCredits(limit:number){
 return Math.max(0,limit-getAiUsage().used);
}
export function consumeAiCredit(limit:number){
 const usage=getAiUsage();
 if(usage.used>=limit)throw new Error("Лимит AI-запросов на этот месяц исчерпан.");
 const next={month:currentMonth(),used:usage.used+1};
 localStorage.setItem(USAGE_KEY,JSON.stringify(next));
 window.dispatchEvent(new Event("onlinerepetitor:ai-usage"));
 return next;
}
export function resetAiUsage(){
 localStorage.removeItem(USAGE_KEY);
 window.dispatchEvent(new Event("onlinerepetitor:ai-usage"));
}

export function listAiDrafts():AiDraft[]{
 try{return JSON.parse(localStorage.getItem(KEY)||"[]") as AiDraft[]}catch{return[]}
}
function remember(draft:AiDraft){
 const next=[draft,...listAiDrafts()].slice(0,20);
 localStorage.setItem(KEY,JSON.stringify(next));
 window.dispatchEvent(new Event("onlinerepetitor:ai-history"));
}
export function clearAiDrafts(){localStorage.removeItem(KEY);window.dispatchEvent(new Event("onlinerepetitor:ai-history"))}

export async function generateLocalAiDraft(tool:AiTool,topic:string,difficulty:AiDifficulty,count:number):Promise<AiDraft>{
 const clean=topic.trim();
 if(clean.length<2)throw new Error("Укажите тему.");
 await new Promise(r=>setTimeout(r,450));
 const level=difficulty==="easy"?"базовый":difficulty==="hard"?"углублённый":"средний";
 let title="",body="";
 if(tool==="assignment"){
  title=`Задание: ${clean}`;
  body=Array.from({length:count},(_,i)=>`${i+1}. ${i===0?`Сформулируйте ключевую идею темы «${clean}».`:i===1?`Приведите пример по теме «${clean}» и объясните его.`:i===2?`Найдите типичную ошибку при работе с темой «${clean}» и исправьте её.`:`Выполните задание ${i+1} по теме «${clean}» (${level} уровень).`}`).join("\n");
 }else if(tool==="quiz"){
  title=`Тест: ${clean}`;
  body=Array.from({length:count},(_,i)=>`${i+1}. Вопрос ${i+1} по теме «${clean}»?\nA) Вариант A\nB) Вариант B\nC) Вариант C\nD) Вариант D\nОтвет: A`).join("\n\n");
 }else{
  title=`Карточки: ${clean}`;
  body=Array.from({length:count},(_,i)=>`Карточка ${i+1}\nВопрос: Что важно знать о «${clean}» в пункте ${i+1}?\nОтвет: Краткий ответ для повторения (${level} уровень).`).join("\n\n");
 }
 const draft={id:uid(),tool,topic:clean,title,body,createdAt:new Date().toISOString()};
 remember(draft);return draft;
}

export type AiBoardTransfer={draft:AiDraft;queuedAt:string};
const BOARD_TRANSFER_KEY="onlinerepetitor.ai.board-transfer.v191";
export function queueAiDraftForBoard(draft:AiDraft){
 const payload:AiBoardTransfer={draft,queuedAt:new Date().toISOString()};
 localStorage.setItem(BOARD_TRANSFER_KEY,JSON.stringify(payload));
 window.dispatchEvent(new Event("onlinerepetitor:ai-board-transfer"));
 return payload;
}
export function peekAiBoardTransfer():AiBoardTransfer|null{
 try{return JSON.parse(localStorage.getItem(BOARD_TRANSFER_KEY)||"null") as AiBoardTransfer|null}catch{return null}
}
export function clearAiBoardTransfer(){localStorage.removeItem(BOARD_TRANSFER_KEY)}
