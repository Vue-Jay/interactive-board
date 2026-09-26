export type PlanId="free"|"teacher"|"pro";
export type SubscriptionStatus="trial"|"active"|"past_due"|"canceled";
export type PlanLimits={
  boards:number|null;
  collaboratorsPerBoard:number|null;
  storageMb:number|null;
  aiCreditsPerMonth:number;
};
export type PlanDefinition={
  id:PlanId;
  name:string;
  description:string;
  priceLabel:string;
  limits:PlanLimits;
  features:string[];
};
export type LocalSubscription={
  planId:PlanId;
  status:SubscriptionStatus;
  trialEndsAt:string|null;
  periodEndsAt:string|null;
  updatedAt:string;
};

const KEY="onlinerepetitor.billing.local.v187";

export const plans:PlanDefinition[]=[
  {id:"free",name:"Free",description:"Для знакомства и личной работы",priceLabel:"Бесплатно",limits:{boards:3,collaboratorsPerBoard:2,storageMb:100,aiCreditsPerMonth:0},features:["До 3 досок","До 2 участников на доске","100 МБ материалов"]},
  {id:"teacher",name:"Teacher",description:"Для регулярных индивидуальных занятий",priceLabel:"Тестовый тариф",limits:{boards:50,collaboratorsPerBoard:10,storageMb:2048,aiCreditsPerMonth:100},features:["До 50 досок","До 10 участников","2 ГБ материалов","100 AI-запросов в месяц"]},
  {id:"pro",name:"Pro",description:"Для активной практики и групп",priceLabel:"Тестовый тариф",limits:{boards:null,collaboratorsPerBoard:null,storageMb:10240,aiCreditsPerMonth:500},features:["Без лимита досок","Без лимита участников","10 ГБ материалов","500 AI-запросов в месяц"]},
];

const defaultSubscription=():LocalSubscription=>({planId:"free",status:"active",trialEndsAt:null,periodEndsAt:null,updatedAt:new Date().toISOString()});

export function getPlan(id:PlanId){return plans.find(p=>p.id===id)??plans[0]}
export function getLocalSubscription():LocalSubscription{
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return defaultSubscription();
    const x=JSON.parse(raw) as Partial<LocalSubscription>;
    if(!["free","teacher","pro"].includes(String(x.planId))||!["trial","active","past_due","canceled"].includes(String(x.status)))return defaultSubscription();
    return {planId:x.planId as PlanId,status:x.status as SubscriptionStatus,trialEndsAt:x.trialEndsAt??null,periodEndsAt:x.periodEndsAt??null,updatedAt:x.updatedAt||new Date().toISOString()};
  }catch{return defaultSubscription()}
}
export function setLocalSubscription(planId:PlanId,status:SubscriptionStatus="active"){
  const now=new Date(),period=new Date(now);
  period.setMonth(period.getMonth()+1);
  const trial=new Date(now);trial.setDate(trial.getDate()+14);
  const next:LocalSubscription={planId,status,trialEndsAt:status==="trial"?trial.toISOString():null,periodEndsAt:planId==="free"?null:period.toISOString(),updatedAt:now.toISOString()};
  localStorage.setItem(KEY,JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("onlinerepetitor:billing",{detail:next}));
  return next;
}
export function resetLocalSubscription(){localStorage.removeItem(KEY);const next=defaultSubscription();window.dispatchEvent(new CustomEvent("onlinerepetitor:billing",{detail:next}));return next}
export function canUse(limit:keyof PlanLimits,current:number){
  const value=getPlan(getLocalSubscription().planId).limits[limit];
  return value===null||current<value;
}

export function subscriptionAllowsPaidFeatures(sub=getLocalSubscription()){
  return sub.planId!=="free"&&(sub.status==="trial"||sub.status==="active");
}
export function effectivePlan(sub=getLocalSubscription()){
  return subscriptionAllowsPaidFeatures(sub)?getPlan(sub.planId):getPlan("free");
}
export function limitLabel(value:number|null,unit=""){
  return value===null?"Без ограничений":`${value}${unit}`;
}

export function describeEntitlement(){
 const sub=getLocalSubscription(),plan=effectivePlan(sub);
 return {
  configuredPlan:getPlan(sub.planId),
  effectivePlan:plan,
  paidFeatures:subscriptionAllowsPaidFeatures(sub),
  status:sub.status,
 };
}
