/* ============================================================
   CiteLab 2.0 — investigation-loop UI over the preserved engine.
   OBSERVE → IDENTIFY → PREDICT → BUILD → INSPECT → EXPLAIN →
   CORRECT → RETRY WITHOUT HELP → TRANSFER.
   ============================================================ */
"use strict";
/* Shared presentational helpers (esc, mcq, DNA painters, feedback) live in ui.js, loaded before this file. */

/* ---------------- STATE ---------------- */
const LS_KEY = "citelab_v1";
const DEFAULT_STATE = () => ({
  skills:Object.assign({}, DEFAULT_SKILLS),
  seen:{}, errLog:{}, ev:{},
  activity:[{t:"Entered the citation laboratory",k:"b",ts:Date.now()}],
  refs:[], notes:[{title:"Multiple authors",body:"3+ authors → first surname + et al. in-text, but the reference keeps up to 20."}],
  streak:0, lastDay:"", sessionNo:1,
  detective:{}, detectiveDone:{}, detectiveSolved:0,
  lprog:{},
  challengeIdx:0, chSolved:{},
  lessonsDone:{}, blindDone:0, transferDone:0, classOk:0, repairCount:0, buildCount:0,
  missions:{}, missionsDone:0, researcher:{},
  weak:"intextM", name:undefined, onboarded:0, hintsUsed:0,
  stemTracks:{}, stemDone:0, review:{}, lastWarmupDay:"", videosWatched:{},
  ui:{railCollapsed:false, inspectorHidden:false, theme:"auto"},
});
let S;
{
  const d=DEFAULT_STATE(); S=d;
  try{
    const raw=JSON.parse(localStorage.getItem(LS_KEY)||"{}")||{};
    for(const k of Object.keys(d.skills)){ const v=Number(raw.skills && raw.skills[k]); S.skills[k]=Number.isFinite(v)?Math.max(0,Math.min(100,v)):d.skills[k]; }
    const pick=(v,fb)=>v!==undefined?v:fb;
    S.seen=(raw.seen&&typeof raw.seen==="object")?raw.seen:{};
    S.errLog=(raw.errLog&&typeof raw.errLog==="object")?raw.errLog:{};
    S.ev=(raw.ev&&typeof raw.ev==="object")?raw.ev:{};
    S.activity=Array.isArray(raw.activity)?raw.activity.filter(a=>a&&typeof a.t==="string").slice(0,14):d.activity;
    S.refs=Array.isArray(raw.refs)?raw.refs.filter(r=>r&&typeof r.text==="string").slice(0,200):[];
    S.notes=Array.isArray(raw.notes)?raw.notes.filter(n=>n&&typeof n.title==="string").slice(0,100):d.notes;
    S.streak=Number.isFinite(Number(raw.streak))?Number(raw.streak):0;
    S.lastDay=typeof raw.lastDay==="string"?raw.lastDay:"";
    S.sessionNo=Number.isInteger(raw.sessionNo)?raw.sessionNo:1;
    S.detective=(raw.detective&&typeof raw.detective==="object")?raw.detective:{};
    S.detectiveDone=(raw.detectiveDone&&typeof raw.detectiveDone==="object")?raw.detectiveDone:{};
    S.detectiveSolved=Object.keys(S.detectiveDone).length;
    S.lprog=(raw.lprog&&typeof raw.lprog==="object")?raw.lprog:{};
    S.challengeIdx=Number.isInteger(raw.challengeIdx)?Math.max(0,raw.challengeIdx):0;
    S.chSolved=(raw.chSolved&&typeof raw.chSolved==="object")?raw.chSolved:{};
    S.lessonsDone=(raw.lessonsDone&&typeof raw.lessonsDone==="object")?raw.lessonsDone:{};
    S.blindDone=Number(raw.blindDone)||0; S.transferDone=Number(raw.transferDone)||0; S.classOk=Number(raw.classOk)||0;
    S.repairCount=Number(raw.repairCount)||0; S.buildCount=Number(raw.buildCount)||0;
    S.missions=(raw.missions&&typeof raw.missions==="object")?raw.missions:{};
    S.researcher=(raw.researcher&&typeof raw.researcher==="object")?raw.researcher:{};
    S.missionsDone=Object.values(S.missions).filter(m=>m&&m.done).length;
    S.weak=typeof raw.weak==="string"&&d.skills[raw.weak]!==undefined?raw.weak:"intextM";
    S.name=typeof raw.name==="string"?raw.name.slice(0,60):undefined;
    S.onboarded=raw.onboarded?1:0; S.hintsUsed=Number(raw.hintsUsed)||0;
    S.stemTracks=(raw.stemTracks&&typeof raw.stemTracks==="object")?raw.stemTracks:{};
    S.stemDone=Object.keys(S.stemTracks).length;
    S.review=(raw.review&&typeof raw.review==="object")?raw.review:{};
    S.lastWarmupDay=typeof raw.lastWarmupDay==="string"?raw.lastWarmupDay:"";
    S.videosWatched=(raw.videosWatched&&typeof raw.videosWatched==="object")?raw.videosWatched:{};
    S.ui=(raw.ui&&typeof raw.ui==="object")?{railCollapsed:raw.ui.railCollapsed===true,inspectorHidden:raw.ui.inspectorHidden===true,theme:pick(raw.ui.theme,"auto")}:{railCollapsed:false,inspectorHidden:false,theme:"auto"};
  }catch(e){ S=DEFAULT_STATE(); }
}
function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){} }
function logActivity(t,k="b"){ S.activity.unshift({t,k,ts:Date.now()}); S.activity=S.activity.slice(0,14); save(); renderActivity(); }
function addSkill(k,pts,ok,ctx,kind){
  if(!(k in S.skills)) return;
  S.seen[k]=1;
  S.skills[k]=Math.max(0,Math.min(100,S.skills[k]+pts));
  if(ok){ S.ev[k]=S.ev[k]||{n:0,ctx:[],kinds:{}}; S.ev[k].n++; if(ctx&&S.ev[k].ctx.length<8&&!S.ev[k].ctx.includes(ctx)) S.ev[k].ctx.push(ctx);
    const kk=kind||"guided"; S.ev[k].kinds[kk]=(S.ev[k].kinds[kk]||0)+1; recordReview(k,true); }
  updateWeak(); save(); refreshMasteryEchoes();
}
/* Spaced review: new skills return soon, successes push farther out,
   mistakes pull the next review near. Mastered skills resurface via
   transfer-flavored drills — never by repeating the same question. */
function recordReview(k,ok){
  if(!(k in (S.skills||{}))) return;
  S.review=S.review||{};
  const r=S.review[k]=S.review[k]||{streak:0,due:0,n:0};
  const day=864e5;
  if(ok){ r.streak++; r.n++; const gaps=[1,3,7,14,30]; r.due=Date.now()+gaps[Math.min(r.streak,gaps.length)-1]*day; }
  else { r.streak=0; r.due=Date.now()+4*36e5; }
  save();
}
function reviewDue(k){
  const r=S.review&&S.review[k];
  if(!r||!r.due) return null;
  return r.due;
}
function reviewLabel(k){
  const d=reviewDue(k);
  if(!d) return "Not scheduled";
  const diff=d-Date.now();
  if(diff<=0) return "Due now";
  if(diff<864e5) return "Due today";
  const days=Math.round(diff/864e5);
  return "Due in "+days+" day"+(days===1?"":"s");
}
function logErr(k){ if(!(k in S.skills)) return; S.seen[k]=1; S.errLog[k]=S.errLog[k]||{n:0,ts:0}; S.errLog[k].n++; S.errLog[k].ts=Date.now(); recordReview(k,false); updateWeak(); save(); }
function updateWeak(){ let w="intextM",v=101; for(const k in S.skills){ if(S.skills[k]<v){v=S.skills[k];w=k;} } S.weak=w; }
function skillState(k){
  const v=S.skills[k]||0;
  if(!S.seen[k]) return {c:"n",t:"Not introduced"};
  if(S.errLog[k]&&S.errLog[k].n>=2&&v<60) return {c:"r",t:"Revisit"};
  // Mastered demands repeated success across contexts, including independent or transfer evidence.
  const ev=S.ev[k];
  const ctxN=ev&&ev.ctx?ev.ctx.length:0;
  const kinds=ev&&ev.kinds?ev.kinds:{};
  const deep=(kinds.independent||0)+(kinds.transfer||0)>0;
  const eligible=v>=60&&ctxN>=2&&deep;
  const errs=S.errLog[k]?S.errLog[k].n:0;
  if(errs>=2&&!eligible) return {c:"r",t:"Revisit"};
  if(eligible&&errs>=4) return {c:"r",t:"Revisit"};
  if(eligible) return {c:"m",t:"Mastered"};
  return {c:"d",t:"Developing"};
}
function symbolFor(st){ return st==="m"?"✓":st==="d"?"△":st==="r"?"!":"—"; }

/* ---------------- toast / modal ---------------- */
let toastT=null;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2600); }
function openModal(kicker,title,html){ $("#modalKicker").textContent=kicker; $("#modalTitle").textContent=title; $("#modalBody").innerHTML=html; $("#modalBack").classList.add("open"); $("#modalClose").focus(); }
$("#modalClose").addEventListener("click",()=>$("#modalBack").classList.remove("open"));
$("#modalBack").addEventListener("click",e=>{ if(e.target.id==="modalBack") e.target.classList.remove("open"); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ $("#modalBack").classList.remove("open"); $("#onboardBack").classList.remove("open"); closeVideoTheater(); } });

/* ---------------- nav ---------------- */
const CRUMBS={home:"CITELAB / LAB CONSOLE",learn:"01 / LEARN · INVESTIGATIONS",practice:"02 / TRAIN · TRAINING FLOOR",builder:"03 / BUILD · WORKBENCH",inspector:"04 / INSPECT · FORENSICS",desk:"05 / RESEARCH · MISSIONS & ARCHIVE",progress:"06 / MASTERY · WHAT YOU KNOW"};
const VIEW_ORDER=["home","learn","practice","builder","inspector","desk","progress"];
function go(view){
  $$(".view").forEach(v=>v.classList.remove("active"));
  const el=$("#view-"+view); if(el) el.classList.add("active");
  $$("[data-nav]").forEach(b=>{ if(b.classList.contains("rail-item")) b.classList.toggle("active", b.dataset.nav===view); });
  $$(".bottomnav button").forEach(b=>b.classList.toggle("active",b.dataset.nav===view));
  $$("#evidenceThread [data-nav]").forEach(b=>{ const on=b.dataset.nav===view; b.classList.toggle("active",on); if(on) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current"); });
  $("#crumb").textContent=CRUMBS[view]||"CITELAB";
  bindViewInspector(view);
  try{ window.scrollTo({top:0,behavior:document.documentElement.style.scrollBehavior==="auto"?"auto":"smooth"}); }catch(e){ window.scrollTo(0,0); }
  if(view==="progress") renderMastery();
  if(view==="desk") renderDesk();
  if(view==="home") renderConsole();
  updateRailDots();
}
function updateRailDots(){
  const frac={
    home:1,
    learn:Object.keys(S.lessonsDone).length/ALL_LESSONS.length,
    practice:Object.keys(S.chSolved).length/CHALLENGES.length,
    builder:Math.min(1,(S.refs.length||0)/3),
    inspector:Math.min(1,(Object.keys(S.detectiveDone).length+(S.repairCount||0))/4),
    desk:Math.min(1,S.missionsDone/STEM.length),
    progress:Object.keys(S.skills).filter(k=>skillState(k).c==="m").length/Object.keys(S.skills).length,
  };
  $$(".rdot").forEach(d=>{ const f=frac[d.dataset.dot]||0; d.className="rdot"+(f>=0.99?" full":f>0.02?" half":""); });
}
document.addEventListener("click",e=>{
  const n=e.target.closest("[data-nav]"); if(n){ go(n.dataset.nav); return; }
  const p=e.target.closest("[data-pinrule]"); if(p){ pinRule(p.dataset.pinrule); return; }
  const u=e.target.closest("[data-unit]"); if(u){ e.preventDefault(); selMod=u.dataset.unit; lessonIdx=-1; if($("#view-learn").classList.contains("active")) renderLesson(); else { go("learn"); renderLesson(); } window.scrollTo({top:0}); return; }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape") return;
  if(e.target.matches("input,textarea,select")) return;
  if(e.key==="/"){ e.preventDefault(); go("learn"); setTimeout(()=>{ const f=$("#trickFilter"); if(f) f.focus(); },120); return; }
  const map={"1":"learn","2":"practice","3":"builder","4":"inspector","5":"desk","6":"progress","0":"home"};
  if(map[e.key]) go(map[e.key]);
   if(e.key==="["){ setRailCollapsed(!(S.ui&&S.ui.railCollapsed)); return; }
   if(e.key==="t"||e.key==="T"){ if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; setTheme(resolvedTheme()==="night"?"paper":"night"); return; }
  if(e.key==="]"){ setInspectorHidden(!(S.ui&&S.ui.inspectorHidden)); return; }
});

/* ---------------- shared renderers ---------------- */
/* Shared DNA painters live in ui.js: dnaSegEl/dnaNodeEl compose one structural
   model for every citation surface. paintAnatomy and renderBuildPreview use them. */
const ANA={key:null,reg:{}};
function renderAnatomy(cite,map,ref,o={}){ ANA.reg[map]={cite,ref,o}; paintAnatomy(map); }
function paintAnatomy(map){
  const R=ANA.reg[map]; if(!R) return;
  const c=$(R.cite), sc=$(map); if(!c) return;
  c.innerHTML="";
  const status=R.o.status||{};
  R.ref.segs.forEach(sg=>{
    c.appendChild(dnaSegEl(sg,{status:status[sg.key],selected:ANA.key===sg.key,onPick:(key)=>{ ANA.key=key; paintAnatomy(map); if(R.o.onPick) R.o.onPick(key); }}));
  });
  if(sc){
    sc.innerHTML="";
    const seen=[...new Set(R.ref.segs.map(s=>s.key))];
    seen.sort((a,b)=>DNA_ORDER.indexOf(a)-DNA_ORDER.indexOf(b));
    seen.forEach(k=>{
      sc.appendChild(dnaNodeEl(k,{status:status[k],active:ANA.key===k,onPick:(key)=>{ ANA.key=key; paintAnatomy(map); if(R.o.onPick) R.o.onPick(key); }}));
    });
  }
}
/* Lightweight reasoning follow-up on key explanations: after the answer,
   ask what decided it. Diagnostic, never punitive. */
const WHY_POOL=["author","date","title","journal","doi","order"];
function explainWhyAsk(L){
  const box=$("#explainWhy"); if(!box||box.dataset.done) return;
  const correct=L.explain.rule&&RULES[L.explain.rule]?L.explain.rule:"ordering";
  const correctLabel=RULES[correct]?.label||correct;
  const distract=WHY_POOL.filter(k=>k!==correct).slice(0,2).map(k=>RULES[k]?.label||k);
  const order=[correctLabel,...distract,"Not sure"].sort(()=>Math.random()-.5);
  const ci=order.indexOf(correctLabel);
  box.innerHTML=`<p class="eyebrow" style="margin-top:6px">What decided it?</p><div id="whyOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="whyMsg" role="status"></p>`;
  mcq($("#whyOpts"),order,(j)=>{
    markMcq($("#whyOpts"),ci,true); if(j!==ci) markMcq($("#whyOpts"),j,false);
    const pick=order[j];
    if(pick===correctLabel) $("#whyMsg").textContent="✓ Reasoning confirmed — you can name the deciding rule, not just the answer.";
    else if(pick==="Not sure") $("#whyMsg").textContent="Honest. The deciding rule is "+correctLabel+": "+(RULES[correct]?.rule||"");
    else $("#whyMsg").textContent="△ Reasonable guess, but the evidence points at "+correctLabel+". Re-trace it above.";
    box.dataset.done="1"; markStageDone(L,"explain");
  });
}
  /* ---------------- console (home) ---------------- */
const HOME_REF=buildReference({sourceType:"journal",authors:"Jane Smith",year:"2025",title:"Climate change and crop systems",journal:"Journal of Environmental Science",volume:"14",issue:"2",pages:"31–44",doi:"https://doi.org/10.5555/citelab-demo"});
function homeRawFor(key){
  const m={author:"Jane Smith",date:"2025",title:"Climate change and crop systems",journal:"Journal of Environmental Science",volume:"14",issue:"2",pages:"31–44",doi:"doi:10.5555/citelab-demo"};
  return m[key]||"—";
}
function pinRule(key){ const r=RULES[key]; if(!r) return; S.notes.unshift({title:r.label+" — APA rule",body:r.rule+" Why: "+r.why}); save(); toast("Pinned "+r.label+" to the research notebook."); logActivity("Pinned rule: "+r.label); }
function renderConsole(){
  renderAnatomy("#homeDNA","#homeScale",HOME_REF,{onPick:(key)=>{
    const seg=(HOME_REF.segs.find(s=>s.key===key)?.text||"").trim();
    renderTrace($("#homeDnaExplain"),key,homeRawFor(key),seg);
  }});
  // investigation: strengths + uncertainties
  const mastered=Object.keys(S.skills).filter(k=>skillState(k).c==="m").slice(0,3);
  const uncertain=Object.keys(S.skills).filter(k=>["r","d"].includes(skillState(k).c)).sort((a,b)=>(S.errLog[b]?.n||0)-(S.errLog[a]?.n||0)).slice(0,3);
  $("#weakStrong").innerHTML=mastered.length?mastered.map(k=>`✓ ${esc(SKILL_LABELS[k])}`).join("<br>"):"✓ — complete an investigation to establish strengths";
  $("#weakUncertain").innerHTML=uncertain.length?uncertain.map(k=>`${skillState(k).c==="r"?"!":"△"} ${esc(SKILL_LABELS[k])}${S.errLog[k]?` — missed ${S.errLog[k].n}×`:""}`).join("<br>"):"△ — no uncertainty recorded yet";
  const w=SKILL_LABELS[S.weak]||"APA structure";
  $("#weakTitle").textContent=w;
  $("#homeSession").textContent=String(S.sessionNo).padStart(2,"0");
  const att=Object.keys(S.skills).filter(k=>S.seen[k]).length;
  $("#homeAcc").textContent=att?`${mastered.length} mastered · ${uncertain.length} developing`:"accuracy forming…";
  renderDaily();
}
function renderActivity(){
  const ul=$("#activityList"); if(!ul) return;
  let lastDay="";
  ul.innerHTML=S.activity.length?S.activity.map(a=>{
    const d=new Date(a.ts); const day=d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
    const head=day!==lastDay?`<li><span class="t-when">${esc(day)}</span></li>`:""; lastDay=day;
    return head+`<li><span class="t-dot ${a.k==="g"?"g":a.k==="a"?"a":a.k==="r"?"r":""}"></span><span>${esc(a.t)}<br><span class="micro">${d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</span></span></li>`;
  }).join(""):`<li><span class="micro">The notebook is blank. Every investigation writes its first line here.</span></li>`;
  const pt=$("#progressTimeline"); if(pt) pt.innerHTML=ul.innerHTML;
}
$("#btnClearActivity")?.addEventListener("click",()=>{ S.activity=[]; save(); renderActivity(); });

/* ---- daily specimen (progressive hints) ---- */
let dailyLeft=60, dailyTick=null, dailyHintsShown=0;
function renderDaily(){
  clearInterval(dailyTick); dailyLeft=60; dailyHintsShown=0;
  $("#dailyTimer").textContent="60s";
  const idx=new Date().getDate()%DAILY_SPEC.length; const d=DAILY_SPEC[idx];
  const spec=$("#dailySpec"); spec.innerHTML="";
  d.frag.forEach(seg=>{
    const sp=document.createElement("span"); sp.className="susp"; sp.textContent=seg.t; sp.tabIndex=0;
    sp.setAttribute("role","button"); sp.setAttribute("aria-label","Investigate: "+seg.t);
    const probe=()=>{
      if(seg.bad){
        sp.classList.add("found-err");
        $("#dailyMsg").innerHTML=`✓ Traced. The fault is <strong>${esc(RULES[d.rule].label)}</strong> → <code>${esc(seg.fix)}</code>. +8 ${esc(SKILL_LABELS[d.skill])}.`;
        addSkill(d.skill,8,true,"daily","independent"); logActivity("Traced the daily specimen ("+RULES[d.rule].label+")","g");
        $$("#dailySpec .susp").forEach(x=>{ x.style.pointerEvents="none"; });
        $$("#dailyOpts button").forEach(x=>{ x.disabled=true; });
        clearInterval(dailyTick); renderMasterySafe();
      } else {
        sp.classList.add("found-ok");
        $("#dailyMsg").textContent="Not yet — that part is structurally sound. Inspect a marked component, or take a hint.";
      }
    };
    sp.addEventListener("click",probe);
    sp.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); probe(); }});
    spec.appendChild(sp);
  });
  $("#dailyQ").textContent=d.q;
  $("#dailyHints").innerHTML=""; $("#dailyMsg").textContent="";
  const box=$("#dailyOpts"); box.innerHTML="";
  ["Hint 1 — direction","Hint 2 — rule","Hint 3 — example"].forEach((h,i)=>{
    const b=document.createElement("button"); b.className="btn small ghost"; b.textContent=h;
    if(i>0) b.disabled=true;
    b.addEventListener("click",()=>{
      if(dailyHintsShown!==i) return;
      $("#dailyHints").innerHTML+=`<div class="rule-block amber" style="margin:6px 0"><strong>Hint ${i+1}</strong><br><span class="micro">${esc(d.hints[i])}</span></div>`;
      dailyHintsShown=i+1; S.hintsUsed++; save();
      b.disabled=true;
      const next=$("#dailyOpts").children[i+1]; if(next) next.disabled=false;
    });
    box.appendChild(b);
  });
  dailyTick=setInterval(()=>{ dailyLeft--; const t=$("#dailyTimer"); if(!t) return; t.textContent=Math.max(0,dailyLeft)+"s";
    if(dailyLeft<=0){ clearInterval(dailyTick); if(!$("#dailyMsg").textContent) $("#dailyMsg").textContent="Time. The trace pointed at "+RULES[d.rule].label+" → "+d.frag.find(s=>s.bad).fix; } },1000);
}
$("#btnDailyTop").addEventListener("click",()=>{ go("home"); setTimeout(()=>$("#dailyPanel").scrollIntoView({behavior:"smooth",block:"center"}),80); });

/* ---------------- onboarding ---------------- */
let obStep=0, obScore={};
function maybeOnboard(){ if(!S.onboarded){ obStep=0; obScore={}; renderOnboard(); $("#onboardBack").classList.add("open"); } }
$("#btnOnboardSkip").addEventListener("click",()=>{ S.onboarded=1; save(); $("#onboardBack").classList.remove("open"); toast("Intro skipped — the lab is yours."); });
function renderOnboard(){
  const box=$("#onboardBody"); const item=ONBOARD[obStep];
  if(obStep<2){
    box.innerHTML=`<p class="micro"><strong>Step ${obStep+1} of 4.</strong> ${esc(item.q)} Select directly on the specimen.</p>
    <div class="paper-para" id="obCite" style="margin:10px 0"></div><p class="micro" id="obMsg" role="status"></p>`;
    const cite=$("#obCite");
    item.cite.forEach(seg=>{
      const sp=document.createElement("span"); sp.className="susp"; sp.textContent=seg.t; sp.tabIndex=0; sp.setAttribute("role","button");
      const go2=()=>{
        if(seg.hit){ sp.classList.add("found-err"); obScore[item.rule]=1; $("#obMsg").textContent="Exactly. You already read citations like a researcher."; setTimeout(()=>{ obStep++; renderOnboard(); },900); }
        else { sp.classList.add("found-ok"); $("#obMsg").textContent="Not that part — look again at the question."; }
      };
      sp.addEventListener("click",go2);
      sp.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go2(); }});
      cite.appendChild(sp);
    });
  } else if(obStep<4){
    box.innerHTML=`<p class="micro"><strong>Step ${obStep+1} of 4.</strong> ${esc(item.q)}</p><div id="obOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:8px"></div><p class="micro" id="obMsg" role="status"></p>`;
    mcq($("#obOpts"),item.opts,(i)=>{
      markMcq($("#obOpts"),item.a,true); if(i!==item.a) markMcq($("#obOpts"),i,false);
      if(i===item.a){ obScore[item.rule]=1; $("#obMsg").textContent="Correct — the pattern holds."; } else { $("#obMsg").textContent="The expected reasoning: "+item.opts[item.a]; }
      setTimeout(()=>{ obStep++; renderOnboard(); },1100);
    });
  } else {
    const got=Object.keys(obScore).length;
    ["author","date","journal","intext"].forEach(k=>{ if(obScore[{author:"author",date:"date",journal:"journal",intext:"intext1"}[k]]) addSkill({author:"author",date:"date",journal:"journal",intext:"intext1"}[k],12); });
    updateWeak();
    box.innerHTML=`<div class="rule-block green"><strong>Diagnostic complete — ${got}/4 traces correct.</strong><br><span class="micro">Recommended starting point: <strong>${esc(SKILL_LABELS[S.weak])}</strong>. The lab will meet you there.</span></div>
    <div class="btn-row"><button class="btn primary" id="obGo">Begin at ${esc(SKILL_LABELS[S.weak])} →</button></div>`;
    $("#obGo").addEventListener("click",()=>{ S.onboarded=1; save(); $("#onboardBack").classList.remove("open"); const id=SKILL_LESSON[S.weak]; const li=ALL_LESSONS.findIndex(l=>l.id===id); if(li>=0){ lessonIdx=li; go("learn"); renderLesson(); } else go("learn"); });
    logActivity("Completed lab induction ("+got+"/4)","g");
  }
}

/* ---------------- LEARN: curriculum ---------------- */
let lessonIdx=0, buildOrder=[], selMod="research";
try{ lessonIdx=0; }catch(e){ lessonIdx=0; }
const KEYNORM=g=>g.map(x=>({author:"author",date:"date",title:"title",journal:"journal",volume:"volume",issue:"volume",pages:"pages",doi:"doi",url:"url",publisher:"publisher",site:"journal"})[x]||x);
const collapse=g=>g.filter((x,i)=>i===0||x!==g[i-1]);
/* Unit landing: written intro + the module's single video + its investigations.
   The video lives here only — lessons stay clean for doing, not watching. */
