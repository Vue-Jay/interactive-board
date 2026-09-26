export type MathAiMode="auto"|"arithmetic"|"equations"|"fractions"|"geometry"|"functions"|"percent"|"word"|"mixed";
export type MathAiLevel="primary"|"basic"|"advanced";
export type MathAiResult={title:string;items:string[];answers:string[];detected:string};

const rnd=(a:number,b:number)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=<T,>(x:T[])=>x[rnd(0,x.length-1)];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
const fmt=(n:number)=>Number.isInteger(n)?String(n):String(Math.round(n*100)/100).replace(".",",");
const signed=(n:number)=>n>=0?`+ ${n}`:`− ${Math.abs(n)}`;

function detect(topic:string,mode:MathAiMode):MathAiMode{
 if(mode!=="auto")return mode;
 const t=topic.toLowerCase();
 if(/геометр|треуг|круг|окруж|прямоуг|квадрат|площад|периметр|угол|теорем.*пифагор/.test(t))return"geometry";
 if(/квадратн|дискриминант|уравнен|систем/.test(t))return"equations";
 if(/дроб|числител|знаменател/.test(t))return"fractions";
 if(/процент|скид|нацен/.test(t))return"percent";
 if(/функц|график|парабол|координат/.test(t))return"functions";
 if(/задач|скорост|время|расстоя|работ|движен/.test(t))return"word";
 if(/пример|вычисл|арифмет/.test(t))return"arithmetic";
 return"mixed";
}

function cubic(){
 const roots=[rnd(-6,6),rnd(-6,6),rnd(-6,6)];
 const [r1,r2,r3]=roots;
 const b=-(r1+r2+r3),c=r1*r2+r1*r3+r2*r3,d=-(r1*r2*r3);
 const term=(coef:number,power:string)=>{
  if(coef===0)return"";
  const sign=coef>0?"+":"−",abs=Math.abs(coef),body=`${abs===1&&power?"":abs}${power}`;
  return` ${sign} ${body}`;
 };
 const q=`x³${term(b,"x²")}${term(c,"x")}${term(d,"")} = 0`;
 return{q,a:`x₁ = ${r1}, x₂ = ${r2}, x₃ = ${r3}`};
}
function system2(){
 const x=rnd(-8,10),y=rnd(-8,10),a=rnd(1,6),b=rnd(1,6),c=rnd(1,6),d=rnd(1,6);
 return{q:`Решите систему: ${a}x + ${b}y = ${a*x+b*y}; ${c}x ${d>=0?"+":"−"} ${Math.abs(d)}y = ${c*x+d*y}`,a:`x = ${x}, y = ${y}`};
}

