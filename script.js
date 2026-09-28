const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const S={t:0,n:1025,reqs:[],audit:[],notes:[],personalOK:true,
sla:{P1:120,P2:240,P3:480,P4:1440},
techs:[{n:'Ravi',s:'Hardware'},{n:'Amit',s:'Software'},{n:'Rahul',s:'Hardware'},{n:'Meera',s:'Network'}],
assets:[{id:'IT-PC-1045',name:'Dell Desktop',crit:1},{id:'IT-SRV-001',name:'Main Server',crit:2},{id:'IT-LT-2210',name:'HP Laptop',crit:0}]};
let tab='emp';
const tm=t=>{const m=600+t;return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const hm=m=>m<0?'-'+hm(-m):Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';
function audit(m){S.audit.unshift(tm(S.t)+'  '+m)}
function tl(r,m){r.tl.push(tm(S.t)+'  '+m)}
function note(who,m){S.notes.unshift({who,m:tm(S.t)+'  '+m})}
$('as').innerHTML=S.assets.map(a=>`<option value="${a.id}">${a.name} (${a.id})</option>`).join('');
$('tsel').innerHTML=S.techs.map(t=>`<option>${t.n}</option>`).join('');
$('tsel').value='Rahul';
$('tabs').innerHTML=[['emp','Employee'],['tech','Technician'],['adm','Admin']].map(x=>`<button id="b-${x[0]}" onclick="go('${x[0]}')">${x[1]}</button>`).join('');
function go(t){tab=t;['emp','tech','adm'].forEach(k=>{$('p-'+k).hidden=k!==t;$('b-'+k).className=k===t?'on':''});draw()}

function load(n){return S.reqs.filter(r=>r.tech===n&&!['CLOSED','REJECTED'].includes(r.st)).length}
function create(){
 const ty=$('ty').value,as=S.assets.find(a=>a.id===$('as').value),sv=$('sv').value,im=+$('im').value;
 const r={id:'SR-'+(S.n++),ty,na:$('na').value,ca:$('ca').value,as,sv,ds:$('ds').value||'(no description)',tl:[],st:'OPEN',esc:false,warned:false,fee:0};
 S.reqs.unshift(r);tl(r,'Request created');audit(r.id+' created by Suprakash');
 if(ty==='Personal'&&!S.personalOK){r.st='REJECTED';r.why='Company policy does not support personal devices.';tl(r,'Rejected: '+r.why);note('Employee',r.id+' rejected: '+r.why);draw();return}
 const sc={Low:1,Medium:2,High:3}[sv]+im+as.crit;
 r.pr=sc>=6?'P1':sc>=4?'P2':sc>=3?'P3':'P4';r.score=sc;
 tl(r,'Priority calculated: '+r.pr+' (score '+sc+')');
 const c=S.techs.filter(t=>t.s===r.ca).sort((a,b)=>load(a.n)-load(b.n))[0];
 if(!c){r.st='OPEN';tl(r,'No technician with this skill. Waiting.')}
 else{r.tech=c.n;r.st='ASSIGNED';r.dead=S.t+S.sla[r.pr];r.total=S.sla[r.pr];tl(r,'Assigned to '+c.n+' (skill match, lowest workload)');
  note(c.n,'New '+r.pr+' request '+r.id+' assigned to you');note('Employee',r.id+' assigned to '+c.n);audit(r.id+' assigned to '+c.n)}
 if(ty==='Personal'||ty==='External'){r.fee=500;tl(r,'Marked as chargeable (Rs 500)')}
 draw()}
function act(id,a){
 const r=S.reqs.find(x=>x.id===id);
 if(a==='acc'){r.acc=true;tl(r,r.tech+' accepted the request')}
 if(a==='start'){r.st='IN_PROGRESS';tl(r,'Work started')}
 if(a==='res'){const d=$('dg-'+id);r.diag=(d&&d.value)||'Problem fixed.';tl(r,'Diagnosis: '+r.diag);
  r.st=r.fee?'PAYMENT_PENDING':'RESOLVED';tl(r,r.fee?'Resolved. Invoice of Rs '+r.fee+' created':'Resolved');
  note('Employee',id+' has been resolved');audit(id+' resolved by '+r.tech)}
 if(a==='close'){r.st='CLOSED';tl(r,'Employee confirmed. Closed')}
 if(a==='pay'){r.st='PAID';tl(r,'Test payment successful. Webhook verified');r.st='CLOSED';tl(r,'PAID, then CLOSED');audit(id+' paid Rs '+r.fee)}
 draw()}
function rate(id,n){const r=S.reqs.find(x=>x.id===id);r.rate=n;audit(id+' rated '+n+'/5');draw()}
function skip(m){for(let i=0;i<m;i++)tick(true);draw()}
function tick(q){
 S.t++;
 S.reqs.forEach(r=>{
  if(!['ASSIGNED','IN_PROGRESS'].includes(r.st))return;
  const left=r.dead-S.t;
  if(!r.warned&&left<=r.total*.25&&left>0){r.warned=true;tl(r,'SLA near breach. Warning sent');note(r.tech,'Warning: '+r.id+' is near SLA breach')}
  if(!r.esc&&left<=0){r.esc=true;tl(r,'SLA breached. Escalated to Admin');note('Admin','SLA breach: '+r.id+' escalated to you');audit(r.id+' escalated to Admin')}
 });
 if(!q)draw()}
setInterval(()=>tick(false),1000);

function slaTxt(r){if(!['ASSIGNED','IN_PROGRESS'].includes(r.st))return '';const l=r.dead-S.t;
 return `<span class="sla ${l<=0?'bad':l<=r.total*.25?'warn':''}">SLA: ${l<=0?'BREACHED '+hm(-l)+' ago':hm(l)+' left'}</span>`}
function head(r){return `<div class="rw"><div><b>${r.id}</b> ${esc(r.as.name)} <span class="sub">${r.ty}, ${r.ca}</span></div><div>${r.pr?`<span class="pill ${r.pr}">${r.pr}</span>`:''}<span class="pill st">${r.st}</span>${r.esc?'<span class="pill P1">ESCALATED</span>':''}</div></div><div class="sub" style="margin:2px 0">${esc(r.ds)}</div><div>${slaTxt(r)}${r.tech?' <span class="sub">Technician: '+r.tech+'</span>':''}</div>`}
function tline(r){return `<ul class="tl">${r.tl.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>`}

function draw(){
 $('clk').textContent='Demo time '+tm(S.t);
 if(tab==='emp'){
  const my=S.notes.filter(n=>n.who==='Employee').slice(0,3).map(n=>`<div class="note">${esc(n.m)}</div>`).join('');
  $('empList').innerHTML=my+(S.reqs.length?'':'<div class="card sub">No requests yet. Submit one above.</div>')+S.reqs.map(r=>{
   let b='';
   if(r.st==='RESOLVED')b=`<button onclick="act('${r.id}','close')">Confirm and close</button>`;
   if(r.st==='PAYMENT_PENDING')b=`<button onclick="act('${r.id}','pay')">Pay Rs ${r.fee} (test mode)</button>`;
   if(r.st==='CLOSED'&&!r.rate)b='<span class="st5">Rate: '+[1,2,3,4,5].map(n=>`<button onclick="rate('${r.id}',${n})" aria-label="${n} stars">&#9734;</button>`).join('')+'</span>';
   if(r.rate)b='Your rating: '+'&#9733;'.repeat(r.rate);
   if(r.why)b=`<span class="bad">${esc(r.why)}</span>`;
   return `<div class="card">${head(r)}<div style="margin-top:6px">${b}</div>${tline(r)}</div>`}).join('')}
 if(tab==='tech'){
  const n=$('tsel').value;const mine=S.reqs.filter(r=>r.tech===n);
  const nn=S.notes.filter(x=>x.who===n).slice(0,3).map(x=>`<div class="note">${esc(x.m)}</div>`).join('');
  const act_=r=>{
   if(r.st==='ASSIGNED'&&!r.acc)return `<button onclick="act('${r.id}','acc')">Accept</button>`;
   if(r.st==='ASSIGNED')return `<button onclick="act('${r.id}','start')">Start work</button>`;
   if(r.st==='IN_PROGRESS')return `<input id="dg-${r.id}" placeholder="Diagnosis, e.g. Power adapter is damaged" style="margin-bottom:6px"><button onclick="act('${r.id}','res')">Mark as resolved</button>`;return ''};
  const act2=r=>{const a=act_(r);return a};
  $('techList').innerHTML=nn+(mine.length?'':'<div class="card sub">No requests for '+n+'.</div>')+mine.map(r=>`<div class="card">${head(r)}<div style="margin-top:6px">${act2(r)}</div>${tline(r)}</div>`).join('')}
 if(tab==='adm'){
  const cnt=s=>S.reqs.filter(r=>r.st===s).length;
  const act1=S.reqs.filter(r=>!['CLOSED','REJECTED'].includes(r.st)).length;
  $('admTop').innerHTML=`<div class="stats"><div><b>${S.reqs.length}</b>Total</div><div><b>${act1}</b>Active</div><div><b>${S.reqs.filter(r=>r.esc).length}</b>Escalated</div><div><b>${cnt('CLOSED')}</b>Closed</div></div>
  ${S.notes.filter(n=>n.who==='Admin').slice(0,3).map(n=>`<div class="note bad">${esc(n.m)}</div>`).join('')}
  <div class="card"><b>Organization settings</b>
  <div class="g2" style="margin-top:8px"><label><input type="checkbox" style="width:auto" ${S.personalOK?'checked':''} onchange="S.personalOK=this.checked;audit('Admin set personal device support: '+this.checked);draw()"> Support personal devices</label><span></span>
  ${['P1','P2','P3','P4'].map(p=>`<div><label>${p} deadline (minutes)</label><input type="number" min="5" value="${S.sla[p]}" onchange="audit('Admin changed SLA '+'${p}'+': '+S.sla['${p}']+' to '+this.value+' min');S.sla['${p}']=+this.value"></div>`).join('')}</div></div>
  <div class="card"><b>Technician workload</b><div class="tw"><table><tr><th>Name</th><th>Skill</th><th>Active tickets</th></tr>${S.techs.map(t=>`<tr><td>${t.n}</td><td>${t.s}</td><td>${load(t.n)}</td></tr>`).join('')}</table></div></div>
  <div class="card"><b>All requests</b><div class="tw"><table><tr><th>ID</th><th>Asset</th><th>Priority</th><th>Status</th><th>Tech</th><th>Rating</th></tr>${S.reqs.map(r=>`<tr><td>${r.id}</td><td>${esc(r.as.name)}</td><td>${r.pr||'-'}</td><td>${r.st}${r.esc?' (escalated)':''}</td><td>${r.tech||'-'}</td><td>${r.rate||'-'}</td></tr>`).join('')}</table></div></div>
  <div class="card"><b>Audit log</b><ul class="tl" style="max-height:180px">${S.audit.map(a=>'<li>'+esc(a)+'</li>').join('')||'<li>Nothing yet.</li>'}</ul></div>`}
}
go('emp');