function renderUnitIntro(){
  const M=MODULES.find(m=>m.id===selMod)||MODULES[0]; selMod=M.id;
  const list=ALL_LESSONS.map((l,i)=>({l,i})).filter(x=>x.l.mod===M.id);
  const doneN=list.filter(x=>S.lessonsDone[x.l.id]).length;
  const modSkills=[...new Set(list.flatMap(x=>x.l.skills||[]))];
  const modTransfers=list.filter(x=>x.l.transfer).length;
  $("#moduleHead").innerHTML=`<p class="eyebrow">Unit ${M.no} · ${esc(M.title)}</p>`;
  $("#lessonTitle").textContent=M.title;
  $("#lessonLevel").textContent="UNIT "+M.no+" · "+doneN+"/"+list.length+" CLOSED";
  $("#lessonStory").textContent=M.sub;
  const transferBit=modTransfers?` · ${modTransfers} transfer challenge${modTransfers===1?"":"s"}`:"";
  $("#lessonObj").innerHTML=`<strong>${list.length} investigations</strong> · ${modSkills.length} skills${transferBit}`;
  const st=$("#lessonStages"); st.innerHTML="";
  st.insertAdjacentHTML("beforeend",`<p class="eyebrow" style="margin-top:14px">Unit intro — read first</p><div class="paper-para" style="font-size:15.5px">${esc(M.intro||"")}</div>`+renderVideoCard(M)+`
  <p class="eyebrow" style="margin-top:16px">Investigations in this unit</p>
  <div id="unitLessons" style="display:flex;flex-direction:column;gap:6px"></div>
  <div class="btn-row"><button class="btn primary" id="btnUnitBegin">Begin first investigation →</button></div>`);
  $("#unitLessons").innerHTML=list.map(({l,i})=>{ const s=S.lessonsDone[l.id]?"✓ CLOSED":(Object.keys(lprog(l.id)).length?"◐ OPEN":"○ NEW");
    return `<button class="lesson-btn" data-unit-lesson="${i}"><div class="l-no">${lessonCaseNo(l)} · ${s}</div><div class="l-t">${esc(l.title)}</div></button>`; }).join("");
  $$("#unitLessons [data-unit-lesson]").forEach(b=>b.addEventListener("click",()=>{ lessonIdx=+b.dataset.unitLesson; renderLesson(); window.scrollTo({top:0}); }));
  const first=list.find(x=>!S.lessonsDone[x.l.id])||list[0];
  $("#btnUnitBegin").addEventListener("click",()=>{ if(first){ lessonIdx=first.i; renderLesson(); window.scrollTo({top:0}); } });
  $("#ruleInspector").innerHTML=`<p class="micro">Unit overview — select an investigation to begin, or watch the intro above.</p>`+ruleCardHTML("order");
  renderLessonIndex(); updateRailDots();
}
function curL(){ return ALL_LESSONS[Math.min(Math.max(0,lessonIdx),ALL_LESSONS.length-1)]; }
function lprog(id){ S.lprog=S.lprog||{}; S.lprog[id]=S.lprog[id]||{}; return S.lprog[id]; }
function guidedKind(L){ return L.build?"build":L.identify?"identify":L.flagwords?"flagwords":L.place?"place":L.orderRefs?"orderRefs":L.judge?"judge":L.concept?"concept":null; }
function guidedKinds(L){ return ["build","identify","flagwords","flagwordsB","place","orderRefs","judge","concept"].filter(k=>L[k]); }
function bumpGuided(L,kind){
  const p=lprog(L.id); const kinds=guidedKinds(L);
  p.gk=p.gk||{}; p.gk[kind]=1; save();
  if(kinds.every(k=>p.gk[k])) markStageDone(L,"guided");
}
function lessonStages(L){
  const s=["context"];
  if(L.evidence) s.push("evidence");
  if(L.notice) s.push("notice");
  if(L.predict) s.push("predict");
  if(L.examples&&L.examples.length) s.push("examples","trace");
  const g=guidedKind(L); if(g) s.push("guided");
  if(L.explain) s.push("explain");
  if(L.blind) s.push("blind");
  if(L.transfer) s.push("transfer");
  s.push("reflect");
  return s;
}
function markStageDone(L,stage){
  const p=lprog(L.id);
  if(!p[stage]){ p[stage]=1; save(); }
  checkLessonDone(L); renderLessonProgress(L); renderLessonIndex(); updateRailDots();
}
function checkLessonDone(L){
  const need=lessonStages(L).filter(s=>s!=="context");
  if(need.length&&need.every(s=>lprog(L.id)[s])){
    if(!S.lessonsDone[L.id]){ S.lessonsDone[L.id]=1; save(); logActivity("Closed investigation: "+L.title,"g"); toast("Investigation closed — demonstrated, not skimmed."); }
  }
}
function modOf(L){ return MODULES.find(m=>m.id===L.mod)||{no:"–",title:"",sub:""}; }
function lessonCaseNo(L){
  const list=ALL_LESSONS.filter(x=>x.mod===L.mod); const i=list.findIndex(x=>x.id===L.id);
  return modOf(L).no+"."+String(i+1).padStart(2,"0");
}
function renderLessonIndex(){
  const counts={}; ALL_LESSONS.forEach(l=>{ counts[l.mod]=counts[l.mod]||{done:0,total:0}; counts[l.mod].total++; if(S.lessonsDone[l.id]) counts[l.mod].done++; });
  $("#lessonIndex").innerHTML=MODULES.map(m=>{
    const c=counts[m.id]||{done:0,total:0};
    const lessons=ALL_LESSONS.map((l,i)=>({l,i})).filter(x=>x.l.mod===m.id);
    return `<div class="mod-group"><button class="mod-head" data-mod="${m.id}"><span><strong>${m.no} · ${esc(m.title)}</strong><br><span class="micro">${esc(m.sub)}</span></span><span class="mono micro">${c.done}/${c.total}</span></button><div class="mod-lessons">${
      lessons.map(({l,i})=>{ const st=S.lessonsDone[l.id]?"done":(Object.keys(lprog(l.id)).length?"started":"");
        return `<button class="lesson-btn ${i===lessonIdx?"active":""}" data-lesson="${i}"><div class="l-no">${lessonCaseNo(l)} · ${st==="done"?"✓ CLOSED":st==="started"?"◐ OPEN":"○ NEW"}</div><div class="l-t">${esc(l.title)}</div></button>`; }).join("")
    }</div>`;
  }).join("");
  $$("#lessonIndex .lesson-btn").forEach(b=>b.addEventListener("click",()=>{ lessonIdx=+b.dataset.lesson; renderLesson(); }));
  $$("#lessonIndex .mod-head").forEach(b=>b.addEventListener("click",()=>{
    selMod=b.dataset.mod; lessonIdx=-1; renderLesson(); window.scrollTo({top:0});
  }));
}
function renderLessonProgress(L){
  const st=lessonStages(L); const done=st.filter(s=>s==="context"||lprog(L.id)[s]).length;
  $("#lessonProgress").innerHTML=`<div class="lprog-bar"><i style="width:${Math.round(100*done/st.length)}%"></i></div><span class="micro mono">${done}/${st.length} stages · ${S.lessonsDone[L.id]?"✓ CLOSED":"OPEN"}</span>`;
}
function fieldRawFor(L,key){
  const ex=(L.examples&&L.examples[0]&&L.examples[0].fields)||{};
  const m={author:ex.authors,date:String(ex.year||""),title:ex.title||ex.chapterTitle,journal:ex.journal||ex.publisher||ex.siteName,volume:String(ex.volume||""),pages:String(ex.pages||""),doi:ex.doi||ex.url,publisher:ex.publisher,editors:ex.editors,url:ex.url||ex.doi};
  return m[key]||"—";
}
function traceLessonSeg(L,ref,key){
  const evRow=(L.evidence||[]).find(e=>(e[2]||"")===key);
  const raw=evRow?evRow[1]:fieldRawFor(L,key);
  renderTrace($("#lessonTrace"),key,raw,(ref.segs.find(s=>s.key===key)?.text||"").trim());
  paintAnatomy("#lessonScale");
  $$("#lessonEvidence .ev-row").forEach(r=>r.classList.toggle("lit",r.dataset.evkey===key));
  if(key==="title"){ const f=titleReviewHTML(raw); if(f) $("#lessonTrace").innerHTML+=f; }
  if(L.evidence) markStageDone(L,"evidence");
  markStageDone(L,"trace");
}
function segmentRawHint(L,key){ return fieldRawFor(L,key); }

function renderLesson(){
  if(lessonIdx<0){ renderUnitIntro(); return; }
  const L=curL(); const M=modOf(L);
  const modLessons=ALL_LESSONS.filter(x=>x.mod===L.mod);
  selMod=L.mod;
  const doneN=modLessons.filter(x=>S.lessonsDone[x.id]).length;
  $("#moduleHead").innerHTML=`<p class="eyebrow">Module ${M.no} \u00b7 ${esc(M.title)} \u00b7 <a href="#" data-unit="${esc(M.id)}" style="color:var(--blue)">\u2190 Unit intro</a></p><p class="micro">${esc(M.sub)} \u00b7 <strong>${doneN}/${modLessons.length} closed</strong></p>`;
  $("#lessonTitle").textContent=L.title;
  $("#lessonLevel").textContent="CASE "+lessonCaseNo(L);
  $("#lessonStory").textContent=L.context;
  $("#lessonObj").innerHTML=`<strong>Objective:</strong> ${esc(L.obj)} · <strong>Rule:</strong> ${esc(RULES[L.rule]?.label||L.rule)}`;
  const st=$("#lessonStages"); st.innerHTML="";
  let n=0;
  const head=(t,sub)=>{ n++; return `<p class="eyebrow" style="margin-top:18px">${n} · ${t}${sub?` — <span style="text-transform:none;letter-spacing:0">${sub}</span>`:""}</p>`; };
  // context is the header itself
  if(L.evidence){
    st.insertAdjacentHTML("beforeend",head("Source evidence","the raw tray")+`<div class="evidence-tray" id="lessonEvidence"></div>`);
    evidenceTray($("#lessonEvidence"),L.evidence);
  }
  if(L.notice){
    st.insertAdjacentHTML("beforeend",head("Notice","look before the rule")+`<div class="predict-box"><h3 class="h3" id="noticeQ"></h3><div id="noticeOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:8px"></div><p class="micro" id="noticeMsg" role="status"></p></div>`);
    $("#noticeQ").textContent=L.notice.q;
    mcq($("#noticeOpts"),L.notice.opts,(i)=>{
      markMcq($("#noticeOpts"),L.notice.a,true); if(i!==L.notice.a) markMcq($("#noticeOpts"),i,false);
      const ok=i===L.notice.a;
      $("#noticeMsg").innerHTML=decidedHTML(L.notice.opts[i],L.notice.opts[L.notice.a],L.notice.why,ok);
      if(ok){ addSkill((L.skills||["ordering"])[0],2,true,"notice","guided"); markStageDone(L,"notice"); }
      else logErr((L.skills||["ordering"])[0]);
    });
  }
  if(L.predict){
    st.insertAdjacentHTML("beforeend",head("Predict","before any rule is shown")+`<div class="predict-box"><h3 class="h3" id="predictQ"></h3><div id="predictOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:8px"></div><p class="micro" id="predictMsg" role="status"></p></div>`);
    $("#predictQ").textContent=L.predict.q;
    mcq($("#predictOpts"),L.predict.opts,(i)=>{
      markMcq($("#predictOpts"),L.predict.a,true); if(i!==L.predict.a) markMcq($("#predictOpts"),i,false);
      const ok=i===L.predict.a;
      $("#predictMsg").innerHTML=decidedHTML(L.predict.opts[i],L.predict.opts[L.predict.a],L.predict.why,ok);
      if(ok){ addSkill((L.skills||["ordering"])[0],2,true,"predict","guided"); if(L.evidence) markStageDone(L,"evidence"); markStageDone(L,"predict"); }
      else logErr((L.skills||["ordering"])[0]);
    });
  }
  if(L.examples&&L.examples.length){
    st.insertAdjacentHTML("beforeend",head("Specimens","worked examples A–"+String.fromCharCode(64+L.examples.length))+`
      <div class="tabs" id="exTabs" role="tablist" aria-label="Examples">${L.examples.map((e,i)=>`<button class="tab${i===0?" active":""}" data-ex="${i}" role="tab">Example ${String.fromCharCode(65+i)}</button>`).join("")}</div>
      <div id="exBody"></div>
      <div class="anatomy" style="margin-top:10px"><div class="ana-cite scanline" id="lessonScan"><div class="citation-text hanging" id="lessonDNA"></div></div><div class="ana-map" id="lessonScale"></div></div>
      <div class="trace" id="lessonTrace"><p class="micro">Trace any component: raw data → rule → decision → output.</p></div>
      <div class="btn-row"><button class="btn small" id="btnLessonInspect">◉ Scan specimen</button><button class="btn small ghost" id="btnLessonPin">Pin rule to notebook</button></div>`);
    const seenEx=new Set([0]);
    const showEx=i=>{
      $$("#exTabs .tab").forEach(t=>t.classList.toggle("active",+t.dataset.ex===i));
      const e=L.examples[i]; const ref=buildReference(e.fields);
      $("#exBody").innerHTML=`<p class="micro"><strong>${esc(e.tag)}.</strong> ${esc(e.note||"")}</p>`;
      renderAnatomy("#lessonDNA","#lessonScale",ref,{onPick:(key)=>traceLessonSeg(L,ref,key)});
      $$("#lessonEvidence .ev-row.can-trace").forEach(row=>{
        const fire=()=>traceLessonSeg(L,ref,row.dataset.evkey);
        row.onclick=fire;
        row.onkeydown=ev=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); fire(); }};
      });
      $("#ruleInspector").innerHTML=`<p class="micro">Case file: <strong>${esc(L.title)}</strong> · example ${String.fromCharCode(65+i)}. Trace any component.</p>`+ruleCardHTML(L.rule);
      seenEx.add(i);
      $$("#exTabs .tab").forEach(t=>{ if(seenEx.has(+t.dataset.ex)&&!t.textContent.includes("✓")) t.textContent+=" ✓"; });
      if(seenEx.size>=L.examples.length) markStageDone(L,"examples");
    };
    $$("#exTabs .tab").forEach(t=>t.addEventListener("click",()=>showEx(+t.dataset.ex)));
    showEx(0);
    $("#btnLessonInspect").addEventListener("click",()=>{ const el=$("#lessonScan"); el.classList.remove("scanning"); void el.offsetWidth; el.classList.add("scanning"); toast("Scanning… select any component to trace its rule."); });
    $("#btnLessonPin").addEventListener("click",()=>{ pinRule(L.rule); });
  } else {
    $("#ruleInspector").innerHTML=`<p class="micro">Case file: <strong>${esc(L.title)}</strong>.</p>`+ruleCardHTML(L.rule);
  }
  // guided tasks (a lesson may carry more than one)
  if(L.build) renderGuidedBuild(L,st,head);
  if(L.identify) renderGuidedIdentify(L,st,head);
  if(L.flagwords) renderGuidedFlagwords(L,st,head);
  if(L.flagwordsB) renderGuidedFlagwordsB(L,st,head);
  if(L.place) renderGuidedPlace(L,st,head);
  if(L.orderRefs) renderGuidedOrder(L,st,head);
  if(L.judge) renderGuidedJudge(L,st,head);
  if(L.concept) renderGuidedConcept(L,st,head);
  if(L.explain){
    st.insertAdjacentHTML("beforeend",head("Explain","your decision")+`<div class="predict-box"><h3 class="h3" id="explainQ"></h3><div id="explainOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:8px"></div><p class="micro" id="explainMsg" role="status"></p><div id="explainWhy" style="margin-top:8px"></div></div>`);
    $("#explainQ").textContent=L.explain.q;
    mcq($("#explainOpts"),L.explain.opts,(i)=>{
      markMcq($("#explainOpts"),L.explain.a,true); if(i!==L.explain.a) markMcq($("#explainOpts"),i,false);
      const ok=i===L.explain.a;
      $("#explainMsg").innerHTML=decidedHTML(L.explain.opts[i],L.explain.opts[L.explain.a],ok?"That reasoning transfers — hold it for the blind build.":"Check the trace above, then reason again.",ok);
      if(ok){ addSkill(L.explain.rule&&L.skills.includes(L.explain.rule)?L.explain.rule:"ordering",4,true,"explain","guided"); explainWhyAsk(L); }
      else logErr(L.explain.rule||"ordering");
    });
  }
  if(L.blind) renderBlindStage(L,st,head);
  if(L.transfer) renderTransferStage(L,st,head);
  // reflection always closes
  st.insertAdjacentHTML("beforeend",head("Field note","reflection")+`<div class="predict-box"><p class="micro">${esc(L.reflect||"State the rule in your own words.")}</p><div class="field"><label for="reflectText">Your note (saved to the research notebook)</label><textarea id="reflectText" placeholder="One or two sentences, in your own words…"></textarea></div><div class="btn-row"><button class="btn small primary" id="btnReflectSave">Save field note</button></div><p class="micro" id="reflectMsg" role="status"></p></div>`);
  /* Reflection validation: length + real tokens + one lesson concept term.
   Gibberish cannot pass; natural phrasing always can. */
$("#btnReflectSave").addEventListener("click",()=>{
    const v=$("#reflectText").value.trim();
    const chk=validateReflection(L,v);
    if(!chk.ok){ $("#reflectMsg").textContent="△ "+chk.msg; return; }
    S.notes.unshift({title:"Field note — "+L.title,body:v}); save();
    $("#reflectMsg").textContent="✓ Noted and filed. The investigation is yours now.";
    addSkill((L.skills||["ordering"])[0],3,true,"reflect","independent");
    markStageDone(L,"reflect");
  });
  if(lprog(L.id).reflect&&S.notes[0]&&S.notes[0].title==="Field note — "+L.title){ $("#reflectText").value=S.notes[0].body; $("#reflectMsg").textContent="✓ Filed previously — revise and save again any time."; }
  renderLessonProgress(L); renderLessonIndex(); updateRailDots();
  // guided ordering state
  buildOrder=[];
}
/* ---- guided: ordering ---- */
function renderGuidedBuild(L,st,head){
  st.insertAdjacentHTML("beforeend",head("Construct","guided ordering")+`<p class="micro">Assemble the research notes into APA order. Tap to place.</p><div class="note-grid" id="buildNotes"></div><div class="drop-zone" id="buildDrop" aria-label="Assembly area"></div><p class="micro" id="buildMsg" role="status"></p><div class="btn-row"><button class="btn small" id="btnBuildReset">Reset assembly</button><button class="btn small primary" id="btnBuildCheck">Build the structure</button></div>`);
  buildOrder=[];
  const shuffled=[...L.build.notes].sort(()=>Math.random()-.5);
  $("#buildNotes").innerHTML=shuffled.map(n=>{ const [txt,k]=n.split("|"); return `<button class="note-chip" data-note="${esc(n)}"><div class="k">${esc(k)}</div><div>${esc(txt)}</div></button>`; }).join("");
  $$("#buildNotes .note-chip").forEach(ch=>ch.addEventListener("click",()=>{ if(!buildOrder.includes(ch.dataset.note)) buildOrder.push(ch.dataset.note); renderBuildDrop(); }));
  renderBuildDrop();
  $("#btnBuildReset").addEventListener("click",()=>{ buildOrder=[]; renderBuildDrop(); $("#buildMsg").textContent=""; });
  $("#btnBuildCheck").addEventListener("click",()=>{
    const got=buildOrder.map(n=>n.split("|")[1].toLowerCase());
    const g=collapse(KEYNORM(got)), w=collapse(KEYNORM(L.build.order));

    if(JSON.stringify(g)===JSON.stringify(w)){
      const doneCount=g.length;
      $("#buildMsg").textContent=doneCount<=1?"✓ Structure locked.":"✓ Structure locked — every component seated. Now explain it below.";
      addSkill("ordering",10,true,"construct","guided"); (L.skills||[]).forEach(s=>{ if(s!=="ordering") addSkill(s,4,true,"construct","guided"); });
      logActivity("Constructed "+L.title+" in APA order","g");
      $$("#buildDrop .drop-chip").forEach(c=>c.classList.add("locked"));
      orderReset("lesson-build:"+L.id); bumpGuided(L,"build"); renderMasterySafe();
    } else {
      const gl=g.map(k=>RULES[k]?.label||k), wl=w.map(k=>RULES[k]?.label||k);
      $("#buildMsg").textContent=doneCountMsg(got,w)+"△ "+orderFeedback("lesson-build:"+L.id,wl,gl);
      $$("#buildDrop .drop-chip").forEach(c=>c.classList.add("wrong")); setTimeout(()=>$$("#buildDrop .drop-chip").forEach(c=>c.classList.remove("wrong")),650);
      logErr("ordering");
    }
  });
  orderReset("lesson-build:"+curL().id);
}
function doneCountMsg(got,w){
  if(!got.length) return "Nothing placed yet. ";
  const same=got.filter((x,i)=>x===w[i]).length;
  return `Your structure is mostly right (${same}/${w.length} seated). One decision remains. `;
}
function renderBuildDrop(){
  const dz=$("#buildDrop"); if(!dz) return; dz.innerHTML="";
  buildOrder.forEach(n=>{ const [txt,k]=n.split("|"); const c=document.createElement("button"); c.className="drop-chip"; c.textContent=k+" · "+txt; c.title="Activate to remove";
    c.addEventListener("click",()=>{ buildOrder=buildOrder.filter(x=>x!==n); renderBuildDrop(); }); dz.appendChild(c); });
  if(!buildOrder.length) dz.innerHTML=`<span class="micro">Tap research notes to place the first component…</span>`;
}

/* ---- guided: fault-finding ---- */
function renderGuidedIdentify(L,st,head){
  const I=L.identify;
  const errTotal=I.cite.filter(s=>s.hit).length;
  st.insertAdjacentHTML("beforeend",head("Investigate","find the faults")+`<p class="micro">${esc(I.intro)}</p><div class="paper-para" id="identifyCite" style="margin-top:8px"></div><p class="micro" id="identifyMsg" role="status" style="margin-top:8px">Faults confirmed: <strong id="identifyCount">0/${errTotal}</strong></p><ul class="check-list" id="identifyLog"></ul>`);
  const found=new Set();
  const box=$("#identifyCite"); box.innerHTML="";
  const setLead=txt=>{ const m=$("#identifyMsg").childNodes[0]; if(m) m.textContent=txt; };
  const renderLog=()=>{
    $("#identifyCount").textContent=`${found.size}/${errTotal}`;
    $("#identifyLog").innerHTML=[...found].map(i=>{ const s=I.cite[i]; return `<li><span class="mark err">\u2715</span><span>${esc(s.why)}<br><span class="micro">Canonical \u2192 <code>${esc(s.fix)}</code></span></span></li>`; }).join("")||`<li><span class="mark warn">\u25B3</span><span>No confirmed faults yet.</span></li>`;
    if(found.size>=errTotal){ addSkill((L.skills||["ordering"])[0],8,true,"identify","independent"); logActivity("Cleared fault-finding: "+L.title,"g"); bumpGuided(L,"identify"); }
  };
  I.cite.forEach((seg,i)=>{
    const sp=document.createElement("span"); sp.className="susp"; sp.textContent=seg.t; sp.tabIndex=0; sp.setAttribute("role","button");
    const probe=()=>{
      if(!seg.hit){ setLead("Sound structure \u2014 keep hunting. Faults confirmed: "); sp.classList.add("found-ok"); return; }
      if(!found.has(i)){ found.add(i); sp.classList.add("found-err"); addSkill(seg.hit in SKILL_LABELS?seg.hit:(L.skills||["ordering"])[0],4,true,"identify","guided"); }
      else setLead("Already logged. Faults confirmed: ");
      renderLog(); save();
    };
    sp.addEventListener("click",probe);
    sp.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); probe(); }});
    box.appendChild(sp);
  });
  renderLog();
}

/* ---- guided: proper-noun flagging ---- */
function renderGuidedFlagwords(L,st,head){ flagRound(L,st,head,L.flagwords,"","flagwords"); }
function renderGuidedFlagwordsB(L,st,head){ flagRound(L,st,head,L.flagwordsB,"B","flagwordsB"); }
function flagRound(L,st,head,F,pfx,kind){
  st.insertAdjacentHTML("beforeend",head("Capitalization review","you decide, not the machine")+`<p class="micro">Tap every word that must KEEP its capital as a proper noun. Then confirm against the engine's honest uncertainty.</p><div class="note-grid" id="flagWords${pfx}"></div><div class="btn-row"><button class="btn small primary" id="btnFlagCheck${pfx}">Confirm capitals</button></div><p class="micro" id="flagMsg${pfx}" role="status"></p>`);
  const words=F.title.split(/\s+/);
  const picked=new Set();
  $("#flagWords"+pfx).innerHTML=words.map((w,i)=>`<button class="note-chip" data-fw="${i}"><div>${esc(w)}</div></button>`).join("");
  $$("#flagWords"+pfx+" .note-chip").forEach(ch=>ch.addEventListener("click",()=>{
    const i=+ch.dataset.fw;
    if(picked.has(i)){ picked.delete(i); ch.classList.remove("picked"); } else { picked.add(i); ch.classList.add("picked"); }
  }));
  $("#btnFlagCheck"+pfx).addEventListener("click",()=>{
    const core=w=>w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,"");
    // Lesson answer (proper nouns) rules; the engine's honest flags are shown for comparison.
    const want=new Set((F.keep||flagTitleWords(F.title)).map(w=>words.findIndex(x=>core(x)===w)).filter(i=>i>=0));
    const got=new Set([...picked]);
    const ok=want.size===got.size&&[...want].every(i=>got.has(i));
    const names=[...want].map(i=>words[i]).join(", ")||"(none)";
    const eng=flagTitleWords(F.title).filter(w=>![...want].map(i=>core(words[i])).includes(w));
    const engNote=eng.length?` The machine also flags <strong>${eng.map(f=>esc(f)).join(", ")}</strong> — capitalized but common; only your judgment tells them apart.`:"";
    if(ok){ $("#flagMsg"+pfx).innerHTML=`✓ Judgment confirmed — <strong>${esc(names)}</strong> survive sentence case. The machine flags; you decide.`; addSkill("title",8,true,"flagwords","independent"); bumpGuided(L,"flagwords"); }
    else { $("#flagMsg"+pfx).innerHTML=`△ Compare with the keep-list: <strong>${esc(names)}</strong>.${engNote} Adjust and confirm again.`; logErr("title"); }
  });
}