function quadratic(){
 const r1=rnd(-9,9),r2=rnd(-9,9),b=-(r1+r2),c=r1*r2;
 return {q:`x² ${signed(b)}x ${signed(c)} = 0`.replace("+ -","− "),a:`x₁ = ${r1}, x₂ = ${r2}`};
}
function linear(level:MathAiLevel){
 const x=rnd(level==="advanced"?-12:1,20),a=rnd(2,9),b=rnd(-18,20),c=a*x+b;
 return {q:`${a}x ${signed(b)} = ${c}`,a:`x = ${x}`};
}
function arithmetic(level:MathAiLevel){
 const a=rnd(12,120),b=rnd(2,40);
 if(level==="primary"){const op=pick(["+","−","×"]);if(op==="+")return{q:`${a} + ${b} =`,a:String(a+b)};if(op==="−")return{q:`${a} − ${b} =`,a:String(a-b)};const x=rnd(2,12),y=rnd(2,12);return{q:`${x} × ${y} =`,a:String(x*y)}}
 const m=rnd(2,12),n=rnd(2,15),c=rnd(2,25);return{q:`${m} · (${n} + ${c}) − ${rnd(2,30)} =`,a:String(m*(n+c)-Number(RegExp.$1||0))};
}
function fraction(){
 const b=pick([3,4,5,6,8,10,12]),a=rnd(1,b-1),d=pick([3,4,5,6,8,10,12]),c=rnd(1,d-1),op=pick(["+","−"]);
 const num=op==="+"?a*d+c*b:a*d-c*b,den=b*d,g=gcd(num,den);
 return{q:`${a}/${b} ${op} ${c}/${d} =`,a:`${num/g}/${den/g}`};
}
function geometry(level:MathAiLevel){
 const kind=pick(level==="advanced"?["pythagoras","circle","triangle","rectangle"]:["rectangle","triangle","circle"]);
 if(kind==="rectangle"){const a=rnd(3,18),b=rnd(3,18);return{q:`Прямоугольник имеет стороны ${a} см и ${b} см. Найдите площадь и периметр.`,a:`S = ${a*b} см²; P = ${2*(a+b)} см`}}
 if(kind==="triangle"){const a=rnd(4,16),h=rnd(3,14);return{q:`Основание треугольника ${a} см, высота к нему ${h} см. Найдите площадь.`,a:`S = ${fmt(a*h/2)} см²`}}
 if(kind==="circle"){const r=rnd(2,12);return{q:`Радиус круга ${r} см. Найдите длину окружности и площадь круга. π ≈ 3,14.`,a:`L ≈ ${fmt(2*3.14*r)} см; S ≈ ${fmt(3.14*r*r)} см²`}}
 const triples=pick([[3,4,5],[5,12,13],[6,8,10],[8,15,17]]);return{q:`Катеты прямоугольного треугольника равны ${triples[0]} см и ${triples[1]} см. Найдите гипотенузу.`,a:`${triples[2]} см`};
}
function percent(){
 const price=rnd(10,200)*10,p=pick([5,10,15,20,25,30,40]);
 return{q:`Товар стоит ${price} руб. Цена ${Math.random()>.5?"уменьшилась":"увеличилась"} на ${p}%. На сколько рублей изменится цена?`,a:`${price*p/100} руб.`};
}
function func(){
 const k=pick([-4,-3,-2,2,3,4]),b=rnd(-8,8),x=rnd(-5,5);
 return{q:`Для функции y = ${k}x ${signed(b)} найдите y при x = ${x}.`,a:`y = ${k*x+b}`};
}
function word(){
 const v=rnd(35,90),t=rnd(2,6);return{q:`Автомобиль ехал ${t} ч со скоростью ${v} км/ч. Какое расстояние он проехал?`,a:`${v*t} км`};
}
export function generateMathAi(mode:MathAiMode,level:MathAiLevel,count:number,topic:string,withAnswers=true):MathAiResult{
 const actual=detect(topic,mode),safe=Math.max(1,Math.min(20,count)),t=topic.toLowerCase();
 const make=()=>{
  if(actual==="equations"){
   if(/кубическ|третьей степени|x\s*[³3]/.test(t))return cubic();
   if(/систем/.test(t))return system2();
   if(/квадратн|дискриминант|второй степени|x\s*[²2]/.test(t))return quadratic();
   return linear(level);
  }
  if(actual==="fractions")return fraction();
  if(actual==="geometry"){
   if(/пифагор|гипотенуз|катет/.test(t)){
    const triples=pick([[3,4,5],[5,12,13],[6,8,10],[8,15,17]]);
    return{q:`Катеты прямоугольного треугольника равны ${triples[0]} см и ${triples[1]} см. Найдите гипотенузу.`,a:`${triples[2]} см`};
   }
   if(/окруж|круг|радиус|диаметр/.test(t)){
    const r=rnd(2,12);return{q:`Радиус круга ${r} см. Найдите длину окружности и площадь круга. π ≈ 3,14.`,a:`L ≈ ${fmt(2*3.14*r)} см; S ≈ ${fmt(3.14*r*r)} см²`};
   }
   if(/треуг/.test(t)){const a=rnd(4,16),h=rnd(3,14);return{q:`Основание треугольника ${a} см, высота ${h} см. Найдите площадь.`,a:`S = ${fmt(a*h/2)} см²`};}
   return geometry(level);
  }
  if(actual==="percent")return percent();
  if(actual==="functions")return func();
  if(actual==="word")return word();
  if(actual==="arithmetic")return arithmetic(level);
  return pick([()=>linear(level),()=>fraction(),()=>geometry(level),()=>percent(),()=>func(),()=>word(),()=>arithmetic(level)])();
 };
 const rows=Array.from({length:safe},make);
 const names:Record<string,string>={arithmetic:"Примеры",equations:"Уравнения",fractions:"Дроби",geometry:"Геометрия",functions:"Функции",percent:"Проценты",word:"Текстовые задачи",mixed:"Смешанная работа"};
 const promptTitle=topic.trim();
 const title=promptTitle?`${names[actual]} · по запросу`:(names[actual]||"Задания");
 return{title,items:rows.map(x=>x.q),answers:withAnswers?rows.map(x=>x.a):[],detected:names[actual]};
}
