/* ============================================================
   CiteLab ENGINE — deterministic APA 7 core (DOM-free).
   Preserved verbatim through the 2.0 redesign. Safe to run in Node.
   ============================================================ */
"use strict";

globalThis.DNA_ORDER=["author","date","title","journal","editors","volume","pages","doi","url","publisher","intext","order"];

const RULES = {
  author:{label:"AUTHOR", rule:"List surname followed by initials (Smith, J.). Separate with commas; use & before the final author. Up to 20 authors in the reference list.", mistake:"Smith J / John Smith", correct:"Smith, J.", why:"APA inverts names so reference lists sort reliably by surname. Initials stand in for full first names.", trace:["Raw name as found on the source","Surname + initials","Move surname first; initial each given name","Smith, J."]},
  date:{label:"DATE", rule:"Publication year appears in parentheses directly after the author, followed by a period: (2025). Use (n.d.) when no date exists.", mistake:"Smith, J. 2025.", correct:"Smith, J. (2025).", why:"Parentheses mark the date as a discrete retrieval cue — readers scan author → year to match in-text citations.", trace:["Year as found on the source","Year in parentheses after author","Enclose the year; close with a period","(2025)."]},
  title:{label:"TITLE", rule:"Article, chapter, and web-page titles use sentence case: only the first word, proper nouns, and the word after a colon are capitalized. Never italicize article titles.", mistake:"Climate Change And Crop Systems", correct:"Climate change and crop systems", why:"Sentence case keeps titles neutral and scannable; italics are reserved for the container (journal, book).", trace:["Title as written by the author","Sentence case; articles never italic","Lowercase except first word, proper nouns, post-colon","Climate change and crop systems."]},
  journal:{label:"JOURNAL / SOURCE", rule:"Journal names and book titles use title case and italics. Every word of 4+ letters is capitalized.", mistake:"journal of environmental science", correct:"Journal of Environmental Science", why:"The container is a proper publication — italics + title case signal it is the venue, not the article.", trace:["Container name as published","Title case + italics","Capitalize the venue; italicize it","*Journal of Environmental Science*,"]},
  volume:{label:"VOLUME", rule:"Journal volume is italicized; the issue number in parentheses is not: 14(2). No space, no 'Vol.' prefix.", mistake:"Vol. 14, No. 2", correct:"14(2)", why:"Compact volume(issue) notation is the locating key librarians and databases parse.", trace:["Volume and issue numbers","Italic volume, plain (issue)","Drop Vol./No.; join compactly","*14*(2),"]},
  pages:{label:"PAGES", rule:"Page ranges use an en dash and full endpoints: 31–44. End with a period (unless a DOI/URL follows).", mistake:"31-44 / pp. 31-44 (journals)", correct:"31–44.", why:"Journals omit 'pp.' — the position after volume(issue) already means pages.", trace:["Page numbers as printed","Page-range rule","En dash, full endpoints, closing period","31–44."]},
  doi:{label:"DOI", rule:"Present as a live link: https://doi.org/10.xxxx/yyyy. No trailing period. Never write 'DOI:' or 'Retrieved from' for journal articles.", mistake:"DOI: 10.xxxx / doi.org/10.xxxx.", correct:"https://doi.org/10.xxxx/yyyy", why:"The DOI is a persistent identifier — the hyperlink form guarantees one-click resolution.", trace:["Identifier as found","Full https hyperlink","Drop the DOI: prefix; no trailing period","https://doi.org/10.xxxx/yyyy"]},
  url:{label:"URL", rule:"Give the direct URL with no trailing period and no 'Retrieved from' (unless the content changes over time).", mistake:"Retrieved from https://….", correct:"https://…", why:"APA 7 dropped 'Retrieved from' for stable content to reduce noise.", trace:["Address as found","URL rule","Direct link, no retrieval statement","https://…"]},
  publisher:{label:"PUBLISHER", rule:"Book publishers are named plainly (Springer). Omit terms like 'Publishers' or 'Inc.' where possible.", mistake:"Springer Publishing Company, Inc.", correct:"Springer", why:"Short publisher names keep references clean; location of publication is no longer required.", trace:["Publisher as printed","Short plain name","Drop Inc. and Publishers","Springer."]},
  intext:{label:"IN-TEXT", rule:"Parenthetical: (Smith, 2025). Narrative: Smith (2025). Two authors always name both; 3+ uses et al. from the first citation.", mistake:"(Smith 2025) / Smith, 2025", correct:"(Smith, 2025) / Smith (2025)", why:"In-text citations are pointers — surname + year must exactly match a reference-list entry.", trace:["Author + year of the source","Surname, comma, year","Parenthetical closes the claim; narrative weaves the author","(Smith, 2025)"]},
  order:{label:"ORDER", rule:"Reference-list order: Author → Date → Title → Source (journal/publisher + volume/pages + DOI/URL). Alphabetical by surname across entries.", mistake:"Title before author", correct:"Author (Date). Title. Source.", why:"Fixed order lets any reader predict where each fact lives — it is the grammar of the reference.", trace:["Unordered facts","Structural order rule","Author → Date → Title → Source","Ordered reference."]},
  nodate:{label:"MISSING DATE", rule:"When no date exists, write (n.d.) — never guess, never leave it blank.", mistake:"(…)", correct:"(n.d.).", why:"Explicit 'no date' is honest metadata; blank dates silently corrupt matching.", trace:["No date on the source","Explicit (n.d.) marker","Never invent a date; never omit silently","(n.d.)."]},
  org:{label:"ORGANIZATION AUTHOR", rule:"Group authors are spelled out: World Health Organization. Abbreviate only in-text after first full use.", mistake:"WHO (2025) in the reference list", correct:"World Health Organization. (2025).", why:"Reference lists never abbreviate — abbreviations belong to the in-text flow.", trace:["Group name on the source","Spell out; never invert","Keep the full group name verbatim","World Health Organization."]},
  editors:{label:"EDITORS", rule:"Edited-book chapters credit editors in the source element: In E. Miles (Ed.), Book title (pp. 12–30).", mistake:"In Miles, E. Book", correct:"In E. Miles (Ed.), Book …", why:"Editor initials come first because the chapter, not the editor, is being cited.", trace:["Editor names","Initials first + (Ed.)","Credit editors inside the container","In E. Miles (Ed.),"]}
};

/* ---------------- authors ---------------- */
const ORG_HINTS = ["world health organization","who","unicef","ministry","nasa","national institutes of health","nih","world bank","united nations","academy","university","institute","organization","agency","center","centre","department","ministry of","central bank","authority","commission","council","directorate","administration","municipality","statistical"];
function isOrg(token){
  const t=token.trim();
  if(!t) return false;
  if(/^[A-Z][A-Z\s&.\-()]+$/.test(t) && t.replace(/[^A-Za-z]/g,"").length<=12 && !t.includes(",")) return true;
  return ORG_HINTS.some(h=>t.toLowerCase().includes(h));
}
function authorToAPA(token){
  token=token.trim().replace(/\s+/g," ");
  if(!token) return "";
  if(token.includes(",") && /\./.test(token)) return token.replace(/\s+/g," ").replace(/,$/,"");
  if(token.includes(",") && !/\./.test(token)){
    const bits=token.split(",").map(x=>x.trim()).filter(Boolean);
    if(bits.length===2 && bits[0] && bits[1] && !bits[1].includes(" ")) return authorToAPA(bits[1]+" "+bits[0]);
  }
  if(isOrg(token)) return token;
  const parts=token.split(" ").filter(Boolean);
  if(parts.length===1) return parts[0];
  let surname=parts[parts.length-1].replace(/,/g,"");
  let given=parts.slice(0,-1);
  if(surname.replace(/\./g,"").length<=1 && given.length){
    const init=surname; surname=given.join(" ").replace(/,/g,""); given=[init];
  }
  const initials=given.map(g=>{
    g=g.replace(/\./g,"");
    if(g.includes("-")) return g.split("-").map(x=>x[0].toUpperCase()+".").join("-");
    return (g[0]||"").toUpperCase()+".";
  }).join(" ");
  return `${surname}, ${initials}`;
}
function splitAuthors(raw){
  if(!raw) return [];
  let t=String(raw).trim();
  if(!t) return [];
  if(t.includes(";")) return t.split(";").map(x=>x.trim()).filter(Boolean);
  if(/\n/.test(t)) return t.split("\n").map(x=>x.trim()).filter(Boolean);
  if(/ & /.test(t)) return t.split(/\s*&\s*/).map(x=>x.trim()).filter(Boolean);
  if(/ and /i.test(t) && !t.includes(",")) return t.split(/\s+and\s+/i).map(x=>x.trim()).filter(Boolean);
  if((t.match(/,/g)||[]).length>=2 && !/\./.test(t)){
    const bits=t.split(",").map(x=>x.trim()).filter(Boolean);
    if(bits.length<=4 && bits.every(b=>!b.includes(" "))) return bits;
  }
  return [t];
}
function formatAuthorList(raw){
  const list=splitAuthors(raw).map(authorToAPA).filter(Boolean);
  if(list.length===0) return "";
  if(list.length===1) return list[0];
  if(list.length===2) return `${list[0]}, & ${list[1]}`;
  if(list.length<=20) return list.slice(0,-1).join(", ")+", & "+list[list.length-1];
  return list.slice(0,19).join(", ")+", . . . "+list[list.length-1];
}
function intextFor(raw, year){
  const list=splitAuthors(raw).map(authorToAPA).filter(Boolean);
  // Personal names arrive as "Surname, Initials." — take the surname.
  // Organization authors arrive verbatim with no comma — keep the full name.
  const surnames=list.map(a=>a.includes(",")?a.split(",")[0].trim():a);
  const y=year||"n.d.";
  if(surnames.length===0) return {paren:`(${y})`,narr:`${y}`};
  if(surnames.length===1) return {paren:`(${surnames[0]}, ${y})`,narr:`${surnames[0]} (${y})`};
  if(surnames.length===2) return {paren:`(${surnames[0]} & ${surnames[1]}, ${y})`,narr:`${surnames[0]} and ${surnames[1]} (${y})`};
  return {paren:`(${surnames[0]} et al., ${y})`,narr:`${surnames[0]} et al. (${y})`};
}