/* ---- guided: in-text placement ---- */
function renderGuidedPlace(L,st,head){
  const P=L.place;
  st.insertAdjacentHTML("beforeend",head("Apply in text","place the pointer")+`<div class="paper-para" id="placePara"></div><div class="btn-row" style="margin-top:8px"><button class="btn small tab${P.mode==="paren"?" active":""}" id="placeParen">Parenthetical</button><button class="btn small tab${P.mode==="narr"?" active":""}" id="placeNarr">Narrative</button></div><div id="placeChoices" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div><p class="micro" id="placeMsg" role="status"></p>`);
  let mode=(P.mode==="narr")?"narr":"paren", slot=0;
  const draw=()=>{
    const want=P.correct[mode];
    $("#placePara").innerHTML=esc(P.para[0])+`<button class="cite-slot${slot?" filled":""}" id="placeSlot">${slot?esc(slot):"⊕ place citation"}</button>`+esc(P.para[1])+esc(P.para[2]||"");
    $("#placeChoices").innerHTML=P.choices.map(c=>`<button class="btn small" style="justify-content:flex-start" data-pc="${esc(c)}">${esc(c)}</button>`).join("");
    $$("#placeChoices [data-pc]").forEach(b=>b.addEventListener("click",()=>{
      slot=b.dataset.pc;
      if(b.dataset.pc===want){ $("#placeMsg").textContent="✓ Placed with intent — voice and form both deliberate."; addSkill(mode==="paren"?"intext1":"intextN",8,true,"place","guided"); bumpGuided(L,"place"); }
      else { $("#placeMsg").textContent="△ Compare: "+want+" — voice changes punctuation."; logErr(mode==="paren"?"intext1":"intextN"); }
      draw();
    }));
    $("#placeParen").classList.toggle("active",mode==="paren"); $("#placeNarr").classList.toggle("active",mode==="narr");
  };
  $("#placeParen").addEventListener("click",()=>{ mode="paren"; slot=0; draw(); });
  $("#placeNarr").addEventListener("click",()=>{ mode="narr"; slot=0; draw(); });
  draw();
}

/* ---- guided: reference ordering ---- */
let orderSeq=[];
function renderGuidedOrder(L,st,head){
  orderSeq=[];
  st.insertAdjacentHTML("beforeend",head("Order the list","click records alphabetically")+`<div id="orderPool" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div><div class="btn-row"><button class="btn small" id="btnOrderReset">Reset</button><button class="btn small primary" id="btnOrderCheck">Confirm order</button></div><p class="micro" id="orderMsg" role="status"></p>`);
  const draw=()=>{
    const pool=$("#orderPool"); pool.innerHTML="";
    L.orderRefs.forEach((r,i)=>{
      if(orderSeq.includes(i)) return;
      const b=document.createElement("button"); b.className="opt-btn"; b.innerHTML=`<span class="micro mono">${String.fromCharCode(65+i)}</span><span class="citation-text" style="font-size:14px;padding:0">${esc(r)}</span>`;
      b.addEventListener("click",()=>{ orderSeq.push(i); draw(); }); pool.appendChild(b);
    });
    if(!pool.children.length) pool.innerHTML=`<span class="micro">All records placed.</span>`;
    const placed=orderSeq.map(i=>`<div class="micro mono" style="padding:4px 0">№${orderSeq.indexOf(i)+1} — ${esc(L.orderRefs[i].slice(0,60))}…</div>`).join("");
    if(orderSeq.length) pool.insertAdjacentHTML("beforeend",`<div style="margin-top:6px;border-top:1px dashed var(--line);padding-top:6px"><span class="micro">Your order:</span>${placed}</div>`);
  };
  draw();
  $("#btnOrderReset").addEventListener("click",()=>{ orderSeq=[]; draw(); $("#orderMsg").textContent=""; });
  $("#btnOrderCheck").addEventListener("click",()=>{
    const want=[...L.orderRefs].sort((a,b)=>a.localeCompare(b));
    const got=orderSeq.map(i=>L.orderRefs[i]);
    if(got.length===want.length&&JSON.stringify(got)===JSON.stringify(want)){ $("#orderMsg").textContent="✓ Sorted by surname — retrieval order, not ranking."; addSkill("ordering",10,true,"order-refs","independent"); orderReset("orderRefs:"+L.id); bumpGuided(L,"orderRefs"); }
    else { const gl=got.map(r=>String(r).split(",")[0]), wl=want.map(r=>String(r).split(",")[0]); $("#orderMsg").textContent="△ "+orderFeedback("orderRefs:"+L.id,wl,gl); orderSeq=[]; draw(); logErr("ordering"); }
  });
}

/* ---- guided: judgment ---- */
function renderGuidedJudge(L,st,head){
  const items=L.judge; let ji=0, jok=0;
  st.insertAdjacentHTML("beforeend",head("Cite or free?","judgment")+`<div id="judgeLBox"></div>`);
  const step=()=>{
    if(ji>=items.length){ $("#judgeLBox").innerHTML=`<div class="rule-block ${jok>=Math.ceil(items.length/2)?"green":"amber"}"><strong>Judgment: ${jok}/${items.length} held.</strong><br><span class="micro">${jok>=Math.ceil(items.length/2)?"You can tell verifiable claims from free ones.":"Re-read the failures — the test is verifiability."}</span></div>`; if(jok>=Math.ceil(items.length/2)){ addSkill("intext1",6,true,"judgment","guided"); bumpGuided(L,"judge"); } return; }
    const J=items[ji];
    const JL=L.judgeLabels||["Needs a citation","Common knowledge"];
    $("#judgeLBox").innerHTML=`<p class="micro">Item ${ji+1}/${items.length}</p><div class="paper-para" style="font-size:15px">${esc(J.s)}</div><div class="btn-row"><button class="btn small" data-jl="1">${esc(JL[0])}</button><button class="btn small" data-jl="0">${esc(JL[1])}</button></div><p class="micro" id="judgeLMsg" role="status"></p>`;
    $$("#judgeLBox [data-jl]").forEach(b=>b.addEventListener("click",()=>{
      const ok=(b.dataset.jl==="1")===J.cite;
      $("#judgeLMsg").textContent=(ok?"✓ ":"△ ")+J.why;
      if(ok) jok++; else logErr("intext1");
      ji++; setTimeout(step,1400);
    }));
  };
  step();
}

/* ---- guided: concept chain ---- */
function renderGuidedConcept(L,st,head){
  const items=L.concept; let ci=0;
  st.insertAdjacentHTML("beforeend",head("Reason it through","concept chain")+`<div id="conceptBox"></div>`);
  const step=()=>{
    if(ci>=items.length){ addSkill((L.skills||["ordering"])[0],6,true,"concept","guided"); bumpGuided(L,"concept"); $("#conceptBox").innerHTML+=`<div class="rule-block green"><strong>Chain complete.</strong><br><span class="micro">Each link held — the concept is yours.</span></div>`; return; }
    const C=items[ci];
    $("#conceptBox").innerHTML=`<p class="micro">Link ${ci+1}/${items.length}</p><h3 class="h3" style="font-size:13.5px">${esc(C.q)}</h3><div id="conceptOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="conceptMsg" role="status"></p>`;
    mcq($("#conceptOpts"),C.opts,(i)=>{
      markMcq($("#conceptOpts"),C.a,true); if(i!==C.a) markMcq($("#conceptOpts"),i,false);
      if(i===C.a){ $("#conceptMsg").textContent="✓ "+C.why; ci++; setTimeout(step,1000); }
      else { $("#conceptMsg").textContent="△ "+C.why+" — try this link again."; logErr((L.skills||["ordering"])[0]); }
    });
  };
  step();
}

/* ---- blind + transfer (curriculum) ---- */
let blindOrder=[], transferOrder=[], transferFocusDone=false;
function renderBlindStage(L,st,head){
  blindOrder=[];
  st.insertAdjacentHTML("beforeend",head("Blind build","no labels, only evidence")+`<p class="micro">Unlabeled fragments from a different source. Identify each one, then order it.</p><div class="note-grid" id="blindNotes"></div><div class="drop-zone" id="blindDrop" aria-label="Blind assembly area"></div><div class="btn-row"><button class="btn small ghost" id="btnBlindHint">Hint</button><button class="btn small" id="btnBlindReset">Reset</button><button class="btn small primary" id="btnBlindCheck">Try without hints</button></div><p class="micro" id="blindMsg" role="status"></p>`);
  $("#blindNotes").innerHTML=L.blind.evidence.map((e,i)=>`<button class="note-chip" data-blind="${i}"><div>${esc(e[0])}</div></button>`).join("");
  $$("#blindNotes .note-chip").forEach(ch=>ch.addEventListener("click",()=>{ const i=+ch.dataset.blind; if(!blindOrder.includes(i)) blindOrder.push(i); renderBlindDrop(L); }));
  renderBlindDrop(L);
  $("#btnBlindReset").addEventListener("click",()=>{ blindOrder=[]; renderBlindDrop(L); $("#blindMsg").textContent=""; });
  $("#btnBlindHint").addEventListener("click",()=>{ S.hintsUsed++; save(); $("#blindMsg").textContent="Hint: the first-placed fragment identifies who is responsible — author or group."; });
  $("#btnBlindCheck").addEventListener("click",()=>{
    const keys=L.blind.keys||L.blind.answer;
    const got=collapse(KEYNORM(blindOrder.map(i=>keys[i]||"")));
    if(JSON.stringify(got)===JSON.stringify(collapse(KEYNORM(L.blind.answer)))){
      const ref=buildReference(L.blind.exp);
      $("#blindMsg").innerHTML=`✓ Correct without scaffolding: <code>${esc(ref.text)}</code>`;
      S.blindDone++; addSkill((L.skills||["ordering"])[0],10,true,"blind","independent"); addSkill("ordering",6,true,"blind","independent");
      logActivity("Blind-built "+L.title,"g"); orderReset("blind:"+L.id); markStageDone(L,"blind"); renderMasterySafe();
    } else { $("#blindMsg").textContent=""; const _bl=collapse(KEYNORM((L.blind.keys||L.blind.answer))); const _bg=collapse(KEYNORM(blindOrder.map(i=>(L.blind.keys||L.blind.answer)[i]||""))); $("#blindMsg").textContent="△ "+orderFeedback("blind:"+L.id,_bl.map(k=>RULES[k]?.label||k),_bg.map(k=>RULES[k]?.label||k)); logErr("ordering"); }
  });
}
function renderBlindDrop(L){
  const dz=$("#blindDrop"); if(!dz) return; dz.innerHTML="";
  blindOrder.forEach(i=>{ const c=document.createElement("button"); c.className="drop-chip"; c.textContent=L.blind.evidence[i][0]; c.addEventListener("click",()=>{ blindOrder=blindOrder.filter(x=>x!==i); renderBlindDrop(L); }); dz.appendChild(c); });
  if(!blindOrder.length) dz.innerHTML=`<span class="micro">Place fragments in APA order…</span>`;
}
function renderTransferStage(L,st,head){
  transferOrder=[]; transferFocusDone=false;
  const T=L.transfer;
  st.insertAdjacentHTML("beforeend",head("Same rule — new world","transfer")+`<p class="micro">${esc(T.brief)}</p><div class="note-grid" id="transferNotes"></div><div class="drop-zone" id="transferDrop" aria-label="Transfer assembly area"></div><div id="transferFocus" style="margin-top:8px"><p class="eyebrow">Focus question</p><h3 class="h3" style="font-size:13px">${esc(T.focus.q)}</h3><div id="transferFocusOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="transferFocusMsg" role="status"></p></div><div class="btn-row"><button class="btn small" id="btnTransferReset">Reset</button><button class="btn small primary" id="btnTransferCheck">Apply to the new source</button></div><p class="micro" id="transferMsg" role="status"></p>`);
  $("#transferNotes").innerHTML=T.evidence.map((e,i)=>`<button class="note-chip" data-tr="${i}"><div>${esc(e[0])}</div></button>`).join("");
  $$("#transferNotes .note-chip").forEach(ch=>ch.addEventListener("click",()=>{ const i=+ch.dataset.tr; if(!transferOrder.includes(i)) transferOrder.push(i); renderTransferDrop(L); }));
  mcq($("#transferFocusOpts"),T.focus.opts,(i)=>{
    markMcq($("#transferFocusOpts"),T.focus.a,true); if(i!==T.focus.a) markMcq($("#transferFocusOpts"),i,false);
    const ok=i===T.focus.a;
    if(ok){ transferFocusDone=true; addSkill(T.rule,4,true,"transfer-focus","guided"); }
    else logErr(T.rule);
    $("#transferFocusMsg").innerHTML=decidedHTML(T.focus.opts[i],T.focus.opts[T.focus.a],T.focus.why,ok);
  });
  renderTransferDrop(L);
  $("#btnTransferReset").addEventListener("click",()=>{ transferOrder=[]; renderTransferDrop(L); $("#transferMsg").textContent=""; });
  $("#btnTransferCheck").addEventListener("click",()=>{
    const keys=T.keys||T.answer;
    const got=collapse(KEYNORM(transferOrder.map(i=>keys[i]||"")));
    if(JSON.stringify(got)===JSON.stringify(collapse(KEYNORM(T.answer))) && transferFocusDone){
      const ref=buildReference(T.exp);
      $("#transferMsg").innerHTML=`✓ Same rule, new context — confirmed: <code>${esc(ref.text)}</code>`;
      S.transferDone++; addSkill((L.skills||["ordering"])[0],10,true,"transfer","transfer"); addSkill(T.rule,8,true,"transfer","transfer");
      logActivity("Transferred "+L.title+" to a new context","g"); orderReset("transfer:"+L.id); markStageDone(L,"transfer"); renderMasterySafe();
    } else if(!transferFocusDone){ $("#transferMsg").textContent="△ Answer the focus question first — ordering without reasoning is copying."; }
    else { const _tk=(T.keys||T.answer); const _tw=collapse(KEYNORM(T.answer)).map(k=>RULES[k]?.label||k), _tg=collapse(KEYNORM(transferOrder.map(i=>_tk[i]||""))).map(k=>RULES[k]?.label||k); $("#transferMsg").textContent="△ "+orderFeedback("transfer:"+L.id,_tw,_tg); logErr(T.rule); }
  });
}
function renderTransferDrop(L){
  const dz=$("#transferDrop"); if(!dz) return; dz.innerHTML="";
  transferOrder.forEach(i=>{ const c=document.createElement("button"); c.className="drop-chip"; c.textContent=L.transfer.evidence[i][0]; c.addEventListener("click",()=>{ transferOrder=transferOrder.filter(x=>x!==i); renderTransferDrop(L); }); dz.appendChild(c); });
  if(!transferOrder.length) dz.innerHTML=`<span class="micro">Place fragments in APA order…</span>`;
}

/* ---------------- TRAIN ---------------- */
let chIdx=0;
try{ chIdx=Math.min(Math.max(0,Number(S.challengeIdx)||0),CHALLENGES.length-1); }catch(e){ chIdx=0; }
const CH_FIELD_DEFS=[["authors","Author(s) — separate multiple with ;"],["year","Year (or n.d.)"],["month","Month (only if evidence shows one)"],["day","Day (only if evidence shows one)"],["title","Article / book title"],["journal","Journal / site / publisher"],["volume","Volume"],["issue","Issue"],["pages","Pages (e.g. 31–44)"],["doi","DOI or URL"]];
const CH_HINTS={
  author:["Whose names are on the evidence? List every researcher.","Surname first, initials after — one per researcher.","Separate with commas; close with & before the last."],
  date:["Find the publication year on the evidence.","It sits in parentheses directly after the author.","(2024). — or (2024, March 5). for dated pages."],
  default:["Name each evidence fact: who, when, what, where.","APA order never changes: Author → Date → Title → Source.","Compare your line against the evidence, component by component."],
};
function renderChallenge(){
  const C=CHALLENGES[chIdx];
  $("#sessionNo").textContent=String(S.sessionNo).padStart(2,"0");
  $("#sessionSkill").textContent=C.skill==="ordering"?"Reference ordering":SKILL_LABELS[C.skill]||C.diff;
  $("#chCount").textContent=`Challenge ${chIdx+1} / ${CHALLENGES.length}`;
  $("#chTitle").textContent=C.n; $("#chDiff").textContent=C.diff;
  evidenceTray($("#chEvidence"),Object.entries(C.ev));
  $("#chFields").innerHTML=CH_FIELD_DEFS.map(([k,lab])=>`<div class="field"><label for="ch-${k}">${esc(lab)}</label><input id="ch-${k}" data-ch="${k}" placeholder="…"></div>`).join("");
  $$("#chFields input").forEach(inp=>inp.addEventListener("input",renderChPreview));
  $("#chResult").innerHTML=""; $("#chExpected").style.display="none"; $("#chHints").innerHTML="";
  window._chAttempted=false; const rv=$("#btnChReveal"); if(rv){ rv.disabled=true; rv.title="Submit an inspection first — then reveal."; }
  renderChPreview(); renderRepairGame(); renderAccuracy(); renderMistakes(); renderWarmup();
}
/* Training-floor warm-up: one due rule before the main challenge. */
function renderWarmup(){
  const box=$("#warmupBox"); if(!box) return; box.innerHTML="";
  const today=new Date().toISOString().slice(0,10);
  if(S.lastWarmupDay===today) return;
  const now=Date.now();
  const due=Object.keys(S.skills||{}).filter(k=>S.seen[k]&&S.review&&S.review[k]&&S.review[k].due<=now);
  if(!due.length) return;
  due.sort((a,b)=>{ const ra=skillState(a).c==="r"?0:1, rb=skillState(b).c==="r"?0:1; if(ra!==rb) return ra-rb; return S.review[a].due-S.review[b].due; });
  const k=due[0];
  box.innerHTML=`<div class="predict-box" style="border-left:4px solid var(--amber)"><p class="eyebrow">Warm-up — revisit one rule before today's investigation</p><h3 class="h3" style="font-size:13.5px">${esc(SKILL_LABELS[k])} · ${esc(reviewLabel(k))}</h3><div id="warmupDrill"></div><div class="btn-row"><button class="btn small ghost" id="btnWarmupSkip">Skip warm-up</button></div></div>`;
  runDrill($("#warmupDrill"),k,()=>{ S.lastWarmupDay=today; save(); const wb=$("#warmupBox"); if(wb) wb.innerHTML=`<div class="rule-block green"><strong>Warmed up.</strong> <span class="micro">This rule returns later — farther apart with each success.</span></div>`; });
  $("#btnWarmupSkip").addEventListener("click",()=>{ S.lastWarmupDay=today; save(); const wb=$("#warmupBox"); if(wb) wb.innerHTML=""; });
}
function chValues(){ const o={sourceType:CHALLENGES[chIdx].exp.sourceType}; $$("#chFields input").forEach(i=>o[i.dataset.ch]=i.value); return o; }
function renderChPreview(){
  const v=chValues(); const exp=CHALLENGES[chIdx].exp;
  const full={sourceType:exp.sourceType,authors:v.authors,year:v.year,month:v.month,day:v.day,title:v.title,journal:v.journal,siteName:v.journal,publisher:v.journal,volume:v.volume,issue:v.issue,pages:v.pages,doi:v.doi,url:v.doi};
  const ref=buildReference(full);
  const box=$("#chPreview");
  if(!v.authors && !v.title){ box.innerHTML=`<span class="micro">Identify the evidence, then construct — your reference assembles here.</span>`; $("#chScale").innerHTML=""; return; }
  renderAnatomy("#chPreview","#chScale",ref,{onPick:(key)=>openModal("APA rule · "+(RULES[key]?.label||key),(RULES[key]?.rule||"").split(".")[0]+".",ruleCardHTML(key))});
}
$("#btnChPrev").addEventListener("click",()=>{ chIdx=(chIdx+CHALLENGES.length-1)%CHALLENGES.length; S.challengeIdx=chIdx; save(); renderChallenge(); });
$("#btnChNext").addEventListener("click",()=>{ chIdx=(chIdx+1)%CHALLENGES.length; S.challengeIdx=chIdx; save(); renderChallenge(); });
$("#btnChHint").addEventListener("click",()=>{
  const C=CHALLENGES[chIdx]; const hints=CH_HINTS[C.skill]||CH_HINTS.default;
  const shown=$$("#chHints .rule-block").length;
  if(shown>=hints.length){ $("#chHints").innerHTML+=`<p class="micro">No further hints — inspect the evidence tray once more, then commit.</p>`; return; }
  S.hintsUsed++; save();
  $("#chHints").innerHTML+=`<div class="rule-block amber"><strong>Hint ${shown+1}</strong><br><span class="micro">${esc(hints[shown])}</span></div>`;
});
let chChecking=false;
$("#btnChCheck").addEventListener("click",()=>{
  if(chChecking) return; chChecking=true;
  const C=CHALLENGES[chIdx]; const v=chValues(); const exp=C.exp;
  const scan=$("#chScan"); scan.classList.remove("scanning"); void scan.offsetWidth; scan.classList.add("scanning");
  const vDate=(v.year||"")+"|"+(v.month||"")+"|"+(v.day||"");
  const eDate=(exp.year||"")+"|"+(exp.month||"")+"|"+(exp.day||"");
  const checks=[
    ["author","Author",normCmp(formatAuthorList(v.authors),formatAuthorList(exp.authors))],
    ["date","Date",normCmp(vDate,eDate)],
    ["title","Title",normCmp(sentenceCase(v.title),sentenceCase(exp.title))],
    ["journal","Source",normCmp(v.journal,exp.journal||exp.siteName||exp.publisher)],
    ["volume","Volume/issue/pages",normCmp((v.volume||"")+(v.issue||"")+(v.pages||""),(exp.volume||"")+(exp.issue||"")+(exp.pages||""))],
    ["doi","DOI/URL",normCmp(normDoi(v.doi),normDoi(exp.doi||exp.url))],
  ];
  const status={}; let bad=0;
  checks.forEach(([k,,ok])=>{ status[k]=ok?"ok":"err"; if(!ok) bad++; });
  status.pages=status.volume;
  const wantDate="("+exp.year+(exp.month?", "+exp.month+(exp.day?" "+exp.day:""):"")+").";
  const gotDate=v.year?"("+v.year+(v.month?", "+v.month+(v.day?" "+v.day:""):"")+").":"(empty)";
  setTimeout(()=>{
    chChecking=false;
    renderAnatomy("#chPreview","#chScale",buildReference({sourceType:exp.sourceType,authors:v.authors||"[missing]",year:v.year||"n.d.",month:v.month,day:v.day,title:v.title||"[missing]",journal:v.journal||"[missing]",siteName:v.journal||"[missing]",publisher:v.journal||"[missing]",volume:v.volume,issue:v.issue,pages:v.pages,doi:v.doi,url:v.doi}),{status});
    const skillOf=k=>k==="journal"?(exp.sourceType==="book"?"books":exp.sourceType==="website"?"websites":"journal"):k;
    const rows=checks.map(([k,lab,ok])=>{
      if(ok) return `<li><span class="mark ok">✓</span><span><strong>${esc(lab)}</strong> — stable. This component held under inspection.</span></li>`;
      const r=RULES[k==="volume"?"volume":k]||RULES.order;
      const what=k==="volume"?`${v.volume||""}${v.issue?"("+v.issue+")":""} ${v.pages||""}`.trim()||"(empty)":k==="doi"?v.doi||"(empty)":k==="date"?gotDate:(v[k==="author"?"authors":k==="journal"?"journal":k]||"(empty)");
      const want=k==="author"?formatAuthorList(exp.authors):k==="date"?wantDate:k==="title"?sentenceCase(exp.title):k==="journal"?(exp.journal||exp.siteName||exp.publisher):k==="doi"?(normDoi(exp.doi||exp.url)||"(see expected)"):`${exp.volume||""}${exp.issue?"("+exp.issue+")":""} ${exp.pages||""}`;
      return `<li><span class="mark err">✕</span><span><strong>What you built</strong> <code>${esc(what)}</code><br><strong>APA expects</strong> <code>${esc(want)}</code><br><span class="micro"><strong>Rule:</strong> ${esc(r.rule)}</span> <button class="btn small ghost" data-nav="learn">Trace this rule</button></span></li>`;
    }).join("");
    const hintNote=S.hintsUsed?` <span class="micro">Hints used this session: ${S.hintsUsed} — hints teach, they don't punish.</span>`:"";
    const titleFlags=flagTitleWords(v.title||"");
    const titleNote=titleFlags.length?`<div class="rule-block amber"><strong>Capitalization review.</strong> <span class="micro">You preserved capitals on <strong>${titleFlags.map(f=>esc(f)).join(", ")}</strong> — confirm each is a genuine proper noun in the source. This is judgment, not error.</span></div>`:"";
    $("#chResult").innerHTML=`<p class="eyebrow">Inspection result — ${bad===0?"all components stable":bad+" component(s) need attention"}.${hintNote}</p>${titleNote}<ul class="check-list">${rows}</ul>`;
    if(bad===0){
      const noHint=S.hintsUsed===0;
      C.skills.forEach(s=>addSkill(s,12,true,C.n,noHint?"independent":"guided"));
      S.chSolved[C.n]=1; save();
      logActivity("Completed "+C.n+" — all components stable"+(noHint?" without hints":""),"g");
      toast(noHint?"✓ Locked without hints. That reasoning is yours.":"✓ Reference stable. The rule is settling.");
    } else {
      checks.forEach(([k,,ok])=>{ if(!ok) logErr(skillOf(k)); else addSkill(skillOf(k),1); });
      const firstBad=checks.find(c=>!c[2]);
      logActivity("Inspected "+C.n+" — "+bad+" to review","a");
      const fb=$("#chResult"); fb.innerHTML+=`<div class="rule-block amber"><strong>What this tells us:</strong> <span class="micro">your ${esc(firstBad[1].toLowerCase())} structure needs review — not your effort. The mistake is recorded in Mistake Memory below for a focused drill.</span></div>`;
    }
    renderAccuracy(); renderMistakes(); renderMasterySafe(); updateRailDots();
    window._chAttempted=true; const rv2=$("#btnChReveal"); if(rv2){ rv2.disabled=false; rv2.title=""; }
  },900);
});
$("#btnChReveal").addEventListener("click",()=>{
  const C=CHALLENGES[chIdx]; const ref=buildReference(C.exp); const box=$("#chExpected");
  box.style.display=box.style.display==="none"?"block":"none";
  box.innerHTML=`<div class="rule-block amber"><strong>Correction — study it, close it, rebuild from memory.</strong><br><code>${esc(ref.text)}</code></div>`;
});
$("#btnChSave").addEventListener("click",()=>{
  const v=chValues();
  if(!String(v.authors||"").trim()||!String(v.title||"").trim()){ toast("Identify at least the author and title before archiving."); return; }
  const ref=buildReference({sourceType:CHALLENGES[chIdx].exp.sourceType,...v,siteName:v.journal,publisher:v.journal,url:v.doi});
  S.refs.push({text:ref.text,type:CHALLENGES[chIdx].exp.sourceType,a:v.authors,y:v.year,m:"Training floor",ts:Date.now()}); save(); renderMasterySafe(); updateRailDots();
  toast("Archived in the research collection."); logActivity("Archived reference from "+CHALLENGES[chIdx].n);
});

