/* ============================================================
   CiteLab UI HELPERS — shared presentational components (DOM, no app state).
   Loaded after engine.js + curriculum, before app.js.
   ============================================================ */
"use strict";
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const orderAttempts={};
const REFLECT_STOP=new Set("the,a,an,and,or,of,to,in,on,for,with,is,are,was,were,be,as,at,by,it,this,that,these,those,i,you,we,they,my,our,your,his,her,its,their,not,no,so,if,then,than,too,very,can,will,would,should,could,from,into,about,after,before,when,where,which,who,what,how,why,do,does,did,have,has,had,each,other,more,most,such,only,also,just,into,onto,than,that,will".split(","));
const EVKEY_GUESS=[["author","researcher","author"],["author","creator","author"],["author","channel","author"],["date","publish","date"],["date","year","date"],["date","release","date"],["title","article","title"],["title","book","title"],["title","page","title"],["title","paper","title"],["title","chapter","title"],["title","claim","title"],["title","work","title"],["journal","journal","journal"],["journal","site","journal"],["journal","publisher","journal"],["journal","container","journal"],["journal","platform","journal"],["journal","distributor","journal"],["volume","volume","volume"],["volume","issue","volume"],["pages","page","pages"],["doi","doi","doi"],["doi","url","doi"],["doi","identifier","doi"],["doi","link","doi"]];
const REFLECT_TERMS={author:["surname","initials","author","invert","order","comma","ampersand","et al","etal"],date:["year","date","parentheses","n.d.","month","day","time"],title:["sentence","capital","proper","noun","colon","title","lowercase","case"],journal:["journal","italic","container","venue","title case","source"],volume:["volume","issue","page","dash","number"],pages:["page","dash","range","number"],doi:["doi","link","hyperlink","identifier","url","resolve"],url:["url","link","retriev","site","address"],publisher:["publisher","book","edition","press"],editors:["editor","chapter","edited"],intext:["parenth","narrative","citation","cite","claim","sentence","et al"],order:["order","first","alphabet","sort","sequence","structure"],nodate:["date","n.d.","missing","honest"],org:["organization","group","company","agency","ministry","spell","abbreviat"],classify:["source","evidence","claim","primary","secondary","relevant","evaluate","attribution","trace","pointer"]};
function validateReflection(L,text){
  const v=String(text||"").trim();
  if(v.length<24) return {ok:false,msg:"Your reflection needs a little more detail. What rule will you remember next time?"};
  const toks=v.toLowerCase().replace(/[^a-z0-9.\s]/g," ").split(/\s+/).filter(w=>w.length>=4&&!REFLECT_STOP.has(w));
  if(new Set(toks).size<3) return {ok:false,msg:"Your reflection needs a little more detail. What rule will you remember next time? Use your own words."};
  const pool=new Set(["rule","apa","reference","citation","citing","format","because","reason"]);
  (L.skills||[]).forEach(s=>{(REFLECT_TERMS[s]||[]).forEach(t=>pool.add(t));});
  if(L.rule&&REFLECT_TERMS[L.rule]) REFLECT_TERMS[L.rule].forEach(t=>pool.add(t));
  const low=v.toLowerCase();
  const hit=[...pool].some(t=>low.includes(t));
  if(!hit) return {ok:false,msg:"Almost — name the idea itself. What rule will you remember next time? (e.g. "+[...pool].slice(0,4).join(", ")+")"};
  return {ok:true};
}
function mcq(container,opts,onDone,opts2={}){
  container.innerHTML="";
  opts.forEach((o,i)=>{
    const b=document.createElement("button"); b.className="opt-btn";
    b.innerHTML=`<strong class="mono">${String.fromCharCode(65+i)}.</strong><span>${esc(o)}</span>`;
    b.addEventListener("click",()=>{
      $$(".opt-btn",container).forEach(x=>{ x.disabled=true; });
      b.classList.add("picked");
      onDone(i,b);
    });
    container.appendChild(b);
  });
}
function markMcq(container,idx,ok){
  const btns=$$(".opt-btn",container);
  if(btns[idx]) btns[idx].classList.add(ok?"right":"wrong");
}
function evKeyFor(label,explicit){
  if(explicit) return explicit;
  const l=String(label||"").toLowerCase();
  for(const [k,sub] of EVKEY_GUESS.map(([a,b])=>[a,b])){ if(l.includes(sub)) return k; }
  return null;
}
function evidenceTray(el,rows){
  el.innerHTML=rows.map(r=>{ const [k,v,x]=r; const key=evKeyFor(k,x);
    return `<div class="ev-row${key?" can-trace":""}"${key?` data-evkey="${key}" tabindex="0" role="button" aria-label="Evidence ${esc(k)} — activate to trace its rule"`:""}><span class="ek">${esc(k)}</span><span class="ev2">${esc(v)}</span><span class="etag">EVIDENCE</span></div>`; }).join("");
}
function decidedHTML(yours,theirs,why,ok){
  return `<strong>Your decision:</strong> ${esc(yours)} ${ok?"✓ matches APA.":"— differs from APA."}<br><strong>APA's decision:</strong> ${esc(theirs)}<br><strong>Why:</strong> ${esc(why)}`;
}
function ruleCardHTML(key){
  const r=RULES[key]; if(!r) return `<p class="micro">No rule mapped.</p>`;
  return `<p class="eyebrow">APA rule · ${esc(r.label)}</p><p class="micro">${esc(r.rule)}</p>
  <div class="rule-block"><strong>Why</strong><br><span class="micro">${esc(r.why)}</span></div>
  <div class="rule-block red"><strong>✕ Frequent fault</strong><br><code>${esc(r.mistake)}</code></div>
  <div class="rule-block green"><strong>✓ Canonical form</strong><br><code>${esc(r.correct)}</code></div>
  <div class="btn-row"><button class="btn small" data-pinrule="${esc(key)}">Pin to notebook</button></div>`;
}
function orderFeedback(taskId,wantLabels,gotLabels){
  orderAttempts[taskId]=(orderAttempts[taskId]||0)+1;
  const n=orderAttempts[taskId];
  let idx=0; while(idx<gotLabels.length&&idx<wantLabels.length&&gotLabels[idx]===wantLabels[idx]) idx++;
  const exp=wantLabels[idx]||"the end of the line";
  if(n===1) return "One component is misplaced. Compare your line against the evidence, position by position.";
  if(n===2) return "Look at the relationship between the first two placed components — responsibility comes before time.";
  if(n===3) return "Trace the rule: examine position "+(idx+1)+" ("+exp+").";
  return "Guided repair: position "+(idx+1)+" ("+exp+") needs examination. Rebuild from there — the region is named, the answer is not.";
}
function orderReset(taskId){ orderAttempts[taskId]=0; }
function titleReviewHTML(raw){
  const flags=flagTitleWords(raw||"");
  if(!flags.length) return "";
  return `<div class="rule-block amber review-flag"><strong>Capitalization review — your judgment required</strong><br><span class="micro">APA uses sentence case, but proper nouns keep their capitals. These words kept theirs — confirm each against the source before saving: <strong>${flags.map(f=>esc(f)).join(", ")}</strong>.</span><br><span class="micro">Honest limit: words you already lowercased cannot be rescued — check the original.</span></div>`;
}
function renderTrace(el,key,raw,out){
  const r=RULES[key];
  if(!r){ el.innerHTML=`<p class="micro">No rule mapped for <span class="mono">${esc(key)}</span>.</p>`; return; }
  const L=r.trace||["Source data","Rule","Decision","Output"];
  const steps=[["SOURCE DATA",raw],["APA RULE",L[1]],["FORMATTING DECISION",L[2]],["FINAL OUTPUT",out]];
  el.innerHTML=`<p class="eyebrow">Trace the rule · ${esc(r.label)}</p>
  <div class="trace-vert" role="list" aria-label="Rule trace from source data to output">${steps.map((s,i)=>`<div class="tstep${i===3?" out":""}" role="listitem"><span class="tdot" aria-hidden="true">${i+1}</span><div class="tbody"><div class="tk">${esc(s[0])}</div><div class="tv${i===3?" morph":""}">${esc(s[1])}</div></div></div>`).join("")}</div>
  <div class="rule-block red"><strong>✕ Frequent fault</strong><br><code>${esc(r.mistake)}</code></div>
  <div class="rule-block green"><strong>✓ Canonical form</strong><br><code>${esc(r.correct)}</code></div>
  <div class="btn-row"><button class="btn small" data-pinrule="${esc(key)}">Pin to notebook</button><button class="btn small ghost" data-nav="learn">Study the investigation</button></div>`;
}
function dnaSegEl(sg, o){
  const sp=document.createElement("span");
  sp.className="dna-seg"+(o.status?" "+o.status:"")+(o.selected?" selected":"");
  sp.dataset.key=sg.key; sp.tabIndex=0; sp.setAttribute("role","button");
  const label=RULES[sg.key]?.label||sg.key;
  sp.setAttribute("aria-label",label+": "+sg.text.trim()+" — activate to trace");
  sp.title=label+" — trace this component";
  sp.textContent=sg.text;
  if(sg.italic) sp.style.fontStyle="italic";
  const pick=()=>{ o.onPick(sg.key); };
  sp.addEventListener("click",pick);
  sp.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pick(); }});
  return sp;
}
function dnaNodeEl(key, o){
  const b=document.createElement("button");
  b.className="dna-node"+(o.active?" active":"")+(o.status==="err"?" has-err":o.status==="warn"?" has-warn":"")+(o.extra||"");
  const sym=o.status==="err"?" ✕":o.status==="warn"?" △":o.status==="ok"?" ✓":"";
  b.textContent=(o.prefix||"")+(RULES[key]?.label||key.toUpperCase())+sym;
  b.setAttribute("aria-label",(o.ariaPrefix||"Trace ")+(RULES[key]?.label||key));
  b.addEventListener("click",()=>o.onPick(key));
  return b;
}
