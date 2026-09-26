import {useEffect,useState} from "react";
import {getLocalSubscription,getPlan,limitLabel,plans,type LocalSubscription} from "./billingStore";
import "./BillingScreen.css";

export default function BillingScreen({onBack}:{onBack:()=>void}){
  const [sub,setSub]=useState<LocalSubscription>(()=>getLocalSubscription());
  useEffect(()=>{const sync=()=>setSub(getLocalSubscription());window.addEventListener("onlinerepetitor:billing",sync);return()=>window.removeEventListener("onlinerepetitor:billing",sync)},[]);
  return <main className="billing-page">
    <header className="billing-head"><button onClick={onBack}>← Назад</button><div><h1>Тарифы</h1><p>Возможности вашего аккаунта и доступные тарифы.</p></div></header>
    <section className="billing-current"><span>Текущий тариф</span><strong>{getPlan(sub.planId).name}</strong><em>{sub.status==="trial"?"Пробный период":sub.status==="active"?"Активен":sub.status==="past_due"?"Требует оплаты":"Отменён"}</em></section>
    <section className="billing-grid">{plans.map(plan=><article className={`billing-card ${sub.planId===plan.id?"current":""}`} key={plan.id}>
      <div><h2>{plan.name}</h2><p>{plan.description}</p></div><strong>{plan.priceLabel}</strong>
      <ul>{plan.features.map(x=><li key={x}>✓ {x}</li>)}</ul>
      <div className="billing-limit-strip"><span>Доски: <b>{limitLabel(plan.limits.boards)}</b></span><span>Участники: <b>{limitLabel(plan.limits.collaboratorsPerBoard)}</b></span><span>AI: <b>{plan.limits.aiCreditsPerMonth}/мес.</b></span></div>
      <button disabled>{sub.planId===plan.id?"Текущий тариф":"Недоступно"}</button>
    </article>)}</section>
  </main>
}