/* accuracy pattern + mistake memory + drills */
function renderAccuracy(){
  const el=$("#accuracyPattern"); if(!el) return;
  const keys=["author","date","title","journal","pages","doi"];
  el.innerHTML=keys.map(k=>{ const st=skillState(k); const ev=S.ev[k];
    return `<div class="acc-row"><span>${esc(SKILL_LABELS[k])}${ev&&ev.n?` <span class="micro">· ${ev.n}× held</span>`:""}</span><span class="acc-state ${st.c}">${symbolFor(st.c)} ${st.t.toUpperCase()}</span></div>`; }).join("");
}
function renderMistakes(){
  const el=$("#mistakeMemory"); if(!el) return;
  const rows=Object.entries(S.errLog).filter(([,v])=>v&&v.n>0).sort((a,b)=>b[1].n-a[1].n).slice(0,4);
  el.innerHTML=rows.length?rows.map(([k,v])=>`<div class="mist-row"><span>! <strong>${esc(SKILL_LABELS[k]||k)}</strong> <span class="micro">· missed ${v.n}× · a rule to revisit</span></span><button class="btn small" data-drill="${esc(k)}">Repair drill</button></div>`).join(""):`<p class="micro">No recurring faults recorded. Mistakes you make twice become drills here — information, not shame.</p>`;
  $$("#mistakeMemory [data-drill]").forEach(b=>b.addEventListener("click",()=>runDrill($("#drillBox"),b.dataset.drill)));
}
const DRILL_TRANSFER={author:1,date:3,doi:2,pages:0};
function runDrill(box,skill,done){
  const items=DRILLS[skill]||DRILLS.title;
  let i=0,score=0,transferDone=false;
  const step=()=>{
    if(i>=items.length){
      const ti=DRILL_TRANSFER[skill];
      if(ti!==undefined&&!transferDone&&score>=2){
        const T=TRANSFER[ti];
        box.innerHTML=`<p class="eyebrow">Transfer — same rule, new context</p><p class="micro">${esc(T.brief)}</p><h3 class="h3" style="font-size:13px">${esc(T.focus.q)}</h3><div id="drillOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="drillMsg" role="status"></p>`;
        mcq($("#drillOpts"),T.focus.opts,(j)=>{
          markMcq($("#drillOpts"),T.focus.a,true); if(j!==T.focus.a) markMcq($("#drillOpts"),j,false);
          transferDone=true;
          if(j===T.focus.a){ score++; addSkill(T.rule,4,true,"drill-transfer","transfer"); $("#drillMsg").textContent="✓ Transfer confirmed — the rule travels."; }
          else { $("#drillMsg").textContent="△ "+T.focus.why; logErr(T.rule); }
          setTimeout(step,1200);
        });
        return;
      }
      box.innerHTML=`<div class="rule-block ${score>=2?"green":"amber"}"><strong>Drill complete — ${score}/${items.length+(transferDone?1:0)} held.</strong><br><span class="micro">${score>=2?"This rule is stabilizing. It returns later in a new context.":"Revisit the trace above, then drill again."}</span></div>`;
      if(score>=2){ addSkill(skill,8,true,"drill","guided"); logActivity("Completed repair drill: "+SKILL_LABELS[skill],"g"); }
      renderAccuracy(); renderMistakes(); renderMasterySafe();
      if(typeof done==="function") done(score);
      return;
    }
    const it=items[i];
    box.innerHTML=`<p class="eyebrow">Repair drill · ${esc(SKILL_LABELS[skill])} · ${i+1}/${items.length}</p><h3 class="h3" style="font-size:13px">${esc(it.q)}</h3><div id="drillOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="drillMsg" role="status"></p>`;
    mcq($("#drillOpts"),it.opts,(j)=>{
      markMcq($("#drillOpts"),it.a,true); if(j!==it.a) markMcq($("#drillOpts"),j,false);
      if(j===it.a){ score++; $("#drillMsg").textContent="✓ "+it.why; } else { $("#drillMsg").textContent="△ "+it.why; logErr(skill); }
      i++; setTimeout(step,1100);
    });
  };
  step();
}
/* order drill */
let repairSeq=[];
function renderRepairGame(){
  const C=CHALLENGES[chIdx]; const ref=buildReference(C.exp);
  const keys=[...new Set(ref.segs.map(s=>s.key))];
  repairSeq=[];
  const pool=$("#repairPool"), drop=$("#repairDrop");
  pool.innerHTML=""; drop.innerHTML=`<span class="micro">Tap pieces in APA order…</span>`; drop.dataset.seq="";
  [...keys].sort(()=>Math.random()-.5).forEach(k=>{
    const b=document.createElement("button"); b.className="note-chip"; b.innerHTML=`<div class="k">${esc(RULES[k]?.label||k)}</div>`;
    b.addEventListener("click",()=>{
      const seq=(drop.dataset.seq?drop.dataset.seq.split(","):[]); seq.push(k); drop.dataset.seq=seq.join(",");
      const c=document.createElement("button"); c.className="drop-chip"; c.textContent=RULES[k]?.label||k; drop.appendChild(c);
      drop.querySelector(".micro")?.remove(); b.disabled=true; b.style.opacity=.4;
    }); pool.appendChild(b);
  });
  $("#repairMsg").textContent="";
}
$("#btnRepairReset").addEventListener("click",renderRepairGame);
$("#btnRepairCheck").addEventListener("click",()=>{
  const C=CHALLENGES[chIdx]; const ref=buildReference(C.exp);
  const want=[...new Set(ref.segs.map(s=>s.key))];
  const got=($("#repairDrop").dataset.seq||"").split(",").filter(Boolean);
  if(JSON.stringify(got)===JSON.stringify(want)){ $("#repairMsg").textContent="✓ Pieces locked in APA order."; addSkill("ordering",10,true,"order-drill","guided"); orderReset("repair:"+chIdx); logActivity("Solved order drill ("+C.n+")","g"); $$("#repairDrop .drop-chip").forEach(c=>c.classList.add("locked")); }
  else { $("#repairMsg").textContent="△ "+orderFeedback("repair:"+chIdx,want.map(k=>RULES[k]?.label||k),got.map(k=>RULES[k]?.label||k)); $$("#repairDrop .drop-chip").forEach(c=>c.classList.add("wrong")); setTimeout(renderRepairGame,900); logErr("ordering"); }
  renderAccuracy(); renderMistakes();
});
/* in-text + judgment */
let intextIdx=0, intextMode="paren", intextSlot=0;
function renderIntext(){
  const P=INTEXT[intextIdx];
  $("#intextEvidence").innerHTML=Object.entries(P.ev).map(([k,v])=>`<div class="ev"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("");
  const want=intextMode==="paren"?P.correct.paren:P.correct.narr;
  const slot=a=>`<button class="cite-slot${intextSlot?" filled":""}" data-slot="${a}" aria-label="Placed citation — activate to clear and retry">${intextSlot?esc(intextSlot):"⊕ place citation"}</button>`;
  $("#intextPara").innerHTML=esc(P.para[0])+slot(1)+esc(P.para[1])+slot(2)+esc(P.para[2])+`<p class="micro" style="margin-top:8px;font-family:var(--font-ui)">Voice: <strong>${intextMode==="paren"?"parenthetical — the pointer closes the claim":"narrative — the author walks in the sentence"}</strong>. Decide placement, then exact form:</p>`;
  $$("#intextPara [data-slot]").forEach(s=>s.addEventListener("click",()=>{ if(!intextSlot) return; intextSlot=0; $("#intextMsg").textContent="Slot cleared — decide again."; renderIntext(); }));
  $("#intextChoices").innerHTML=P.choices.map(c=>`<button class="btn small opt-pick" style="justify-content:flex-start" data-ic="${esc(c)}">${esc(c)}</button>`).join("");
  $$("#intextChoices [data-ic]").forEach(b=>b.addEventListener("click",()=>{
    intextSlot=b.dataset.ic;
    const key=intextIdx===2?"intextM":intextIdx===1?"intext2":"intext1";
    if(b.dataset.ic===want){ $("#intextMsg").textContent="✓ Placed. "+(intextMode==="paren"?"The pointer closes the claim, before the period.":"The author joins the sentence; the year stays parenthesized.")+" You chose the voice deliberately."; addSkill(key,8,true,"intext","guided"); addSkill("intextN",intextMode==="narr"?8:2,true,"intext","guided"); logActivity("Placed in-text citation with intent","g"); }
    else { $("#intextMsg").textContent="△ Compare: "+want+" — commas, & vs and, et al. punctuation."; logErr(key); }
    renderAccuracy(); renderMistakes(); renderIntext();
  }));
  $("#btnParen").classList.toggle("active",intextMode==="paren"); $("#btnNarr").classList.toggle("active",intextMode==="narr");
  renderJudge();
}
$("#btnParen").addEventListener("click",()=>{ intextMode="paren"; intextSlot=0; renderIntext(); });
$("#btnNarr").addEventListener("click",()=>{ intextMode="narr"; intextSlot=0; renderIntext(); });
$("#btnIntextPrev").addEventListener("click",()=>{ intextIdx=(intextIdx+INTEXT.length-1)%INTEXT.length; intextSlot=0; renderIntext(); });
$("#btnIntextNext").addEventListener("click",()=>{ intextIdx=(intextIdx+1)%INTEXT.length; intextSlot=0; renderIntext(); });
let judgeIdx=0;
function renderJudge(){
  const box=$("#judgeBox"); if(!box) return;
  const J=JUDGE[judgeIdx%JUDGE.length];
  box.innerHTML=`<p class="micro">Sentence ${judgeIdx%JUDGE.length+1}/${JUDGE.length}</p><div class="paper-para" style="font-size:15px">${esc(J.s)}</div>
  <div class="btn-row"><button class="btn small" data-j="1">Needs a citation</button><button class="btn small" data-j="0">Common knowledge</button></div><p class="micro" id="judgeMsg" role="status"></p>`;
  $$("#judgeBox [data-j]").forEach(b=>b.addEventListener("click",()=>{
    const ok=(b.dataset.j==="1")===J.cite;
    $("#judgeMsg").textContent=(ok?"✓ Judgment held. ":"△ Reconsider. ")+J.why;
    if(ok){ addSkill("intext1",3,true,"judgment","guided"); } else logErr("intext1");
    setTimeout(()=>{ judgeIdx++; renderJudge(); },1600);
  }));
}

/* ---------------- BUILD: workbench ---------------- */
let builderType="journal", constructSeq=[], lastTouched="authors", blindMode=false;
const BUILDER_FIELDS={
  journal:[["authors","Author(s) — e.g. Jane Smith or A; B","Jane Smith"],["year","Year","2025"],["month","Month (optional)",""],["day","Day (optional)",""],["title","Article title","Effects of microplastics on freshwater ecosystems"],["journal","Journal name","Environmental Research"],["volume","Volume","14"],["issue","Issue","3"],["pages","Pages","44–58"],["doi","DOI or URL","https://doi.org/10.1016/j.envres.2025.03.014"]],
  book:[["authors","Author(s)","Amira Khalil"],["year","Year","2023"],["title","Book title","Materials science for engineers"],["edition","Edition (optional, e.g. 3rd ed.)",""],["publisher","Publisher","Springer"],["doi","DOI or URL (optional)",""]],
  chapter:[["authors","Chapter author(s)","Omar Hassan"],["year","Year","2024"],["chapterTitle","Chapter title","Equilibrium in closed systems"],["title","Book title","Physical chemistry methods"],["editors","Editor(s)","E. Miles"],["pages","Chapter pages","12–30"],["publisher","Publisher","Oxford University Press"],["doi","DOI (optional)",""]],
  website:[["authors","Author or organization","World Health Organization"],["year","Year","2024"],["month","Month","June"],["day","Day","11"],["title","Page title","Air quality and health"],["siteName","Site name","World Health Organization"],["url","URL","https://www.who.int/…"]],
  report:[["authors","Author / organization","Ministry of Environment"],["year","Year","2022"],["title","Report title","Nile water quality: annual report"],["publisher","Publisher","Ministry of Environment"],["url","URL","https://…"]],
  gov:[["authors","Agency","Ministry of Health"],["year","Year","2023"],["title","Publication title","Nutrition guidelines for schools"],["publisher","Publisher","Ministry of Health"],["url","URL","https://…"]],
  dataset:[["authors","Creator(s)","Karim Adel"],["year","Year","2024"],["title","Dataset title","Equilibrium constants across temperatures"],["version","Version","2.0"],["publisher","Distributor","Zenodo"],["doi","DOI","https://doi.org/10.5281/zenodo.1000000"]],
  video:[["authors","Channel / creator","Code for Agriculture"],["year","Year","2024"],["month","Month","February"],["day","Day","2"],["title","Video title","Training crop models"],["siteName","Platform","YouTube"],["url","URL","https://www.youtube.com/…"]],
  conference:[["authors","Author(s)","Tarek Samy"],["year","Year","2024"],["month","Month","March"],["title","Paper title","Microgrid control for desert schools"],["siteName","Conference","IEEE Sustainable Power Conference"],["publisher","Location","Cairo"],["url","URL (optional)",""]],
  thesis:[["authors","Author","Salma Rashad"],["year","Year","2023"],["title","Thesis title","Low-cost composite testing"],["publisher","University","Cairo University"],["url","URL (optional)",""]],
};
function renderSourceTabs(){
  $("#sourceTabs").innerHTML=SOURCE_TYPES.map(s=>`<button class="source-tab ${s.id===builderType?"active":""}" data-st="${s.id}" role="tab" title="${esc(s.blurb)}"><span class="ico">${s.i}</span>${s.t}</button>`).join("");
  $$("#sourceTabs .source-tab").forEach(b=>b.addEventListener("click",()=>{ builderType=b.dataset.st; constructSeq=[]; renderSourceTabs(); renderBuilderFields(); renderBuilder(); }));
}
function builderValues(){ const o={sourceType:builderType}; $$("#builderFields input").forEach(i=>o[i.dataset.bf]=i.value); return o; }
function renderBuilderFields(){
  $("#builderFields").innerHTML=(BUILDER_FIELDS[builderType]||BUILDER_FIELDS.journal).map(([k,lab,ph])=>`<div class="field"><label for="bf-${k}" class="${blindMode?"blinded":""}">${esc(lab)}</label><input id="bf-${k}" data-bf="${k}" placeholder="${esc(ph||"")}" value="${k==="authors"?"Jane Smith":k==="year"?"2025":k==="title"?"Effects of microplastics on freshwater ecosystems":k==="journal"?"Environmental Research":k==="volume"?"14":k==="issue"?"3":k==="pages"?"44–58":k==="doi"?"https://doi.org/10.5555/citelab-demo":""}"></div>`).join("")+
  `<p class="hint">Evidence, not answers: paste a <span class="mono">doi.org/10…</span> anywhere and watch it resolve. Leave the year empty to meet the missing-date rule.</p>`;
  $$("#builderFields input").forEach(i=>{
    i.addEventListener("focus",()=>{ lastTouched=i.dataset.bf; });
    i.addEventListener("input",()=>{ lastTouched=i.dataset.bf; renderBuilder(); });
  });
}
function componentsOf(ref){ return [...new Set(ref.segs.map(s=>s.key))]; }
function renderBuilder(){
  const v=builderValues();
  for(const k of Object.keys(v)){ const m=String(v[k]||"").match(/10\.\d{4,}\/\S+/); if(m && k!=="doi" && k!=="url" && !v.doi){ v.doi=m[0]; break; } }
  const ref=buildReference(v);
  const want=componentsOf(ref);
  let resetNotice=false;
  if(constructSeq.length&&!constructSeq.every(k=>want.includes(k))){ constructSeq=[]; resetNotice=true; }
  renderBuildPreview(ref,want);
  renderConstructStrip(ref,want,resetNotice);
  renderBuilderLogic(lastTouched,v,ref);
  const warns=[];
  if(!String(v.authors||"").trim()) warns.push("No author on the tray — APA moves the title first. Confirm the source truly has none.");
  if(!String(v.year||"").trim()) warns.push("Date unavailable — APA requires (n.d.).");
  if(v.doi && !/10\.\d+\//.test(v.doi) && !/^https?:\/\//.test(v.doi)) warns.push("That DOI/URL does not resolve — inspect it for typos.");
  const tflags=flagTitleWords(v.title||"");
  if(tflags.length) warns.push("Capitalization review: confirm "+tflags.join(", ")+" against the source before archiving.");
  $("#builderWarn").textContent=warns.join(" ");
  const verified=constructSeq.length>0&&constructSeq.length===want.length;
  const cp=$("#btnBuilderCopy"); if(cp){ cp.disabled=!verified; cp.title=verified?"Reference verified — copying is earned.":"Build the structure before copying."; }
  const ch=$("#copyHint"); if(ch) ch.textContent=verified?"Reference verified — copying is earned.":"Build the structure before copying.";
}
/* Progressive assembly: the citation emerges piece by piece.
   Placed components render as live segments; the rest wait as ghost slots. */
function renderBuildPreview(ref,want){
  const box=$("#builderDNA"); if(!box) return; box.innerHTML="";
  const byKey={}; ref.segs.forEach(s=>{ if(!byKey[s.key]) byKey[s.key]=s; });
  const repick=k=>{ ANA.key=k; lastTouched=k; renderBuildPreview(ref,want); renderBuilderLogic(k,builderValues(),ref); };
  constructSeq.forEach(k=>{
    const s=byKey[k]; if(!s) return;
    box.appendChild(dnaSegEl(s,{selected:ANA.key===k,onPick:repick}));
  });
  want.filter(k=>!constructSeq.includes(k)).forEach(k=>{
    const g=document.createElement("span"); g.className="ghost-seg"; g.textContent=`[${RULES[k]?.label||k}]`; g.title="Not yet placed — use the tray below";
    box.appendChild(g);
  });
  if(!constructSeq.length && !box.children.length) box.innerHTML=`<span class="micro">Place the first component below — who is responsible?</span>`;
  const sc=$("#builderScale");
  if(sc){
    sc.innerHTML="";
    want.forEach(k=>{
      const placed=constructSeq.includes(k);
      sc.appendChild(dnaNodeEl(k,{active:ANA.key===k,extra:placed?" placed":"",prefix:(placed?"\u2713 ":""),ariaPrefix:placed?"Placed: ":"Pending: ",onPick:repick}));
    });
  }
}
function renderConstructStrip(ref,want,resetNotice){
  const track=$("#constructTrack"), pool=$("#constructPool");
  track.innerHTML=constructSeq.length?constructSeq.map(k=>`<span class="track-bit">${esc(RULES[k]?.label||k)}</span>`).join(""):`<span class="micro">Place the first component — who is responsible?</span>`;
  const remaining=want.filter(k=>!constructSeq.includes(k));
  pool.innerHTML=remaining.length?[...remaining].sort(()=>Math.random()-.5).map(k=>`<button class="note-chip" data-ck="${k}"><div class="k">${esc(RULES[k]?.label||k)}</div><div class="micro">place next</div></button>`).join(""):`<span class="micro">All components placed.</span>`;
  $$("#constructPool [data-ck]").forEach(b=>b.addEventListener("click",()=>{
    constructSeq.push(b.dataset.ck); lastTouched=b.dataset.ck;
    const v=builderValues(); const r2=buildReference(v); const w2=componentsOf(r2);
    if(JSON.stringify(constructSeq)===JSON.stringify(w2.slice(0,constructSeq.length))){
      $("#constructMsg").textContent=constructSeq.length===w2.length?"✓ Construction complete — compare with the live reference above.":"✓ Placed. What must come next?";
      if(constructSeq.length===w2.length){ $$("#constructTrack .track-bit").forEach(t=>t.classList.add("locked")); addSkill("ordering",6,true,"workbench"); S.buildCount=(S.buildCount||0)+1; save(); }
    } else {
      constructSeq.pop();
      $("#constructMsg").textContent="△ That component cannot sit there — reconsider what APA demands at this position.";
      logErr("ordering");
    }
    renderBuilder();
  }));
  if(resetNotice){
    $("#constructMsg").innerHTML=`<div class="rule-block amber"><strong>Construction reset — the evidence changed the structure.</strong><br><span class="micro">Editing the source information changed this citation's components, so the previous assembly was cleared to prevent an invalid reference. Rebuild from the tray — the new structure is already mapped below.</span></div>`;
  } else if(!$("#constructMsg").textContent) $("#constructMsg").textContent="";
}
function transformNote(key,v){
  if(key==="author" && v.sourceType==="video") return `<div class="rule-block"><strong>Channel names stay verbatim</strong><br><span class="micro">Screen names are never inverted into surname + initials.</span></div>`;
  if(key==="author" && v.authors && !String(v.authors).includes(",")) return `<div class="rule-block green"><strong>You entered</strong> <code>${esc(v.authors)}</code><br><strong>APA uses</strong> <code>${esc(formatAuthorList(v.authors))}</code><br><span class="micro">Surname first, then initials — so lists sort correctly.</span></div>`;
  if(key==="authors") return transformNote("author",v);
  if(key==="title" && v.title) return `<div class="rule-block green"><strong>You entered</strong> <code>${esc(v.title)}</code><br><strong>APA uses</strong> <code>${esc(sentenceCase(v.title))}</code><br><span class="micro">Sentence case: first word, proper nouns, post-colon word.</span></div>`+titleReviewHTML(v.title);
  if(key==="date" && !v.year) return `<div class="rule-block amber"><strong>Date unavailable</strong><br><span class="micro">APA requires <code>(n.d.)</code> — never invent a year.</span></div>`;
  if(key==="doi" && v.doi) return `<div class="rule-block green"><strong>Resolved as DOI:</strong> <code>${esc(normDoi(v.doi))}</code><br><span class="micro">Full hyperlink, no trailing period.</span></div>`;
  if(key==="author" && v.authors && isOrg(v.authors)) return `<div class="rule-block"><strong>Organization author mode</strong><br><span class="micro">Group authors are spelled out in full.</span></div>`;
  return "";
}
function renderBuilderLogic(key,v,ref){
  const seg=(ref.segs.find(s=>s.key===key)?.text||"").trim();
  const rawMap={authors:v.authors,year:v.year,title:v.title,journal:v.journal||v.siteName||v.publisher,volume:v.volume,pages:v.pages,doi:v.doi,publisher:v.publisher,editors:v.editors,date:v.year};
  $("#builderInspector").innerHTML=`<p class="eyebrow">Current decision · ${(RULES[key]?.label||key).toUpperCase()}</p>`+
    (transformNote(key,v)||`<p class="micro">Touch any evidence field or citation component — this panel explains only the current decision.</p>`)+
    (seg?`<div class="rule-block"><strong>Output segment</strong><br><code>${esc(seg)}</code></div>`:"");
}
$("#btnBlindMode").addEventListener("click",()=>{
  blindMode=!blindMode; renderBuilderFields(); renderBuilder();
  $("#btnBlindMode").textContent=blindMode?"Blind build: show field labels":"Blind build: hide field labels";
  if(blindMode) toast("Labels hidden — identify each field by its content, like real research.");
});
$$("[data-wstep]").forEach(b=>b.addEventListener("click",()=>{
  $$("[data-wstep]").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  const w=$(".split.workbench"); w.classList.remove("wstep-ev","wstep-build","wstep-logic"); w.classList.add("wstep-"+b.dataset.wstep);
}));
$("#btnBuilderCopy").addEventListener("click",()=>{ const v=builderValues(); const ref=buildReference(v); const want=componentsOf(ref); if(!(constructSeq.length>0&&constructSeq.length===want.length)){ toast("Build the structure before copying."); return; } if(navigator.clipboard) navigator.clipboard.writeText(ref.text).catch(()=>{}); toast("Copied — only keep it if you can defend every component."); logActivity("Copied a verified workbench reference"); });
$("#btnBuilderSave").addEventListener("click",()=>{ const v=builderValues(); if(!String(v.authors||"").trim()||!String(v.title||"").trim()){ toast("Evidence incomplete — author and title are required."); return; } const t=buildReference(v).text; S.refs.push({text:t,type:builderType,a:v.authors,y:v.year||"n.d.",m:"Workbench",ts:Date.now()}); save(); updateRailDots(); toast("Archived in the research collection."); logActivity("Archived workbench reference ("+builderType+")","g"); });

/* ---------------- INSPECT: forensics + reconstruction + detective ---------------- */
let repairRunId=0;
function updateShowFix(){
  const ok=!!window._reconAttempted;
  const b=$("#btnShowFix"); if(b) b.disabled=!ok;
  const h=$("#showFixHint"); if(h) h.textContent=ok?"Correction unlocked — compare your structure, then reveal.":"Reconstruct the reference first — place at least one fragment.";
}
function renderExhibitMeta(raw,notes){
  const box=$("#repExMeta"); if(!box) return;
  if(!raw||!notes){ box.style.display="none"; box.innerHTML=""; return; }
  const sev={ok:0,warn:0,err:0};
  notes.forEach(n=>{ sev[n.s]=(sev[n.s]||0)+1; });
  const words=raw.trim().split(/\s+/).length;
  const found=["author","date","title","journal","volume","pages","doi","url"].filter(k=>notes.some(n=>n.k===k)).filter(k=>k!=="date"||/\b(19|20)\d{2}\b/.test(raw)).length;
  box.style.display="";
  box.innerHTML=`<span class="xm"><b>${notes.length}</b> traces</span><span class="xm ok"><b>${sev.ok}</b> keep</span><span class="xm warn"><b>${sev.warn}</b> review</span><span class="xm err"><b>${sev.err}</b> fault${sev.err===1?"":"s"}</span><span class="xm"><b>${found}/8</b> fields</span><span class="xm"><b>${words}</b> words</span>`;
}
const APA_FIELD_ORDER=["author","date","title","journal","volume","pages","doi","url"];
function renderFieldMap(foundSeq,apaSeq){
  const box=$("#repFieldMap"); if(!box) return;
  if(!foundSeq||!foundSeq.length){ box.style.display="none"; box.innerHTML=""; return; }
  const has=(seq,k)=>seq.includes(k);
  const row=(label,seq,cmp)=>`<div class="fm-row"><span class="fm-label">${label}</span><div class="fm-chips">${APA_FIELD_ORDER.filter(k=>has(seq,k)||has(cmp,k)).map(k=>{
    const inSeq=has(seq,k), inCmp=has(cmp,k);
    const cls=inSeq&&inCmp?"":inSeq?"fm-extra":"fm-miss";
    return `<span class="fm-chip ${cls}">${k.toUpperCase()}</span>`;
  }).join("")||`<span class="micro">nothing recognized</span>`}</div></div>`;
  box.style.display="";
  box.innerHTML=`<p class="eyebrow fm-sec">Field map</p>`+row("AS FOUND",foundSeq,apaSeq)+row("APA 7",apaSeq,foundSeq)+
    `<p class="micro fm-foot">Amber = found but not in APA order · red = APA expects it and the exhibit lacks it.</p>`;
}
function renderReportIndex(state){
  const box=$("#repReportIndex"); if(!box) return;
  const steps=state?["open","open","open","ready"]:["sealed","sealed","sealed","locked"];
  [...box.querySelectorAll(".ri-row")].forEach((r,i)=>{
    const st=r.querySelector(".ri-st");
    st.textContent=steps[i]||"sealed";
    r.classList.toggle("open", !!state);
    if(i===3&&state) r.classList.add("ready"); else r.classList.remove("ready");
  });
}
$("#btnRepairRun").addEventListener("click",()=>{
  const raw=$("#repairInput").value;
  if(!raw.trim()){ toast("Place an exhibit on the bench first."); return; }
  const my=++repairRunId;
  const {fields,notes}=parseCitation(raw);
  $("#repLeft").textContent=raw;
  renderExhibitMeta(raw,notes);
  const order=["author","date","title","journal","volume","pages","doi","url"];
  const byKey={}; notes.forEach(n=>{ byKey[n.k]=n; });
  $("#repCenter").innerHTML=`<table class="forensic-table" aria-label="Structural check">${order.filter(k=>byKey[k]).map(k=>{ const n=byKey[k];
    return `<tr><td class="fk">${esc(k.toUpperCase())}</td><td><span class="mark ${n.s==="ok"?"ok":n.s==="warn"?"warn":"err"}">${n.s==="ok"?"✓":n.s==="warn"?"△":"✕"}</span></td><td class="micro">${esc(n.t)}</td></tr>`; }).join("")}</table>
    <p class="micro" style="margin-top:8px"><span class="tag blue">DETERMINISTIC REBUILD</span> <span class="micro">detection is interpretation; the rebuild follows rules.</span></p>`;
  const ref=buildReference(fields);
  const literalDate=/\b(19|20)\d{2}\b/.test(raw);
  renderFieldMap(order.filter(k=>byKey[k]).filter(k=>k!=="date"||literalDate),[...new Set(ref.segs.map(s=>s.key))]);
  renderReportIndex(0);
  renderRecon(fields,ref);
  $("#repFindings").innerHTML=`<p class="micro">Reconstruct the fragments below first — the correction stays sealed until you try.</p>`;
  $("#repFixedWrap").style.display="none"; $("#repDiff").innerHTML=`<div class="diff-row"><div class="dl">STATUS</div><div class="dv micro">Exhibit under investigation — reconstruct below.</div></div>`;
  window._lastRepair={raw,corrected:ref.text,fields,notes};
  window._reconAttempted=false; updateShowFix();
  S.repairCount=(S.repairCount||0)+1;
  addSkill("author",2); addSkill("date",2); logActivity("Opened a forensics case","g"); updateRailDots();
});
$("#btnShowFix").addEventListener("click",()=>{
  const R=window._lastRepair; if(!R){ toast("Investigate an exhibit first."); return; }
  const ref=buildReference(R.fields);
  const right=$("#repRight"); right.textContent="Reconstructing…";
  const my=repairRunId; let i=0; const order=ref.segs.map(s=>s.text);
  const step=()=>{ if(my!==repairRunId) return;
    if(i<=order.length){ right.textContent=order.slice(0,i).join(" "); i++; setTimeout(step,160); }
    else {
      renderAnatomy("#repRight","#repScale",ref,{onPick:(key)=>openModal("APA rule · "+(RULES[key]?.label||key),(RULES[key]?.rule||"").split(".")[0]+".",ruleCardHTML(key))});
      $("#repFixedWrap").style.display="";
      renderReportIndex(1);
      const n=Object.keys(S.detectiveDone).length;
      $("#repFindings").innerHTML=R.notes.map((x,j)=>`<div class="finding${x.s==="ok"?" ok-infer":""}"><div class="f-no">FINDING #${String(j+1).padStart(2,"0")} · ${esc(x.k.toUpperCase())} ${x.s==="ok"?"✓":x.s==="warn"?"△":"✕"}</div><p class="micro">${esc(x.t)}</p><div class="btn-row"><button class="btn small ghost" data-tracerule="${esc(x.k)}">Trace rule</button></div></div>`).join("");
      $$("#repFindings [data-tracerule]").forEach(b=>b.addEventListener("click",()=>{ const id=SKILL_LESSON[b.dataset.tracerule]||"f04"; const li=ALL_LESSONS.findIndex(l=>l.id===id); lessonIdx=li>=0?li:0; go("learn"); renderLesson(); }));
      renderRepDiff(R.raw,ref.text,R.notes);
      addSkill("ordering",4,true,"forensics","guided"); logActivity("Revealed a forensics correction","g"); renderMasterySafe();
    } };
  step();
});
function renderRepDiff(orig,corrected,notes){
  $("#repDiff").innerHTML=[["EXHIBIT",orig],["APA 7",corrected]].map(([k,v])=>`<div class="diff-row"><div class="dl">${k}</div><div class="dv">${esc(v)}</div></div>`).join("")+
  `<div class="diff-row"><div class="dl">TRACES</div><div class="dv micro">${notes.map(n=>`<span class="change-tag">${esc(n.k)} ${n.s==="ok"?"✓":n.s==="warn"?"△":"✕"}</span>`).join(" ")}<br><br>Markers: <span class="change-tag">J <span class="arrow">→</span> J.</span> <span class="change-tag">2025 <span class="arrow">→</span> (2025).</span> <span class="change-tag">DOI: 10… <span class="arrow">→</span> https://doi.org/10…</span></div></div>`;
}
$("#btnRepairSample").addEventListener("click",()=>{ $("#repairInput").value="Smith J 2024. Effects of microplastics. Environmental Science, 14(2), 31-44."; });
$("#btnRepairClear").addEventListener("click",()=>{ $("#repairInput").value=""; $("#repLeft").textContent="—"; renderExhibitMeta("",null); renderFieldMap([],[]); renderReportIndex(0); $("#repCenter").innerHTML=`<p class="micro">Investigate to open the case report.</p>`; $("#repFindings").innerHTML=`<p class="micro">No findings yet.</p>`; window._lastRepair=null; window._reconAttempted=false; updateShowFix(); });
$("#btnRepSave").addEventListener("click",()=>{ if(!window._lastRepair){ toast("Investigate an exhibit first."); return; } const R=window._lastRepair; S.refs.push({text:R.corrected,type:"journal",a:R.fields.authors,y:R.fields.year,m:"Forensics",ts:Date.now()}); save(); updateRailDots(); toast("Corrected exhibit archived."); });
/* reconstruction lab */
let reconSeq=[];
function renderRecon(fields,ref){
  reconSeq=[];
  const keys=[...new Set(ref.segs.map(s=>s.key))];
  const first={}; ref.segs.forEach(s=>{ if(!first[s.key]) first[s.key]=s; });
  const pool=$("#reconPool"), track=$("#reconTrack");
  pool.innerHTML=""; track.innerHTML=`<span class="micro">Place fragments in the order APA demands…</span>`; track.dataset.seq="";
  $("#reconCompare").style.display="none"; $("#reconMsg").textContent="";
  [...keys].sort(()=>Math.random()-.5).forEach(k=>{
    const b=document.createElement("button"); b.className="note-chip";
    b.innerHTML=`<div class="micro">${esc(first[k].text.trim())}</div><div class="k">FRAGMENT</div>`;
    b.addEventListener("click",()=>{
      const seq=(track.dataset.seq?track.dataset.seq.split(","):[]); seq.push(k); track.dataset.seq=seq.join(",");
      const c=document.createElement("button"); c.className="drop-chip"; c.textContent=(RULES[k]?.label||k); track.appendChild(c);
      track.querySelector(".micro")?.remove(); b.disabled=true; b.style.opacity=.4;
    }); pool.appendChild(b);
  });
  pool.dataset.want=keys.join(","); pool.dataset.text=ref.text;
  window._reconFirst=first;
}
$("#btnReconReset").addEventListener("click",()=>{ if(window._lastRepair) renderRecon(window._lastRepair.fields,buildReference(window._lastRepair.fields)); });
$("#btnReconCheck").addEventListener("click",()=>{
  const pool=$("#reconPool"); if(!pool.dataset.want){ toast("Investigate an exhibit first."); return; }
  const want=pool.dataset.want.split(","), got=($("#reconTrack").dataset.seq||"").split(",").filter(Boolean);
  if(!got.length){ toast("Place at least one fragment — an empty tray is not an attempt."); return; }
  window._reconAttempted=true; updateShowFix();
  const box=$("#reconCompare"); box.style.display="";
  if(JSON.stringify(got)===JSON.stringify(want)){
    box.innerHTML=`<div class="diff-row"><div class="dl">MATCH</div><div class="dv micro">✓ Your structure matches APA structure. The correction below holds no surprises — reveal it.</div></div>`;
    $("#reconMsg").textContent="✓ Reconstruction matches. Reveal the correction when ready.";
    orderReset("recon");
    addSkill("ordering",8,true,"reconstruction","independent"); logActivity("Reconstructed a fragmented citation","g");
  } else {
    const yours=got.map(k=>window._reconFirst[k]?.text||"").join(" ");
    box.innerHTML=`<div class="diff-row"><div class="dl">YOURS</div><div class="dv">${esc(yours||"(nothing placed)")}</div></div><div class="diff-row"><div class="dl">APA</div><div class="dv">${esc(pool.dataset.text)}</div></div>`;
    $("#reconMsg").textContent="△ "+orderFeedback("recon",want.map(k=>RULES[k]?.label||k),got.map(k=>RULES[k]?.label||k));
    logErr("ordering");
  }
  renderMasterySafe();
});
/* detective (moved under Inspect) */
let detIdx=0, detFound=new Set();
function renderDetective(){
  const C=DETECTIVE[detIdx]; detFound=new Set(S.detective[detIdx]||[]);
  const errCount=()=>[...detFound].filter(x=>C.errors.includes(x)).length;
  $("#detTitle").textContent=C.title;
  $("#detScore").textContent=`FOUND ${errCount()}/${C.errors.length}`;
  const box=$("#detCite"); box.innerHTML="";
  C.cite.forEach((seg,i)=>{
    const sp=document.createElement("span"); sp.className="susp"+(detFound.has(seg.err||("ok"+i))&&seg.err?" found-err":detFound.has("ok"+i)?" found-ok":"");
    sp.textContent=seg.t; sp.tabIndex=0; sp.setAttribute("role","button"); sp.setAttribute("aria-label","Inspect: "+seg.t);
    const probe=()=>{
      if(seg.ok){ detFound.add("ok"+i); $("#detMsg").textContent="Sound structure — keep hunting the real faults."; sp.classList.add("found-ok"); }
      else if(detFound.has(seg.err)){ $("#detMsg").textContent="Already logged: "+seg.why; }
      else { detFound.add(seg.err); $("#detMsg").innerHTML=`<strong>Fault confirmed.</strong> ${esc(seg.why)}<br><span class="micro">Canonical form: <code>${esc(seg.fix)}</code></span>`; sp.classList.add("found-err"); addSkill(seg.err==="author"?"author":seg.err==="date"?"date":seg.err==="title"?"title":seg.err==="doi"?"doi":"ordering",6,true,"detective","independent"); }
      S.detective[detIdx]=[...detFound]; save();
      $("#detScore").textContent=`FOUND ${[...detFound].filter(x=>C.errors.includes(x)).length}/${C.errors.length}`;
      renderDetLog();
      if(C.errors.every(e=>detFound.has(e))){
        S.detectiveDone=S.detectiveDone||{};
        if(!S.detectiveDone[detIdx]){ S.detectiveDone[detIdx]=1; S.detectiveSolved=Object.keys(S.detectiveDone).length; save(); logActivity("Closed "+C.title,"g"); toast("◉ Case closed and logged."); renderMasterySafe(); updateRailDots(); }
      }
    };
    sp.addEventListener("click",probe); sp.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); probe(); }});
    box.appendChild(sp);
  });
  $("#detMsg").textContent="Click directly on the structural faults.";
  renderDetLog();
}
function renderDetLog(){
  const C=DETECTIVE[detIdx];
  $("#detLog").innerHTML=C.cite.filter(s=>s.err&&detFound.has(s.err)).map(s=>`<li><span class="mark err">✕</span><span>${esc(s.why)}<br><span class="micro">Canonical → <code>${esc(s.fix)}</code></span></span></li>`).join("")||`<li><span class="mark warn">△</span><span>No confirmed faults. <span class="micro">Years, casing, ranges, and identifier hygiene are the usual suspects.</span></span></li>`;
}
$("#btnDetPrev").addEventListener("click",()=>{ detIdx=(detIdx+DETECTIVE.length-1)%DETECTIVE.length; renderDetective(); });
$("#btnDetNext").addEventListener("click",()=>{ detIdx=(detIdx+1)%DETECTIVE.length; renderDetective(); });
$("#btnDetReset").addEventListener("click",()=>{ delete S.detective[detIdx]; if(S.detectiveDone){ delete S.detectiveDone[detIdx]; S.detectiveSolved=Object.keys(S.detectiveDone).length; } save(); renderDetective(); renderMasterySafe(); updateRailDots(); });

