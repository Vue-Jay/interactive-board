import {useEffect,useState} from "react";
import {clearAiDrafts,consumeAiCredit,generateLocalAiDraft,getAiUsage,listAiDrafts,remainingAiCredits,queueAiDraftForBoard,type AiDifficulty,type AiDraft,type AiTool} from "./aiLocalStore";
import {effectivePlan,getLocalSubscription} from "./billingStore";
import "./AiStudioScreen.css";

export default function AiStudioScreen({onBack,onTariffs}:{onBack:()=>void;onTariffs:()=>void}){
 const [tool,setTool]=useState<AiTool>("assignment"),[topic,setTopic]=useState(""),[difficulty,setDifficulty]=useState<AiDifficulty>("medium"),[count,setCount]=useState(5);
 const [draft,setDraft]=useState<AiDraft|null>(null),[history,setHistory]=useState<AiDraft[]>(()=>listAiDrafts()),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [usage,setUsage]=useState(()=>getAiUsage());
 const [transferNotice,setTransferNotice]=useState("");
 const plan=effectivePlan(),sub=getLocalSubscription(),available=plan.limits.aiCreditsPerMonth>0;
 useEffect(()=>{const sync=()=>setHistory(listAiDrafts());window.addEventListener("onlinerepetitor:ai-history",sync);const usageSync=()=>setUsage(getAiUsage());window.addEventListener("onlinerepetitor:ai-usage",usageSync);return()=>{window.removeEventListener("onlinerepetitor:ai-history",sync);window.removeEventListener("onlinerepetitor:ai-usage",usageSync)}},[]);
 const generate=async()=>{setError("");setBusy(true);try{consumeAiCredit(plan.limits.aiCreditsPerMonth);setUsage(getAiUsage());setDraft(await generateLocalAiDraft(tool,topic,difficulty,count))}catch(e){setError(e instanceof Error?e.message:"Не удалось создать черновик")}finally{setBusy(false)}};
 return <main className="ai-studio">
  <header className="ai-head"><button onClick={onBack}>← Настройки</button><div><h1>AI-студия</h1><p>Создавайте задания, тесты и карточки. Результат остаётся черновиком до подтверждения преподавателем.</p></div><span>{plan.name} · осталось {remainingAiCredits(plan.limits.aiCreditsPerMonth)} из {plan.limits.aiCreditsPerMonth}</span></header>
  {!available?<section className="ai-locked"><b>AI недоступен на текущем тарифе</b><p>{sub.planId!=="free"?"Подписка сейчас не активна, поэтому применяются возможности Free.":"AI включён в Teacher и Pro."}</p><button onClick={onTariffs}>Открыть тарифы</button></section>:
  <section className="ai-layout"><div className="ai-compose"><div className="ai-tool-tabs"><button className={tool==="assignment"?"active":""} onClick={()=>setTool("assignment")}>Задание</button><button className={tool==="quiz"?"active":""} onClick={()=>setTool("quiz")}>Тест</button><button className={tool==="flashcards"?"active":""} onClick={()=>setTool("flashcards")}>Карточки</button></div>
   <label><span>Тема</span><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Например: квадратные уравнения"/></label>
   <div className="ai-options"><label><span>Уровень</span><select value={difficulty} onChange={e=>setDifficulty(e.target.value as AiDifficulty)}><option value="easy">Базовый</option><option value="medium">Средний</option><option value="hard">Углублённый</option></select></label><label><span>Количество</span><select value={count} onChange={e=>setCount(Number(e.target.value))}><option>3</option><option>5</option><option>7</option><option>10</option></select></label></div>
   {error&&<div className="ai-error">{error}</div>}<button className="ai-generate" disabled={busy||topic.trim().length<2||remainingAiCredits(plan.limits.aiCreditsPerMonth)<=0} onClick={()=>void generate()}>{busy?"Создаём…":"Создать черновик"}</button>
   <div className="ai-usage-meter"><span style={{width:`${plan.limits.aiCreditsPerMonth?Math.min(100,usage.used/plan.limits.aiCreditsPerMonth*100):0}%`}}/></div>
   <small className="ai-local-note">Использовано в этом месяце: {usage.used}.</small>
  </div>
  <div className="ai-result">{draft?<><div className="ai-result-head"><div><small>Черновик</small><h2>{draft.title}</h2></div><div className="ai-result-actions"><button onClick={()=>void navigator.clipboard.writeText(`${draft.title}\n\n${draft.body}`)}>Копировать</button><button className="ai-board-queue" onClick={()=>{queueAiDraftForBoard(draft);setTransferNotice("Материал подготовлен. Откройте нужную доску, и он будет добавлен в её центр.");setTimeout(()=>{window.history.pushState({},"","/");window.dispatchEvent(new PopStateEvent("popstate"))},450)}}>На доску</button></div></div><textarea value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/><div className="ai-approval">✓ Перед добавлением на доску преподаватель может проверить и отредактировать результат.</div>{transferNotice&&<div className="ai-transfer-notice">{transferNotice}</div>}</>:<div className="ai-empty">Здесь появится созданный материал.</div>}</div></section>}
  <section className="ai-history"><div><h2>Недавние черновики</h2><div className="ai-history-actions">{history.length>0&&<button onClick={()=>{clearAiDrafts();setDraft(null)}}>Очистить историю</button>}</div></div>{history.length===0?<p>История пока пуста.</p>:history.slice(0,6).map(x=><button key={x.id} onClick={()=>setDraft(x)}><b>{x.title}</b><span>{new Date(x.createdAt).toLocaleString("ru-RU")}</span></button>)}</section>
 </main>
}