/* ---------------- text utils ---------------- */
function sentenceCase(t){
  t=String(t||"").trim().replace(/\s+/g," "); if(!t) return "";
  const parts=t.split(/:\s*/);
  /* APA sentence case lowercases ordinary words but must never flatten an
     acronym (PFAS, APA, WHO) or a taxonomic author mark (Pisum sativum L.).
     Those are protected before the case fold, then restored. */
  const fix=(s)=>{
    /* Sentence case lowercases ordinary words but must never flatten what the
       author wrote as fixed form: acronyms (PFAS, APA), taxonomic marks
       (Pisum sativum L.), chemical formulas/symbols (FAPbI3, CO2, Ksp, pH) and
       compact mixed-case names (McMills). */
    const SYMBOLS=/^(Ksp|K[sp]\d*|pK|pH|mL|L|L\.|log\d*|ln)$/;
    const out=s.split(" ").map(w=>{
      const core=w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g,"");
      if(!core) return w;
      const fixed=/[A-Z]{2,}/.test(core)                       // acronym
        || /^[A-Z][a-z]{0,2}[A-Z][A-Za-z0-9]*$/.test(core)      // McMills, FASbI3
        || /[A-Za-z]\d|\d[A-Za-z]/.test(core)                   // CO2, FAPbI3
        || /^[A-Z]\.$/.test(core)                               // L.
        || SYMBOLS.test(core);
      return fixed? w : w.toLowerCase();
    }).join(" ");
    return out.charAt(0).toUpperCase()+out.slice(1);
  };
  if(parts.length===1) return fix(t);
  return fix(parts[0])+": "+parts.slice(1).map(p=>fix(p)).join(": ");
}
function normDoi(d){
  d=String(d||"").trim(); if(!d) return "";
  const m=d.match(/10\.\d{4,}\/\S+/); if(m) return "https://doi.org/"+m[0].replace(/[).,;]+$/,"");
  if(/^https?:\/\//.test(d)) return d.replace(/[).,;]+$/,"");
  return d;
}
function normUrl(u){ u=String(u||"").trim(); if(!u) return ""; if(!/^https?:\/\//i.test(u)) return "https://"+u; return u; }
function normStr(s){ return String(s||"").toLowerCase().replace(/[\s.,;:&()\-–—]+/g," ").replace(/https?:\/\/(doi\.org\/)?/,"").trim(); }
function normCmp(a,b){ return normStr(a)===normStr(b); }
function fmtDate(f){
  if(!f.year || /n\.?d\.?/i.test(String(f.year))) return {text:"(n.d.).",rule:"nodate",missing:true};
  let y=String(f.year).trim();
  if(f.month && f.day) return {text:`(${y}, ${f.month} ${f.day}).`,rule:"date"};
  if(f.month) return {text:`(${y}, ${f.month}).`,rule:"date"};
  return {text:`(${y}).`,rule:"date"};
}

/* ---------------- reference builder (deterministic) ---------------- */
function buildReference(f){
  const A = formatAuthorList(f.authors) || (f.orgAuthor ? f.orgAuthor : "");
  // APA: when no author exists, the title moves into the author position.
  // The engine states this honestly instead of printing a placeholder.
  const noAuthor = !A;
  const D = fmtDate(f);
  const segs=[];
  const push=(key,text,italic=false)=>{ if(text) segs.push({key,text,italic}); };
  const st=f.sourceType||"journal";
  const titleSC = f.title? sentenceCase(f.title) : "";
  const pushAuthorDate=()=>{ const a=A.endsWith(".")?A:A+"."; push("author", a); push("date"," "+D.text); };
  const titleFirst = noAuthor && !!titleSC;
  // pushHead(core, italic): title-first when authorless, else author → date → title.
  const pushHead=(core,italic=false)=>{
    if(titleFirst){ push("title"," "+core+".",italic); push("date"," "+D.text); }
    else { pushAuthorDate(); push("title",core?" "+core+".":" [Title missing].",italic); }
  };
  if(st==="journal"){
    pushHead(titleSC);
    const jName=(f.journal||"[Journal missing]").trim();
    const hasVol=!!(f.volume||f.issue), hasPages=!!String(f.pages||"").trim();
    push("journal"," "+jName+((hasVol||hasPages)?",":"."),true);
    if(hasVol){ const v=(f.volume||"")+(f.issue?"("+f.issue+")":""); push("volume"," "+v+(hasPages?",":"."),false); }
    if(hasPages) push("pages"," "+String(f.pages).replace(/-/g,"–")+".");
    const doi=normDoi(f.doi);
    if(doi) push("doi"," "+doi);
    else if(f.url) push("url"," "+normUrl(f.url));
  } else if(st==="book"){
    pushHead((titleSC||"[Book title]")+(f.edition?" ("+String(f.edition).trim()+")":""),true);
    push("publisher"," "+(f.publisher||"[Publisher missing]")+".");
    const doi=normDoi(f.doi); if(doi) push("doi"," "+doi); else if(f.url) push("url"," "+normUrl(f.url));
  } else if(st==="chapter"){
    pushHead(f.chapterTitle?sentenceCase(f.chapterTitle):(titleSC||"[Chapter title]"));
    const ed=f.editors?formatAuthorList(f.editors):"E. Editor";
    push("editors"," In "+ed+" (Ed.),");
    push("journal"," "+(f.title?sentenceCase(f.title):"[Book title]"),true);
    push("pages"," (pp. "+(f.pages||"xx–xx")+").");
    push("publisher"," "+(f.publisher||"[Publisher]")+".");
    const doi=normDoi(f.doi); if(doi) push("doi"," "+doi);
  } else if(st==="website"||st==="report"||st==="gov"){
    pushHead(titleSC||"[Page title]",false);
    push("journal"," "+(f.siteName||f.publisher||"[Site / Publisher]")+".");
    push("url"," "+normUrl(f.url||f.doi));
  } else if(st==="dataset"){
    pushHead((titleSC||"[Dataset title]")+" (Version "+(f.version||"1.0")+") [Data set]",false);
    push("publisher"," "+(f.publisher||"[Distributor]")+".");
    const doi=normDoi(f.doi); push(doi?"doi":"url"," "+(doi||normUrl(f.url)));
  } else if(st==="video"){
    const chRaw=String(f.authors||"").trim().replace(/\s+/g," ");
    if(!chRaw && titleSC){ push("title"," "+titleSC+" [Video]."); push("date"," "+D.text); }
    else { const ch=chRaw||"[Channel]"; push("author"," "+(ch.endsWith(".")?ch:ch+".")); push("date"," "+D.text); push("title"," "+(titleSC||"[Video title]")+" [Video]."); }
    push("journal"," "+(f.siteName||"YouTube")+".");
    push("url"," "+normUrl(f.url));
  } else if(st==="conference"){
    pushHead(titleSC||"[Paper title]");
    push("journal"," Paper presented at "+(f.siteName||"[Conference]")+(f.publisher?", "+f.publisher:"")+".");
    if(f.url) push("url"," "+normUrl(f.url));
  } else if(st==="thesis"){
    if(titleFirst){ push("title"," "+(titleSC||"[Thesis title]"),true); push("title"," [Unpublished master's thesis]."); push("date"," "+D.text); }
    else { pushAuthorDate(); push("title"," "+(titleSC||"[Thesis title]"),true); push("title"," [Unpublished master's thesis]."); }
    push("publisher"," "+(f.publisher||"[University]")+".");
    if(f.url) push("url"," "+normUrl(f.url));
  } else {
    pushHead(titleSC||"[Title]"); if(f.publisher) push("publisher"," "+f.publisher+".");
    if(f.doi) push("doi"," "+normDoi(f.doi)); else if(f.url) push("url"," "+normUrl(f.url));
  }
  const text=segs.map(s=>s.text).join("").replace(/\s+/g," ").trim();
  return {text, segs, dateMissing:!!D.missing};
}

/* Multi-source parenthetical: deterministic alphabetical join with "; ".
   [{authors, year}] -> "(Hassan & Farouk, 2024; Bohlmann, 2004)". */
function intextMulti(items){
  const rows=(items||[]).map(o=>{
    const list=splitAuthors(o.authors).map(authorToAPA).filter(Boolean);
    const first=list.length?(list[0].includes(",")?list[0].split(",")[0].trim():list[0]):"";
    const it=intextFor(o.authors,o.year);
    return {key:(first+" "+(o.year||"")).toLowerCase(), inner:it.paren.replace(/^\(/,"").replace(/\)$/,"")};
  }).filter(r=>r.inner);
  rows.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  if(!rows.length) return "";
  return "("+rows.map(r=>r.inner).join("; ")+")";
}
/* Messy-citation parser: interpretation (labeled as such in UI), deterministic rebuild. */
function parseCitation(raw){
  const notes=[]; const f={sourceType:"journal",authors:"",year:"",title:"",journal:"",volume:"",issue:"",pages:"",doi:"",url:""};
  let t=String(raw||"");
  const doiM=t.match(/https?:\/\/(dx\.)?doi\.org\/10\.\S+|10\.\d{4,}\/\S+/); if(doiM){ f.doi=doiM[0]; notes.push({k:"doi",t:`DOI recognized → ${normDoi(f.doi)}`,s:"ok"}); t=t.replace(doiM[0]," "); }
  const urlM=t.match(/https?:\/\/[^\s,;]+/); if(urlM && !f.doi){ f.url=urlM[0]; notes.push({k:"url",t:`URL detected → ${f.url}`,s:"ok"}); t=t.replace(urlM[0]," "); }
  const viM=t.match(/(\d+)\s*\((\d+)\)/); if(viM){ f.volume=viM[1]; f.issue=viM[2]; notes.push({k:"volume",t:`Volume(issue) recognized → ${f.volume}(${f.issue})`,s:"ok"}); t=t.replace(viM[0]," "); }
  else { const vM=t.match(/\b[Vv]ol\.?\s*(\d+)/); if(vM){ f.volume=vM[1]; notes.push({k:"volume",t:`Volume recognized → ${f.volume} (APA drops "Vol.")`,s:"warn"}); t=t.replace(vM[0]," "); } }
  const pgM=t.match(/(\d+\s*[–—-]\s*\d+)/); if(pgM){ f.pages=pgM[1].replace(/-/g,"–"); notes.push({k:"pages",t:`Page range recognized → ${f.pages}`,s:"ok"}); t=t.replace(pgM[0]," "); }
  const yM=t.match(/\(?(19|20)\d{2}\)?/); if(yM){ f.year=yM[0].replace(/[()]/g,""); const paren=/\(\d{4}\)/.test(yM[0]); notes.push({k:"date",t:paren?`Publication year recognized → (${f.year})`:`Year ${f.year} found without parentheses — APA requires (${f.year}).`,s:paren?"ok":"err"}); t=t.replace(yM[0]," "); }
  else { f.year="n.d."; notes.push({k:"date",t:"No year found — APA requires (n.d.).",s:"warn"}); }
  t=t.replace(/,\s*,/g,",").replace(/\s{2,}/g," ");
  const chunks=t.split(/[.]+/).map(s=>s.trim()).filter(Boolean);
  if(chunks.length){
    const first=chunks[0];
    const orgSplit=first.match(/^(WHO|UNICEF|NASA|NIH|World Health Organization|Ministry of [A-Z][a-z]+|United Nations|World Bank)\b[\s,]+(.+)$/i);
    if(orgSplit && chunks.length===1){
      f.authors=orgSplit[1];
      notes.push({k:"author",t:`Organization author recognized → ${formatAuthorList(orgSplit[1])}`,s:"ok"});
      chunks[0]=orgSplit[2];
    }
    else if(/[A-Z][a-z]+,?\s+[A-Z]\.?/.test(first)||/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(first)||isOrg(first)) { f.authors=first; notes.push({k:"author",t:`Author recognized → ${formatAuthorList(first)}`,s:/,/.test(first)?"ok":"warn"}); chunks.shift(); }
    else { f.authors=first; notes.push({k:"author",t:`Possible author: "${first}" → ${formatAuthorList(first)}`,s:"warn"}); chunks.shift(); }
  }
  if(chunks.length){ f.title=chunks.shift(); notes.push({k:"title",t:`Title/source text detected → sentence case applied.`,s:"ok"}); }
  if(chunks.length){ f.journal=chunks.shift().replace(/,+$/,"").trim(); notes.push({k:"journal",t:`Container detected → "${f.journal}".`,s:"ok"}); }
  if(!f.journal && f.title && f.title.split(" ").length>6){ const w=f.title.split(" "); f.journal=w.slice(-3).join(" "); f.title=w.slice(0,-3).join(" "); }
  return {fields:f,notes};
}

/* ---------------- source types ---------------- */
const SOURCE_TYPES=[
  {id:"journal",t:"Journal article",i:"JA",blurb:"A paper in a scholarly journal — the core STEM source."},
  {id:"book",t:"Book",i:"BK",blurb:"A whole book by an author or team."},
  {id:"chapter",t:"Chapter",i:"CH",blurb:"One chapter inside an edited book."},
  {id:"website",t:"Website",i:"WB",blurb:"A page with a real date and a site name."},
  {id:"report",t:"Report",i:"RP",blurb:"Findings published by an organization."},
  {id:"gov",t:"Government pub.",i:"GV",blurb:"Official guidance, statistics, guidelines."},
  {id:"dataset",t:"Dataset",i:"DS",blurb:"Data with a version and distributor."},
  {id:"video",t:"Video",i:"VD",blurb:"Streaming video — channel stays verbatim."},
  {id:"conference",t:"Conference paper",i:"CF",blurb:"Work presented at a meeting."},
  {id:"thesis",t:"Thesis",i:"TH",blurb:"A dissertation or master's thesis."},
];

/* ---------------- source type explorer ----------------
   What each source type IS, when it earns its place, what APA needs
   from it, what students get wrong, and what claim it can carry. */
const SOURCE_FAMILIES=[
  {id:"primary",t:"Primary research",d:"Original evidence. It reports what someone actually did and observed."},
  {id:"synthesis",t:"Synthesis and context",d:"Work that organises a field. It interprets, frames, and points you onward."},
  {id:"authority",t:"Authority and data",d:"Findings issued by institutions. They speak for an organisation, not for one study."},
  {id:"digital",t:"Digital reference",d:"Published on a platform. Fast and current, but only as strong as what it documents."},
];
const SOURCE_DETAIL={
 journal:{family:"primary",carries:"Direct findings from a study you can inspect.",
  what:"An article published inside a journal issue, usually after peer review.",
  when:"When you need current, checked findings on a specific research question.",
  needs:["Author(s)","Year","Article title - sentence case","Journal title - italics","Volume","Issue - only if pagination restarts","Page range or article number","DOI or URL"],
  structure:"Author. (Year). Title. *Journal, volume*(issue), pages. https://doi.org/...",
  mistakes:["Using title case for the article title","Keeping the issue number when the journal paginates continuously","Writing 'Retrieved from' before a DOI","Omitting a DOI that exists"],
  value:"The backbone of STEM evidence. Original, peer-checked research appears here first.",
  example:{sourceType:"journal",authors:"Jane Smith",year:"2025",title:"Effects of microplastics on freshwater ecosystems",journal:"Environmental Research",volume:"14",issue:"3",pages:"44-58",doi:"10.9999/citelab.sim.envres.03014"}},
 book:{family:"synthesis",carries:"Frameworks, theory, and sustained treatment of a topic.",
  what:"A complete work by one or more authors, published as a whole.",
  when:"For canonical theory, a methods manual, or a topic treated at length.",
  needs:["Author(s)","Year","Book title - italics","Publisher","DOI or URL"],
  structure:"Author, A. A. (Year). *Title of the work*. Publisher. https://doi.org/...",
  mistakes:["Adding the city of publication - APA 7 dropped it","Citing a chapter's editors as the book's author","Writing 'Retrieved from' before the publisher name"],
  value:"Depth and vocabulary. Most books are themselves an argument that others cite.",
  example:{sourceType:"book",authors:"Bikash Ranjan Parida; Arvind Chandra Pandey; Mukunda Dev Behera; Navneet Kumar",year:"2022",title:"Handbook of Himalayan ecosystems and sustainability, Volume 2: Spatio-temporal monitoring of water resources and climate",publisher:"CRC Press"}},
 chapter:{family:"synthesis",carries:"One author's argument inside a larger collection.",
  what:"A self-contained essay inside a book with a named editor.",
  when:"When a volume collects different authors on one theme.",
  needs:["Chapter author(s) - not the editors","Year","Chapter title","'In' + editor(s)","Book title - italics","Page range","Publisher","DOI"],
  structure:"Author, A. A. (Year). Chapter title. In E. Editor (Ed.), *Book title* (pp. 1-20). Publisher.",
  mistakes:["Citing the whole book instead of the chapter","Dropping the page range","Placing the book title where the author belongs"],
  value:"Precision inside a bigger argument. The page range lets a reader find it.",
  example:{sourceType:"chapter",authors:"Nour El-Din",year:"2022",chapterTitle:"Tensile testing of low-cost polymers",editors:"Mona Aziz; Karim Adel",title:"Materials in the field",pages:"12-29",publisher:"Cairo Academic Press"}},
 website:{family:"digital",carries:"Organisational positions, documentation, and changing pages.",
  what:"A page published on a website with an identifiable author or organisation and a date.",
  when:"For organisational information, standards, documentation, or changing content.",
  needs:["Author or site owner","Date - use (n.d.) if there is none","Page title","Site name - when it differs from the author","URL","Retrieval date - only if the page is likely to change"],
  structure:"Author. (Year). *Page title*. Site name. URL",
  mistakes:["Citing the site homepage instead of the page","Guessing a date instead of writing (n.d.)","Dropping the site name when it differs from the author"],
  value:"Current, and often the only source for an official position.",
  example:{sourceType:"website",authors:"World Health Organization",year:"2024",title:"Vector-borne diseases: fact sheet",siteName:"World Health Organization",url:"https://www.who.int/news-room/fact-sheets/detail/vector-borne-diseases"}},
 report:{family:"authority",carries:"Findings issued under an organisation's name.",
  what:"A document of findings published by an organisation, agency, or company.",
  when:"For institutional research, white papers, and programmatic data.",
  needs:["Group author","Year","Report title - italics","Report or catalogue number if present","Publisher - only if different from the author","URL"],
  structure:"Organisation. (Year). *Title of report* (Report No. 12). Publisher. URL",
  mistakes:["Dropping the group author","Listing the same body as both author and publisher","Ignoring a report number that identifies the edition"],
  value:"Substantial findings that carry an institution's authority rather than one study's.",
  example:{sourceType:"report",authors:"Ministry of Environment",year:"2022",title:"Nile water quality: annual monitoring report",publisher:"Ministry of Environment",number:"ME-2022-07"}},
 gov:{family:"authority",carries:"Law, official statistics, and policy.",
  what:"An official publication from a government or statutory body.",
  when:"For legal frameworks, national statistics, and regulatory guidance.",
  needs:["Issuing agency as author, using its exact official name","Year","Title of the document","Act number, report number, or series","URL"],
  structure:"Agency. (Year). *Title* (Publication No.). URL",
  mistakes:["Citing the ministry's webpage instead of the document","Shortening the agency name in ways the source does not","Treating guidance as though it were legislation"],
  value:"Binding or official. It defines what is required, not what a study found.",
  example:{sourceType:"gov",authors:"World Health Organization",year:"2026",title:"Vector-borne diseases: key facts",siteName:"World Health Organization",url:"https://www.who.int/news-room/fact-sheets/detail/vector-borne-diseases",retrieved:"2026-10-01"}},
 dataset:{family:"primary",carries:"The numbers your own analysis reuses.",
  what:"Structured data published for reuse, normally with a version.",
  when:"When your findings rest on data you did not collect yourself.",
  needs:["Author(s)","Year","Dataset title","Version number","Distributor or repository","DOI or persistent URL"],
  structure:"Author, A. A. (Year). *Title of dataset* (Version 2.0) [Data set]. Repository. https://doi.org/...",
  mistakes:["Omitting the version - data changes","Citing the download page instead of the dataset","Skipping a retrieval date for data that keeps updating"],
  value:"Reproducibility. It lets a reader recheck your arithmetic.",
  example:{sourceType:"dataset",authors:"Karim Adel",year:"2026",title:"Equilibrium constants across temperatures",publisher:"U.S. Geological Survey",version:"2.0",doi:"10.9999/citelab.sim.zenodo.equil-v2"}},
 video:{family:"digital",carries:"Demonstration and recorded explanation.",
  what:"Recorded moving material published on a platform.",
  when:"For procedures, demonstrations, and recorded talks.",
  needs:["Uploader or channel","Year - add month and day for broadcasts","Title","Platform name","URL"],
  structure:"Channel. (Year, Month Day). *Title of video* [Video]. Platform. URL",
  mistakes:["Citing the channel instead of the individual video","Writing 'Retrieved from' before a platform name","Leaving out the upload date"],
  value:"Shows process that text cannot, but rarely carries citable findings.",
  example:{sourceType:"video",authors:"Khan Academy",year:"2023",month:"April",day:"11",title:"Reading a graph: axes and scales",siteName:"YouTube",url:"https://www.youtube.com/watch?v=pG7M4xxrmbo"}},
 conference:{family:"primary",carries:"New work, often ahead of publication.",
  what:"Work presented at a meeting, usually in published proceedings.",
  when:"For very recent work that has not yet reached a journal.",
  needs:["Author(s)","Year","Paper title","Conference name","Publisher or sponsoring body","URL"],
  structure:"Author, A. A. (Year). Paper title. Paper presented at Conference Name, Publisher. URL",
  mistakes:["Citing the conference as if it were a website","Leaving out the conference name so the paper floats free","Inventing a volume and issue the way you would for a journal"],
  value:"Currency. Often the first public version of a finding.",
  example:{sourceType:"conference",authors:"Lina Farouk",year:"2024",month:"March",title:"Low-cost turbidity sensors in canal water",siteName:"Regional Water Conference",publisher:"Nile Research Institute",url:"https://doi.org/10.9999/citelab.sim.conf.turbidity"}},
 thesis:{family:"primary",carries:"Detailed, rarely-published method and results.",
  what:"Original research submitted for a degree.",
  when:"For deep method detail and work that was never formally published.",
  needs:["Author","Year","Title - italics","Degree statement","Institution","Repository URL or DOI"],
  structure:"Author, A. A. (Year). *Title* [Unpublished master's thesis, Institution]. URL",
  mistakes:["Omitting the institution","Citing the department page instead of the repository record","Formatting it like a journal article and inventing a volume"],
  value:"Method depth, and a permanent record of otherwise unpublished work.",
  example:{sourceType:"thesis",authors:"Youssef Nader",year:"2023",title:"Phytoremediation of heavy metals in irrigation canals",publisher:"Cairo University",url:"https://doi.org/10.9999/citelab.sim.thesis.phytoremediation"}},
};

/* ---------------- lessons (investigations) ---------------- */
const LESSONS=[
  {id:"journal",no:"INVESTIGATION 01",title:"Journal Articles",level:"CORE FIELDWORK",skill:"journal",
   story:"A Grade-11 student found a paper on microplastics and wants to cite it in a capstone report. The evidence is on the tray — nothing is formatted yet.",
   fields:{sourceType:"journal",authors:"Md. Saiful Islam; Gangadhar Andaluri",year:"2026",title:"Mechanistic insights into PFAS adsorption on microplastics: Effects of contaminant properties and water chemistry",journal:"Environmental Research",volume:"297",pages:"124161",doi:"https://doi.org/10.1016/j.envres.2026.124161"},
   evidence:[["Researcher","Jane Smith","author"],["Published","2025","date"],["Article","Effects of microplastics on freshwater ecosystems","title"],["Journal","Environmental Research","journal"],["Volume","14","volume"],["Issue","3","volume"],["Pages","44–58"],["DOI","doi:10.1016/j.envres.2026.124161","doi"]],
   predict:{q:"Before any rule is shown: which piece of evidence belongs FIRST in the reference?",opts:["Researcher — Jane Smith","Published — 2025","Article title","Journal name"],a:0,why:"APA opens with who is responsible. Everything else hangs off the author."},
   notes:["Md. Saiful Islam|AUTHOR","Gangadhar Andaluri|AUTHOR","2026|DATE","Mechanistic insights into PFAS adsorption on microplastics: Effects of contaminant properties and water chemistry|TITLE","Environmental Research|JOURNAL","297|VOLUME","124161|PAGES","doi:10.1016/j.envres.2026.124161|DOI"],order:["author","date","title","journal","volume","pages","doi"],
   explain:{q:"You placed the researcher first. Why does APA do that?",opts:["It identifies who is responsible, so lists sort by surname","Numbers always come first","Journals demand it for style"],a:0,rule:"author"},
   blind:{evidence:[["Mona Aziz","?"],["2023","?"],["Renewable energy storage in arid grids","?"],["Energy Reports","?"],["9","?"],["512–520","?"]],answer:["author","date","title","journal","volume","pages"],exp:{sourceType:"journal",authors:"Sungho Hwang; Hae-seok Lee; Yoonmook Kang",year:"2023",title:"Energy yield comparison between monofacial photovoltaic modules with monofacial and bifacial cells in a carport",journal:"Energy Reports",volume:"9",pages:"3148–3153",doi:"https://doi.org/10.1016/j.egyr.2023.02.011"}},
   transfer:{brief:"Same structural rule — a new world. A physics preprint on desert microgrids:",evidence:[["Tarek Samy","?"],["2024","?"],["Microgrid control for desert schools","?"],["Energy Reports","?"],["11","?"],["88–99","?"]],answer:["author","date","title","journal","volume","pages"],exp:{sourceType:"journal",authors:"Tarek Samy",year:"2024",title:"Microgrid control for desert schools",journal:"Energy Reports",volume:"11",pages:"88–99"},focus:{q:"Why does the journal name come after the article title?",opts:["The container is cited after the work it contains","Alphabetical order","It looked better"],a:0,rule:"journal"}}},
  {id:"authors",no:"INVESTIGATION 02",title:"Authors: One, Two, Many",level:"CORE FIELDWORK",skill:"author",
   story:"Three chemists co-wrote a paper on reaction equilibrium. The evidence tray holds three names — how does APA compress them without losing anyone?",
   fields:{sourceType:"journal",authors:"Frazier Nyasulu; Lauren McMills; Rebecca Barlag",year:"2013",title:"Weak acid ionization constants and the determination of weak acid-weak base reaction equilibrium constants in the general chemistry laboratory",journal:"Journal of Chemical Education",volume:"90",issue:"6",pages:"768–770",doi:"https://doi.org/10.1021/ed300403v"},
   evidence:[["Researcher 1","Omar Hassan","author"],["Researcher 2","Lina Farouk","author"],["Researcher 3","Karim Adel","author"],["Published","2024","date"],["Article","Reaction equilibrium in closed aqueous systems","title"],["Journal","Journal of Chemical Education","journal"]],
   predict:{q:"Three researchers. What does APA do with all three in the reference list?",opts:["Lists all three, surname + initials, & before the last","Keeps only the first + et al.","Lists first names in full"],a:0,why:"References keep up to 20 authors. et al. is an in-text shortcut, not a reference-list one."},
   notes:["Omar Hassan|AUTHOR","Lina Farouk|AUTHOR","Karim Adel|AUTHOR","2024|DATE","Reaction equilibrium in closed aqueous systems|TITLE","Journal of Chemical Education|JOURNAL","101|VOLUME","6|ISSUE","2210–2218|PAGES","10.1021/ed300403v|DOI"],order:["author","date","title","journal","volume","pages","doi"],
   explain:{q:"In-text, this source becomes (Hassan et al., 2024). Why?",opts:["3+ authors collapse to first surname + et al. from the first citation","References were too long","Only the first author matters"],a:0,rule:"intext"},
   blind:{evidence:[["Mohsen Azadbakht; Davoud Ashourloo; Hossein Aghighi; Soheil Radiom; Abbas Alimohammadi","?"],["2019","?"],["Wheat leaf rust detection at canopy scale under different LAI levels using machine learning techniques","?"],["Computers and Electronics in Agriculture","?"]],answer:["author","date","title","journal"],exp:{sourceType:"journal",authors:"Mohsen Azadbakht; Davoud Ashourloo; Hossein Aghighi; Soheil Radiom; Abbas Alimohammadi",year:"2019",title:"Wheat leaf rust detection at canopy scale under different LAI levels using machine learning techniques",journal:"Computers and Electronics in Agriculture",volume:"156",pages:"119–128",doi:"https://doi.org/10.1016/j.compag.2018.11.016"}},
   transfer:{brief:"Same rule — new world. Two engineers, one prosthetics paper:",evidence:[["Nour El-Din; Salma Rashad","?"],["2023","?"],["Material strength in low-cost prosthetics","?"],["Journal of Engineering in Medicine","?"]],answer:["author","date","title","journal"],exp:{sourceType:"journal",authors:"Nour El-Din; Salma Rashad",year:"2023",title:"Material strength in low-cost prosthetics",journal:"Journal of Engineering in Medicine",volume:"237",issue:"9",pages:"1041–1053"},focus:{q:"Two authors in-text look like…?",opts:["(El-Din & Rashad, 2023)","(El-Din et al., 2023)","(El-Din and Rashad 2023)"],a:0,rule:"intext"}}},
  {id:"books",no:"INVESTIGATION 03",title:"Books & Chapters",level:"FIELDWORK",skill:"books",
   story:"An engineer cites a whole book on materials science. Books play by a slightly different container rule — the title itself becomes the star.",
   fields:{sourceType:"book",authors:"Bikash Ranjan Parida; Arvind Chandra Pandey; Mukunda Dev Behera; Navneet Kumar",year:"2022",title:"Handbook of Himalayan ecosystems and sustainability, Volume 2: Spatio-temporal monitoring of water resources and climate",publisher:"CRC Press",doi:"https://doi.org/10.1201/9781003265160"},
   evidence:[["Author","Amira Khalil","author"],["Published","2023","date"],["Book","Materials science for engineers: strength and failure","title"],["Publisher","Springer","journal"]],
   predict:{q:"A book has no journal. What takes the container position?",opts:["The publisher, after the italic book title","The city of publication","Nothing — books end at the title"],a:0,why:"Book titles are italic + sentence case; the publisher closes the reference."},
   notes:["Bikash Ranjan Parida|AUTHOR","Arvind Chandra Pandey|AUTHOR","Mukunda Dev Behera|AUTHOR","Navneet Kumar|AUTHOR","2022|DATE","Handbook of Himalayan ecosystems and sustainability, Volume 2: Spatio-temporal monitoring of water resources and climate|TITLE","CRC Press|PUBLISHER"],order:["author","date","title","publisher"],
   explain:{q:"Why is the book title italic but an article title never is?",opts:["Italics mark the container — the book IS the container","Articles are less important","To save ink"],a:0,rule:"journal"},
   blind:{evidence:[["Hana Mostafa","?"],["2022","?"],["Invasive species of the Nile Delta: a field guide","?"],["Springer","?"]],answer:["author","date","title","publisher"],exp:{sourceType:"book",authors:"James C. Beasley; Gary W. Witmer",year:"2017",title:"Ecology and management of terrestrial vertebrate invasive species in the United States",publisher:"CRC Press",doi:"https://doi.org/10.1201/9781315157078"}},
   transfer:{brief:"Same rule — new world. A chapter inside an edited book:",evidence:[["Omar Hassan (chapter)","?"],["2024","?"],["Equilibrium in closed systems","?"],["Physical chemistry methods, ed. E. Miles","?"]],answer:["author","date","title","journal","publisher"],exp:{sourceType:"chapter",authors:"Omar Hassan",year:"2024",chapterTitle:"Equilibrium in closed systems",title:"Physical chemistry methods",editors:"E. Miles",pages:"12–30",publisher:"Oxford University Press"},focus:{q:"Why do editor initials come FIRST (E. Miles)?",opts:["The chapter — not the editor — is being cited","Editors outrank authors","Alphabetical order"],a:0,rule:"editors"}}},
  {id:"websites",no:"INVESTIGATION 04",title:"Websites & Reports",level:"FIELDWORK",skill:"websites",
   story:"A public-health team cites a WHO fact sheet. Web sources carry full dates and site names — and group authors that must never be abbreviated.",
   fields:{sourceType:"website",authors:"World Health Organization",year:"2024",month:"June",day:"11",title:"Air quality and health: global update",siteName:"World Health Organization",url:"https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health"},
   evidence:[["Author","World Health Organization","author"],["Published","2024, June 11","date"],["Page","Air quality and health: global update","title"],["Site","World Health Organization","journal"]],
   predict:{q:"The author is an organization. How should it appear?",opts:["Spelled out in full — World Health Organization","Abbreviated — WHO","Skipped; start with the title"],a:0,why:"Reference lists never abbreviate group authors. Abbreviations belong to in-text flow."},
   notes:["World Health Organization|AUTHOR","2024, June 11|DATE","Air quality and health: global update|TITLE","World Health Organization|SITE","URL|URL"],order:["author","date","title","journal","url"],
   explain:{q:"Why does this reference carry month and day, but journal articles carry only a year?",opts:["Web pages update; the full date pins the version you saw","Journals are yearly","APA likes long dates"],a:0,rule:"date"},
   blind:{evidence:[["Ministry of Environment","?"],["2022","?"],["Nile water quality: annual monitoring report","?"],["Ministry of Environment","?"]],answer:["author","date","title","journal"],exp:{sourceType:"report",authors:"Ministry of Environment",year:"2022",title:"Nile water quality: annual monitoring report",publisher:"Ministry of Environment",url:"https://www.eeaa.gov.eg/nile-water-2022"}},
   transfer:{brief:"Same rule — new world. A dataset with a version:",evidence:[["Karim Adel","?"],["2024","?"],["Equilibrium constants across temperatures (v2.0)","?"],["Zenodo","?"]],answer:["author","date","title","publisher"],exp:{sourceType:"dataset",authors:"Karim Adel",year:"2026",title:"Equilibrium constants across temperatures",publisher:"U.S. Geological Survey",version:"2.0",doi:"https://doi.org/10.5066/p13ppvlt"},focus:{q:"Why does the version appear in the reference?",opts:["Data changes between versions — cite the exact one you used","Versions look technical","To fill space"],a:0,rule:"date"}}},
  {id:"doi",no:"INVESTIGATION 05",title:"DOI & Missing Pieces",level:"DEEP WATER",skill:"doi",
   story:"A machine-learning paper has a DOI but thin metadata. Identifiers must be exact hyperlinks — and missing information must be marked honestly, never invented.",
   fields:{sourceType:"journal",authors:"Tawseef Ayoub Shaikh; Tabasum Rasool; Faisal Rasheed Lone",year:"2022",title:"Towards leveraging the role of machine learning and artificial intelligence in precision agriculture and smart farming",journal:"Computers and Electronics in Agriculture",volume:"198",pages:"107119",doi:"https://doi.org/10.1016/j.compag.2022.107119"},
   evidence:[["Researcher","Youssef Nader","author"],["Published","2022","date"],["Article","Machine-learning systems for crop-yield prediction","title"],["Journal","Computers and Electronics in Agriculture","journal"],["Identifier","doi:10.1016/j.compag.2022.107119","doi"]],
   predict:{q:"The identifier arrives as plain text `doi:10.1016/…`. What must it become?",opts:["A full https://doi.org/… hyperlink","It stays as-is","It can be dropped"],a:0,why:"The DOI is a persistent identifier — only the hyperlink form guarantees one-click resolution."},
   notes:["Youssef Nader|AUTHOR","2022|DATE","Machine-learning systems for crop-yield prediction|TITLE","Computers and Electronics in Agriculture|JOURNAL","198|VOLUME","107–119|PAGES","https://doi.org/10.1016/j.compag.2022.107119|DOI"],order:["author","date","title","journal","volume","pages","doi"],
   explain:{q:"No date on a source. What do you write?",opts:["(n.d.) — an explicit honest marker","Guess the year","Leave it blank"],a:0,rule:"nodate"},
   blind:{evidence:[["No author listed","?"],["No date","?"],["Equilibrium constants: reference tables","?"],["CRC Handbook of Chemistry and Physics","?"]],answer:["author","date","title","journal"],exp:{sourceType:"journal",authors:"",year:"n.d.",title:"Equilibrium constants: reference tables",journal:"CRC Handbook of Chemistry and Physics",volume:"104",pages:"5-12–5-20"}},
   transfer:{brief:"Same rule — new world. A video source with a channel author:",evidence:[["Code for Agriculture (channel)","?"],["2024, February 2","?"],["Training crop models on small datasets","?"],["YouTube","?"]],answer:["author","date","title","journal"],exp:{sourceType:"video",authors:"Code for Agriculture",year:"2024",month:"February",day:"2",title:"Training crop models on small datasets",siteName:"YouTube",url:"https://www.youtube.com/watch?v=example"},focus:{q:"Why does the channel name stay verbatim?",opts:["Screen names are not personal names — never invert them","Channels are organizations","Shorter is better"],a:0,rule:"org"}}},
  {id:"intext",no:"INVESTIGATION 06",title:"In-Text Citations",level:"CORE FIELDWORK",skill:"intext1",
   story:"A manuscript claims arid-grid storage works. The reference exists — but the sentence has no pointer. The reader is stranded.",
   fields:{sourceType:"journal",authors:"Sungho Hwang; Hae-seok Lee; Yoonmook Kang",year:"2023",title:"Energy yield comparison between monofacial photovoltaic modules with monofacial and bifacial cells in a carport",journal:"Energy Reports",volume:"9",pages:"3148–3153",doi:"https://doi.org/10.1016/j.egyr.2023.02.011"},
   evidence:[["Researcher","Mona Aziz","author"],["Published","2023","date"],["Claim","Renewable energy storage in arid grids","title"]],
   predict:{q:"Where does a parenthetical citation sit?",opts:["At the end of the claim, before the period","At the start of the paragraph","After the period"],a:0,why:"The pointer closes the claim it supports — inside the sentence."},
   notes:["Mona Aziz|AUTHOR","2023|DATE","Renewable energy storage in arid grids|TITLE","Energy Reports|JOURNAL"],order:["author","date","title","journal"],
   explain:{q:"Narrative vs parenthetical — what actually differs?",opts:["Whether the surname sits in the sentence flow or in parentheses","The year can be dropped in narrative form","Nothing — they are interchangeable"],a:0,rule:"intext"},
   blind:{evidence:[["Gregory M. Bohlmann","?"],["2024","?"],["Biodegradable packaging life-cycle assessment","?"]],answer:["author","date","title"],exp:{sourceType:"journal",authors:"Gregory M. Bohlmann",year:"2004",title:"Biodegradable packaging life-cycle assessment",journal:"Environmental Progress",volume:"23",issue:"4",pages:"342–346"}},
   transfer:{brief:"Same rule — new world. Three authors, one wheat-rust claim:",evidence:[["Adel; Farouk; Nader","?"],["2025","?"],["Deep learning for wheat-rust detection","?"]],answer:["author","date","title"],exp:{sourceType:"journal",authors:"Karim Adel; Lina Farouk; Youssef Nader",year:"2025",title:"Deep learning for wheat-rust detection",journal:"Computers and Electronics in Agriculture",volume:"215",pages:"88–99"},focus:{q:"Parenthetical form for 3+ authors?",opts:["(Adel et al., 2025)","(Adel, Farouk & Nader, 2025)","(Adel 2025)"],a:0,rule:"intext"}}},
];

/* ---------------- training sessions (challenges) ---------------- */
const CHALLENGES=[
  {n:"CHALLENGE 01",diff:"BEGINNER",skill:"author",skills:["author","date","title"],ev:{Authors:"Gregory M. Bohlmann",Year:"2004",Article:"Biodegradable packaging life-cycle assessment",Journal:"Environmental Progress",Volume:"23",Issue:"4",Pages:"342–346",DOI:"https://doi.org/10.1002/ep.10053"},exp:{sourceType:"journal",authors:"Gregory M. Bohlmann",year:"2004",title:"Biodegradable packaging life-cycle assessment",journal:"Environmental Progress",volume:"23",issue:"4",pages:"342–346",doi:"https://doi.org/10.1002/ep.10053"}},
  {n:"CHALLENGE 02",diff:"BEGINNER",skill:"author",skills:["author","date","doi"],ev:{Authors:"George M. Ayoub; Lilian Malaeb",Year:"2014",Article:"Economic feasibility of a solar still desalination system with enhanced productivity",Journal:"Desalination",Volume:"335",Issue:"1",Pages:"27–32",DOI:"https://doi.org/10.1016/j.desal.2013.12.010"},exp:{sourceType:"journal",authors:"George M. Ayoub; Lilian Malaeb",year:"2014",title:"Economic feasibility of a solar still desalination system with enhanced productivity",journal:"Desalination",volume:"335",issue:"1",pages:"27–32",doi:"https://doi.org/10.1016/j.desal.2013.12.010"}},
  {n:"CHALLENGE 03",diff:"INTERMEDIATE",skill:"books",skills:["books","publisher"],ev:{Authors:"Hana Mostafa",Year:"2022",Book:"Invasive species of the Nile Delta: a field guide",Publisher:"Springer",DOI:"https://doi.org/10.1201/9781315157078"},exp:{sourceType:"book",authors:"James C. Beasley; Gary W. Witmer",year:"2017",title:"Ecology and management of terrestrial vertebrate invasive species in the United States",publisher:"CRC Press",doi:"https://doi.org/10.1201/9781315157078"}},
  {n:"CHALLENGE 04",diff:"INTERMEDIATE",skill:"websites",skills:["websites","date"],ev:{Authors:"World Health Organization",Date:"2024, March 5",Page:"Drinking-water quality guidelines",Site:"World Health Organization",URL:"https://www.who.int/publications/drinking-water"},exp:{sourceType:"website",authors:"World Health Organization",year:"2024",month:"March",day:"5",title:"Drinking-water quality guidelines",siteName:"World Health Organization",url:"https://www.who.int/publications/drinking-water"}},
  {n:"CHALLENGE 05",diff:"ADVANCED",skill:"author",skills:["author","intextM","doi"],ev:{Authors:"Mohsen Azadbakht; Davoud Ashourloo; Hossein Aghighi; Soheil Radiom; Abbas Alimohammadi",Year:"2019",Article:"Wheat leaf rust detection at canopy scale under different LAI levels using machine learning techniques",Journal:"Computers and Electronics in Agriculture",Volume:"156",Pages:"119–128",DOI:"https://doi.org/10.1016/j.compag.2018.11.016"},exp:{sourceType:"journal",authors:"Mohsen Azadbakht; Davoud Ashourloo; Hossein Aghighi; Soheil Radiom; Abbas Alimohammadi",year:"2019",title:"Wheat leaf rust detection at canopy scale under different LAI levels using machine learning techniques",journal:"Computers and Electronics in Agriculture",volume:"156",pages:"119–128",doi:"https://doi.org/10.1016/j.compag.2018.11.016"}},
  {n:"CHALLENGE 06",diff:"ADVANCED",skill:"date",skills:["date","title","pages"],ev:{Authors:"No author listed",Year:"No date",Article:"Equilibrium constants: reference tables",Journal:"CRC Handbook of Chemistry and Physics",Volume:"104",Pages:"5-12–5-20",Note:"Missing author + date — APA has a rule for this"},exp:{sourceType:"journal",authors:"",year:"n.d.",title:"Equilibrium constants: reference tables",journal:"CRC Handbook of Chemistry and Physics",volume:"104",pages:"5-12–5-20"}},
  {n:"CHALLENGE 07",diff:"RESEARCH SIMULATION",skill:"ordering",skills:["ordering","journal","doi"],ev:{Authors:"Nour El-Din",Year:"2023",Article:"Material strength in low-cost prosthetics",Journal:"Journal of Engineering in Medicine",Volume:"237",Issue:"9",Pages:"1041–1053",DOI:"https://doi.org/10.1177/09544119211060092"},exp:{sourceType:"journal",authors:"Merel van der Stelt; Luc Verhamme; Cornelis H. Slump; Lars Brouwers; Thomas J. J. Maal",year:"2021",title:"Strength testing of low-cost 3D-printed transtibial prosthetic socket",journal:"Proceedings of the Institution of Mechanical Engineers, Part H: Journal of Engineering in Medicine",volume:"236",issue:"3",pages:"367–375",doi:"https://doi.org/10.1177/09544119211060092"}},
];

/* ---------------- detective cases ---------------- */
const DETECTIVE=[
  {title:"Case file 01 — Microplastics manuscript",cite:[{t:"Smith, J.",ok:true},{t:" 2024.",err:"date",why:"Correct investigation. Years are enclosed in parentheses: (2024).",fix:"(2024)."},{t:" Effects of microplastics.",ok:true},{t:" Environmental Science,",ok:true},{t:" 14(2),",ok:true},{t:" 31-44.",err:"pages",why:"Correct — page ranges use an en dash: 31–44.",fix:"31–44."}],errors:["date","pages"]},
  {title:"Case file 02 — Punctuation slip",cite:[{t:"Hassan, O., & Farouk, L.",ok:true},{t:" (2023).",ok:true},{t:" Solar water purification.",ok:true},{t:" Desalination,",ok:true},{t:" 540,",ok:true},{t:" 88-97.",err:"pages",why:"Correct — page ranges use an en dash, not a hyphen: 88–97.",fix:"88–97."},{t:" DOI: 10.1016/j.desal.2023.1",err:"doi",why:"Correct investigation. Never prefix 'DOI:' — use the full hyperlink https://doi.org/…",fix:"https://doi.org/10.1016/j.desal.2023.1"}],errors:["pages","doi"]},
  {title:"Case file 03 — Title case trap",cite:[{t:"Nader, Y.",ok:true},{t:" (2022).",ok:true},{t:" Machine-Learning Systems For Crop-Yield Prediction.",err:"title",why:"Correct. Article titles use sentence case: only the first word and proper nouns are capitalized.",fix:"Machine-learning systems for crop-yield prediction."},{t:" Computers and Electronics in Agriculture,",ok:true},{t:" 198,",ok:true},{t:" 107–119.",ok:true},{t:" https://doi.org/10.1016/j.compag.2022.107119",ok:true}],errors:["title"]},
  {title:"Case file 04 — The author slip",cite:[{t:"John Smith",err:"author",why:"Correct investigation. Invert to surname + initials: Smith, J.",fix:"Smith, J."},{t:" (2025).",ok:true},{t:" climate change and crop systems.",err:"title",why:"Correct — sentence case capitalizes only the first word: Climate change and crop systems.",fix:"Climate change and crop systems."},{t:" Journal of Environmental Science,",ok:true},{t:" 14(2), 31–44.",ok:true},{t:" https://doi.org/10.5555/0000",ok:true}],errors:["author","title"]},
];

/* ---------------- in-text passages ---------------- */
const INTEXT=[
  {para:["Recent studies suggest biodegradable packaging can reduce packaging impacts "," when composting infrastructure is available ","."], ev:{Authors:"Gregory M. Bohlmann",Year:"2004",Work:"Biodegradable packaging life-cycle assessment"}, correct:{paren:"(Bohlmann, 2004)",narr:"Bohlmann (2004)"}, choices:["(Bohlmann, 2004)","(Gregory M. Bohlmann, 2004)","(Bohlmann 2024)","Bohlmann (2004)"]},
  {para:["Equilibrium constants shift predictably with temperature "," — a relationship confirmed across three independent aqueous datasets ","."], ev:{Authors:"Omar Hassan & Lina Farouk",Year:"2024",Work:"Reaction equilibrium in closed aqueous systems"}, correct:{paren:"(Hassan & Farouk, 2024)",narr:"Hassan and Farouk (2024)"}, choices:["(Hassan & Farouk, 2024)","(Hassan and Farouk, 2024)","Hassan and Farouk (2024)","(Hassan et al., 2024)"]},
  {para:["Deep-learning models now detect wheat rust with 96% field accuracy "," — outperforming manual scouting in large-plot trials ","."], ev:{Authors:"Adel, Farouk, Nader & Aziz",Year:"2025",Work:"Deep learning for wheat-rust detection"}, correct:{paren:"(Adel et al., 2025)",narr:"Adel et al. (2025)"}, choices:["(Adel et al., 2025)","(Adel, Farouk, Nader & Aziz, 2025)","Adel et al. (2025)","(Adel et. al, 2025)"]},
];

/* ---------------- citation judgment (cite or not?) ---------------- */
const JUDGE=[
  {s:"Water boils at 100°C at sea level.",cite:false,why:"Common knowledge in school science — no citation needed."},
  {s:"Biodegradable packaging cut waste 40% in the 2004 packaging trial.",cite:true,why:"A specific statistic from a study — the reader must be able to verify it."},
  {s:"Bohlmann (2004) argues composting infrastructure decides the outcome.",cite:true,why:"A paraphrased claim attributed to a researcher — cite it."},
  {s:"Solar stills are an interesting technology.",cite:false,why:"A general opinion with no verifiable claim — nothing to point at."},
  {s:"“Equilibrium constants shift predictably with temperature” (Hassan & Farouk, 2024).",cite:true,why:"A direct quotation — always cite, with exact wording credited."},
];

/* ---------------- noisy-record classification ---------------- */
const CLASSIFY=[
  {title:"Record A — journal page scrape",rows:[["Authors","Omar Hassan; Lina Farouk"],["Published","2024","date"],["Abstract","120 words on equilibrium…"],["Keywords","equilibrium, aqueous, lab"],["Institution","Cairo University"],["Journal","Journal of Chemical Education","journal"],["Volume","101"],["Issue","6"],["Pages","2210–2218"],["DOI","10.1021/ed300403v"],["Downloads","4,102"]],
   answer:["Authors","Published","Journal","Volume","Issue","Pages","DOI"],why:"Abstracts, keywords, institutions and download counts never enter an APA reference. Title would too — this scrape dropped it, which is itself a finding."},
  {title:"Record B — dataset landing page",rows:[["Creator","Karim Adel"],["Released","2024"],["Version","2.0"],["File size","48 MB"],["License","CC-BY"],["Format","CSV"],["Distributor","Zenodo"],["DOI","10.5066/p13ppvlt"],["Views","912"]],
   answer:["Creator","Released","Version","Distributor","DOI"],why:"Version matters for data (cite the exact one used). File size, format, license and views stay out."},
];

/* ---------------- layered repair drills ---------------- */
const DRILLS={
  author:[
    {q:"Which author line is APA 7?",opts:["Smith, J.","Smith J","John Smith"],a:0,why:"Surname first, then initials with periods."},
    {q:"Two authors, correct form?",opts:["Hassan, O., & Farouk, L.","Hassan, O. and Farouk, L.","O. Hassan, L. Farouk"],a:0,why:"Commas separate; & closes before the final author."},
    {q:"A channel called “Nile Lab Notes” appears how?",opts:["Nile Lab Notes. (verbatim)","Notes, N. L.","Nile, L. N."],a:0,why:"Screen names are never inverted."}],
  date:[
    {q:"Correct date cue?",opts:["(2025).","2025.","(2025)"],a:0,why:"Parentheses + closing period."},
    {q:"A WHO page dated June 11, 2024 becomes…?",opts:["(2024, June 11).","(June 11, 2024).","(2024)."],a:0,why:"Web sources carry the full date: year first."},
    {q:"No date anywhere. Honest marker?",opts:["(n.d.).","(….).","Leave it blank"],a:0,why:"Never invent, never omit silently."}],
  doi:[
    {q:"Correct DOI form?",opts:["https://doi.org/10.1016/j.x","DOI: 10.1016/j.x","doi.org/10.1016/j.x."],a:0,why:"Full hyperlink, no prefix, no trailing period."},
    {q:"The DOI ends the reference. Trailing period?",opts:["No — the link must stay clickable","Yes, every line ends with a period","Only on Mondays"],a:0,why:"Punctuation must not break the identifier."},
    {q:"Plain `10.1016/j.x` pasted in. Resolve it to…?",opts:["https://doi.org/10.1016/j.x","http://10.1016/j.x","[no DOI]"],a:0,why:" bare identifiers expand to the resolver link."}],
  title:[
    {q:"Article title in sentence case?",opts:["Climate change and crop systems","Climate Change And Crop Systems","Climate Change and Crop Systems"],a:0,why:"Only first word (+ proper nouns) capitalized."},
    {q:"Which part is italicized?",opts:["The journal name","The article title","Both"],a:0,why:"Italics mark the container."},
    {q:"Subtitle after a colon?",opts:["Strength and failure — capital S","strength and failure","Strength And Failure"],a:0,why:"The word after a colon is capitalized."}],
  pages:[
    {q:"Correct range?",opts:["31–44.","31-44.","pp. 31-44."],a:0,why:"En dash, no pp., closing period."},
    {q:"Volume 14, issue 2 compresses to…?",opts:["14(2)","Vol. 14, No. 2","14:2"],a:0,why:"Italic volume, plain parenthesized issue."},
    {q:"No pages on the source. You…?",opts:["End the container with a period — never invent pages","Write pp. ?–?","Copy another paper's pages"],a:0,why:"Missing data is marked, not fabricated."}],
  intext:[
    {q:"Parenthetical, one author?",opts:["(Bohlmann, 2004)","(Bohlmann 2024)","Bohlmann (2004)"],a:0,why:"Surname, comma, year — all inside."},
    {q:"Narrative, two authors?",opts:["Hassan and Farouk (2024)","Hassan & Farouk (2024)","(Hassan and Farouk, 2024)"],a:0,why:"Narrative uses “and”; & lives inside parentheses."},
    {q:"Parenthetical, four authors?",opts:["(Adel et al., 2025)","(Adel, Farouk, Nader & Aziz, 2025)","(Adel et. al 2025)"],a:0,why:"3+ collapses to et al. with exact punctuation."}],
};

/* ---------------- daily specimens (progressive hints) ---------------- */
const DAILY_SPEC=[
  {frag:[{t:"Smith, J.",ok:1},{t:" 2025.",bad:"date",fix:"(2025)."}],q:"Something is wrong here. What would you investigate first?",
   hints:["Look at the year — how is it dressed?","APA wraps the date in something. What?","Parentheses. The year needs (2025)."],rule:"date",skill:"date"},
  {frag:[{t:"Hassan, O., & Farouk, L.",ok:1},{t:" (2023).",ok:1},{t:" Solar Water Purification.",bad:"title",fix:"Solar water purification."}],q:"One word here breaks sentence case. Which?",
   hints:["Compare every capitalized word after the first.","Proper nouns only — is “Water” one?","Water → water."],rule:"title",skill:"title"},
  {frag:[{t:"Nader, Y. (2022). Models. ",ok:1},{t:"DOI: 10.1016/j.x",bad:"doi",fix:"https://doi.org/10.1016/j.x"}],q:"The identifier is present but unusable. Why?",
   hints:["Try clicking it in your mind.","A resolver link starts with…?","https://doi.org/ + identifier, no prefix."],rule:"doi",skill:"doi"},
  {frag:[{t:"John Smith",bad:"author",fix:"Smith, J."},{t:" (2025). Methods.",ok:1}],q:"Who comes first — and in what form?",
   hints:["Does the punctuation tell you who is who?","Surname before initials.","Smith, J."],rule:"author",skill:"author"},
  {frag:[{t:"Aziz, M. (2023). Grids. ",ok:1},{t:"Energy Reports, 9, 88-97.",bad:"pages",fix:"88–97."}],q:"Nearly perfect. One keystroke is wrong.",
   hints:["Look at the range between the numbers.","Hyphen or en dash?","88–97."],rule:"pages",skill:"pages"},
];

/* ---------------- transfer missions (same rule, new world) ---------------- */
const TRANSFER=[
  {rule:"pages",brief:"You learned page ranges on a biology paper. A physics manuscript on desert microgrids uses the same rule — prove it transfers.",
   evidence:[["Tarek Samy","?"],["2024","?"],["Microgrid control for desert schools","?"],["Energy Reports","?"],["11","?"],["31-44","?"]],
   answer:["author","date","title","journal","volume","pages"],
   exp:{sourceType:"journal",authors:"Tarek Samy",year:"2024",title:"Microgrid control for desert schools",journal:"Energy Reports",volume:"11",pages:"31-44"},
   focus:{q:"The evidence shows `31-44`. Your reference must show…?",opts:["31–44. (en dash + period)","31-44 (as found)","pp. 31–44"],a:0,why:"Same rule, new world: en dash, no pp., closing period."}},
  {rule:"author",brief:"You learned multi-author compression in chemistry. A computer-science paper with four authors tests the same muscle.",
   evidence:[["Mohsen Azadbakht; Davoud Ashourloo; Hossein Aghighi; Soheil Radiom; Abbas Alimohammadi","?"],["2019","?"],["Wheat leaf rust detection at canopy scale under different LAI levels using machine learning techniques","?"],["Computers and Electronics in Agriculture","?"]],
   answer:["author","date","title","journal"],
   exp:{sourceType:"journal",authors:"Mohsen Azadbakht; Davoud Ashourloo; Hossein Aghighi; Soheil Radiom; Abbas Alimohammadi",year:"2019",title:"Wheat leaf rust detection at canopy scale under different LAI levels using machine learning techniques",journal:"Computers and Electronics in Agriculture",volume:"156",pages:"119–128",doi:"https://doi.org/10.1016/j.compag.2018.11.016"},
   focus:{q:"In-text, this team becomes…?",opts:["(Adel et al., 2025)","(Adel, Farouk, Nader & Aziz, 2025)","(Aziz et al., 2025)"],a:0,why:"First surname + et al. — even though the reference keeps all four."}},
  {rule:"doi",brief:"You learned DOI hygiene on an ML paper. An engineering paper hands you a bare identifier — same rule, rougher evidence.",
   evidence:[["Nour El-Din","?"],["2023","?"],["Material strength in low-cost prosthetics","?"],["Journal of Engineering in Medicine","?"],["DOI 10.1177/09544119211060092","?"]],
   answer:["author","date","title","journal","doi"],
   exp:{sourceType:"journal",authors:"Merel van der Stelt; Luc Verhamme; Cornelis H. Slump; Lars Brouwers; Thomas J. J. Maal",year:"2021",title:"Strength testing of low-cost 3D-printed transtibial prosthetic socket",journal:"Proceedings of the Institution of Mechanical Engineers, Part H: Journal of Engineering in Medicine",volume:"236",issue:"3",pages:"367–375",doi:"10.1177/09544119211060092"},
   focus:{q:"`DOI 10.1177/…` must be rebuilt as…?",opts:["https://doi.org/10.1177/…","DOI: 10.1177/…","10.1177/… (as found)"],a:0,why:"Prefix dropped, resolver hyperlink built."}},
  {rule:"date",brief:"You learned date placement on journal papers. A WHO web page with a full date tests whether the rule travels.",
   evidence:[["World Health Organization","?"],["2024, June 11","?"],["Air quality and health","?"],["World Health Organization","?"]],
   answer:["author","date","title","journal"],
   exp:{sourceType:"website",authors:"World Health Organization",year:"2024",month:"June",day:"11",title:"Air quality and health",siteName:"World Health Organization",url:"https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health"},
   focus:{q:"Why month + day here, when journals show year only?",opts:["Web pages version — the full date pins what you saw","Journals forbid months","Longer looks smarter"],a:0,why:"Date granularity follows source volatility."}},
];

/* ---------------- STEM missions ---------------- */
const STEM=[
  {track:"Biology",mission:"MISSION 01",brief:"Your team is investigating whether water hyacinth can be managed as a biofilter in Nile canals. Your mentor asks for two documented sources.",sources:[
    {type:"journal",authors:"Sasadhar Jana; Monojit A. Choudhuri",year:"1981",title:"Glycolate metabolism of three submersed aquatic angiosperms: Effect of heavy metals",journal:"Aquatic Botany",volume:"11",pages:"67–77",doi:"https://doi.org/10.1016/0304-3770(81)90047-4"},
    {type:"report",authors:"Ministry of Environment",year:"2022",title:"Nile water quality: annual monitoring report",publisher:"Ministry of Environment",url:"https://www.eeaa.gov.eg/nile-water-2022"}],
   judge:[
    {q:"Your claim: water hyacinth takes up heavy metals in Nile canals. Which source carries that finding?",opts:["The journal study on hyacinth uptake","The ministry monitoring report","Both equally — reports contain trials"],a:0,why:"The finding belongs to its origin: the uptake study. The report monitors water quality; it ran no uptake trial."},
    {q:"A teammate writes: Hyacinth solves canal pollution (Mostafa, 2023). Your call?",opts:["Too strong — uptake in a study is not solved pollution","Fine — citations cover it","Fine — journals prove things"],a:0,why:"Match strength to evidence. One uptake study supports a finding, not a solved crisis."}]},
  {track:"Chemistry",mission:"MISSION 02",brief:"Your team is testing whether low-cost catalysts shift reaction equilibrium in school-lab conditions. Document the paper and the dataset.",sources:[
    {type:"journal",authors:"Matthew M. Hooper; Brenton DeBoef",year:"2009",title:"A green multicomponent reaction for the organic chemistry laboratory: The aqueous Passerini reaction",journal:"Journal of Chemical Education",volume:"86",issue:"9",pages:"1077",doi:"https://doi.org/10.1021/ed086p1077"},
    {type:"dataset",authors:"Karim Adel",year:"2026",title:"Equilibrium constants across temperatures",publisher:"U.S. Geological Survey",version:"2.0",doi:"https://doi.org/10.5066/p13ppvlt"}],
   judge:[
    {q:"You need the equilibrium constants themselves. Which source is primary?",opts:["The Zenodo dataset of constants","The journal paper discussing them","A textbook chapter"],a:0,why:"Numbers live at their origin: the dataset. The paper interprets them."},
    {q:"Which sentence is faithful to a dataset showing constants across temperatures?",opts:["Constants were measured across temperatures (Adel, 2024).","The dataset proves catalysts always work.","The data shows nothing can be concluded."],a:0,why:"Faithful means same strength. Always-proves outruns the data; the third inverts it."}]},
  {track:"Physics",mission:"MISSION 03",brief:"Your team is preparing a capstone report on stabilizing a school microgrid in Aswan with rooftop solar + storage. Document both sources.",sources:[
    {type:"journal",authors:"Sungho Hwang; Hae-seok Lee; Yoonmook Kang",year:"2023",title:"Energy yield comparison between monofacial photovoltaic modules with monofacial and bifacial cells in a carport",journal:"Energy Reports",volume:"9",pages:"3148–3153",doi:"https://doi.org/10.1016/j.egyr.2023.02.011"},
    {type:"conference",authors:"Tarek Samy",year:"2024",month:"March",title:"Microgrid control for desert schools",siteName:"IEEE Sustainable Power Conference",publisher:"Cairo",url:"https://example.org/microgrid-2024"}],
   judge:[
    {q:"Your capstone claims school-microgrid control works in desert conditions. Best support?",opts:["The conference paper on microgrid control for desert schools","The journal storage review alone","Either — all sources are equal"],a:0,why:"Fit decides: the desert-schools control paper matches the claim's exact conditions."},
    {q:"Should the reference list include both sources?",opts:["Yes — storage background plus control evidence serve different jobs","No — one source per paper","No — conference papers are banned"],a:0,why:"Different links, different jobs. Background and evidence both belong."}]},
  {track:"Environmental Science",mission:"MISSION 04",brief:"Your team is investigating biodegradable packaging for fresh food. Document the journal study and the health-agency page.",sources:[
    {type:"journal",authors:"Gregory M. Bohlmann",year:"2004",title:"Biodegradable packaging life-cycle assessment",journal:"Environmental Progress",volume:"23",issue:"4",pages:"342–346",doi:"https://doi.org/10.1002/ep.10053"},
    {type:"website",authors:"World Health Organization",year:"2024",month:"June",day:"11",title:"Air quality and health: global update",siteName:"World Health Organization",url:"https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health"}],
   judge:[
    {q:"Your claim concerns packaging waste. Which source carries it?",opts:["The packaging study (Bohlmann, 2004)","The WHO air-quality page","The WHO page — agencies outrank journals"],a:0,why:"Relevance beats rank. The WHO page is authoritative — about air, not packaging."},
    {q:"You paraphrase Bohlmann's finding in new words. Pointer needed?",opts:["Yes — wording changed, ownership did not","No — paraphrases are original","Only for direct quotes"],a:0,why:"Paraphrase restructures; it does not transfer ownership. Cite it."}]},
  {track:"Engineering",mission:"MISSION 05",brief:"Your mentor asks you to document three sources supporting a material-selection decision for low-cost prosthetics. Two records are on file.",sources:[
    {type:"journal",authors:"Merel van der Stelt; Luc Verhamme; Cornelis H. Slump; Lars Brouwers; Thomas J. J. Maal",year:"2021",title:"Strength testing of low-cost 3D-printed transtibial prosthetic socket",journal:"Proceedings of the Institution of Mechanical Engineers, Part H: Journal of Engineering in Medicine",volume:"236",issue:"3",pages:"367–375",doi:"https://doi.org/10.1177/09544119211060092"},
    {type:"thesis",authors:"Salma Rashad",year:"2023",title:"Low-cost composite testing for prosthetic sockets",publisher:"Cairo University",url:"https://example.edu/thesis/rashad-2023"}],
   judge:[
    {q:"You need the socket-test measurements. Which source is primary?",opts:["The thesis presenting new composite tests","The journal article","Both — theses copy journals"],a:0,why:"New measurements are primary wherever they appear — including a thesis."},
    {q:"What limitation must your claim respect?",opts:["Lab tests are not field performance — scope the claim","Theses need no limits stated","Limitations weaken papers, so omit them"],a:0,why:"Read the limits: support what was tested. Honest limits strengthen the rest."}]},
  {track:"Computer Science",mission:"MISSION 06",brief:"Your team must decide whether phone-photo wheat-rust detection is reliable enough for field trials. Document the study and the methods video.",sources:[
    {type:"journal",authors:"Mohsen Azadbakht; Davoud Ashourloo; Hossein Aghighi; Soheil Radiom; Abbas Alimohammadi",year:"2019",title:"Wheat leaf rust detection at canopy scale under different LAI levels using machine learning techniques",journal:"Computers and Electronics in Agriculture",volume:"156",pages:"119–128",doi:"https://doi.org/10.1016/j.compag.2018.11.016"},
    {type:"video",authors:"Code for Agriculture",year:"2024",month:"February",day:"2",title:"Training crop models on small datasets",siteName:"YouTube",url:"https://www.youtube.com/watch?v=example"}],
   judge:[
    {q:"Your claim: phone-photo detection is field-trial ready. Which source decides?",opts:["The wheat-rust detection study — evaluated reliability","The methods video alone","The video — newer means truer"],a:0,why:"Reliability claims need evaluated evidence, not a methods walkthrough."},
    {q:"What is the methods video for your file?",opts:["Background on small-dataset training — context, not proof","Proof of field readiness","Decoration"],a:0,why:"Secondary material serves context. Findings need origins."}]},
];

/* ---------------- researcher mode tasks ----------------
   Mini research problems with the scaffolding removed. Each task carries
   sources with roles: cite (build on this origin), include (belongs in the
   file), reject (does not belong). The capstone adds conflict, a dateless
   source question, and a limitation reflection. */
const RESEARCHER_TASKS=[
 {id:"biofilter",track:"Biology",title:"Biofilter pilot",simulated:true,
  question:"Does water hyacinth take up lead in canal water?",
  brief:"A canal-cleaning pilot needs one documented finding. Three sources are on file. Build the file — and defend every choice.",
  need:{q:"What evidence would answer this question?",opts:["Measured uptake of lead by hyacinth in canal water","Opinions about which plant looks nicest","The history of the canal"],a:0,why:"The question asks about uptake — only measured removal answers it."},
  sources:[
{role:"cite",type:"journal",authors:"Hana Mostafa",year:"2023",title:"Water hyacinth uptake of heavy metals in canal water",journal:"Aquatic Botany",volume:"188",pages:"103–112",doi:"10.9999/citelab.sim.biofilter.103512",sim:true,excerpt:"Canal water exposed to water hyacinth lost up to 68% of dissolved lead within 14 days. Uptake was highest in the first week, then levelled off."},
    {role:"include",type:"report",authors:"Ministry of Environment",year:"2022",title:"Nile water quality: annual monitoring report",publisher:"Ministry of Environment",url:"https://simulated.example.org/nile-water-2022",sim:true,excerpt:"Annual monitoring records lead readings across 40 canal stations. The report interprets trends but ran no plant-uptake trials."},
    {role:"reject",type:"website",authors:"AquaClean",year:"2024",title:"Clear weeds fast with AquaClean",siteName:"AquaClean",url:"https://simulated.example.org/aquaclean",sim:true,excerpt:"Marketing copy promising fast weed clearance. No measurements, no methods, no data."}],
  finding:{q:"Which finding answers the question?",opts:["68% of dissolved lead removed within 14 days","Lead was monitored at 40 stations","Weeds clear fast with AquaClean"],a:0,why:"Only the uptake measurement answers an uptake question."},
  claim:{q:"Which claim fits the evidence?",opts:["Water hyacinth removed up to 68% of dissolved lead from canal water within 14 days (Mostafa, 2023).","Water hyacinth solves canal pollution (Mostafa, 2023).","Water hyacinth might do something to water (Mostafa, 2023)."],a:0,why:"Same strength, same conditions. Solves-pollution outruns the study; the third abandons its precision."},
  explainQ:"Why does this source support your claim?"},
 {id:"catalyst",track:"Chemistry",title:"Catalyst check",simulated:true,
  question:"Do low-cost catalysts shift equilibrium in school-lab conditions?",
  brief:"A school lab wants evidence before buying catalysts. Three sources are on file. Build the file — and defend every choice.",
  need:{q:"What evidence would answer this question?",opts:["Measured equilibrium shifts in school-lab setups","A price list of catalysts","A definition of chemistry"],a:0,why:"The question asks about shifts under school conditions — only measured shifts answer it."},
  sources:[
   {role:"cite",type:"journal",authors:"Omar Hassan; Lina Farouk",year:"2009",title:"Reaction equilibrium in closed aqueous systems",journal:"Journal of Chemical Education",volume:"86",issue:"9",pages:"1077",doi:"10.9999/citelab.sim.catalyst.0112",sim:true,excerpt:"Closed aqueous systems with the low-cost catalyst shifted equilibrium measurably at classroom temperatures. Controls without catalyst did not shift."},
   {role:"include",type:"dataset",authors:"Karim Adel",year:"2026",title:"Equilibrium constants across temperatures",publisher:"U.S. Geological Survey",version:"2.0",doi:"10.9999/citelab.sim.zenodo.equil-v2",sim:true,excerpt:"Measured equilibrium constants across a temperature range, versioned 2.0. Raw numbers other researchers can recheck."},
   {role:"reject",type:"website",authors:"MiracleCatalyst Blog",year:"2024",title:"One teacher's miracle catalyst",siteName:"MiracleCatalyst Blog",url:"https://simulated.example.org/miracle",sim:true,excerpt:"A blog post claiming a miracle catalyst. No data shown, no methods described."}],
  finding:{q:"Which finding answers the question?",opts:["Equilibrium shifted measurably with catalyst at classroom temperatures","Constants exist somewhere","A blogger loves catalysts"],a:0,why:"Only the measured shift under school conditions answers the question."},
  claim:{q:"Which claim fits the evidence?",opts:["The low-cost catalyst shifted equilibrium measurably in closed classroom-temperature systems (Hassan & Farouk, 2024).","The catalyst proves all reactions work everywhere (Hassan & Farouk, 2024).","Something happened with chemicals (Hassan & Farouk, 2024)."],a:0,why:"Same strength, same conditions. Proves-everywhere outruns one system; the third says nothing."},
  explainQ:"Why does this source support your claim?"},
 {id:"fieldready",track:"Computer Science",title:"The research challenge",simulated:true,
  question:"Is phone-photo wheat-rust detection ready for field trials?",
  brief:"CAPSTONE. Four sources, conflicting evidence, one misleading page. Identify what is useful, reject what is not, match your claim to the evidence, and reflect on its limits.",
  need:{q:"What evidence would answer this question?",opts:["Measured detection reliability in field-like conditions","The number of app downloads","Opinions about phone cameras"],a:0,why:"Readiness is reliability under field conditions — only measured accuracy answers it."},
  sources:[
   {role:"cite",type:"journal",authors:"Karim Adel; Lina Farouk",year:"2019",title:"Deep learning for wheat-rust detection",journal:"Computers and Electronics in Agriculture",volume:"156",pages:"119–128",doi:"10.9999/citelab.sim.wheatlab.108811",sim:true,excerpt:"Phone-photo detection reached 91% accuracy in lab tests on small samples. The authors note samples were small and conditions controlled."},
   {role:"include",type:"journal",authors:"Youssef Nader",year:"2024",title:"Wheat-rust detection in field conditions",journal:"Field Robotics Letters",volume:"3",pages:"40–52",doi:"10.9999/citelab.sim.wheatfield.040",sim:true,excerpt:"The same approach reached only 58% accuracy across three working farms. Lighting and leaf clutter hurt performance."},
   {role:"include",type:"video",authors:"Code for Agriculture",year:"2024",month:"February",day:"2",title:"Training crop models on small datasets",siteName:"Simulated training channel",url:"https://simulated.example.org/methods-video",sim:true,excerpt:"A methods walkthrough explaining how small datasets are used to train crop models. Background, not an evaluation."},
   {role:"reject",type:"website",authors:"AgriScan",year:"2025",title:"AgriScan reaches 99% accuracy",siteName:"AgriScan",url:"https://simulated.example.org/agriscan",sim:true,excerpt:"A vendor page claiming 99% accuracy for its paid product. No methods, no data, no evaluation described."}],
  finding:{q:"Which findings must your file weigh?",opts:["91% lab accuracy — plus 58% field accuracy from the second study","99% vendor accuracy","The video's view count"],a:0,why:"Both evaluated results matter, especially because they disagree."},
  claim:{q:"Which claim fits the evidence?",opts:["Detection reached 91% in lab tests on small samples, but field results disagree — trials are premature (Adel et al., 2025).","Detection is field-ready now (Adel et al., 2025).","Detection never works (Adel et al., 2025)."],a:0,why:"The honest claim carries both the result and the conflict. Ready-now ignores the field study; never-works ignores the lab result."},
  extra:[
   {q:"Study A reports 91% lab accuracy; Study B reports 58% in the field. What goes in your file?",opts:["Both, weighted — readers need the disagreement","Only A — clean stories win","Neither — disagreement means silence"],a:0,why:"Represent relevant evidence honestly — including the conflict."},
   {q:"A useful methods page gives no date. What goes in its reference entry?",opts:["(n.d.) — say so honestly","Guess 2023","Leave the date out"],a:0,why:"Missing dates become (n.d.). Never guess, never leave a gap."}],
  explainQ:"Why does this source support your claim — and what limits it?",
  limitQ:"What can your claim NOT support?"},
];

/* ---------------- onboarding diagnostics ---------------- */
const ONBOARD=[
  {q:"Which part tells us who created this source?",cite:[{t:"Smith, J.",hit:"author"},{t:" (2025). Climate change and crop systems.",hit:null}],rule:"author"},
  {q:"Which part tells us WHEN it was published?",cite:[{t:"Smith, J. ",hit:null},{t:"(2025)",hit:"date"},{t:". Climate change and crop systems.",hit:null}],rule:"date"},
  {q:"Which is the ARTICLE title, and which is the JOURNAL?",opts:["“Climate change…” is the article; “Journal of …” is the container","“Journal of …” is the article; “Climate change…” is the container"],a:0,rule:"journal"},
  {q:"A sentence uses Smith's finding. Correct pointer?",opts:["(Smith, 2025)","(Smith 2025)","Smith, 2025"],a:0,rule:"intext"},
];

/* ---------------- skill model ---------------- */
const SKILL_GROUPS=[
  {name:"SOURCE RECOGNITION",skills:["journal","books","websites","reports","datasets","classify"]},
  {name:"REFERENCE STRUCTURE",skills:["author","date","title","volume","pages","doi","ordering"]},
  {name:"IN-TEXT CITATION",skills:["intext1","intext2","intextM","intextN"]},
  {name:"EVIDENCE & JUDGMENT",skills:["classify","intext1","intextN"]},
];
const SKILL_LABELS={author:"Author formatting",date:"Dates",title:"Title case",journal:"Journals",volume:"Volume & issue",pages:"Page ranges",doi:"DOI & URLs",ordering:"Reference ordering",intext1:"Parenthetical · one author",intext2:"Parenthetical · two authors",intextM:"Parenthetical · 3+ (et al.)",intextN:"Narrative citations",books:"Books",websites:"Websites & pages",reports:"Reports & official pubs",datasets:"Datasets & versions",classify:"Source classification"};
const SKILL_VIEW={author:"learn",date:"learn",title:"learn",journal:"practice",volume:"practice",pages:"practice",doi:"practice",ordering:"practice",intext1:"practice",intext2:"practice",intextM:"practice",intextN:"practice",books:"practice",websites:"practice",reports:"desk",datasets:"desk",classify:"desk"};
const DEFAULT_SKILLS={author:20,date:20,title:10,journal:10,volume:5,pages:5,doi:5,intext1:10,intext2:5,intextM:5,intextN:5,books:5,websites:5,reports:5,datasets:5,classify:5,ordering:10};

/* Title-capitalization review (deterministic uncertainty labeling).
   sentenceCase() cannot know proper nouns. flagTitleWords() lists mid-title
   capitalized words the student should confirm before saving — the UI
   presents these as review, never as silent corrections. */
function flagTitleWords(t){
  t=String(t||"").trim().replace(/\s+/g," "); if(!t) return [];
  const out=[]; let afterColon=false; let first=true;
  t.split(/\s+/).forEach(w=>{
    const core=w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,"");
    const endsColon=/:\s*$/.test(w);
    if(first){ first=false; if(!core) return; }
    else if(!afterColon && core && /[A-Z]/.test(core[0]) && !/^[A-Z][A-Z\s&.\-']+$/.test(core) && core.length>1){ out.push(core); }
    afterColon=endsColon;
  });
  return [...new Set(out)];
}

/* 60-second tricks: one fast mnemonic per skill. Shown in the finder,
   printed on the study sheet. Each maps to its rule + investigation. */
const TRICKS=[
 {skill:"author",title:"Flip the name",trick:"Surname first, initials after — “Jane Smith” always becomes “Smith, J.”",example:"Smith, J.",rule:"author"},
 {skill:"author",title:"Two authors need &",trick:"Comma between, & before the last: Hassan, O., & Farouk, L.",example:"Hassan, O., & Farouk, L.",rule:"author"},
 {skill:"author",title:"3+ means et al. (in text)",trick:"Three or more authors collapse in TEXT only: (Adel et al., 2025). The list still names up to 20.",example:"(Adel et al., 2025)",rule:"intext"},
 {skill:"author",title:"Never invert organizations",trick:"Groups stay verbatim: World Health Organization — never “Organization, W.”",example:"World Health Organization.",rule:"org"},
 {skill:"date",title:"Year hugs the author",trick:"(2025). sits directly after the author, parentheses + period included.",example:"Smith, J. (2025).",rule:"date"},
 {skill:"date",title:"Full dates for live pages",trick:"Web pages and videos carry month + day: (2024, June 11). Journals stay year-only.",example:"(2024, June 11).",rule:"date"},
 {skill:"date",title:"No date? Say so",trick:"Missing dates become (n.d.) — never guess, never leave a gap.",example:"(n.d.).",rule:"nodate"},
 {skill:"title",title:"Quiet the title",trick:"Sentence case: first word up, the rest down — Climate change and crop systems.",example:"Climate change and crop systems",rule:"title"},
 {skill:"title",title:"Proper nouns survive",trick:"Rivers, tools, languages keep capitals: Nile, Python, Arduino. When unsure, flag for review.",example:"…of the Nile Delta",rule:"title"},
 {skill:"journal",title:"Venue gets the italics",trick:"Article plain, journal italic: title. *Journal of …*, — never the reverse.",example:"*Journal of Environmental Science*,",rule:"journal"},
 {skill:"volume",title:"Compress to 14(2)",trick:"“Volume 14, Issue 3” becomes 14(3) — italic volume, plain (issue), no words.",example:"14(3),",rule:"volume"},
 {skill:"pages",title:"En dash the range",trick:"Page ranges use – not -: 31–44. Journals skip pp. entirely.",example:"31–44.",rule:"pages"},
 {skill:"doi",title:"DOI = full hyperlink",trick:"Strip “DOI:”, build https://doi.org/10.xxxx — and no trailing period, ever.",example:"https://doi.org/10.xxxx",rule:"doi"},
 {skill:"intext1",title:"Pointer closes the claim",trick:"Parenthetical sits before the period: …waste (Bohlmann, 2004).",example:"(Bohlmann, 2004)",rule:"intext"},
 {skill:"intextN",title:"Narrative weaves the name",trick:"Author in the sentence, year caged: Bohlmann (2004) argues…",example:"Bohlmann (2004)",rule:"intext"},
 {skill:"ordering",title:"Sort by surname",trick:"Reference lists sort A–Z by first surname. Same author? Earlier year first.",example:"Aziz … Hassan … Bohlmann",rule:"order"},
 {skill:"ordering",title:"Author → Date → Title → Source",trick:"Four slots, fixed order, every source type. Memorize the chain, not templates.",example:"Author (Date). Title. Source.",rule:"order"},
  {skill:"classify",title:"Type is the master switch",trick:"Journal + volume + DOI = article. Site + URL = webpage. Classify first — rules follow.",example:"journal? website? report?",rule:"order"},
  {skill:"classify",title:"Cite so a stranger can check",trick:"Every borrowed fact needs a pointer a stranger can follow — claim, pointer, record, source.",example:"(Bohlmann, 2004) → reference → source",rule:"intext"},
  {skill:"intext1",title:"A citation is a pointer, not proof",trick:"A citation shows WHERE to look, not THAT it is true — always evaluate the source behind it.",example:"cited ≠ true",rule:"intext"},
];
/* ---------------- research dictionary ----------------
   Short, honest definitions for the language of trustworthy research.
   Each entry carries a STEM note so the term lands in real work. */
const GLOSSARY=[
  {t:"citation",d:"A short pointer inside your writing that names the source behind a claim (e.g. Bohlmann, 2004).",why:"It tells a reader exactly which sentence rests on which source."},
  {t:"reference",d:"The full record at the end of your work — everything needed to retrieve a source.",why:"Without it, your pointers lead nowhere and your evidence cannot be checked."},
  {t:"attribution",d:"Naming whose work, idea, or data contributed to your statement.",why:"Science keeps score through attribution; it is how contributors get credit."},
  {t:"evidence",d:"Information that supports a claim — measurements, observations, records.",why:"STEM arguments stand or fall on evidence, never on assertion alone."},
  {t:"claim",d:"What you say or argue — an assertion a reader may reasonably ask you to support.",why:"Every section of a capstone report is built from claims; each needs its support visible."},
  {t:"source",d:"Where evidence or ideas come from — a paper, dataset, report, book, or page.",why:"Citing the right source, not just any source, is a core research judgment."},
  {t:"primary source",d:"Original, first-hand material — a trial report, a dataset, new measurements.",why:"Cite origins for findings; they are the closest link to the evidence."},
  {t:"secondary source",d:"Analysis or synthesis of earlier material — a review, a textbook chapter, a news summary.",why:"Useful for background and context; trace findings back to their origins."},
  {t:"peer review",d:"Independent experts probing a manuscript's methods, reasoning, and reporting before publication.",why:"It is quality control, not a truth certificate — reviewed work can still be wrong."},
  {t:"DOI",d:"A persistent identifier (https://doi.org/…) that permanently locates a publication.",why:"Links rot; a DOI keeps your reference retrievable years later."},
  {t:"paraphrase",d:"Restating a source's idea in genuinely your own sentence structure, with a pointer.",why:"Most STEM writing paraphrases — it proves you understood, not just copied."},
  {t:"quotation",d:"Repeating a source's exact words inside quote marks, with a pointer.",why:"Reserve it for definitions, precise claims, or language under analysis."},
  {t:"plagiarism",d:"Presenting someone else's words, ideas, or data as your own — by copying or by too-close paraphrase.",why:"It breaks the evidence chain and ends trust in your work."},
  {t:"credibility",d:"How much reason a reader has to trust a claim — earned by evidence, methods, and fit.",why:"A citation alone never creates credibility; what the trace reveals does."},
  {t:"bias",d:"Systematic lean in what is measured, reported, or omitted — from methods, funding, or perspective.",why:"Ask who produced a source and why before letting it carry your claim."},
  {t:"methodology",d:"How evidence was obtained — design, instruments, samples, analysis.",why:"Methods decide what a study can and cannot support."},
  {t:"limitation",d:"What a study cannot show — small samples, lab-only conditions, narrow scope.",why:"Honest limits strengthen the claims you do make."},
  {t:"reproducibility",d:"Whether another researcher can follow your work — locate sources, inspect methods, redo steps.",why:"Citations are part of the infrastructure that makes research traceable."},
  {t:"literature review",d:"A synthesis that compares studies, finds patterns and disagreements, and spots gaps.",why:"It is an argument about the state of knowledge — not a pile of summaries."},
  {t:"synthesis",d:"Combining findings from multiple sources into a new understanding.",why:"Your capstone's value lives here — connected evidence, not listed evidence."},
  {t:"research gap",d:"A question the existing literature does not yet answer.",why:"Gaps are where new STEM projects begin."},
];
if(typeof module!=="undefined"&&module.exports){ module.exports={RULES,isOrg,authorToAPA,splitAuthors,formatAuthorList,intextFor,intextMulti,sentenceCase,flagTitleWords,normDoi,normUrl,normStr,normCmp,fmtDate,buildReference,parseCitation,SOURCE_TYPES,LESSONS,CHALLENGES,DETECTIVE,INTEXT,JUDGE,CLASSIFY,DRILLS,DAILY_SPEC,TRANSFER,TRICKS,STEM,ONBOARD,SKILL_GROUPS,SKILL_LABELS,SKILL_VIEW,DEFAULT_SKILLS,GLOSSARY,RESEARCHER_TASKS,SOURCE_FAMILIES,SOURCE_DETAIL}; }