/* ---------------- RESEARCH: missions + notebook + archive ---------------- */
let missionTrack=3;
   $$("[data-dtab]").forEach(b=>b.addEventListener("click",()=>{ $$("[data-dtab]").forEach(x=>x.classList.toggle("active",x===b)); $$(".subview").forEach(v=>v.classList.remove("active")); $("#dtab-"+b.dataset.dtab).classList.add("active"); if(b.dataset.dtab==="refs") renderRefs(); if(b.dataset.dtab==="sources") renderSourceExplorer(); }));
const TYPE_RULES={journal:["author","date","title","journal","volume","pages","doi"],book:["author","date","title","publisher"],chapter:["author","date","title","editors","publisher"],website:["author","date","title","journal","url"],report:["author","date","title","publisher"],gov:["author","date","title","publisher"],dataset:["author","date","title","publisher","doi"],video:["author","date","title","url"],conference:["author","date","title","journal"],thesis:["author","date","title","publisher"]};
function missionState(t){ S.missions[t]=S.missions[t]||{step:0,cls:{},bld:{},int:{},jdg:{},done:0}; return S.missions[t]; }
function renderMissions(){
  $("#stemTabs").innerHTML=STEM.map((s,i)=>`<button class="tab ${i===missionTrack?"active":""}" data-mission="${i}">${s.mission} · ${s.track}</button>`).join("");
  $$("#stemTabs [data-mission]").forEach(b=>b.addEventListener("click",()=>{ missionTrack=+b.dataset.mission; renderMissions(); }));
  const M=STEM[missionTrack], st=missionState(M.track); st.jdg=st.jdg||{};
  const steps=["Brief","Classify","Construct","Apply in-text","Reference list","Research judgment","Inspection"];
  const rules=[...new Set(M.sources.flatMap(s=>TYPE_RULES[s.type]||[]))];
  const stage=st.done?7:st.step;
  const clsN=M.sources.filter((_,i)=>st.cls[i]).length;
  const bldN=M.sources.filter((_,i)=>st.bld[i]&&st.bld[i].length).length;
  const intN=M.sources.filter((_,i)=>st.int[i]&&st.int[i]!=="wrong").length;
  const jdgN=(M.judge||[]).filter((_,i)=>st.jdg[i]).length;
  const typeLabel=id=>(SOURCE_TYPES.find(t=>t.id===id)||{}).t||id;
  const dossier=`<aside class="mission-dossier" aria-label="Mission dossier">
    <div class="dos-head"><span class="eyebrow">Mission dossier</span><span class="tag ${st.done?"green":"blue"}">${st.done?"SEALED":String(stage+1).padStart(2,"0")+"/07"}</span></div>
    <div class="dos-bar" role="progressbar" aria-valuenow="${Math.round(stage/7*100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round(stage/7*100)}%"></i></div>
    <p class="eyebrow dos-sec">Source manifest · ${M.sources.length} record${M.sources.length>1?"s":""}</p>
    <ol class="dos-list">${M.sources.map((s,i)=>`<li${st.cls[i]?" class=\"ok\"":""}><span class="dos-no">${String(i+1).padStart(2,"0")}</span><span class="dos-body"><span class="dos-type">${esc(typeLabel(s.type))}</span><span class="dos-title">${esc(s.title)}</span><span class="dos-meta">${esc(s.authors)} · ${esc(s.year)}${st.cls[i]?" · classified":""}</span></span></li>`).join("")}</ol>
    <p class="eyebrow dos-sec">Evidence secured</p>
    <ul class="dos-tally">
      <li${clsN===M.sources.length?' class="ok"':''}><span>Classified</span><b>${clsN}/${M.sources.length}</b></li>
      <li${bldN===M.sources.length?' class="ok"':''}><span>Constructed</span><b>${bldN}/${M.sources.length}</b></li>
      <li${intN===M.sources.length?' class="ok"':''}><span>In-text pointers</span><b>${intN}/${M.sources.length}</b></li>
      <li${jdgN===(M.judge||[]).length&&M.judge?' class="ok"':''}><span>Judgment</span><b>${jdgN}/${(M.judge||[]).length}</b></li>
      <li${st.done?' class="ok"':''}><span>Inspection</span><b>${st.done?"passed":"pending"}</b></li>
    </ul>
    <p class="eyebrow dos-sec">APA rules this file demonstrates · ${rules.length}</p>
    <div class="dos-rules">${rules.map(k=>`<button class="dos-chip" data-tracerule="${esc(k)}">${esc(RULES[k]?.label||k)}</button>`).join("")}</div>
  </aside>`;
  let body=`<div class="mission-brief"><p class="eyebrow">${esc(M.mission)} · ${esc(M.track)}</p><p style="margin:0">${esc(M.brief)}</p></div>
  <div class="mission-board">
    <div class="mission-steps" role="list" aria-label="Mission file progress">${steps.map((s,i)=>`<span class="mstep${i<st.step?" done":i===st.step?" now":""}" role="listitem"><span class="msym" aria-hidden="true">${i<st.step?"✓":i===st.step?"△":"—"}</span>${i+1} · ${s.toUpperCase()}</span>`).join("")}</div>
    ${dossier}
  </div>`;
  if(st.done){
    const refs=M.sources.map(s=>buildReference({sourceType:s.type,...s}).text).sort();
    const intexts=M.sources.map(s=>{ const it=intextFor(s.authors,s.year); return it.paren; });
    const trail=M.sources.map(s=>({p:intextFor(s.authors,s.year).paren,r:buildReference({sourceType:s.type,...s}).text}));
    body+=`<div class="sealed-file"><p class="eyebrow">Research file · ${esc(M.mission)}</p>
    <h3 class="h3">Research file sealed — no confetti, just order.</h3>
    <div class="seal-grid">
      <div><span class="mono micro">SOURCES</span><br><strong>${M.sources.length}</strong></div>
      <div><span class="mono micro">IN-TEXT POINTERS</span><br><strong>${intexts.length}</strong></div>
      <div><span class="mono micro">REFERENCES</span><br><strong>${refs.length}</strong></div>
      <div><span class="mono micro">RULES DEMONSTRATED</span><br><strong>${rules.length}</strong></div>
    </div>
    <p class="eyebrow" style="margin-top:12px">01 · Question</p><p class="micro">${esc(M.brief)}</p>
    <p class="eyebrow" style="margin-top:8px">02 · Evidence</p><p class="micro">${M.sources.map(s=>esc(s.title)+" — "+esc(s.authors)+", "+esc(s.year)).join("<br>")}</p>
    <p class="eyebrow" style="margin-top:8px">03 · Claims</p><p class="micro">Pointers placed: ${intexts.map(x=>`<code>${esc(x)}</code>`).join(" ")}</p>
    <p class="eyebrow" style="margin-top:8px">04 · Citation trail</p><p class="micro">${trail.map(t=>`<code>${esc(t.p)}</code> → ${esc(t.r.slice(0,72))}…`).join("<br>")}</p>
    <p class="eyebrow" style="margin-top:8px">05 · APA</p><p class="micro">Rules: ${rules.map(r=>esc(RULES[r]?.label||r)).join(" · ")}</p>
    <p class="eyebrow" style="margin-top:8px">06 · Research judgment</p><p class="micro">${(M.judge||[]).map(j=>esc(j.q)+" → <strong>"+esc(j.opts[j.a])+"</strong>").join("<br>")}</p></div>
    <div class="paper-para">${refs.map(r=>esc(r)).join("<br><br>")}</div>
    <div class="btn-row"><button class="btn small" id="btnMissionArchive">Archive set → collection</button><button class="btn small ghost" id="btnMissionRedo">Re-run mission</button></div>`;
  } else if(st.step===0){
    body+=`<p class="micro">Read the brief. Open the source room when the goal is clear.</p><div class="btn-row"><button class="btn small primary" id="btnMissionNext">Open the source room →</button></div>`;
  } else if(st.step===1){
    body+=`<p class="eyebrow">Source room — classify every record</p><div class="source-room">${M.sources.map((s,i)=>`
      <div class="panel"><p class="eyebrow">Record ${String(i+1).padStart(2,"0")}</p>
      <div class="evidence">${Object.entries(s).filter(([k])=>k!=="type").map(([k,v])=>`<div class="ev"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>
      <div class="btn-row" style="margin-top:8px">${SOURCE_TYPES.map(t=>`<button class="btn small ${st.cls[i]===t.id?"primary":"ghost"}" data-mcls="${i}:${t.id}">${t.t}</button>`).join("")}</div>
      <p class="micro" id="mclsMsg-${i}">${st.cls[i]?"✓ Classified.":"Which kind of source is this?"}</p></div>`).join("")}</div>
      <div class="btn-row"><button class="btn small primary" id="btnMissionNext" ${M.sources.every((s,i)=>st.cls[i]===s.type)?"":"disabled"}>Construct citations →</button></div>`;
  } else if(st.step===2){
    const i=st.buildIdx||0, s=M.sources[i];
    const full={sourceType:s.type,...s};
    const want=[...new Set(buildReference(full).segs.map(x=>x.key))];
    const seq=st.bld[i]||[];
    body+=`<p class="eyebrow">Construction — record ${i+1}/${M.sources.length}: order its components</p>
    <div class="evidence">${Object.entries(s).filter(([k])=>k!=="type").map(([k,v])=>`<div class="ev"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>
    <div class="drop-zone" id="mBuildTrack" style="margin-top:8px">${seq.length?seq.map(k=>`<span class="track-bit">${esc(RULES[k]?.label||k)}</span>`).join(""):`<span class="micro">Place components in APA order…</span>`}</div>
    <div class="note-grid">${want.filter(k=>!seq.includes(k)).sort(()=>Math.random()-.5).map(k=>`<button class="note-chip" data-mb="${k}"><div class="k">${esc(RULES[k]?.label||k)}</div></button>`).join("")}</div>
    <p class="micro" id="mBuildMsg" role="status"></p>
    <div class="btn-row"><button class="btn small ghost" id="btnMissionBack">← Back</button><button class="btn small primary" id="btnMissionNext" ${seq.length===want.length?"":"disabled"}>Apply in-text →</button></div>`;
  } else if(st.step===3){
    const i=st.intIdx||0, s=M.sources[i];
    const it=intextFor(s.authors,s.year);
    const cur=st.int[i];
    body+=`<p class="eyebrow">In-text application — record ${i+1}/${M.sources.length}</p>
    <div class="paper-para">Your mission paragraph cites this finding ${cur?`<strong>${esc(cur)}</strong>`:`<span class="cite-slot">⊕ place citation</span>`}.</div>
    <div class="evidence" style="margin-top:8px">${Object.entries({Authors:s.authors,Year:s.year,Work:s.title}).map(([k,v])=>`<div class="ev"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>
    <div class="btn-row"><button class="btn small" data-mint="${esc(it.paren)}">${esc(it.paren)}</button><button class="btn small" data-mint="${esc(it.narr)}">${esc(it.narr)}</button><button class="btn small ghost" data-mint="wrong">(Wrong form)</button></div>
    <p class="micro" id="mIntMsg" role="status">${cur?"✓ Pointer placed.":"Choose the exact APA form — parenthetical or narrative."}</p>
    <div class="btn-row"><button class="btn small ghost" id="btnMissionBack">← Back</button><button class="btn small primary" id="btnMissionNext" ${M.sources.every((_,j)=>st.int[j]&&st.int[j]!=="wrong")?"":"disabled"}>Assemble reference list →</button></div>`;
  } else if(st.step===4){
    const refs=M.sources.map(s=>buildReference({sourceType:s.type,...s}).text).sort();
    body+=`<p class="eyebrow">Reference list — is this archive-ready?</p><div class="paper-para">${refs.map(r=>esc(r)).join("<br><br>")}</div>
    <p class="micro" style="margin-top:8px">Confirm: alphabetical by surname, every entry dated, every identifier a live link?</p>
    <div class="btn-row"><button class="btn small ghost" id="btnMissionBack">← Back</button><button class="btn small primary" id="btnMissionNext">Defend the file →</button></div>`;
  } else if(st.step===5){
    const J=M.judge||[], allHeld=J.every((_,j)=>st.jdg[j]);
    body+=`<p class="eyebrow">Research judgment — decide before inspection</p><p class="micro">The file is assembled. Now defend it: each decision below is part of the sealed record.</p><div id="mJudgeBox">`;
    J.forEach((q,j)=>{
      if(st.jdg[j]){ body+=`<div class="rule-block green"><strong>Q${j+1} held.</strong><br><span class="micro">${esc(q.q)} → <strong>${esc(q.opts[q.a])}</strong><br>${esc(q.why)}</span></div>`; }
      else { body+=`<h3 class="h3" style="font-size:13.5px;margin-top:10px">Q${j+1} · ${esc(q.q)}</h3><div id="mJudgeOpts-${j}" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="mJudgeMsg-${j}" role="status"></p>`; }
    });
    body+=`</div><div class="btn-row"><button class="btn small ghost" id="btnMissionBack">← Back</button><button class="btn small primary" id="btnMissionNext" ${allHeld?"":"disabled"}>Run final inspection →</button></div>`;
  } else {
    const refs=M.sources.map((s,i)=>({text:buildReference({sourceType:s.type,...s}).text,type:s.type}));
    const issues=[];
    refs.forEach((r,i)=>{ if(!/\(\d{4}[,)]|\(n\.d\.\)/.test(r.text)) issues.push(`Record ${i+1}: date cue missing.`); if(!/https?:\/\//.test(r.text)&&r.type==="journal") issues.push(`Record ${i+1}: journal entry without identifier.`); });
    const sorted=[...refs].sort((a,b)=>a.text.localeCompare(b.text));
    if(!refs.every((r,i)=>r.text===sorted[i].text)) issues.push("List is not alphabetical.");
    body+=`<p class="eyebrow">Final inspection</p>${issues.length?`<ul class="check-list">${issues.map(t=>`<li><span class="mark warn">△</span><span>${esc(t)}</span></li>`).join("")}</ul><div class="btn-row"><button class="btn small ghost" id="btnMissionBack">← Back to list</button></div>`:`<div class="rule-block green"><strong>Inspection passed.</strong> <span class="micro">Alphabetical, dated, linked.</span></div><div class="btn-row"><button class="btn small green" id="btnMissionDone">Seal the research file</button></div>`}`;
  }
  $("#stemBody").innerHTML=body;
  $$("#stemBody .dos-chip[data-tracerule]").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.tracerule;
    openModal("APA rule · "+(RULES[k]?.label||k),(RULES[k]?.rule||"").split(".")[0]+".",ruleCardHTML(k));
  }));
  const nx=$("#btnMissionNext"); if(nx) nx.addEventListener("click",()=>{ st.step=Math.min(6,st.step+1); save(); renderMissions(); });
  const bk=$("#btnMissionBack"); if(bk) bk.addEventListener("click",()=>{ st.step=Math.max(0,st.step-1); save(); renderMissions(); });
  $$("#stemBody [data-mcls]").forEach(b=>b.addEventListener("click",()=>{
    const [si,tid]=b.dataset.mcls.split(":"); const s=M.sources[+si];
    if(tid===s.type){ st.cls[si]=tid; S.classOk++; addSkill("classify",6,true,"mission-classify","guided"); logActivity("Classified "+tid+" in "+M.track,"g"); }
    else { $("#mclsMsg-"+si).textContent="△ Not "+tid+" — read the container clues again."; logErr("classify"); }
    save(); renderMissions(); renderMasterySafe();
  }));
  $$("#stemBody [data-mb]").forEach(b=>b.addEventListener("click",()=>{
    const i=st.buildIdx||0, s=M.sources[i];
    const want=[...new Set(buildReference({sourceType:s.type,...s}).segs.map(x=>x.key))];
    st.bld[i]=st.bld[i]||[]; st.bld[i].push(b.dataset.mb);
    if(JSON.stringify(st.bld[i])===JSON.stringify(want.slice(0,st.bld[i].length))){
      if(st.bld[i].length===want.length){ addSkill("ordering",6,true,"mission-construct","guided"); logActivity("Constructed mission record "+(i+1),"g"); orderReset("mission-construct"); st.buildIdx=(st.buildIdx||0)+1; if(st.buildIdx>=M.sources.length){ st.buildIdx=0; st.step=3; } }
    } else { $("#mBuildMsg").textContent="△ "+orderFeedback("mission-construct",want.map(k=>RULES[k]?.label||k),(st.bld[i]||[]).map(k=>RULES[k]?.label||k))+ " That fragment was set aside — try another position."; st.bld[i].pop(); logErr("ordering"); }
    save(); renderMissions();
  }));
  $$("#stemBody [data-mint]").forEach(b=>b.addEventListener("click",()=>{
    const i=st.intIdx||0;
    if(b.dataset.mint==="wrong"){ $("#mIntMsg").textContent="△ That form does not exist — compare punctuation carefully."; logErr("intext1"); return; }
    st.int[i]=b.dataset.mint; addSkill("intext1",6,true,"mission-intext","guided"); logActivity("Applied in-text citation in mission","g");
    st.intIdx=(st.intIdx||0)+1; if(st.intIdx>=M.sources.length) st.intIdx=0;
    save(); renderMissions(); renderMasterySafe();
  }));
  (M.judge||[]).forEach((q,j)=>{
    const box=$("#mJudgeOpts-"+j); if(!box||st.jdg[j]) return;
    mcq(box,q.opts,(i)=>{
      markMcq(box,q.a,true); if(i!==q.a) markMcq(box,i,false);
      const ok=i===q.a;
      $("#mJudgeMsg-"+j).innerHTML=`<strong>Your decision:</strong> ${esc(q.opts[i])} ${ok?"✓ held.":"— reconsider."}<br><strong>Research judgment:</strong> ${esc(q.opts[q.a])}<br><strong>Why:</strong> ${esc(q.why)}`;
      if(ok){ st.jdg[j]=1; addSkill("classify",4,true,"mission-judgment","guided"); logActivity("Held judgment Q"+(j+1)+" in "+M.track,"g"); }
      else logErr("classify");
      save(); setTimeout(renderMissions,ok?900:1600); renderMasterySafe();
    });
  });
  const done=$("#btnMissionDone"); if(done) done.addEventListener("click",()=>{ st.done=1; S.missionsDone=Object.values(S.missions).filter(m=>m&&m.done).length; addSkill("ordering",10,true,"mission-done","transfer"); logActivity("Sealed mission file: "+M.track,"g"); toast("Research file ready — sealed and logged."); save(); renderMissions(); renderMasterySafe(); updateRailDots(); });
  const arch=$("#btnMissionArchive"); if(arch) arch.addEventListener("click",()=>{ M.sources.forEach(s=>S.refs.push({text:buildReference({sourceType:s.type,...s}).text,type:s.type,a:s.authors,y:s.year,m:M.track,ts:Date.now()})); save(); updateRailDots(); toast("Mission set archived in the collection."); });
  const redo=$("#btnMissionRedo"); if(redo) redo.addEventListener("click",()=>{ S.missions[M.track]={step:0,cls:{},bld:{},int:{},jdg:{},done:0}; S.missionsDone=Object.values(S.missions).filter(m=>m&&m.done).length; save(); renderMissions(); });
}
/* ---------------- researcher mode (§52) + capstone (§53) ----------------
   Scaffolding removed: the student decides what evidence is needed, chooses
   sources, identifies findings, drafts and selects a claim, places the
   pointer, builds the reference, and defends the file. */
let researcherIdx=0;
const WF_STEPS=["QUESTION","SEARCH","EVALUATE","EXTRACT","CLAIM","CITE","BUILD","CHECK","LIMITS","CONNECT"];
const EV_CHECK=[["RELEVANCE","Does it answer my question?"],["AUTHORITY","Who produced it?"],["EVIDENCE","What supports its claims?"],["METHOD","How was the evidence obtained?"],["LIMITATIONS","What should I be cautious about?"],["DATE","Does recency matter here?"],["FIT","Does the source support my sentence?"]];
function rState(id){ S.researcher=S.researcher||{}; S.researcher[id]=S.researcher[id]||{step:0,sel:{},rej:{},ref:[],extra:{},draft:"",limit:""}; return S.researcher[id]; }
function researcherUnlocked(){ const rClosed=ALL_LESSONS.filter(l=>l.mod==="research"&&S.lessonsDone[l.id]).length; return {ok:S.missionsDone>=1&&rClosed>=6,m:S.missionsDone>=1,f:rClosed}; }
function rTypeLabel(id){ return (SOURCE_TYPES.find(t=>t.id===id)||{}).t||id; }
function renderResearcher(){
  const box=$("#researcherBody"); if(!box||typeof RESEARCHER_TASKS==="undefined") return;
  const un=researcherUnlocked();
  let head=`<p class="eyebrow">Researcher mode — scaffolding removed</p><div class="wf-strip" aria-label="Research workflow">${WF_STEPS.map((s,i)=>`<span>${i+1} · ${s}</span>`).join("")}</div>
  <div class="tabs" role="tablist" aria-label="Researcher tasks">${RESEARCHER_TASKS.map((t,i)=>`<button class="tab${i===researcherIdx?" active":""}" data-rtask="${i}" role="tab">${esc(t.title)}</button>`).join("")}</div>`;
  if(!un.ok){
    box.innerHTML=head+`<div class="panel" style="margin-top:12px"><h3 class="h3">Locked — earn the field first.</h3>
    <p class="micro">Researcher mode removes the scaffolding. Unlock it by sealing <strong>1 mission</strong> (${un.m?"done":"0/1"}) and closing <strong>6 Unit 00 investigations</strong> (${un.f}/6).</p>
    <div class="btn-row"><button class="btn small primary" data-dtab="stem">Seal a mission →</button><button class="btn small ghost" data-unit="research">Open Unit 00 →</button></div></div>`;
    return;
  }
  const T=RESEARCHER_TASKS[Math.min(Math.max(0,researcherIdx),RESEARCHER_TASKS.length-1)]; researcherIdx=RESEARCHER_TASKS.indexOf(T);
  const st=rState(T.id);
  const citeSrc=T.sources.find(s=>s.role==="cite");
  const stepNames=["Brief","Evidence needed","Source room","Finding","Claim","Citation","Reference","Defense"];
  let body=head+`<div class="mission-brief" style="margin-top:12px"><p class="eyebrow">${esc(T.track)} · ${esc(T.title)}${T.id==="fieldready"?" · CAPSTONE":""}</p><p class="micro">Step ${st.done?8:st.step+1}/8 · ${st.done?"SEALED":stepNames[Math.min(st.step,7)]}</p>${T.simulated?`<p class="micro sim-note">Training case file — every source below is invented for practice. Do not cite these records in real work.</p>`:""}</div><div id="rBody"></div>`;
  box.innerHTML=body;
  const el=$("#rBody");
  $$("#researcherBody [data-rtask]").forEach(b=>b.addEventListener("click",()=>{ researcherIdx=+b.dataset.rtask; renderResearcher(); }));
  const back=`<div class="btn-row"><button class="btn small ghost" id="btnRBack">← Back</button></div>`;
  if(st.done){
    const ref=buildReference({sourceType:citeSrc.type,...citeSrc}).text;
    const claim=T.claim.opts[T.claim.a];
    el.innerHTML=`<div class="sealed-file"><p class="eyebrow">Sealed researcher file · ${esc(T.title)}</p>
    <h3 class="h3">Filed without scaffolding — defended, not assembled.</h3>
    <p class="eyebrow" style="margin-top:8px">Question</p><p class="micro">${esc(T.question)}</p>
    <p class="eyebrow" style="margin-top:8px">Source used</p><p class="micro">${esc(citeSrc.title)} — ${esc(citeSrc.authors)}, ${esc(citeSrc.year)}</p>
    <p class="eyebrow" style="margin-top:8px">Claim</p><p class="micro">${esc(claim)}</p>
    <p class="eyebrow" style="margin-top:8px">Pointer → reference</p><p class="micro"><code>${esc(st.cite||"")}</code> → ${esc(ref.slice(0,80))}…</p>
    <p class="eyebrow" style="margin-top:8px">Defense</p><p class="micro">${esc(st.draft||"")}</p>
    ${st.limit?`<p class="eyebrow" style="margin-top:8px">Limits admitted</p><p class="micro">${esc(st.limit)}</p>`:""}
    <p class="micro sim-note">${T.simulated?"Training case file — these records are invented for practice. Verify every source against real literature before using it in actual research.":"Sources verified by the student before filing."}</p></div>
    <div class="btn-row"><button class="btn small ghost" id="btnRRedo">Re-run task</button></div>`;
    $("#btnRRedo").addEventListener("click",()=>{ S.researcher[T.id]={step:0,sel:{},rej:{},ref:[],extra:{},draft:"",limit:""}; save(); renderResearcher(); });
    return;
  }
  const go=n=>{ st.step=n; save(); renderResearcher(); window.scrollTo({top:0}); };
  const rmcq=(boxId,msgId,q,onOk)=>{
    const bx=$("#"+boxId); if(!bx) return;
    mcq(bx,q.opts,(i)=>{
      markMcq(bx,q.a,true); if(i!==q.a) markMcq(bx,i,false);
      const ok=i===q.a;
      $("#"+msgId).innerHTML=`<strong>Your decision:</strong> ${esc(q.opts[i])} ${ok?"✓ held.":"— reconsider."}<br><strong>Why:</strong> ${esc(q.why)}`;
      if(ok){ save(); onOk(); }
      else { logErr("classify"); save(); setTimeout(renderResearcher,1700); }
      renderMasterySafe();
    });
  };
  if(st.step===0){
    el.innerHTML=`<p class="micro"><strong>Question:</strong> ${esc(T.question)}</p><p class="micro">${esc(T.brief)}</p>
    <div class="ev-check"><p class="eyebrow" style="margin:0 0 6px">Evidence check — ask of every source</p><ul style="margin:0;padding-left:18px">${EV_CHECK.map(([k,v])=>`<li><strong>${k}</strong> — ${v}</li>`).join("")}</ul></div>
    <div class="btn-row"><button class="btn small primary" id="btnRNext">Decide what evidence is needed →</button></div>`;
    $("#btnRNext").addEventListener("click",()=>go(1));
  } else if(st.step===1){
    el.innerHTML=`<h3 class="h3" style="font-size:13.5px">${esc(T.need.q)}</h3><div id="rNeedOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="rNeedMsg" role="status"></p>${back}`;
    rmcq("rNeedOpts","rNeedMsg",T.need,()=>{ st.need=1; addSkill("classify",4,true,"researcher-need","guided"); logActivity("Scoped evidence need: "+T.title,"g"); save(); setTimeout(()=>go(2),900); });
    $("#btnRBack").addEventListener("click",()=>go(0));
  } else if(st.step===2){
    const useIdx=T.sources.map((s,i)=>i).filter(i=>T.sources[i].role!=="reject");
    const rejIdx=T.sources.map((s,i)=>i).filter(i=>T.sources[i].role==="reject");
    const ready=useIdx.every(i=>st.sel[i])&&rejIdx.every(i=>st.rej[i]);
    const missing=[...useIdx.filter(i=>!st.sel[i]).map(i=>"use "+(T.sources[i].title||"record")),...rejIdx.filter(i=>!st.rej[i]).map(i=>"rule out "+(T.sources[i].title||"record"))];
    el.innerHTML=`<p class="eyebrow">Source room — use what belongs, reject what does not</p><div class="src-cards">${T.sources.map((s,i)=>{
      const stTag=st.sel[i]?`<span class="tag green">IN FILE</span>`:st.rej[i]?`<span class="tag red">REJECTED</span>`:"";
      return `<div class="panel"><p class="eyebrow">Record ${i+1} · ${esc(rTypeLabel(s.type))} ${stTag}</p>
      <p style="margin:4px 0;font-size:14px"><strong>${esc(s.title)}</strong></p>
      <p class="micro">${esc(s.authors)} · ${esc(s.year||"no date given")}</p>
      <div class="paper-para" style="font-size:13.5px">${esc(s.excerpt)}</div>
      <div class="btn-row"><button class="btn small ${st.sel[i]?"primary":"ghost"}" data-ruse="${i}">Use this source</button><button class="btn small ${st.rej[i]?"primary":"ghost"}" data-rrej="${i}">Reject</button></div>
      <p class="micro" id="rSrcMsg-${i}" role="status"></p></div>`;}).join("")}</div>
    <p class="micro" id="rRoomMsg" role="status">${ready?"File composed.":"Still open: "+esc(missing.join("; "))}</p>
    <div class="btn-row"><button class="btn small ghost" id="btnRBack">← Back</button><button class="btn small primary" id="btnRNext" ${ready?"":"disabled"}>Identify the finding →</button></div>`;
    $$("#rBody [data-ruse]").forEach(b=>b.addEventListener("click",()=>{
      const i=+b.dataset.ruse, s=T.sources[i];
      if(s.role==="reject"){ $("#rSrcMsg-"+i).textContent="△ This page exists to persuade, not to show evidence. Reject it."; logErr("classify"); }
      else { st.sel[i]=1; delete st.rej[i]; addSkill("classify",4,true,"researcher-source","guided"); logActivity("Filed source: "+s.title,"g"); }
      save(); renderResearcher(); renderMasterySafe();
    }));
    $$("#rBody [data-rrej]").forEach(b=>b.addEventListener("click",()=>{
      const i=+b.dataset.rrej, s=T.sources[i];
      if(s.role!=="reject"){ $("#rSrcMsg-"+i).textContent="△ This one belongs in the file — it carries usable evidence. Use it."; logErr("classify"); }
      else { st.rej[i]=1; delete st.sel[i]; addSkill("classify",4,true,"researcher-source","guided"); logActivity("Rejected misleading source in "+T.title,"g"); }
      save(); renderResearcher(); renderMasterySafe();
    }));
    $("#btnRBack").addEventListener("click",()=>go(1));
    const nx=$("#btnRNext"); if(nx&&ready) nx.addEventListener("click",()=>go(3));
  } else if(st.step===3){
    el.innerHTML=`<h3 class="h3" style="font-size:13.5px">${esc(T.finding.q)}</h3><div id="rFindOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="rFindMsg" role="status"></p>${back}`;
    rmcq("rFindOpts","rFindMsg",T.finding,()=>{ st.find=1; addSkill("classify",4,true,"researcher-finding","guided"); save(); setTimeout(()=>go(4),900); });
    $("#btnRBack").addEventListener("click",()=>go(2));
  } else if(st.step===4){
    el.innerHTML=`<h3 class="h3" style="font-size:13.5px">${esc(T.claim.q)}</h3><div id="rClaimOpts" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="rClaimMsg" role="status"></p>${back}`;
    rmcq("rClaimOpts","rClaimMsg",T.claim,()=>{ st.claimSel=1; addSkill("intext1",4,true,"researcher-claim","guided"); save(); setTimeout(()=>go(5),900); });
    $("#btnRBack").addEventListener("click",()=>go(3));
  } else if(st.step===5){
    const it=intextFor(citeSrc.authors,citeSrc.year);
    el.innerHTML=`<p class="eyebrow">Insert citation — the exact form</p>
    <div class="paper-para">Your paragraph carries this claim ${st.cite?`<strong>${esc(st.cite)}</strong>`:`<span class="cite-slot">⊕ place citation</span>`}.</div>
    <div class="btn-row" style="margin-top:8px"><button class="btn small" data-rcite="p">${esc(it.paren)}</button><button class="btn small" data-rcite="n">${esc(it.narr)}</button><button class="btn small ghost" data-rcite="w">(Wrong form)</button></div>
    <p class="micro" id="rCiteMsg" role="status">Choose parenthetical or narrative — voice is deliberate.</p>${back}`;
    $$("#rBody [data-rcite]").forEach(b=>b.addEventListener("click",()=>{
      const k=b.dataset.rcite;
      if(k==="w"){ $("#rCiteMsg").textContent="△ That form does not exist — compare punctuation carefully."; logErr("intext1"); return; }
      st.cite=k==="p"?it.paren:it.narr; addSkill("intext1",6,true,"researcher-cite","guided"); logActivity("Placed researcher pointer","g");
      save(); toast("Pointer placed — now build its reference."); go(6); renderMasterySafe();
    }));
    $("#btnRBack").addEventListener("click",()=>go(4));
  } else if(st.step===6){
    const full={sourceType:citeSrc.type,...citeSrc};
    const want=[...new Set(buildReference(full).segs.map(x=>x.key))];
    const seq=st.ref||[];
    el.innerHTML=`<p class="eyebrow">Build the reference — no labels, only evidence</p>
    <div class="evidence">${Object.entries(citeSrc).filter(([k])=>!["type","role","excerpt"].includes(k)).map(([k,v])=>`<div class="ev"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>
    <div class="drop-zone" id="rBuildTrack" style="margin-top:8px">${seq.length?seq.map(k=>`<span class="track-bit">${esc(RULES[k]?.label||k)}</span>`).join(""):`<span class="micro">Place components in APA order…</span>`}</div>
    <div class="note-grid">${want.filter(k=>!seq.includes(k)).sort(()=>Math.random()-.5).map(k=>`<button class="note-chip" data-rb="${k}"><div class="k">${esc(RULES[k]?.label||k)}</div></button>`).join("")}</div>
    <p class="micro" id="rBuildMsg" role="status"></p>${back}`;
    $$("#rBody [data-rb]").forEach(b=>b.addEventListener("click",()=>{
      st.ref=st.ref||[]; st.ref.push(b.dataset.rb);
      if(JSON.stringify(st.ref)===JSON.stringify(want.slice(0,st.ref.length))){
        if(st.ref.length===want.length){ addSkill("ordering",6,true,"researcher-build","guided"); logActivity("Built researcher reference","g"); orderReset("researcher-build"); save(); go(7); renderMasterySafe(); return; }
      } else { $("#rBuildMsg").textContent="△ "+orderFeedback("researcher-build",want.map(k=>RULES[k]?.label||k),st.ref.map(k=>RULES[k]?.label||k))+" That fragment was set aside — try another position."; st.ref.pop(); logErr("ordering"); }
      save(); renderResearcher();
    }));
    $("#btnRBack").addEventListener("click",()=>go(5));
  } else {
    const extras=T.extra||[];
    const exHeld=extras.every((_,j)=>st.extra[j]);
    const whyOk=(st.draft||"").trim().length>=24;
    const limOk=!T.limitQ||(st.limit||"").trim().length>=24;
    const canSeal=exHeld&&whyOk&&limOk;
    el.innerHTML=`<p class="eyebrow">Defense — explain the file, then seal it</p><div id="rExtraBox">`;
    extras.forEach((q,j)=>{
      if(st.extra[j]){ el.innerHTML+=`<div class="rule-block green"><strong>Q${j+1} held.</strong><br><span class="micro">${esc(q.q)} → <strong>${esc(q.opts[q.a])}</strong><br>${esc(q.why)}</span></div>`; }
      else { el.innerHTML+=`<h3 class="h3" style="font-size:13.5px;margin-top:10px">Q${j+1} · ${esc(q.q)}</h3><div id="rExtraOpts-${j}" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div><p class="micro" id="rExtraMsg-${j}" role="status"></p>`; }
    });
    el.innerHTML+=`</div>
    <div class="field" style="margin-top:10px"><label for="rWhy">${esc(T.explainQ)}</label><textarea id="rWhy" placeholder="Two or three sentences, in your own words…">${esc(st.draft||"")}</textarea></div>
    ${T.limitQ?`<div class="field"><label for="rLimit">${esc(T.limitQ)}</label><textarea id="rLimit" placeholder="What can your claim NOT support?">${esc(st.limit||"")}</textarea></div>`:""}
    <div class="btn-row"><button class="btn small ghost" id="btnRBack">← Back</button><button class="btn small green" id="btnRSeal" ${canSeal?"":"disabled"}>Seal the researcher file</button></div>
    <p class="micro" id="rSealMsg" role="status">${canSeal?"Ready — the file is defended.":"Answer the questions and write the defense (24+ characters each). "}</p>`;
    extras.forEach((q,j)=>{
      const bx=$("#rExtraOpts-"+j); if(!bx||st.extra[j]) return;
      mcq(bx,q.opts,(i)=>{
        markMcq(bx,q.a,true); if(i!==q.a) markMcq(bx,i,false);
        const ok=i===q.a;
        $("#rExtraMsg-"+j).innerHTML=`<strong>Your decision:</strong> ${esc(q.opts[i])} ${ok?"✓ held.":"— reconsider."}<br><strong>Why:</strong> ${esc(q.why)}`;
        if(ok){ st.extra[j]=1; addSkill("classify",4,true,"researcher-extra","guided"); } else logErr("classify");
        save(); setTimeout(renderResearcher,ok?900:1700); renderMasterySafe();
      });
    });
    const recheck=()=>{ const w=($("#rWhy")?$("#rWhy").value:"").trim().length>=24; const l=!T.limitQ||(($("#rLimit")?$("#rLimit").value:"").trim().length>=24); const b=$("#btnRSeal"); if(b) b.disabled=!(exHeld&&w&&l); };
    $("#rWhy").addEventListener("input",e=>{ st.draft=e.target.value; save(); recheck(); });
    const rl=$("#rLimit"); if(rl) rl.addEventListener("input",e=>{ st.limit=e.target.value; save(); recheck(); });
    $("#btnRBack").addEventListener("click",()=>go(6));
    const seal=$("#btnRSeal"); if(seal) seal.addEventListener("click",()=>{
      const w=$("#rWhy").value.trim(); const l=rl?$("#rLimit").value.trim():"";
      if(!(extras.every((_,j)=>st.extra[j])&&w.length>=24&&(!T.limitQ||l.length>=24))){ $("#rSealMsg").textContent="△ Answer the questions and write the defense (24+ characters each) before sealing."; return; }
      st.draft=w; if(rl) st.limit=l; st.done=1;
      const claim=T.claim.opts[T.claim.a];
      S.notes.unshift({title:"Researcher file — "+T.title,body:claim+" "+(st.cite||"")+" Why: "+st.draft+(st.limit?" Limits: "+st.limit:"")});
      addSkill("classify",8,true,"researcher","transfer"); addSkill("intext1",8,true,"researcher","transfer");
      logActivity("Sealed researcher file: "+T.title,"g"); toast("Filed without scaffolding — defended, not assembled.");
      save(); renderNotebook(); renderResearcher(); renderMasterySafe(); updateRailDots();
    });
  }
}
/* ---------------- source type explorer (§30-32) ---------------- */
let srcxIdx=0;
function srcxType(id){ return SOURCE_TYPES.find(s=>s.id===id)||SOURCE_TYPES[0]; }
function srcxOpen(id){
  const i=SOURCE_TYPES.findIndex(s=>s.id===id);
  if(i>=0) srcxIdx=i;
  document.querySelector('[data-dtab="sources"]').click();
  renderSourceExplorer();
}
function srcxCompareRows(a,b){
  const A=SOURCE_DETAIL[a.id], B=SOURCE_DETAIL[b.id], fa=SOURCE_FAMILIES.find(f=>f.id===A.family), fb=SOURCE_FAMILIES.find(f=>f.id===B.family);
  const list=s=>(s||[]).map(x=>`<li>${esc(x)}</li>`).join("");
  return [
    ["Family", esc(fa?fa.t:"-"), esc(fb?fb.t:"-")],
    ["What it is", esc(A.what), esc(B.what)],
    ["When to use it", esc(A.when), esc(B.when)],
    ["Carries", esc(A.carries), esc(B.carries)],
    ["Research value", esc(A.value), esc(B.value)],
    ["APA needs", `<ul>${list(A.needs)}</ul>`, `<ul>${list(B.needs)}</ul>`],
    ["Common mistakes", `<ul>${list(A.mistakes)}</ul>`, `<ul>${list(B.mistakes)}</ul>`],
  ];
}
function renderSourceExplorer(){
  if(typeof SOURCE_DETAIL==="undefined"||!$("#srcxList")) return;
  const st=srcxType(SOURCE_TYPES[Math.min(Math.max(0,srcxIdx),SOURCE_TYPES.length-1)].id); srcxIdx=SOURCE_TYPES.indexOf(st);
  const D=SOURCE_DETAIL[st.id], fam=SOURCE_FAMILIES.find(f=>f.id===D.family);

  /* taxonomy */
  const COLW=190, X0=5, centers=SOURCE_FAMILIES.map((_,i)=>X0+COLW*i+COLW/2);
  const byFam={}; SOURCE_FAMILIES.forEach(f=>byFam[f.id]=[]);
  SOURCE_TYPES.forEach(s=>{ const d=SOURCE_DETAIL[s.id]; if(byFam[d.family]) byFam[d.family].push(s); });
  let svg=`<path class="tax-link" d="M380 36 V56"/>`;
  SOURCE_FAMILIES.forEach((f,i)=>{
    const cx=centers[i], famY=56;
    svg+=`<path class="tax-link" d="M${cx} ${i===0?56:56} V${famY}"/>`;
    svg+=`<path class="tax-link" d="M${centers[0]} 56 H${centers[SOURCE_FAMILIES.length-1]}"/>`;
    svg+=`<rect class="tax-fam" x="${cx-78}" y="${famY}" width="156" height="30" rx="6"/>`;
    svg+=`<text x="${cx}" y="${famY+19}" text-anchor="middle">${esc(f.t)}</text>`;
    const kids=byFam[f.id]||[];
    kids.forEach((s,j)=>{
      const y=famY+42+j*32;
      svg+=`<path class="tax-link" d="M${cx} ${famY+30} V${y-12}"/>`;
      svg+=`<g role="button" tabindex="0" data-srcx="${s.id}" aria-label="${esc(s.t)} — ${esc(f.t)}"><rect class="tax-node${s.id===st.id?" on":""}" x="${cx-70}" y="${y-12}" width="140" height="24" rx="6"/><text x="${cx}" y="${y+4}" text-anchor="middle">${esc(s.t)}</text></g>`;
    });
    svg+=`<text class="tax-count" x="${cx}" y="${famY+42+kids.length*32+2}" text-anchor="middle">${kids.length} type${kids.length===1?"":"s"}</text>`;
  });
  const tax=$("#srcTaxonomy");
  tax.setAttribute("role","img");
  tax.setAttribute("aria-label","Source type taxonomy: every source belongs to one of four families");
  tax.innerHTML=`<rect class="tax-root" x="322" y="10" width="116" height="26" rx="6"/><text x="380" y="27" text-anchor="middle">SOURCE</text>`+svg;
  $$("#srcTaxonomy [data-srcx]").forEach(g=>{
    const pick=()=>{ const i=SOURCE_TYPES.findIndex(s=>s.id===g.dataset.srcx); srcxIdx=i; renderSourceExplorer(); };
    g.addEventListener("click",pick);
    g.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pick(); } });
  });

  /* list */
  $("#srcxList").innerHTML=SOURCE_TYPES.map((s,i)=>{
    const d=SOURCE_DETAIL[s.id], f=SOURCE_FAMILIES.find(x=>x.id===d.family);
    return `<button class="srcx-item${i===srcxIdx?" on":""}" data-srcx="${s.id}" role="tab" aria-selected="${i===srcxIdx}"><span class="ico">${esc(s.i)}</span><span class="nm">${esc(s.t)}<span class="fam">${esc(f?f.t:"")}</span></span></button>`;
  }).join("");
  $$("#srcxList [data-srcx]").forEach(b=>b.addEventListener("click",()=>{ srcxIdx=SOURCE_TYPES.findIndex(s=>s.id===b.dataset.srcx); renderSourceExplorer(); }));

  /* detail */
  const ref=buildReference(D.example);
  $("#srcxDetail").innerHTML=`
    <p class="eyebrow">${esc(fam?fam.t:"")} · ${esc(st.i)}</p>
    <h2 class="h2" style="margin:0">${esc(st.t)}</h2>
    <p class="srcx-carries">Carries: ${esc(D.carries)}</p>
    <div class="srcx-q"><p class="eyebrow">What it is</p><p class="micro" style="font-size:13.5px">${esc(D.what)}</p></div>
    <div class="srcx-q"><p class="eyebrow">When to use it</p><p class="micro" style="font-size:13.5px">${esc(D.when)}</p></div>
    <div class="srcx-q"><p class="eyebrow">What APA needs</p><ul class="srcx-needs">${D.needs.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></div>
    <div class="srcx-q"><p class="eyebrow">Structure signature</p><div class="srcx-struct">${esc(D.structure)}</div></div>
    <div class="srcx-q"><p class="eyebrow">Worked specimen — built live by the CiteLab engine</p>
      <div class="srcx-specimen"><div class="citation-text">${ref.segs.map(sg=>`<span class="dna-seg" data-key="${esc(sg.key)}">${esc(sg.text)}</span>`).join("")}</div></div>
      <p class="micro" style="margin-top:5px">${/10\.9999|simulated/.test(ref.text)?"Format specimen — identifiers are simulated.":"Built from the same engine that produces your references."}</p></div>
    <div class="srcx-q"><p class="eyebrow">Common mistakes</p><ul class="srcx-mistakes">${D.mistakes.map(m=>`<li>${esc(m)}</li>`).join("")}</ul></div>
    <div class="srcx-q"><p class="eyebrow">Research value</p><p class="micro" style="font-size:13.5px">${esc(D.value)}</p></div>
    <div class="btn-row"><button class="btn small" data-nav="builder">Build one yourself →</button><button class="btn small ghost" id="srcxTry">Send to Train →</button></div>`;
  const tb=$("#srcxTry"); if(tb) tb.addEventListener("click",()=>{ logActivity("Chose to practise: "+st.t); go("practice"); });

  /* selects + comparison */
  const opts=cur=>SOURCE_TYPES.map(s=>`<option value="${s.id}"${s.id===cur?" selected":""}>${esc(s.t)}</option>`).join("");
  const a=$("#srcxA"), b=$("#srcxB");
  if(a&&!a.dataset.bound){ a.innerHTML=opts("journal"); b.innerHTML=opts("book"); a.dataset.bound="1"; b.dataset.bound="1";
    const cmp=()=>renderSourceCompare(a.value,b.value);
    a.addEventListener("change",cmp); b.addEventListener("change",cmp); cmp(); }
}
function renderSourceCompare(aId,bId){
  const box=$("#srcxCompare"); if(!box) return;
  const A=srcxType(aId), B=srcxType(bId);
  if(A.id===B.id){ box.style.display="none"; return; }
  box.style.display="";
  box.innerHTML=`<p class="eyebrow">Comparison · ${esc(A.t)} vs ${esc(B.t)}</p>
  <table class="srcx-cmp"><thead><tr><th scope="col">Dimension</th><th scope="col">${esc(A.t)}</th><th scope="col">${esc(B.t)}</th></tr></thead>
  <tbody>${srcxCompareRows(A,B).map(r=>`<tr><td class="lab">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table>`;
}
/* ---------------- global knowledge search (§28) ---------------- */
let SRCH_IDX=null, srchLast="";
function buildSearchIndex(){
  const out=[];
  const push=(kind,title,sub,why,go)=>{ if(title) out.push({kind,title,sub:sub||"",why:why||"",go}); };
  (typeof LESSONS!=="undefined"?LESSONS:[]).forEach(L=>push("Lesson",L.title,L.no+" · "+(L.level||""),L.story||"",()=>{ go("learn"); const i=LESSONS.findIndex(x=>x.id===L.id); if(i>=0){ lessonIdx=i; selMod=L.mod; renderLesson(); } }));
  Object.keys(RULES).forEach(k=>{ const r=RULES[k]; push("APA rule",r.label,k,r.rule+" "+r.why,()=>go("learn")); });
  (typeof GLOSSARY!=="undefined"?GLOSSARY:[]).forEach(g=>push("Term",g.t,g.d,g.why,()=>go("learn")));
  (typeof TRICKS!=="undefined"?TRICKS:[]).forEach(t=>push("Trick",t.title,t.trick,t.example,()=>go("learn")));
  (typeof DETECTIVE!=="undefined"?DETECTIVE:[]).forEach((d,i)=>push("Case file",d.title,"Forensic case",d.errors&&d.errors.length?("Targets: "+d.errors.join(", ")):"",()=>{ go("inspector"); detectiveIdx=i; renderDetective(); }));
  (typeof SOURCE_TYPES!=="undefined"?SOURCE_TYPES:[]).forEach(s=>{ const d=SOURCE_DETAIL[s.id]; push("Source type",s.t,d.what,d.value,()=>{ go("desk"); setTimeout(()=>{ document.querySelector('[data-dtab="sources"]').click(); srcxOpen(s.id); },60); }); });
  (typeof STEM!=="undefined"?STEM:[]).forEach(m=>push("Mission",m.mission||m.title,m.brief,"",()=>{ go("desk"); document.querySelector('[data-dtab="stem"]').click(); }));
  (typeof RESEARCHER_TASKS!=="undefined"?RESEARCHER_TASKS:[]).forEach(r=>push("Researcher task",r.title,r.question,r.brief,()=>{ go("desk"); setTimeout(()=>document.querySelector('[data-dtab="researcher"]').click(),60); }));
  return out;
}
function srchScore(rec,q){
  const t=rec.title.toLowerCase(), s=rec.sub.toLowerCase(), w=rec.why.toLowerCase();
  if(t.startsWith(q)) return 100;
  if(t.includes(q)) return 80;
  if(w.includes(q)) return 55;
  if(s.includes(q)) return 40;
  // word-boundary hit across fields
  if(new RegExp("\\b"+q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(t+" "+s+" "+w)) return 30;
  return 0;
}
function openSearch(prefill){
  if(!SRCH_IDX) SRCH_IDX=buildSearchIndex();
  openModal("KNOWLEDGE BASE","Search CiteLab",`<div class="field"><label for="srchInput" class="sr-only">Search CiteLab</label><input id="srchInput" placeholder="secondary citation, DOI, n.d., report, peer review…" autocomplete="off" value="${esc(prefill||"")}"></div>
  <p class="micro" id="srchHint" role="status"></p><div id="srchOut"></div>
  <div class="btn-row"><button class="btn small ghost" id="srchClose">Close (Esc)</button><span class="micro" style="align-self:center">Searches ${SRCH_IDX.length} rules, lessons, terms, source types, cases &amp; missions</span></div>`);
  const inp=$("#srchInput"), out=$("#srchOut"), hint=$("#srchHint");
  const run=()=>{
    const q=inp.value.trim().toLowerCase();
    if(!q){ out.innerHTML=""; hint.textContent="Start typing. Try: \"et al.\", \"government report\", \"what is a DOI\"."; return; }
    const hits=SRCH_IDX.map(r=>({r,s:Math.max(srchScore(r,q),q.split(/\s+/).every(w=>srchScore(r,w)>0)?25:0)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,40);
    hint.textContent=hits.length?hits.length+" match"+(hits.length===1?"":"es")+" for \u201c"+inp.value.trim()+"\u201d":"No match for \u201c"+inp.value.trim()+"\u201d";
    if(!hits.length){ out.innerHTML=`<div class="empty"><p class="micro">Nothing indexed under that phrase. Try a shorter term, or browse <a href="#" data-srcxsearch="source">source types</a>.</p></div>`; return; }
    let last=""; let html="";
    hits.forEach(({r})=>{
      if(r.kind!==last){ html+=`<p class="eyebrow" style="margin-top:10px">${esc(r.kind)}</p>`; last=r.kind; }
      html+=`<button class="srch-row" data-si="${SRCH_IDX.indexOf(r)}"><span class="srch-t">${esc(r.title)}</span><span class="srch-s">${esc(r.sub.slice(0,110))}</span>${r.why?`<span class="srch-w">${esc(r.why.slice(0,150))}</span>`:""}</button>`;
    });
    out.innerHTML=html;
    $$("#srchOut .srch-row").forEach(b=>b.addEventListener("click",()=>{ const rec=SRCH_IDX[+b.dataset.si]; $("#modalBack").classList.remove("open"); if(rec&&rec.go) rec.go(); }));
    const link=out.querySelector("[data-srcxsearch]"); if(link) link.addEventListener("click",e=>{ e.preventDefault(); $("#modalBack").classList.remove("open"); go("desk"); setTimeout(()=>document.querySelector('[data-dtab="sources"]').click(),60); });
  };
  inp.addEventListener("input",run);
  const sc=$("#srchClose"); if(sc) sc.addEventListener("click",()=>$("#modalBack").classList.remove("open"));
  run(); inp.focus();
}
$("#btnSearchTop").addEventListener("click",()=>openSearch(""));
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); openSearch(""); return; }
  if(e.key==="/"&&!e.ctrlKey&&!e.metaKey){ const t=e.target; if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; e.preventDefault(); openSearch(""); }
});
/* notebook */
function renderDesk(){ renderNotebook(); renderDeskSources(); renderMissions(); renderResearcher(); renderRefs(); renderClassSignals(); }
function renderNotebook(){
  $("#notebookList").innerHTML=S.notes.length?S.notes.map((n,i)=>`<div class="record"><div class="r-no">N${String(i+1).padStart(2,"0")}</div><div><strong>${esc(n.title)}</strong><br><span class="micro">${esc(n.body)}</span></div><div class="r-meta"><button class="btn small ghost" data-delnote="${i}">Remove</button></div></div>`).join(""):`<div class="empty"><h3 class="h3">Your research desk is empty.</h3><p class="micro">Every good reference list starts with one source.</p><div class="btn-row" style="justify-content:center"><button class="btn small primary" data-nav="builder">Add first source</button><button class="btn small" data-nav="desk">Start a research mission</button></div></div>`;
  $$("#notebookList [data-delnote]").forEach(b=>b.addEventListener("click",()=>{ S.notes.splice(+b.dataset.delnote,1); save(); renderNotebook(); }));
  const rows=Object.entries(S.errLog).filter(([,v])=>v&&v.n>0).sort((a,b)=>b[1].n-a[1].n).slice(0,3);
  $("#revisitList").innerHTML=rows.length?rows.map(([k,v])=>`<div class="mist-row"><span>△ <strong>${esc(SKILL_LABELS[k]||k)}</strong> <span class="micro">· missed ${v.n}×</span></span><button class="btn small" data-revisit="${esc(k)}">Drill now</button></div>`).join(""):`<p class="micro">Nothing to revisit — the notebook is clean.</p>`;
  $$("#revisitList [data-revisit]").forEach(b=>b.addEventListener("click",()=>{ go("practice"); setTimeout(()=>runDrill($("#drillBox"),b.dataset.revisit),150); }));
  $("#deskWeak").textContent=SKILL_LABELS[S.weak]||"—";
}
$("#btnAddNote").addEventListener("click",()=>{ const t=prompt("Note title (e.g. Multiple authors):"); if(!t) return; const b=prompt("Why will you need this rule? Write it in your own words:")||""; S.notes.unshift({title:t,body:b}); save(); renderNotebook(); });
$("#btnDeskPractice").addEventListener("click",()=>go("practice"));
function renderDeskSources(){
  $("#deskSources").innerHTML=S.refs.length?S.refs.slice(-3).reverse().map(r=>`<div class="micro" style="padding:6px 0;border-top:1px dashed var(--line)">${esc(r.text.slice(0,90))}…</div>`).join(""):`<p class="micro">No archived sources yet. Build one at the workbench.</p>`;
}
/* archive + graph */
function renderRefs(){
  const box=$("#refsList"); if(!box) return;
  renderGraph();
  if(!S.refs.length){ box.innerHTML=`<div class="empty"><h3 class="h3">The archive is empty.</h3><p class="micro">Every good reference list starts with one source.</p><div class="btn-row" style="justify-content:center"><button class="btn small primary" data-nav="builder">Add first source</button><button class="btn small" data-nav="desk">Start a research mission</button></div></div>`; $("#refsReport").innerHTML=""; return; }
  box.innerHTML=S.refs.map((r,i)=>{
    const rules=(TYPE_RULES[r.type]||[]).map(k=>RULES[k]?.label||k).join(" · ");
    return `<div class="record"><div class="r-no">${String(i+1).padStart(2,"0")}</div><div><div class="r-text">${esc(r.text)}</div><div class="micro" style="margin-top:4px"><span class="mono">USED IN</span> ${esc(r.m||"—")} &nbsp;·&nbsp; <span class="mono">RULES</span> ${esc(rules||"—")}</div></div><div class="r-meta"><span class="tag">${esc((r.type||"").toUpperCase())}</span><span class="tag ${/https?:\/\//.test(r.text)?"green":"amber"}">${/https?:\/\//.test(r.text)?"✓ LINK":"△ NO LINK"}</span><button class="btn small ghost" data-copyref="${i}">Copy</button><button class="btn small ghost" data-delref="${i}">✕</button></div></div>`; }).join("");
  $$("#refsList [data-delref]").forEach(b=>b.addEventListener("click",()=>{ S.refs.splice(+b.dataset.delref,1); save(); renderRefs(); renderDeskSources(); updateRailDots(); }));
  $$("#refsList [data-copyref]").forEach(b=>b.addEventListener("click",()=>{ if(navigator.clipboard) navigator.clipboard.writeText(S.refs[+b.dataset.copyref].text).catch(()=>{}); toast("Reference copied."); }));
}
function renderGraph(){
  const svg=$("#researchGraph"); if(!svg) return;
  const refs=S.refs.slice(0,12);
  svg.innerHTML="";
  const detail=$("#graphDetail");
  if(!refs.length){
    svg.style.display="none";
    if(detail) detail.innerHTML=`<p class="micro">Your research map is empty. Add a source to begin connecting evidence.</p>`;
    return;
  }
  svg.style.display="";
  svg.style.maxHeight=refs.length<=3?"150px":refs.length<=7?"190px":"240px";
  if(detail&&refs.length===1&&!detail.innerHTML.trim()) detail.innerHTML=`<p class="micro">One source archived. Add another source to reveal relationships.</p>`;
  const cx=280,cy=118,R=refs.length>1?72:0;
  const pos=refs.map((_,i)=>{ const a=(2*Math.PI*i/Math.max(1,refs.length))-Math.PI/2; return [cx+R*Math.cos(a),cy+R*Math.sin(a)*0.62]; });
  let links="";
  for(let i=1;i<pos.length;i++) links+=`<line class="g-link" x1="${pos[i-1][0]}" y1="${pos[i-1][1]}" x2="${pos[i][0]}" y2="${pos[i][1]}"/>`;
  for(let i=0;i<refs.length;i++) for(let j=i+1;j<refs.length;j++) if(refs[i].type&&refs[i].type===refs[j].type) links+=`<line class="g-link" x1="${pos[i][0]}" y1="${pos[i][1]}" x2="${pos[j][0]}" y2="${pos[j][1]}" stroke-dasharray="3 3"/>`;
  // mission hubs: real relationships between sealed files and their archived sources
  const hubs=[...new Set(S.refs.slice(0,12).map(r=>r.m).filter(m=>m&&m!=="Workbench"&&m!=="Training floor"&&m!=="Forensics"))];
  const hubPos=hubs.map((_,h)=>[70+h*((560-140)/Math.max(1,hubs.length-1||1)),26]);
  hubs.forEach((m,h)=>{ S.refs.slice(0,12).forEach((r,i)=>{ if(r.m===m) links+=`<line class="g-link hub" x1="${hubPos[h][0]}" y1="${hubPos[h][1]}" x2="${pos[i][0]}" y2="${pos[i][1]}"/>`; }); });
  svg.innerHTML=links+hubs.map((m,h)=>`<g class="g-hub" data-hub="${esc(m)}" tabindex="0" role="button" aria-label="Mission ${esc(m)}"><rect x="${hubPos[h][0]-46}" y="${hubPos[h][1]-11}" width="92" height="22" rx="4"/><text x="${hubPos[h][0]}" y="${hubPos[h][1]+3.5}" text-anchor="middle">▣ ${esc(m).toUpperCase().slice(0,14)}</text></g>`).join("")+pos.map((p,i)=>`<g class="g-node" data-g="${i}" tabindex="0" role="button" aria-label="Source ${i+1}"><circle cx="${p[0]}" cy="${p[1]}" r="16"/><text x="${p[0]}" y="${p[1]+3.5}" text-anchor="middle">${String(i+1).padStart(2,"0")}</text></g>`).join("");
  $$("#researchGraph .g-hub").forEach(n=>{
    const showHub=()=>{
      $$("#researchGraph .g-node").forEach(x=>x.classList.remove("sel"));
      const m=n.dataset.hub; const items=S.refs.map((r,i)=>({r,i})).filter(x=>x.r.m===m);
      $("#graphDetail").innerHTML=`<div class="rule-block"><strong>▣ Mission file · ${esc(m)}</strong><br><span class="micro">${items.length} archived source${items.length===1?"":"s"}: ${items.map(x=>"№"+(x.i+1)).join(", ")}. Solid lines trace archive order; dashed lines join same-type sources; hub lines join a sealed file to its evidence.</span></div>`;
    };
    n.addEventListener("click",showHub);
    n.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); showHub(); }});
  });
  const show=i=>{
    $$("#researchGraph .g-node").forEach(n=>n.classList.toggle("sel",+n.dataset.g===i));
    const r=S.refs[i]; if(!r) return;
    let forms="";
    if(r.a&&r.y){ const it=intextFor(r.a,String(r.y).match(/\d{4}/)?.[0]||r.y); forms=`<p class="micro">In-text: <code>${esc(it.paren)}</code> · <code>${esc(it.narr)}</code></p>`; }
    else forms=`<p class="micro">In-text forms unavailable — archived before source metadata was kept.</p>`;
    $("#graphDetail").innerHTML=`<div class="rule-block"><strong>Source ${i+1} · ${(r.type||"unknown").toUpperCase()}</strong><br><code>${esc(r.text)}</code>${forms}<div class="btn-row"><button class="btn small ghost" data-nav="learn">Connected lesson</button></div></div>`;
  };
  $$("#researchGraph .g-node").forEach(n=>{
    n.addEventListener("click",()=>show(+n.dataset.g));
    n.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); show(+n.dataset.g); }});
  });
}
$("#btnSortRefs").addEventListener("click",()=>{ S.refs.sort((a,b)=>a.text.localeCompare(b.text)); save(); renderRefs(); toast("Archive sorted A–Z by surname."); logActivity("Sorted the archive A–Z"); });
$("#btnCheckRefs").addEventListener("click",()=>{
  const issues=[]; const seen=new Set();
  S.refs.forEach((r,i)=>{
    const k=r.text.toLowerCase().replace(/\s+/g," ").slice(0,60);
    if(seen.has(k)) issues.push(`Record ${i+1}: possible duplicate.`);
    seen.add(k);
    if(!/\(\d{4}[,)]|\(n\.d\.\)/.test(r.text)) issues.push(`Record ${i+1}: date cue missing — every entry needs (Year) or (n.d.).`);
    if(!/https?:\/\//.test(r.text) && r.type==="journal") issues.push(`Record ${i+1}: journal entry without identifier.`);
  });
  const sorted=[...S.refs].sort((a,b)=>a.text.localeCompare(b.text));
  if(!S.refs.every((r,i)=>r.text===sorted[i].text)) issues.push("Archive is not alphabetical — sort A–Z.");
  $("#refsReport").innerHTML=issues.length?`<ul class="check-list">${issues.map(t=>`<li><span class="mark warn">△</span><span>${esc(t)}</span></li>`).join("")}</ul>`:`<ul class="check-list"><li><span class="mark ok">✓</span><span><strong>Final inspection passed.</strong><br><span class="micro">Alphabetical, dated, linked, no duplicates.</span></span></li></ul>`;
  if(!issues.length){ addSkill("ordering",8,true,"archive","independent"); logActivity("Archive passed final inspection","g"); }
  renderMasterySafe();
});
$("#btnExportRefs").addEventListener("click",()=>{
  if(!S.refs.length){ toast("Archive is empty — nothing to export."); return; }
  const blob=new Blob([S.refs.map(r=>r.text).join("\n\n")],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="citelab-references.txt"; a.click(); toast("Archive exported.");
});
/* teacher */
function renderClassSignals(){
  const el=$("#classSignals"); if(!el) return;
  el.innerHTML=Object.entries(S.skills).sort((a,b)=>a[1]-b[1]).slice(0,4).map(([k,v])=>{ const st=skillState(k);
    return `<div class="mastery-row"><span>${esc(SKILL_LABELS[k]||k)}</span><span class="mstate ${st.c}">${symbolFor(st.c)} ${st.t.toUpperCase()}</span></div>`; }).join("");
  const cr=$("#classReport"); if(cr&&!cr.innerHTML.trim()){ const r=buildClassReport(); cr.innerHTML=r.html; }
  renderReteach();
}
function buildClassReport(){
  const name=($("#className")&&$("#className").value)||"Class";
  const grp={Strong:[],Developing:[],"Needs review":[]};
  Object.keys(S.skills).forEach(k=>{ const st=skillState(k); (grp[st.c==="m"?"Strong":st.c==="r"?"Needs review":"Developing"]).push(SKILL_LABELS[k]); });
  const need=Object.keys(S.skills).filter(k=>skillState(k).c==="r").sort((a,b)=>((S.errLog[b]||{n:0}).n-(S.errLog[a]||{n:0}).n));
  return {html:`<div class="rule-block"><strong>${esc(name)} — class rule map</strong></div>
  ${Object.entries(grp).map(([g,ks])=>`<p class="micro"><strong>${g}:</strong> ${ks.length?esc(ks.slice(0,6).join(" · "))+(ks.length>6?" …":""):"—"}</p>`).join("")}
  <p class="micro">${need.length?`Most students are currently encountering difficulty with <strong>${esc(SKILL_LABELS[need[0]])}</strong> — consider reteaching it with fresh examples.`:"No acute difficulty signals. Advance to transfer work."}</p>
  <p class="micro">Sessions: ${S.sessionNo} · Investigations closed: ${Object.keys(S.lessonsDone).length}/${ALL_LESSONS.length} · Missions sealed: ${S.missionsDone}</p>`, need};
}
function renderReteach(){
  const el=$("#reteachGuide"); if(!el) return;
  const need=Object.keys(S.skills).filter(k=>skillState(k).c==="r").sort((a,b)=>((S.errLog[b]||{n:0}).n-(S.errLog[a]||{n:0}).n)).slice(0,3);
  el.innerHTML=`<h3 class="h3" style="font-size:22px">What to reteach</h3>`+(need.length?need.map((k,i)=>{
    const slips=(S.errLog[k]||{n:0}).n;
    return `<div class="mist-row"><span><strong>${i+1}. ${esc(SKILL_LABELS[k])}</strong><br><span class="micro">${slips} recorded slips · state: ${skillState(k).t}</span></span><span class="mstate r">! PRIORITY</span></div>`; }).join(""):`<p class="micro">No priorities right now — the class signal is stable. Advance to transfer work.</p>`);
}
$("#btnClassReport").addEventListener("click",()=>{ const r=buildClassReport(); $("#classReport").innerHTML=r.html; renderReteach(); logActivity("Mapped the class rule map"); });

/* ---------------- MASTERY ---------------- */
const STAMPS=[
  {id:"detective",name:"SOURCE DETECTIVE",why:"Classified difficult sources correctly",test:()=>S.classOk>=3,prog:()=>Math.min(3,S.classOk)+"/3 classifications"},
  {id:"structure",name:"STRUCTURE MASTER",why:"Built references with no guiding labels",test:()=>S.blindDone>=2,prog:()=>Math.min(2,S.blindDone)+"/2 blind builds"},
  {id:"hunter",name:"ERROR HUNTER",why:"Closed faulty citations in forensics",test:()=>S.detectiveSolved>=2,prog:()=>Math.min(2,S.detectiveSolved)+"/2 cases"},
  {id:"transfer",name:"TRANSFER READY",why:"Applied rules in unfamiliar STEM contexts",test:()=>S.transferDone>=2,prog:()=>Math.min(2,S.transferDone)+"/2 transfers"},
  {id:"refs",name:"REFERENCE LIST READY",why:"Curated a consistent archive",test:()=>S.refs.length>=3,prog:()=>Math.min(3,S.refs.length)+"/3 archived"},
  {id:"stem",name:"STEM RESEARCH READY",why:"Sealed a mission research file",test:()=>S.missionsDone>=1,prog:()=>Math.min(1,S.missionsDone)+"/1 mission"},
  {id:"field",name:"FIELD RESEARCHER",why:"Sealed a researcher-mode file with scaffolding removed",test:()=>Object.values(S.researcher||{}).filter(r=>r&&r.done).length>=1,prog:()=>Math.min(1,Object.values(S.researcher||{}).filter(r=>r&&r.done).length)+"/1 file"},
  {id:"tracer",name:"CLAIM TRACER",why:"Closed 6+ Research Foundations investigations",test:()=>ALL_LESSONS.filter(l=>l.mod==="research"&&S.lessonsDone[l.id]).length>=6,prog:()=>Math.min(6,ALL_LESSONS.filter(l=>l.mod==="research"&&S.lessonsDone[l.id]).length)+"/6 foundations"},
];
function renderStampsInto(el){
  if(!el) return;
  el.innerHTML=STAMPS.map(s=>{ const e=s.test(); return `<span class="stamp ${e?"earned":""}">${esc(s.name)}<small>${esc(e?s.why:s.prog())}</small></span>`; }).join("");
}
function renderMastery(){
  updateWeak();
  $("#skillTree").innerHTML=SKILL_GROUPS.map(g=>`${esc(g.name)}<br>${g.skills.map((k,i)=>`${i===g.skills.length-1?"└":"├"}── <span class="sk ${skillState(k).c==="m"?"on":skillState(k).c==="r"?"rev":skillState(k).c==="d"?"mid":"off"}" data-skill="${k}">${symbolFor(skillState(k).c)} ${esc(SKILL_LABELS[k])}</span>`).join("<br>")}`).join("<br>");
  $$("#skillTree .sk").forEach(el=>el.addEventListener("click",()=>renderDossier(el.dataset.skill)));
  renderDossier(S.weak);
function renderDossier(k){
  const box=$("#skillDossier"); if(!box||!k) return;
  const st=skillState(k); const ev=S.ev[k]; const kinds=ev&&ev.kinds?ev.kinds:{};
  const slips=S.errLog[k]?S.errLog[k].n:0;
  const group=(SKILL_GROUPS.find(g=>g.skills.includes(k))||{name:"",skills:[]});
  const related=group.skills.filter(s=>s!==k).slice(0,4).map(s=>SKILL_LABELS[s]||s).join(" · ")||"—";
  const ruleKey=(k==="intext1"||k==="intext2"||k==="intextM"||k==="intextN")?"intext":k;
  box.innerHTML=`<p class="eyebrow">Skill dossier</p><h3 class="h3">${esc(SKILL_LABELS[k]||k)}</h3>
  <p><span class="mstate ${st.c}">${symbolFor(st.c)} ${st.t.toUpperCase()}</span></p>
  <div class="mastery-row"><span>Evidence</span><span class="micro">✓ ${ev?ev.n:0} held</span></div>
  <div class="mastery-row"><span>Guided / independent / transfer</span><span class="micro">${kinds.guided||0} / ${kinds.independent||0} / ${kinds.transfer||0}</span></div>
  <div class="mastery-row"><span>Contexts</span><span class="micro">${ev&&ev.ctx.length?esc(ev.ctx.slice(0,4).join(", ")):"—"}</span></div>
  <div class="mastery-row"><span>Slips recorded</span><span class="micro">${slips}</span></div>
  <div class="mastery-row"><span>Next review</span><span class="micro">${esc(reviewLabel(k))}</span></div>
  <div class="mastery-row"><span>Related rules</span><span class="micro">${esc(related)}</span></div>
  <p class="micro" style="margin-top:8px"><strong>Rule:</strong> ${esc((RULES[ruleKey]||{}).rule||"")}</p>
  <div class="btn-row"><button class="btn small primary" id="btnDossierTrain">Train it →</button></div>`;
  $("#btnDossierTrain").addEventListener("click",()=>go(SKILL_VIEW[k]||"practice"));
}
  $("#skillBars").innerHTML=Object.keys(SKILL_LABELS).map(k=>{ const st=skillState(k); const ev=S.ev[k];
    const kinds=ev&&ev.kinds?ev.kinds:{};
    const trail=ev&&ev.n?`<span class="micro"> · held ${ev.n}× (${kinds.guided||0} guided · ${kinds.independent||0} independent · ${kinds.transfer||0} transfer${ev.ctx.length?` — ${esc(ev.ctx.slice(0,3).join(", "))}`:""})</span>`:`<span class="micro"> · no successful applications yet</span>`;
    return `<div class="mastery-row"><span>${esc(SKILL_LABELS[k])}${trail}</span><span class="mstate ${st.c}">${symbolFor(st.c)} ${st.t.toUpperCase()}</span></div>`; }).join("");
  renderStampsInto($("#stampWall")); renderStampsInto($("#homeStamps"));
  const w=SKILL_LABELS[S.weak]||"—"; $("#weakTitle").textContent=w;
}
function renderMasterySafe(){ if($("#view-progress").classList.contains("active")) renderMastery(); renderStampsInto($("#homeStamps")); }
function refreshMasteryEchoes(){ renderMasterySafe(); renderAccuracy(); }
$("#btnResetProgress").addEventListener("click",()=>{ if(confirm("Reset all laboratory progress on this device?")){ const keep={onboarded:S.onboarded,name:S.name,ui:S.ui}; S=DEFAULT_STATE(); S.onboarded=keep.onboarded; S.name=keep.name; S.ui=keep.ui||S.ui; save(); renderAll(); toast("Laboratory reset. A fresh notebook is issued."); }});
$("#btnExportProgress").addEventListener("click",()=>{ const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="citelab-progress.json"; a.click(); toast("Progress exported."); });
$("#btnContinueWeak").addEventListener("click",()=>{ const k=S.weak; const id=SKILL_LESSON[k]; const li=ALL_LESSONS.findIndex(l=>l.id===id); if(li>=0){ lessonIdx=li; go("learn"); renderLesson(); toast("Routed to the investigation your evidence calls for."); } else go(SKILL_VIEW[k]||"practice"); });

/* ---------------- profile / instrument / guide ---------------- */
$("#btnSettings").addEventListener("click",()=>openModal("INSTRUMENT","Calibration",`
   <div class="field"><label for="setThemeSel">Reading environment</label><select id="setThemeSel"><option value="auto">Follow system</option><option value="paper">Paper (light)</option><option value="night">Night study lab</option></select></div>
   <div class="field"><label for="setContrast">Contrast</label><select id="setContrast"><option value="std">Standard paper</option><option value="hi">High contrast</option></select></div>
  <div class="field"><label for="setMotion">Motion</label><select id="setMotion"><option value="full">Precise instrument motion</option><option value="reduced">Reduced motion</option></select></div>
  <div class="btn-row"><button class="btn small" id="setPrint">Print / save PDF</button><button class="btn small ghost" id="setWipe">Erase all local data</button></div>
  <p class="micro">Progress lives on this device only. No accounts, no tracking.</p>`));
document.addEventListener("click",e=>{
  if(e.target.id==="setPrint") window.print();
  if(e.target.id==="setWipe" && confirm("Erase all CiteLab data?")){ try{localStorage.removeItem(LS_KEY);}catch(_){} location.reload(); }
});
document.addEventListener("change",e=>{
   if(e.target.id==="setThemeSel") setTheme(e.target.value);
   if(e.target.id==="setContrast") document.documentElement.style.setProperty("--paper",e.target.value==="hi"?"#FFFFFF":"#FAF8F2");
  if(e.target.id==="setMotion") document.documentElement.style.setProperty("scroll-behavior",e.target.value==="reduced"?"auto":"smooth");
});
$("#btnProfile").addEventListener("click",()=>{
  const mastered=Object.keys(S.skills).filter(k=>skillState(k).c==="m").length;
  openModal("RESEARCHER","Field identity",`
  <div class="field"><label for="profName">Display name</label><input id="profName" value="${esc(S.name||"STEM Researcher")}" placeholder="Your name"></div>
  <p class="micro">Session <strong>${S.sessionNo}</strong> · Streak <strong>${S.streak||0} days</strong> · Archive <strong>${S.refs.length}</strong> · Mastered <strong>${mastered}/${Object.keys(S.skills).length}</strong> · Under investigation <strong>${esc(SKILL_LABELS[S.weak])}</strong></p>
  <div class="btn-row"><button class="btn small primary" id="profSave">Save</button></div>`);
});
document.addEventListener("click",e=>{ if(e.target.id==="profSave"){ S.name=$("#profName").value; save(); $("#modalBack").classList.remove("open"); toast("Identity recorded."); }});
   $("#btnHelp").addEventListener("click",()=>{ openModal("FIELD GUIDE","How the laboratory works",`
  <p><strong>Observe → Identify → Predict → Build → Inspect → Explain → Correct → Retry → Transfer.</strong></p>
  <p class="micro"><strong>Learn</strong> opens case files: predict before the rule is shown, construct, explain, then rebuild blind and transfer.<br><strong>Train</strong> runs sessions shaped by your mistake memory.<br><strong>Build</strong> constructs from evidence; logic explains only your current decision.<br><strong>Inspect</strong> investigates first — corrections stay sealed until you reconstruct.<br>Keyboard: <span class="kbd">0–6</span> move between rooms, <span class="kbd">Esc</span> closes dialogs.</p>
   <p class="micro">Corrections come from a deterministic APA 7 ruleset. Messy-text detection is interpretation and is always labeled as such.</p>
    <div class="btn-row"><button class="btn small primary" id="btnHelpSearch">Search the knowledge base</button><button class="btn small ghost" id="btnHelpTheme">Switch reading environment</button></div>`);
   $("#btnHelpSearch").addEventListener("click",()=>openSearch(""));
   $("#btnHelpTheme").addEventListener("click",()=>{ $("#modalBack").classList.remove("open"); setTheme(resolvedTheme()==="night"?"paper":"night"); });
   });

/* ---------------- streak / session ---------------- */
(function(){
  const h=new Date().getHours();
  const g=$("#greeting"); if(g) g.textContent = h<12?"Good morning.":h<18?"Good afternoon.":"Good evening.";
  const today=new Date().toISOString().slice(0,10);
  if(S.lastDay!==today){ const y=new Date(Date.now()-864e5).toISOString().slice(0,10); S.streak=(S.lastDay===y)?(S.streak||0)+1:1; S.lastDay=today; S.sessionNo=(S.sessionNo||1)+1; save(); }
  $("#streakTag").textContent="STREAK "+(S.streak||0);
})();
window.go=go;

/* ---------------- init ---------------- */
function bindViewInspector(view){
  if(view==="home") renderConsole();
  else if(view==="learn"){ const L=curL(); const ex=(L.examples&&L.examples[0]&&L.examples[0].fields)||null;
    if(ex){ const ref=buildReference(ex); renderAnatomy("#lessonDNA","#lessonScale",ref,{onPick:(key)=>traceLessonSeg(L,ref,key)}); } }
  else if(view==="builder") renderBuilder();
  else if(view==="practice"){ renderChPreview(); renderWarmup(); }
}
/* ---------------- tricks finder + study sheet + module videos ---------------- */
function renderTricks(filter){
  const box=$("#trickList"); if(!box) return;
  const q=String(filter||"").toLowerCase().trim();
  const hits=TRICKS.filter(t=>{
    if(!q) return true;
    return (t.title+" "+t.trick+" "+t.example+" "+(SKILL_LABELS[t.skill]||"")+" "+t.skill).toLowerCase().includes(q);
  }).slice(0,12);
  box.innerHTML=hits.length?hits.map((t,i)=>`<div class="trick" style="border-top:1px dashed var(--line);padding:8px 0"><div style="font-weight:700;font-size:13px">${esc(t.title)}</div><div class="micro">${esc(t.trick)}</div><code style="font-family:var(--font-mono);font-size:11.5px">${esc(t.example)}</code><div class="btn-row" style="margin-top:6px"><button class="btn small ghost" data-trick-go="${esc(t.skill)}">Study →</button></div></div>`).join(""):`<p class="micro">No trick matches — try “doi”, “author”, “date”, “title”.</p>`;
  $$("#trickList [data-trick-go]").forEach(b=>b.addEventListener("click",()=>{
    const id=SKILL_LESSON[b.dataset.trickGo]; const li=ALL_LESSONS.findIndex(l=>l.id===id);
    if(li>=0){ lessonIdx=li; go("learn"); renderLesson(); }
  }));
}
function renderVideoCard(M){
  if(!M||!M.video) return "";
  const v=M.video; const watched=S.videosWatched&&S.videosWatched[v.id+":"+M.id];
  return `<div class="video-card video-intro">
    <button class="video-facade" data-vmod="${esc(M.id)}" data-vid="${esc(v.id)}" aria-label="Play intro video: ${esc(v.label)} by ${esc(v.by)}">
      <img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none'">
      <span class="vf-play" aria-hidden="true">▶</span>
      ${watched?'<span class="vf-watched">✓ Watched</span>':""}
    </button>
    <div class="vf-body">
      <p class="eyebrow">Module intro · watch first</p>
      <p class="vf-title" title="${esc(v.label)}"><strong>${esc(v.label)}</strong> <span class="micro">· ${esc(v.by)}</span></p>
      <div class="btn-row"><button class="btn small ghost" data-theater="${esc(v.id)}" data-tmod="${esc(M.id)}" data-tlabel="${esc(v.label)}">⛶ Full screen</button><a class="btn small ghost" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div>
    </div>
  </div>`;
}
function openVideoTheater(vid, mod, label){
  const back=$("#videoTheater"), stage=$("#videoStage");
  if(!back||!stage) return;
  $("#theaterTitle").textContent="Now showing: "+label;
  $("#theaterNote").textContent="External video · plays privately (youtube-nocookie) · Esc or ✕ to leave the theater.";
  stage.innerHTML="";
  const frame=document.createElement("iframe");
  frame.src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(vid)+"?rel=0&autoplay=1";
  frame.referrerPolicy="strict-origin-when-cross-origin";
  frame.title=label; frame.allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen=true;
  stage.appendChild(frame);
  back.classList.add("open");
  S.videosWatched=S.videosWatched||{}; S.videosWatched[vid+":"+mod]=1; save();
  logActivity("Watched module intro ("+mod+") in theater");
  const box=frame.closest(".theater-box");
  if(box&&box.requestFullscreen&&matchMedia("(pointer:fine)").matches){ try{ const p=box.requestFullscreen(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} }
  renderVideoCardRefresh(mod);
}
function renderVideoCardRefresh(mod){
  const f=document.querySelector('.video-facade[data-vmod="'+mod+'"]');
  if(f&&!f.querySelector(".tag")){ const s=document.createElement("span"); s.className="tag green"; s.style.cssText="position:absolute;top:6px;right:6px"; s.textContent="✓"; f.appendChild(s); }
}
function closeVideoTheater(){ const back=$("#videoTheater"); if(!back) return; back.classList.remove("open"); $("#videoStage").innerHTML=""; if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-theater]");
  if(t){ openVideoTheater(t.dataset.theater, t.dataset.tmod, t.dataset.tlabel||"Module intro"); return; }
  if(e.target.closest("#btnTheaterClose")||e.target.id==="videoTheater"){ closeVideoTheater(); }
});
document.addEventListener("click",e=>{
  const f=e.target.closest("[data-vid]");
  if(!f) return;
  const wrap=f.closest(".video-card"); if(!wrap) return;
  const frame=document.createElement("iframe");
  frame.width="100%"; frame.height="315";
  frame.src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(f.dataset.vid)+"?rel=0";
  frame.referrerPolicy="strict-origin-when-cross-origin";
  frame.title="APA 7 video player"; frame.allow="accelerometer; encrypted-media; picture-in-picture";
  frame.allowFullscreen=true; frame.style.border="none"; frame.style.display="block";
  f.replaceWith(frame);
  S.videosWatched=S.videosWatched||{}; S.videosWatched[f.dataset.vid+":"+f.dataset.vmod]=1; save();
  logActivity("Watched module video ("+f.dataset.vmod+")");
});
function renderStudySheet(){
  const box=$("#studySheet"); if(!box) return;
  const groups={};
  TRICKS.forEach(t=>{ (groups[t.skill]=groups[t.skill]||[]).push(t); });
  box.innerHTML=`<div style="max-width:720px;margin:0 auto;padding:24px;font-family:Georgia,serif;color:#111">
  <h1 style="font-size:26px">CiteLab APA 7 Study Sheet</h1>
  <p>${TRICKS.length} fast tricks — one per skill. Printed ${new Date().toLocaleDateString()}.</p>
  ${Object.keys(groups).map(k=>`<h2 style="font-size:15px;margin:16px 0 4px">${esc(SKILL_LABELS[k]||k)}</h2>${groups[k].map(t=>`<p style="margin:4px 0"><strong>${esc(t.title)}.</strong> ${esc(t.trick)} <em>(${esc(t.example)})</em></p>`).join("")}`).join("")}
  <p style="margin-top:16px;font-size:12px">Videos per module + full investigations live in CiteLab. Rules: deterministic APA 7.</p></div>`;
}
/* ---------------- research dictionary ---------------- */
function openGlossary(){
  const items=(typeof GLOSSARY!=="undefined"&&Array.isArray(GLOSSARY))?GLOSSARY:[];
  openModal("RESEARCH DICTIONARY","The language of trustworthy research",
    `<div class="field" style="margin-bottom:10px"><label for="glossFilter">Find a term</label><input id="glossFilter" placeholder="citation, peer review, bias…" autocomplete="off"></div>
    <div class="gloss-list" id="glossList">${items.map(g=>`<div class="gloss-item" data-gt="${esc(g.t.toLowerCase())}"><p><strong>${esc(g.t)}</strong> — ${esc(g.d)}</p><p class="micro"><strong>Why it matters in STEM:</strong> ${esc(g.why)}</p></div>`).join("")}</div>`);
  const f=$("#glossFilter");
  if(f) f.addEventListener("input",()=>{ const q=f.value.toLowerCase().trim();
    $$("#glossList .gloss-item").forEach(el=>{ el.style.display=(!q||el.dataset.gt.includes(q)||el.textContent.toLowerCase().includes(q))?"":"none"; }); });
}
document.addEventListener("click",e=>{ if(e.target.closest("[data-glossary]")){ openGlossary(); } });
/* ---------------- collapsible workspace panels ---------------- */
function applyPanelState(){
  S.ui=S.ui||{railCollapsed:false,inspectorHidden:false};
  const railHidden=S.ui.railCollapsed===true, inspHidden=S.ui.inspectorHidden===true;
  document.body.classList.toggle("rail-collapsed",railHidden);
  const rb=$("#btnRailToggle"), rt=$("#railToggleText");
  if(rb){ rb.setAttribute("aria-expanded",String(!railHidden)); rb.title=(railHidden?"Show":"Hide")+" navigation rail"; }
  if(rt) rt.textContent=railHidden?"Show nav":"Hide nav";
  const split=document.querySelector(".split.learn");
  if(split) split.classList.toggle("inspector-hidden",inspHidden);
  const ib=$("#btnInspectorToggle");
  if(ib){ ib.setAttribute("aria-expanded",String(!inspHidden)); ib.textContent=inspHidden?"Show":"Hide"; }
}
function setRailCollapsed(v){
  S.ui=S.ui||{railCollapsed:false,inspectorHidden:false}; S.ui.railCollapsed=!!v; save(); applyPanelState();
  if(v&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest(".rail")){ const b=$("#btnRailToggle"); if(b) b.focus(); }
}
function setInspectorHidden(v){
  S.ui=S.ui||{railCollapsed:false,inspectorHidden:false}; S.ui.inspectorHidden=!!v; save(); applyPanelState();
}
   $("#btnRailToggle").addEventListener("click",()=>setRailCollapsed(!(S.ui&&S.ui.railCollapsed)));
   $("#btnInspectorToggle").addEventListener("click",()=>setInspectorHidden(!(S.ui&&S.ui.inspectorHidden)));
   /* ---- theme: paper <-> night study lab (§5) ---- */
   function resolvedTheme(){ const t=S.ui&&S.ui.theme||"auto"; return t==="auto"?(matchMedia("(prefers-color-scheme: dark)").matches?"night":"paper"):t; }
   function applyTheme(){
     const t=resolvedTheme();
     document.documentElement.setAttribute("data-theme",t);
     const b=$("#btnTheme"); if(b){ b.textContent=t==="night"?"☀ Paper":"☾ Night"; b.setAttribute("aria-pressed",t==="night"?"true":"false"); }
     const m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute("content",t==="night"?"#101317":"#FAF8F2");
   }
   function setTheme(t){ S.ui=S.ui||{railCollapsed:false,inspectorHidden:false,theme:"auto"}; S.ui.theme=t; save(); applyTheme(); }
   $("#btnTheme").addEventListener("click",()=>setTheme(resolvedTheme()==="night"?"paper":"night"));
   try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{ if((S.ui&&S.ui.theme)==="auto") applyTheme(); }); }catch(e){}
function renderAll(){
  applyPanelState();
  renderActivity(); renderConsole(); renderLessonIndex(); renderLesson();
  renderChallenge(); renderIntext(); renderSourceTabs(); renderBuilderFields(); renderBuilder();
  renderDetective(); renderDesk(); renderMastery(); updateRailDots(); renderTricks(""); renderStudySheet(); renderSourceExplorer();
  const tf=$("#trickFilter"); if(tf&&!tf.dataset.bound){ tf.dataset.bound="1"; tf.addEventListener("input",()=>renderTricks(tf.value)); }
  const sb=$("#btnStudySheet"); if(sb&&!sb.dataset.bound){ sb.dataset.bound="1"; sb.addEventListener("click",()=>{ renderStudySheet(); document.body.classList.add("print-sheet"); window.print(); }); }
}
window.addEventListener("afterprint",()=>document.body.classList.remove("print-sheet"));
applyTheme();
renderAll();
maybeOnboard();


