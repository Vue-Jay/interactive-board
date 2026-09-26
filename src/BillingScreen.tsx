import {useEffect,useState} from "react";
import {getPlan,limitLabel,plans} from "./billingStore";
import {getAccountAccess,type AccountAccess} from "./accountRoleStore";
import "./BillingScreen.css";

export default function BillingScreen({onBack}:{onBack:()=>void}){
  const [access,setAccess]=useState<AccountAccess>({role:"student",teacherStatus:"none",isAdmin:false,requestedAt:null,reviewedAt:null,subscriptionPlan:"free",subscriptionUntil:null});
  useEffect(()=>{const sync=()=>void getAccountAccess().then(setAccess);sync();window.addEventListener("onlinerepetitor:account-access",sync);window.addEventListener("focus",sync);return()=>{window.removeEventListener("onlinerepetitor:account-access",sync);window.removeEventListener("focus",sync)}},[]);
  const currentPlan=getPlan(access.subscriptionPlan);
  return <main className="billing-page">
    <header className="billing-head"><button onClick={onBack}>← Назад</button><div><h1>Тарифы</h1><p>Возможности вашего аккаунта и доступные тарифы.</p></div></header>
    <section className="billing-current"><span>Текущий тариф</span><strong>{currentPlan.name}</strong><em>{access.subscriptionPlan==="free"?"Бесплатный":access.subscriptionUntil?`Активен до ${new Date(access.subscriptionUntil).toLocaleDateString("ru-RU")}`:"Активен"}</em></section>
    <section className="billing-grid">{plans.map(plan=><article className={`billing-card ${access.subscriptionPlan===plan.id?"current":""}`} key={plan.id}>
      <div><h2>{plan.name}</h2><p>{plan.description}</p></div><strong>{plan.priceLabel}</strong>
      <ul>{plan.features.map(x=><li key={x}>✓ {x}</li>)}</ul>
      <div className="billing-limit-strip"><span>Доски: <b>{limitLabel(plan.limits.boards)}</b></span><span>Участники: <b>{limitLabel(plan.limits.collaboratorsPerBoard)}</b></span><span>AI: <b>{plan.limits.aiCreditsPerMonth}/мес.</b></span></div>
      <button disabled>{access.subscriptionPlan===plan.id?"Текущий тариф":"Недоступно"}</button>
    </article>)}</section>
  </main>
}
