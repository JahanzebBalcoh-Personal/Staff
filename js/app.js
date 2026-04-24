console.log('Sultans App Starting...');

try {
  emailjs.init({ publicKey: "WEicHOT9c6wtsaRt-" });
} catch (e) {
  console.warn("EmailJS failed to initialize:", e);
}
const EJ_SVC = 'default_service';
const EJ_TPL = 'template_id';
const EJ_TO = 'jahanzebbaloch@example.com';
const firebaseConfig={apiKey:"AIzaSyBfhbjD0b8UaISn1QrK6E-Ci5Yr7HcUTzA",authDomain:"sultans-cricket.firebaseapp.com",projectId:"sultans-cricket",storageBucket:"sultans-cricket.firebasestorage.app",messagingSenderId:"975861366304",appId:"1:975861366304:web:6bfef2fc3e3b01d0284645"};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let RATE=2000;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let ADMIN_PASS=localStorage.getItem('admin_pass')||'jahanzebbaloch';
let activeBookingId=null;
let allBookings=[],allExpenses=[],allCustomers=[];
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth();
let currentInvBooking=null;
let allHistory=[];
const APP_VERSION = '1.2.1'; // Update this when deploying new code

// ─── FIREBASE LISTENERS ───
function startListeners(){
  try {
    showSync(true);
    db.collection('bookings').onSnapshot(s=>{
      allBookings=s.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(b.createdAt||b.date||'').localeCompare(a.createdAt||a.date||''));
      showSync(false);
      renderOnline(); // Update online badge/tab
      refreshTab();
    },err=>{showSync(false);console.log('Bookings error:',err);});
    db.collection('expenses').onSnapshot(s=>{allExpenses=s.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));refreshTab();},err=>{console.log('Expenses error:',err);});
    db.collection('customers').onSnapshot(s=>{allCustomers=s.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.nm||'').localeCompare(b.nm||''));refreshTab();},err=>{console.log('Customers error:',err);});
    db.collection('history_reset').onSnapshot(s=>{allHistory=s.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));refreshTab();},err=>{console.log('History error:',err);});
    
    // Listen for real-time notifications from Public App
    db.collection('feed').orderBy('at', 'desc').limit(5).onSnapshot(s => {
      s.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const now = new Date().getTime();
          const at = new Date(data.at).getTime();
          // Only notify for new items (within last 30s) to avoid old alerts on load
          if (now - at < 30000) {
            toast('🔔 ' + data.txt, 'info');
            // Play a sound if possible
            try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
          }
        }
      });
    });

  } catch (e) {
    console.error("Firebase Listeners failed:", e);
    showSync(false);
  }
}
function showSync(on){document.getElementById('syncBar').className='sync-bar'+(on?' on':'');}
function refreshTab(){
  const a=document.querySelector('.tab.active');if(!a)return;
  const fn=a.getAttribute('onclick')||'';
  if(fn.includes('dash'))renderDash();
  else if(fn.includes('pre'))renderPreTable();
  else if(fn.includes('post'))renderPostTab();
  else if(fn.includes('cal'))renderCal();
  else if(fn.includes('cust'))renderCustTable('');
  else if(fn.includes('online'))renderOnline();
  else if(fn.includes('history'))renderHistory();
  else if(fn.includes('exp'))renderET();
  else if(fn.includes('rep'))renderRep();
}

// ─── ALARM SYSTEM ───
let sirenAudio = null;
function startAlarmListener() {
    db.collection('alerts').onSnapshot(snap => {
        snap.docChanges().forEach(ch => {
            if (ch.type === 'added') {
                const data = ch.doc.data();
                const now = new Date().getTime();
                const at = new Date(data.at).getTime();
                if (now - at < 60000) { // Only if alert is within last 1 minute
                    playSiren(data.txt);
                }
            }
        });
    });
}

function playSiren(msg) {
    document.getElementById('alarmMsg').textContent = msg || 'Customer needs attention!';
    document.getElementById('alarmAlert').style.display = 'block';
    if (!sirenAudio) {
        sirenAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2816/2816-preview.mp3');
        sirenAudio.loop = true;
    }
    sirenAudio.play().catch(e => console.log("Sound blocked:", e));
}

function stopAlarm() {
    document.getElementById('alarmAlert').style.display = 'none';
    if (sirenAudio) {
        sirenAudio.pause();
        sirenAudio.currentTime = 0;
    }
}

// ─── HELPERS ───
const today=()=>{const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dd}`;};
const Rs=n=>'Rs '+Number(n||0).toLocaleString('en-PK');
const fromRs = txt => parseFloat((txt||'').replace(/Rs|,/g, ''))||0;
function toast(m,t='ok'){const el=document.getElementById('toast');el.textContent=m;el.className='toast on '+t;setTimeout(()=>el.className='toast',3000);}

// ─── CLOCK ───
let lastDate = today();
function tick(){
  try {
    const n = new Date();
    const hours = n.getHours();
    const minutes = String(n.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const timeStr = h12 + ':' + minutes + ' ' + ampm;
    const dateStr = n.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const clk = document.getElementById('clk');
    const clkd = document.getElementById('clkd');
    if (clk) clk.textContent = timeStr;
    if (clkd) clkd.textContent = dateStr;

    const curDate = today();
    if(curDate !== lastDate){
      lastDate = curDate;
      ['b-date','e-d','ef-d'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.value = curDate;
      });
      if(typeof renderDash === 'function') renderDash();
      if(typeof startTimer === 'function') startTimer();
    }
  } catch (e) { console.warn("Clock tick error:", e); }
}
setInterval(tick,1000);
tick();
function pmbadge(m){const mp={cash:'bx-g',bank:'bx-b',jazz:'bx-p',easy:'bx-t'};const ml={cash:'💵 Cash',bank:'🏦 Alfalah',jazz:'🟣 Jazz',easy:'🩵 Easy'};return`<span class="bx ${mp[m]||'bx-g'}">${ml[m]||m}</span>`;}
function sbadge(s){if(s==='paid')return'<span class="bx bx-g">✅ PAID</span>';if(s==='partial')return'<span class="bx bx-y">💛 PARTIAL</span>';if(s==='pre')return'<span class="bx bx-o">⏳ PRE</span>';if(s==='waiting_approval')return'<span class="bx bx-b">⏳ WAITING APPROVAL</span>';return'<span class="bx bx-r">❌ PENDING</span>';}

function vipbadge(v){if(v==='vip')return'<span class="bx bx-y">⭐ VIP</span>';if(v==='new')return'<span class="bx bx-b">🆕 NEW</span>';return'<span class="bx bx-t">Regular</span>';}
function accName(t){return{jazz:'JazzCash (Abdul Gaffar)',bank:'Bank Alfalah (Mehboob Ahmad)',easy:'Easypaisa'}[t]||'';}
function viewSS(url){ if(!url) return; window.open(url, '_blank'); }

function waLink(phone,msg){const p=phone.replace(/[^0-9]/g,'');const intl=p.startsWith('0')?'92'+p.slice(1):p;return`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;}

// ─── WHATSAPP MESSAGES ───
function waConfirm(b){return`Assalam o Alaikum ${b.nm}! 🏏\n*The Sultans Indoor Cricket Club — Multan*\n\n✅ *Your booking is confirmed!*\n📅 Date: ${b.date}\n⏰ Time: ${b.st}\n🕐 Hours: ${b.hrs} hrs\n💰 Total: ${Rs(b.fin)}\n💵 Advance Paid: ${Rs(b.advAmt)}\n⏳ Remaining: ${Rs(b.due)}\n\nPlease arrive on time!\n*Thank you! 🙏*`;}
function waDue(b){return`Assalam o Alaikum ${b.nm}! 🏏\n*The Sultans Indoor Cricket Club — Multan*\n\nYour payment is pending:\n📅 Date: ${b.date}\n⏰ Time: ${b.st}\n💰 Total: ${Rs(b.fin)}\n❗ *Due Amount: ${Rs(b.due)}*\n\nPlease clear your payment:\n🟣 JazzCash: 0300-3510175 (Abdul Gaffar)\n🏦 Bank Alfalah: 83721010111101 (Mehboob Ahmad)\n\n*Thank you! 🙏*`;}
function waInvoiceText(b){
  const status=b.status==='paid'?'✅ FULLY PAID':b.status==='partial'?'💛 PARTIAL PAYMENT':'⏳ PRE-MATCH';
  return `🏏 *THE SULTANS INDOOR CRICKET CLUB*\n📍 Multan, Pakistan\n\n━━━━━━━━━━━━━━\n📄 *BOOKING RECEIPT*\n━━━━━━━━━━━━━━\n👤 *Name:* ${b.nm}\n📞 *Phone:* ${b.ph||'—'}\n📅 *Date:* ${b.date}\n⏰ *Time:* ${b.st||'—'} (${b.hrs} hrs${b.exM>0?' + '+b.exM+' min':''})\n💰 *Rate:* Rs.${RATE}/hr${b.dA>0?'\n🎁 *Discount:* -'+Rs(b.dA):''}\n\n━━━━━━━━━━━━━━\n💵 *PAYMENT DETAILS*\n━━━━━━━━━━━━━━\n*Total: ${Rs(b.fin)}*\nAdvance (${b.advMode}): ${Rs(b.advAmt)}${b.status!=='pre'?'\nCash (After Match): '+Rs(b.afterCash||0)+'\nAccount (After Match): '+Rs(b.afterAcc||0):''}\n*Due Remaining: ${(b.due||0)>0?Rs(b.due):'CLEAR ✅'}*\n\n*Status: ${status}*\n\n━━━━━━━━━━━━━━\n🏦 *PAYMENT ACCOUNTS*\n━━━━━━━━━━━━━━\n🟣 JazzCash: 0300-3510175\n(Abdul Gaffar)\n🏦 Bank Alfalah: 83721010111101\n(Mehboob Ahmad)\n\n📞 0300-9634880\nThank you! 🙏`;}

// ─── TABS ───
function go(tab){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>{if(t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+tab+"'"))t.classList.add('active');});
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-'+tab).classList.add('on');
  if(tab==='dash')renderDash();if(tab==='pre')renderPreTable();if(tab==='post')renderPostTab();
  if(tab==='cal')renderCal();if(tab==='cust')renderCustTable('');if(tab==='exp')renderET();if(tab==='rep')renderRep();
  if(tab==='history')renderHistory();
}

// ─── TARGET ───
function saveTarget(){
  const v=document.getElementById('targetInput').value;
  localStorage.setItem('daily_target',v);
  updateTarget();
}
function updateTarget(){
  const target=parseFloat(localStorage.getItem('daily_target'))||0;
  const inp=document.getElementById('targetInput');
  if(inp&&!inp.value&&target)inp.value=target;
  const td=today();
  const earned=allBookings.filter(b=>b.date===td).reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
  if(!target){document.getElementById('targetFill').style.width='0%';document.getElementById('targetPct').textContent='0%';document.getElementById('targetEarned').textContent='Earned: '+Rs(earned);document.getElementById('targetRemaining').textContent='Set a target ↑';return;}
  const pct=Math.min(100,Math.round((earned/target)*100));
  document.getElementById('targetFill').style.width=pct+'%';
  document.getElementById('targetFill').style.background=pct>=100?'linear-gradient(90deg,var(--gold),var(--gold2))':'linear-gradient(90deg,var(--green),#86efac)';
  document.getElementById('targetPct').textContent=pct+'%';
  document.getElementById('targetEarned').textContent='Earned: '+Rs(earned);
  document.getElementById('targetRemaining').textContent=pct>=100?'🎉 Target Achieved!':'Remaining: '+Rs(Math.max(0,target-earned));
}

// ─── CONFLICT ───
function checkConflict(){calcAmt();const date=document.getElementById('b-date').value;const bks=allBookings.filter(b=>b.date===date);document.getElementById('conflictWarn').style.display=bks.length?'block':'none';}

// ─── CALC ───
function calcAmt(){
  const hrs=parseFloat(document.getElementById('b-hr').value)||0;
  const base=Math.round(hrs*RATE);
  const exM=parseFloat(document.getElementById('b-ex').value)||0;
  const exC=document.getElementById('b-exc').value;
  let exA=0;if(exM>0){const h=exM/60;if(exC==='full')exA=Math.round(h*RATE);else if(exC==='half')exA=Math.round(h*RATE/2);}
  const dT=document.getElementById('b-dt').value;
  const dV=parseFloat(document.getElementById('b-dv').value)||0;
  let dA=0;if(dT==='pct')dA=Math.round((base+exA)*dV/100);else if(dT==='flat')dA=Math.min(dV,base+exA);
  const fin=Math.max(0,base+exA-dA);
  document.getElementById('sb-base').textContent=Rs(base);
  document.getElementById('sb-ex').textContent=exM>0&&exC==='free'?'Free 🎁':Rs(exA);
  document.getElementById('sb-disc').textContent='-'+Rs(dA);
  document.getElementById('sb-final').textContent=Rs(fin);
  calcAdvance();return{base,exM,exC,exA,dT,dV,dA,fin};
}
function calcAdvance(){
  const fin=fromRs(document.getElementById('sb-final').textContent);
  const adv=parseFloat(document.getElementById('adv-amt').value)||0;
  const due=Math.max(0,fin-adv);
  document.getElementById('adv-final').textContent=Rs(fin);
  document.getElementById('adv-show').textContent=Rs(adv);
  document.getElementById('adv-due').textContent=due>0?Rs(due):'All Received ✅';
  document.getElementById('adv-due').style.color=due>0?'var(--purple)':'var(--green)';
}

// ─── CUSTOMER SEARCH ───
function custSearch(val){
  const dd=document.getElementById('custDD');
  if(!val||val.length<2){dd.style.display='none';return;}
  const m=allCustomers.filter(c=>c.nm.toLowerCase().includes(val.toLowerCase())||c.ph.includes(val));
  if(!m.length){dd.style.display='none';return;}
  dd.style.display='block';
  dd.innerHTML=m.slice(0,5).map(c=>`<div onclick="fillCust('${c.nm}','${c.ph}','${c.type}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;font-weight:700;">${c.type==='vip'?'⭐ ':''}<b>${c.nm}</b> <span style="color:var(--muted);">${c.ph}</span></div>`).join('');
}
function fillCust(nm,ph,type){document.getElementById('b-nm').value=nm;document.getElementById('b-ph').value=ph;document.getElementById('b-vip').value=type;document.getElementById('custDD').style.display='none';}

// ─── SAVE PRE-MATCH ───
async function savePreMatch(){
  const date=document.getElementById('b-date').value;
  const st=document.getElementById('b-st').value.trim();
  const hrs=parseFloat(document.getElementById('b-hr').value)||0;
  const nm=document.getElementById('b-nm').value.trim();
  const ph=document.getElementById('b-ph').value.trim();
  const vip=document.getElementById('b-vip').value;
  const exM=parseFloat(document.getElementById('b-ex').value)||0;
  const exC=document.getElementById('b-exc').value;
  const dT=document.getElementById('b-dt').value;
  const dV=parseFloat(document.getElementById('b-dv').value)||0;
  const nt=document.getElementById('b-nt').value.trim();
  const advAmt=parseFloat(document.getElementById('adv-amt').value)||0;
  const advMode=document.getElementById('adv-mode').value;
  const advNote=document.getElementById('adv-note').value.trim();
  
  if(!date||!nm||!st||!hrs){
    toast('Date, Time, Hours and Name are required!','err');
    return;
  }
  
  const{base,exA,dA,fin}=calcAmt();
  const due=Math.max(0,fin-advAmt);
  const bk={date,st,hrs,nm,ph,vip,exM,exC,dT,dV,dA,base,exA,fin,advAmt,advMode,advNote,afterCash:0,afterAcc:0,afterAccType:'',afterCashNote:'',afterAccNote:'',totalPaid:advAmt,due,status:'pre',nt,createdAt:new Date().toISOString()};
  
  showSync(true);
  try{
    console.log("Saving booking:", bk);
    await db.collection('bookings').add(bk);
    
    // Add to customers if new
    if(ph && !allCustomers.find(c=>c.ph===ph)) {
      await db.collection('customers').add({nm,ph,type:vip,note:'',joined:date,createdAt:new Date().toISOString()});
    }
    
    sendAlert(bk);
    
    // Clear form
    ['b-nm','b-ph','b-nt','adv-amt','adv-note','b-hr','b-st','b-ex','b-dv'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.value='';
    });
    document.getElementById('b-exc').value='free';
    document.getElementById('b-dt').value='none';
    const dd = document.getElementById('custDD');
    if(dd) dd.style.display='none';
    
    calcAmt();
    toast('Booking saved successfully! ✅','ok');
  }catch(e){
    console.error("Firebase Save Error (Pre-match):", e);
    toast('Error: ' + e.message, 'err');
  }
  showSync(false);
}

// ─── EMAIL ALERTS ───
function sendAlert(bk){emailjs.send(EJ_SVC,EJ_TPL,{customer_name:bk.nm,customer_phone:bk.ph||'N/A',date:bk.date,time:bk.st+'('+bk.hrs+'hr)',hours:bk.hrs+' hrs',payment_mode:bk.advMode,final_amount:Rs(bk.fin),paid:Rs(bk.advAmt),discount:bk.dA>0?Rs(bk.dA):'None',extra_time:bk.exM>0?bk.exM+'min':'None',notes:'[PRE-MATCH] Adv:'+Rs(bk.advAmt)+'|Due:'+Rs(bk.due)+'|'+bk.nt,to_email:EJ_TO}).catch(()=>{});}
function sendCompleteAlert(bk){emailjs.send(EJ_SVC,EJ_TPL,{customer_name:bk.nm,customer_phone:bk.ph||'N/A',date:bk.date,time:bk.st,hours:bk.hrs+' hrs',payment_mode:'Multiple',final_amount:Rs(bk.fin),paid:Rs(bk.totalPaid),discount:bk.dA>0?Rs(bk.dA):'None',extra_time:bk.exM>0?bk.exM+'min':'None',notes:'[COMPLETE] Adv:'+Rs(bk.advAmt)+'('+bk.advMode+')|Cash:'+Rs(bk.afterCash)+'|Acc:'+Rs(bk.afterAcc)+(bk.afterAccType?'('+accName(bk.afterAccType)+')':'')+'|Due:'+Rs(bk.due),to_email:EJ_TO}).catch(()=>{});}

// ─── INVOICE MODAL ───
function openInv(id){
  const b=allBookings.find(bk=>bk.id===id);if(!b)return;
  currentInvBooking=b;
  const status=b.status==='paid'?'✅ FULLY PAID — THANK YOU!':b.status==='partial'?'💛 PARTIAL PAYMENT — Balance Due':b.status==='pre'?'⏳ PRE-MATCH — Advance Received':'';
  const statusColor=b.status==='paid'?'#dcfce7;color:#15803d;border:1px solid #86efac':b.status==='partial'?'#fef9c3;color:#854d0e;border:1px solid #fde047':'#fff7ed;color:#c2410c;border:1px solid #fdba74';
  document.getElementById('invContent').innerHTML=`
    <div class="inv-header">
      <div style="font-size:26px;">🏏</div>
      <div style="font-size:18px;font-weight:bold;letter-spacing:2px;">THE SULTANS</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Indoor Cricket Club — Multan</div>
      <div style="font-size:10px;color:#94a3b8;">0300-9634880 | 0319-3510870</div>
    </div>
    <div class="inv-title-row"><span>📄 BOOKING RECEIPT</span><span style="font-size:10px;">${new Date().toLocaleDateString('en-PK')}</span></div>
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
      <div class="inv-row"><span style="color:#64748b;">👤 Customer</span><span style="font-weight:bold;">${b.nm}</span></div>
      <div class="inv-row"><span style="color:#64748b;">📞 Phone</span><span>${b.ph||'—'}</span></div>
      <div class="inv-row"><span style="color:#64748b;">📅 Date</span><span>${b.date}</span></div>
      <div class="inv-row"><span style="color:#64748b;">⏰ Time</span><span>${b.st||'—'} (${b.hrs} hrs${b.exM>0?' + '+b.exM+' min':''})</span></div>
      <div class="inv-row"><span style="color:#64748b;">💰 Rate</span><span>Rs.2000/hr</span></div>
      ${b.dA>0?`<div class="inv-row"><span style="color:#64748b;">🎁 Discount</span><span style="color:#ef4444;font-weight:bold;">-${Rs(b.dA)}</span></div>`:''}
    </div>
    <div class="inv-total"><span>TOTAL AMOUNT</span><span>${Rs(b.fin)}</span></div>
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
      <div class="inv-row"><span style="color:#f97316;font-weight:bold;">💰 Advance (${b.advMode})</span><span style="color:#f97316;font-weight:bold;">${Rs(b.advAmt)}</span></div>
      ${b.status!=='pre'?`<div class="inv-row"><span style="color:#22c55e;font-weight:bold;">💵 Cash (After Match)</span><span style="color:#22c55e;font-weight:bold;">${Rs(b.afterCash||0)}</span></div>
      <div class="inv-row"><span style="color:#3b82f6;font-weight:bold;">🏦 Account (After Match)</span><span style="color:#3b82f6;font-weight:bold;">${Rs(b.afterAcc||0)}</span></div>`:''}
      <div class="inv-row" style="border-top:2px solid #e2e8f0;"><span style="font-weight:bold;">REMAINING DUE</span><span style="font-weight:bold;color:${(b.due||0)>0?'#ef4444':'#22c55e'};">${(b.due||0)>0?Rs(b.due):'CLEAR ✅'}</span></div>
    </div>
    <div style="background:${statusColor};padding:10px;border-radius:8px;text-align:center;font-weight:bold;font-size:12px;margin-bottom:10px;">${status}</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:10px;font-size:11px;">
      <div style="font-weight:bold;font-size:10px;color:#64748b;letter-spacing:1px;margin-bottom:6px;">PAYMENT ACCOUNTS</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>🟣 JazzCash:</span><span><b>0300-3510175 (Abdul Gaffar)</b></span></div>
      <div style="display:flex;justify-content:space-between;"><span>🏦 Bank Alfalah:</span><span><b>83721010111101 (Mehboob Ahmad)</b></span></div>
    </div>
    <div class="inv-footer">
      <p><b>The Sultans Indoor Cricket Club, Multan</b></p>
      <p>System by Jahanzeb Baloch — 0306-0711529</p>
      <p style="margin-top:4px;">Thank you! Please come again 🏏</p>
    </div>`;
  document.getElementById('invModal').classList.add('on');
}
function closeInv(){document.getElementById('invModal').classList.remove('on');currentInvBooking=null;}

function downloadInvPDF(){
  if(!currentInvBooking)return;
  const b=currentInvBooking;
  try{
    const{jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a6'});
    const W=105;let y=10;
    // Header
    doc.setFillColor(6,14,26);doc.rect(0,0,W,30,'F');
    doc.setTextColor(240,180,41);doc.setFontSize(14);doc.setFont('helvetica','bold');
    doc.text('THE SULTANS',W/2,12,{align:'center'});
    doc.setFontSize(8);doc.setTextColor(148,163,184);
    doc.text('Indoor Cricket Club — Multan',W/2,18,{align:'center'});
    doc.text('0300-9634880 | 0319-3510870',W/2,23,{align:'center'});
    y=36;
    // Title
    doc.setFillColor(240,180,41);doc.rect(8,y-5,W-16,8,'F');
    doc.setTextColor(0,0,0);doc.setFontSize(10);doc.setFont('helvetica','bold');
    doc.text('BOOKING RECEIPT',W/2,y,{align:'center'});
    y+=8;
    // Details
    doc.setTextColor(0,0,0);doc.setFontSize(9);
    const rows=[['Customer',b.nm],['Phone',b.ph||'—'],['Date',b.date],['Time',b.st+' ('+b.hrs+' hrs'+( b.exM>0?' + '+b.exM+' min':'')+')'],['Rate','Rs.2000/hr']];
    if(b.dA>0)rows.push(['Discount','-'+Rs(b.dA)]);
    rows.forEach(([l,v],i)=>{
      if(i%2===0)doc.setFillColor(248,250,252);else doc.setFillColor(255,255,255);
      doc.rect(8,y-4,W-16,7,'F');
      doc.setFont('helvetica','normal');doc.setTextColor(100,116,139);doc.text(l,11,y);
      doc.setFont('helvetica','bold');doc.setTextColor(0,0,0);doc.text(v,W-11,y,{align:'right'});
      y+=7;
    });
    y+=3;
    // Total
    doc.setFillColor(6,14,26);doc.rect(8,y-5,W-16,9,'F');
    doc.setTextColor(240,180,41);doc.setFontSize(11);doc.setFont('helvetica','bold');
    doc.text('TOTAL: '+Rs(b.fin),W/2,y,{align:'center'});
    y+=11;
    // Payment
    const pays=[['Advance ('+b.advMode+')',Rs(b.advAmt)]];
    if(b.status!=='pre'){pays.push(['Cash (After Match)',Rs(b.afterCash||0)]);pays.push(['Account (After Match)',Rs(b.afterAcc||0)]);}
    pays.push(['DUE REMAINING',(b.due||0)>0?Rs(b.due):'CLEAR ✅']);
    pays.forEach(([l,v],i)=>{
      if(i%2===0)doc.setFillColor(248,250,252);else doc.setFillColor(255,255,255);
      doc.rect(8,y-4,W-16,7,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(9);
      const isLast=i===pays.length-1;
      doc.setTextColor(isLast&&(b.due||0)>0?239:isLast?34:0,isLast&&(b.due||0)>0?68:isLast?197:0,isLast&&(b.due||0)>0?68:isLast?94:0);
      if(isLast)doc.setFont('helvetica','bold');
      doc.text(l,11,y);doc.text(v,W-11,y,{align:'right'});
      y+=7;
    });
    y+=3;
    // Accounts
    doc.setFillColor(248,250,252);doc.rect(8,y-4,W-16,16,'F');
    doc.setTextColor(100,116,130);doc.setFontSize(8);doc.setFont('helvetica','normal');
    doc.text('JazzCash: 0300-3510175 (Abdul Gaffar)',11,y);y+=5;
    doc.text('Bank Alfalah: 83721010111101 (Mehboob Ahmad)',11,y);y+=5;
    // Footer
    doc.setTextColor(148,163,184);doc.setFontSize(7);
    doc.text('System by Jahanzeb Baloch — 0306-0711529',W/2,y+4,{align:'center'});
    doc.text('Thank you! Please come again 🏏',W/2,y+9,{align:'center'});
    doc.save(`Sultans-Receipt-${b.nm}-${b.date}.pdf`);
    toast('PDF downloading! ✅','ok');
  }catch(e){
    toast('PDF error — try WhatsApp share','err');
  }
}

function shareInvWA(){
  if(!currentInvBooking)return;
  const b=currentInvBooking;
  if(b.ph){
    window.open(waLink(b.ph,waInvoiceText(b)),'_blank');
  } else {
    const msg=waInvoiceText(b);
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
  }
}


// ─── DASHBOARD ───
function renderDash(){
  const td=today();
  const tB=allBookings.filter(b=>b.date===td);
  const tE=allExpenses.filter(e=>e.date===td);
  const inc=tB.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
  const exp=tE.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const prf=inc-exp;
  const adv=tB.reduce((s,b)=>s+(parseFloat(b.advAmt)||0),0);
  const due=tB.reduce((s,b)=>s+(parseFloat(b.due)||0),0);
  document.getElementById('d-inc').textContent=Rs(inc);document.getElementById('d-inc-s').textContent=tB.filter(b=>b.status!=='pre').length+' complete';
  document.getElementById('d-exp').textContent=Rs(exp);document.getElementById('d-exp-s').textContent=tE.length+' entries';
  document.getElementById('d-prf').textContent=Rs(prf);document.getElementById('d-prf').style.color=prf>=0?'var(--gold)':'var(--red)';
  document.getElementById('d-prf-s').textContent=prf>=0?'Profit 📈':'Loss 📉';
  document.getElementById('d-sl').textContent=tB.length;document.getElementById('d-sl-s').textContent=tB.filter(b=>b.status==='pre').length+' pending';
  document.getElementById('d-adv').textContent=Rs(adv);document.getElementById('d-due').textContent=Rs(due);
  updateTarget();
  // Slot map
  const sm=document.getElementById('slotMap');sm.innerHTML='';
  const ts={};
  tB.forEach(b=>{
    if(!b.st)return;
    const startMins=parseTimeToMinutes(b.st);
    const hrs=parseFloat(b.hrs)||1;
    for(let i=0;i<Math.ceil(hrs);i++){
      const slotMins=startMins+(i*60);
      const slotH=Math.floor(slotMins/60)%24;
      if(slotH>=0&&slotH<=23){
        ts[slotH]={type:b.status==='pre'?'pre-match':'bkd',bk:b};
      }
    }
  });
  for(let h=0;h<=23;h++){
    const ap=h>=12?'PM':'AM';const d=h>12?h-12:h===0?12:h;
    const info=ts[h];
    const div=document.createElement('div');
    div.className='slot '+(info?info.type:'free');
    div.textContent=d+':00 '+ap;
    if(info){
      div.style.cursor='pointer';
      div.title=`Booked by ${info.bk.nm}`;
      div.onclick=()=>showSlotLink(info.bk.id);
    }
    sm.appendChild(div);
  }
  // Analytics
  renderAnalytics();
  // Recent
  const recent=tB.slice(0,6);
  document.getElementById('dash-bks').innerHTML=!recent.length
    ?'<tr><td colspan="8" class="empty"><div class="empty-ic">📅</div>No bookings today</td></tr>'
    :recent.map(b=>`<tr>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px;">${b.st||'—'}<br><span style="color:var(--muted);font-size:10px;">${b.hrs}hr</span></td>
      <td><b>${b.nm}</b></td><td style="color:var(--blue);font-size:11px;">${b.ph||'—'}</td>
      <td style="color:var(--gold);">${Rs(b.fin)}</td>
      <td style="color:var(--orange);">${Rs(b.advAmt)}<br>${pmbadge(b.advMode)}</td>
      <td style="color:${(b.due||0)>0?'var(--red)':'var(--green)'};">${(b.due||0)>0?Rs(b.due):'✅'}</td>
      <td>${sbadge(b.status)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="btn-inv" onclick="openInv('${b.id}')" style="font-size:9px;padding:4px 8px;">🧾</button>
        ${b.screenshot ? `<button class="btn-orange" onclick="viewSS('${b.screenshot}')" style="font-size:9px;padding:4px 8px;">🖼️ SS</button>` : ''}
        <button class="btn-blue" onclick="openEdit('${b.id}')" style="font-size:9px;padding:4px 8px;background:linear-gradient(135deg,var(--blue),#1d4ed8);color:#fff;border:none;border-radius:7px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:800;">✏️</button>
        <button class="btn-del" onclick="delBk('${b.id}')" style="font-size:9px;padding:4px 8px;">🗑️</button>
        ${b.ph?`<a class="btn-wa" href="${waLink(b.ph,waConfirm(b))}" target="_blank" style="font-size:9px;padding:4px 8px;">💬</a>`:''}
      </td>

    </tr>`).join('');
}

function showSlotLink(id){
  const b=allBookings.find(x=>x.id===id);
  if(!b)return;
  toast(`${b.nm} (${b.st}) - ${b.status==='pre'?'Pending':'Paid'} 🏏`,'ok');
}

// ─── ANALYTICS ───
function renderAnalytics(){
  const hourCount={};for(let h=8;h<=23;h++)hourCount[h]=0;
  allBookings.forEach(b=>{const m=b.st&&b.st.match(/(\d+)/);if(!m)return;let h=parseInt(m[1]);if(b.st&&b.st.toLowerCase().includes('pm')&&h<12)h+=12;if(b.st&&b.st.toLowerCase().includes('am')&&h===12)h=0;for(let i=0;i<Math.ceil(parseFloat(b.hrs)||1);i++){if(hourCount[h+i]!==undefined)hourCount[h+i]++;}});
  const maxH=Math.max(...Object.values(hourCount),1);
  const pc=document.getElementById('peakChart'),pl=document.getElementById('peakLabels');
  if(pc){pc.innerHTML='';pl.innerHTML='';[8,10,12,14,16,18,20,22].forEach(h=>{const cnt=hourCount[h]||0;const pct=Math.max(4,(cnt/maxH)*100);const ap=h>=12?'PM':'AM';const d=h>12?h-12:h===0?12:h;pc.innerHTML+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;"><div style="font-size:7px;color:var(--gold);margin-bottom:1px;">${cnt||''}</div><div style="width:100%;height:${pct}%;background:linear-gradient(180deg,var(--gold),var(--gold2));border-radius:2px 2px 0 0;"></div></div>`;pl.innerHTML+=`<div style="flex:1;text-align:center;font-size:7px;color:var(--muted);font-weight:700;">${d}${ap.toLowerCase()}</div>`;});}
  const dayCount={0:0,1:0,2:0,3:0,4:0,5:0,6:0};
  allBookings.forEach(b=>{if(b.date){const d=new Date(b.date).getDay();dayCount[d]++;}});
  const maxD=Math.max(...Object.values(dayCount),1);
  const dc=document.getElementById('daysChart'),dl=document.getElementById('daysLabels');
  if(dc){dc.innerHTML='';dl.innerHTML='';DAYS.forEach((day,i)=>{const cnt=dayCount[i]||0;const pct=Math.max(4,(cnt/maxD)*100);dc.innerHTML+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;"><div style="font-size:7px;color:var(--blue);margin-bottom:1px;">${cnt||''}</div><div style="width:100%;height:${pct}%;background:linear-gradient(180deg,var(--blue),#1d4ed8);border-radius:2px 2px 0 0;"></div></div>`;dl.innerHTML+=`<div style="flex:1;text-align:center;font-size:7px;color:var(--muted);font-weight:700;">${day}</div>`;});}
  const now=new Date(),mc=document.getElementById('monthComp');
  if(mc){mc.innerHTML='';for(let i=2;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const m=d.getMonth()+1,y=d.getFullYear();const mB=allBookings.filter(b=>{const bd=new Date(b.date);return bd.getMonth()+1===m&&bd.getFullYear()===y;});const inc=mB.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);const allIncs=[0,1,2].map(j=>{const dd=new Date(now.getFullYear(),now.getMonth()-j,1);const mm=dd.getMonth()+1,yy=dd.getFullYear();return allBookings.filter(b=>{const bd=new Date(b.date);return bd.getMonth()+1===mm&&bd.getFullYear()===yy;}).reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);});const mx=Math.max(...allIncs,1);mc.innerHTML+=`<div class="br"><div class="br-lbl" style="width:32px;font-size:9px;">${MONTHS[m-1].slice(0,3)}</div><div class="br-track" style="flex:1;"><div class="br-fill bi" style="width:${inc>0?((inc/mx)*100).toFixed(0):0}%"></div></div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--green);width:65px;text-align:right;">${Rs(inc)}</div></div>`;}}
  const bestDayIdx=Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('ana-best').textContent=DAYS[bestDayIdx[0]];
  const activeDays=new Set(allBookings.map(b=>b.date)).size;
  const totalInc=allBookings.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
  document.getElementById('ana-avg').textContent=activeDays>0?Rs(Math.round(totalInc/activeDays)):Rs(0);
  document.getElementById('ana-custs').textContent=allCustomers.length;
}

// ─── PRE TABLE ───
function renderPreTable(){
  const bks=allBookings.filter(b=>b.status==='pre');
  document.getElementById('pre-tbl').innerHTML=!bks.length
    ?'<tr><td colspan="9" class="empty"><div class="empty-ic">📋</div>No pre-match bookings pending</td></tr>'
    :bks.map(b=>{
      const {endTime,crossesMidnight}=getEndInfo(b.st,b.hrs);
      return`<tr>
        <td style="font-size:10px;color:var(--muted);">${b.date}</td>
        <td style="font-size:11px;">${b.st||'—'}</td>
        <td style="font-size:11px;color:${crossesMidnight?'var(--purple)':'var(--muted)'};">${endTime}${crossesMidnight?'<br><span style="font-size:9px;">🌙 Next Day</span>':''}</td>
        <td><b>${b.nm}</b></td>
        <td style="color:var(--blue);font-size:11px;">${b.ph||'—'}</td>
        <td>${b.hrs}hr${b.exM>0?'+'+b.exM+'m':''}</td>
        <td style="color:var(--gold);">${Rs(b.fin)}</td>
        <td style="color:var(--orange);">${Rs(b.advAmt)}</td>
        <td style="color:var(--purple);font-weight:800;">${Rs(b.due)}</td>
        <td style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn-orange" onclick="openComplete('${b.id}')">✅</button>
          <button class="btn-inv" onclick="openInv('${b.id}')" style="font-size:9px;padding:4px 8px;">🧾</button>
          ${b.screenshot ? `<button class="btn-orange" onclick="viewSS('${b.screenshot}')" style="font-size:9px;padding:4px 8px;">🖼️ SS</button>` : ''}
          <button class="btn-blue" onclick="openEdit('${b.id}')" style="font-size:9px;padding:4px 8px;background:linear-gradient(135deg,var(--blue),#1d4ed8);color:#fff;border:none;border-radius:7px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:800;">✏️</button>
          ${b.ph?`<a class="btn-wa" href="${waLink(b.ph,waConfirm(b))}" target="_blank">💬</a>`:''}
          <button class="btn-del" onclick="delBk('${b.id}')">Del</button>
        </td>

      </tr>`;
    }).join('');
}

// ─── COMPLETE MODAL ───
function openComplete(id){
  activeBookingId=id;
  const bk=allBookings.find(b=>b.id===id);if(!bk)return;
  ['m-cash','m-acc','m-cash-note','m-acc-note','m-extra-min','m-disc','m-disc-note'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  document.getElementById('m-acc-type').value='';
  document.getElementById('m-status').value='paid';
  document.getElementById('m-extra-rate').value='free';
  document.getElementById('modal-info').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
    <div><b style="color:var(--muted);">Customer:</b> ${bk.nm}</div>
    <div><b style="color:var(--muted);">Phone:</b> ${bk.ph||'—'}</div>
    <div><b style="color:var(--muted);">Date:</b> ${bk.date}</div>
    <div><b style="color:var(--muted);">Time:</b> ${bk.st} (${bk.hrs}hr)</div>
    <div><b style="color:var(--muted);">Total:</b> <span style="color:var(--gold);font-weight:800;">${Rs(bk.fin)}</span></div>
    <div><b style="color:var(--muted);">Advance:</b> <span style="color:var(--orange);">${Rs(bk.advAmt)}</span></div>
    <div style="grid-column:1/-1;"><b style="color:var(--purple);">Due:</b> <span style="color:var(--purple);font-size:16px;font-weight:800;">${Rs(bk.due)}</span></div>
  </div>`;
  document.getElementById('m-total').textContent=Rs(bk.fin);
  document.getElementById('m-adv').textContent=Rs(bk.advAmt);
  calcModal();document.getElementById('completeModal').classList.add('on');
}
function closeModal(){document.getElementById('completeModal').classList.remove('on');activeBookingId=null;}
function calcModal(){
  if(!activeBookingId)return;
  const bk=allBookings.find(b=>b.id===activeBookingId);if(!bk)return;

  // Extra time
  const extraMin=parseFloat(document.getElementById('m-extra-min').value)||0;
  const extraRate=document.getElementById('m-extra-rate').value;
  let extraCharge=0;
  if(extraMin>0){
    const h=extraMin/60;
    if(extraRate==='full')extraCharge=Math.round(h*2000);
    else if(extraRate==='half')extraCharge=Math.round(h*1000);
  }

  // Extra discount
  const extraDisc=parseFloat(document.getElementById('m-disc').value)||0;

  // New total
  const newTotal=Math.max(0,(bk.fin||0)+extraCharge-extraDisc);

  // Payment
  const cash=parseFloat(document.getElementById('m-cash').value)||0;
  const acc=parseFloat(document.getElementById('m-acc').value)||0;
  const totalPaid=(bk.advAmt||0)+cash+acc;
  const due=Math.max(0,newTotal-totalPaid);

  // Update UI
  document.getElementById('m-orig').textContent=Rs(bk.fin);
  document.getElementById('m-extra-show').textContent=extraMin>0&&extraRate==='free'?'Free 🎁':Rs(extraCharge);
  document.getElementById('m-disc-show').textContent='-'+Rs(extraDisc);
  document.getElementById('m-total').textContent=Rs(newTotal);
  document.getElementById('m-adv').textContent=Rs(bk.advAmt||0);
  document.getElementById('m-cash-show').textContent=Rs(cash);
  document.getElementById('m-acc-show').textContent=Rs(acc);
  document.getElementById('m-due').textContent=due>0?Rs(due):'All Clear ✅';
  document.getElementById('m-due').style.color=due>0?'var(--red)':'var(--green)';
  document.getElementById('m-status').value=due>0?'partial':'paid';
}
async function saveComplete(){
  if(!activeBookingId)return;
  const bk=allBookings.find(b=>b.id===activeBookingId);if(!bk)return;

  const cash=parseFloat(document.getElementById('m-cash').value)||0;
  const acc=parseFloat(document.getElementById('m-acc').value)||0;
  const accType=document.getElementById('m-acc-type').value;
  const cashNote=document.getElementById('m-cash-note').value.trim();
  const accNote=document.getElementById('m-acc-note').value.trim();
  const status=document.getElementById('m-status').value;

  // Extra time
  const extraMin=parseFloat(document.getElementById('m-extra-min').value)||0;
  const extraRate=document.getElementById('m-extra-rate').value;
  let extraCharge=0;
  if(extraMin>0){const h=extraMin/60;if(extraRate==='full')extraCharge=Math.round(h*2000);else if(extraRate==='half')extraCharge=Math.round(h*1000);}

  // Extra discount
  const extraDisc=parseFloat(document.getElementById('m-disc').value)||0;
  const discNote=document.getElementById('m-disc-note').value.trim();

  // Recalculate total
  const newFin=Math.max(0,(bk.fin||0)+extraCharge-extraDisc);
  const totalPaid=(bk.advAmt||0)+cash+acc;
  const due=Math.max(0,newFin-totalPaid);

  showSync(true);
  try{
    const updates={
      afterCash:cash,afterAcc:acc,afterAccType:accType,
      afterCashNote:cashNote,afterAccNote:accNote,
      totalPaid,due,status,
      completedAt:new Date().toISOString()
    };
    // If adjusted
    if(extraMin>0||extraDisc>0){
      updates.fin=newFin;
      updates.extraMinAdded=extraMin;
      updates.extraChargeAdded=extraCharge;
      updates.extraDiscAdded=extraDisc;
      updates.discNote=discNote;
    }
    console.log("Updating booking (Complete):", activeBookingId, updates);
    await db.collection('bookings').doc(activeBookingId).update(updates);
    sendCompleteAlert({...bk,...updates});
    closeModal();
    toast('Match complete! ✅','ok');
  }catch(e){
    console.error("Firebase Update Error (Complete):", e);
    toast('Error: '+e.message,'err');
  }
  showSync(false);
}

// ─── POST TAB ───
function renderPostTab(){
  const pending=allBookings.filter(b=>b.status==='pre');
  document.getElementById('post-tbl').innerHTML=!pending.length
    ?'<tr><td colspan="8" class="empty"><div class="empty-ic">🎉</div>All bookings complete!</td></tr>'
    :pending.map(b=>`<tr>
      <td style="font-size:10px;color:var(--muted);">${b.date}</td>
      <td>${b.st||'—'}</td><td><b>${b.nm}</b></td>
      <td style="color:var(--blue);">${b.ph||'—'}</td>
      <td style="color:var(--gold);">${Rs(b.fin)}</td>
      <td style="color:var(--orange);">${Rs(b.advAmt)}<br>${pmbadge(b.advMode)}</td>
      <td style="color:var(--purple);font-weight:800;">${Rs(b.due)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="btn-orange" onclick="openComplete('${b.id}')">✅ Complete</button>
        ${b.ph?`<a class="btn-wa" href="${waLink(b.ph,waDue(b))}" target="_blank">💬 Due</a>`:''}
      </td>
    </tr>`).join('');
  const fd=document.getElementById('comp-filter').value;
  let done=allBookings.filter(b=>b.status!=='pre');
  if(fd)done=done.filter(b=>b.date===fd);
  document.getElementById('comp-tbl').innerHTML=!done.length
    ?'<tr><td colspan="10" class="empty">No completed bookings</td></tr>'
    :done.map(b=>`<tr>
      <td style="font-size:10px;color:var(--muted);">${b.date}</td>
      <td><b>${b.nm}</b></td>
      <td style="font-size:11px;">${b.st||'—'} (${b.hrs}hr)</td>
      <td style="color:var(--gold);">${Rs(b.fin)}</td>
      <td style="color:var(--orange);">${Rs(b.advAmt)}</td>
      <td style="color:var(--green);">${Rs(b.afterCash||0)}</td>
      <td style="color:var(--blue);">${Rs(b.afterAcc||0)}<br>${b.afterAccType?pmbadge(b.afterAccType):''}</td>
      <td style="color:${(b.due||0)>0?'var(--red)':'var(--green)'};font-weight:800;">${(b.due||0)>0?Rs(b.due):'✅'}</td>
      <td>${sbadge(b.status)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="btn-inv" onclick="openInv('${b.id}')" style="font-size:9px;padding:4px 8px;">🧾</button>
        ${b.screenshot ? `<button class="btn-orange" onclick="viewSS('${b.screenshot}')" style="font-size:9px;padding:4px 8px;">🖼️ SS</button>` : ''}
        ${(b.due||0)>0?`<button class="btn-orange" onclick="openAddPay('${b.id}')" style="font-size:9px;padding:4px 8px;">💰 Add Pay</button>`:''}
        <button class="btn-blue" onclick="openEdit('${b.id}')" style="font-size:9px;padding:4px 8px;background:linear-gradient(135deg,var(--blue),#1d4ed8);color:#fff;border:none;border-radius:7px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:800;">✏️</button>
        <button class="btn-del" onclick="delBk('${b.id}')">Del</button>
      </td>

    </tr>`).join('');
}
async function delBk(id){if(!confirm('Delete?'))return;await db.collection('bookings').doc(id).delete();toast('Deleted','err');}

// ─── CALENDAR ───
function renderCal(){
  document.getElementById('calTitle').textContent=MONTHS[calMonth]+' '+calYear;
  const first=new Date(calYear,calMonth,1).getDay();
  const days=new Date(calYear,calMonth+1,0).getDate();
  const td=today();
  const grid=document.getElementById('calGrid');grid.innerHTML='';
  ['S','M','T','W','T','F','S'].forEach(d=>{grid.innerHTML+=`<div class="cal-day-lbl">${d}</div>`;});
  for(let i=0;i<first;i++)grid.innerHTML+=`<div class="cal-day empty"></div>`;
  for(let d=1;d<=days;d++){
    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayBks=allBookings.filter(b=>b.date===ds);
    const hasPre=dayBks.some(b=>b.status==='pre');
    const hasDone=dayBks.some(b=>b.status!=='pre');
    let cls=dayBks.length?(hasDone?'has-bk':'has-pre'):'no-bk';
    grid.innerHTML+=`<div class="cal-day ${cls}${ds===td?' today':''}" onclick="showCalDay('${ds}')">${d}${dayBks.length?`<div class="cal-bk-ct">${dayBks.length}</div>`:''}</div>`;
  }
}
function calNav(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderCal();}
function showCalDay(ds){
  const bks=allBookings.filter(b=>b.date===ds);
  document.getElementById('calDayTitle').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;width:100%;">${ds} Bookings (${bks.length}) <button class="btn-sm" onclick="goPreWithDate('${ds}')" style="background:var(--gold);color:var(--bg);font-size:10px;padding:4px 10px;border-radius:6px;font-weight:800;">➕ Add Booking</button></div>`;
  document.getElementById('cal-bks').innerHTML=!bks.length
    ?'<tr><td colspan="8" class="empty">No bookings on this date</td></tr>'
    :bks.map(b=>`<tr>
      <td>${b.st||'—'} (${b.hrs}hr)</td><td><b>${b.nm}</b></td>
      <td style="color:var(--blue);">${b.ph||'—'}</td>
      <td style="color:var(--gold);">${Rs(b.fin)}</td>
      <td style="color:var(--orange);">${Rs(b.advAmt)}</td>
      <td style="color:${(b.due||0)>0?'var(--red)':'var(--green)'};">${(b.due||0)>0?Rs(b.due):'✅'}</td>
      <td>${sbadge(b.status)}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn-inv" onclick="openInv('${b.id}')" style="font-size:9px;padding:4px 8px;">🧾</button>
        ${b.screenshot ? `<button class="btn-orange" onclick="viewSS('${b.screenshot}')" style="font-size:9px;padding:4px 8px;">🖼️ SS</button>` : ''}
        ${b.status==='pre'?`<button class="btn-orange" onclick="openComplete('${b.id}')" style="font-size:9px;padding:4px 8px;">✅</button>`:''}
        <button class="btn-blue" onclick="openEdit('${b.id}')" style="font-size:9px;padding:4px 8px;background:linear-gradient(135deg,var(--blue),#1d4ed8);color:#fff;border:none;border-radius:7px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:800;">✏️</button>
        <button class="btn-del" onclick="delBk('${b.id}')" style="font-size:9px;padding:4px 8px;">🗑️</button>
      </td>

    </tr>`).join('');
}

// ─── CUSTOMERS ───
async function saveCust(){
  const nm=document.getElementById('c-nm').value.trim();
  const ph=document.getElementById('c-ph').value.trim();
  const type=document.getElementById('c-type').value;
  const note=document.getElementById('c-note').value.trim();
  if(!nm||!ph){toast('Naam aur Phone lazmi hai!','err');return;}
  
  showSync(true);
  try{
    const cust = {nm,ph,type,note,joined:today(),createdAt:new Date().toISOString()};
    console.log("Saving customer:", cust);
    await db.collection('customers').add(cust);
    ['c-nm','c-ph','c-note'].forEach(id=>document.getElementById(id).value='');
    toast('Customer saved! ✅','ok');
  }catch(e){
    console.error("Firebase Save Error (Customer):", e);
    toast('Error: '+e.message,'err');
  }
  showSync(false);
}
function renderCustTable(q){
  let custs=allCustomers;
  if(q)custs=custs.filter(c=>c.nm.toLowerCase().includes(q.toLowerCase())||c.ph.includes(q));
  document.getElementById('c-tbl').innerHTML=!custs.length
    ?'<tr><td colspan="9" class="empty"><div class="empty-ic">👥</div>No customers</td></tr>'
    :custs.map(c=>{
      const cBks=allBookings.filter(b=>b.ph===c.ph||b.nm===c.nm);
      const spent=cBks.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
      const due=cBks.reduce((s,b)=>s+(parseFloat(b.due)||0),0);
      const last=cBks.length?[...cBks].sort((a,b)=>b.date.localeCompare(a.date))[0].date:'—';
      return`<tr>
        <td><b>${c.nm}</b></td>
        <td style="color:var(--blue);">${c.ph||'—'}</td>
        <td>${vipbadge(c.type)}</td>
        <td style="color:var(--blue);font-family:'JetBrains Mono',monospace;">${cBks.length}</td>
        <td style="color:var(--green);font-family:'JetBrains Mono',monospace;">${Rs(spent)}</td>
        <td style="font-size:11px;color:var(--muted);">${last}</td>
        <td style="color:${due>0?'var(--red)':'var(--green)'};">${due>0?Rs(due):'✅'}</td>
        <td style="font-size:11px;color:var(--soft);">${c.note||'—'}</td>
        <td style="display:flex;gap:4px;">
          ${c.ph?`<a class="btn-wa" href="${waLink(c.ph,'Assalam o Alaikum '+c.nm+'! 🏏 The Sultans Indoor Cricket Club — Multan.')}" target="_blank" style="font-size:9px;padding:4px 8px;">💬</a>`:''}
          ${c.ph&&due>0?`<a class="btn-wa" href="${waLink(c.ph,waDue({nm:c.nm,ph:c.ph,date:'—',st:'—',fin:spent,due}))}" target="_blank" style="font-size:9px;padding:4px 8px;background:linear-gradient(135deg,var(--red),#b91c1c);">💬 Due</a>`:''}
          <button class="btn-del" onclick="delCust('${c.id}')">Del</button>
        </td>
      </tr>`;
    }).join('');
}
async function delCust(id){if(!confirm('Delete?'))return;await db.collection('customers').doc(id).delete();toast('Deleted','err');}

// ─── BULK WHATSAPP ───
function bulkWAReminder(){
  const dueCustomers=allBookings.filter(b=>(b.due||0)>0&&b.ph);
  if(!dueCustomers.length){toast('No pending dues! 🎉','ok');return;}
  let sent=0;
  dueCustomers.forEach((b,i)=>{
    setTimeout(()=>{
      window.open(waLink(b.ph,waDue(b)),'_blank');
      sent++;
      if(sent===dueCustomers.length)toast(`Reminder sent to ${sent} customers! ✅`,'ok');
    },i*1000);
  });
  toast(`Opening ${dueCustomers.length} WhatsApp chats...`,'info');
}

// ─── EXPENSE ───
function checkExpCat(){document.getElementById('e-other-wrap').style.display=document.getElementById('e-c').value==='Other'?'block':'none';}
async function saveExp(){
  const date=document.getElementById('e-d').value;
  let cat=document.getElementById('e-c').value;
  const amt=parseFloat(document.getElementById('e-a').value)||0;
  const pay=document.getElementById('e-pay').value;
  const desc=document.getElementById('e-desc').value.trim();
  if(cat==='Other')cat=document.getElementById('e-other').value.trim();
  if(!date||!cat||!amt){toast('Date, Category and Amount required!','err');return;}
  
  showSync(true);
  try{
    const exp = {date,cat,amount:amt,pay,desc,createdAt:new Date().toISOString()};
    console.log("Saving expense:", exp);
    await db.collection('expenses').add(exp);
    ['e-a','e-desc','e-other'].forEach(id=>document.getElementById(id).value='');
    toast('Expense saved! ✅','ok');
  }catch(e){
    console.error("Firebase Save Error (Expense):", e);
    toast('Error: '+e.message,'err');
  }
  showSync(false);
}
function renderET(){
  const fd=document.getElementById('ef-d').value;const fc=document.getElementById('ef-c').value;
  let f=allExpenses;if(fd)f=f.filter(e=>e.date===fd);if(fc)f=f.filter(e=>e.cat===fc);
  document.getElementById('e-tbl').innerHTML=!f.length
    ?'<tr><td colspan="6" class="empty"><div class="empty-ic">💸</div>No expenses</td></tr>'
    :f.map(e=>`<tr>
      <td style="font-size:10px;color:var(--muted);">${e.date}</td>
      <td><span class="bx bx-r">${e.cat}</span></td>
      <td style="color:var(--soft);font-size:11px;">${e.desc||'—'}</td>
      <td>${pmbadge(e.pay||'cash')}</td>
      <td style="font-family:'JetBrains Mono',monospace;color:var(--red);">${Rs(e.amount)}</td>
      <td><button class="btn-del" onclick="delEx('${e.id}')">Del</button></td>
    </tr>`).join('');
}
async function delEx(id){if(!confirm('Delete?'))return;await db.collection('expenses').doc(id).delete();toast('Deleted','err');}
function clrEF(){document.getElementById('ef-d').value='';document.getElementById('ef-c').value='';renderET();}

// ─── REPORTS ───
function renderRep(){
  const month=parseInt(document.getElementById('r-m').value);
  const year=parseInt(document.getElementById('r-y').value);
  const mB=allBookings.filter(b=>{const d=new Date(b.date);return d.getMonth()+1===month&&d.getFullYear()===year;});
  const mE=allExpenses.filter(e=>{const d=new Date(e.date);return d.getMonth()+1===month&&d.getFullYear()===year;});
  const tInc=mB.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
  const tExp=mE.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const prf=tInc-tExp;
  const tDisc=mB.reduce((s,b)=>s+(parseFloat(b.dA)||0),0);
  const tAdv=mB.reduce((s,b)=>s+(parseFloat(b.advAmt)||0),0);
  const tDue=mB.reduce((s,b)=>s+(parseFloat(b.due)||0),0);
  let cashT=0,jazzT=0,bankT=0,easyT=0;
  mB.forEach(b=>{if(b.advMode==='cash')cashT+=b.advAmt||0;if(b.advMode==='jazz')jazzT+=b.advAmt||0;if(b.advMode==='bank')bankT+=b.advAmt||0;if(b.advMode==='easy')easyT+=b.advAmt||0;cashT+=b.afterCash||0;if(b.afterAccType==='jazz')jazzT+=b.afterAcc||0;if(b.afterAccType==='bank')bankT+=b.afterAcc||0;if(b.afterAccType==='easy')easyT+=b.afterAcc||0;});
  document.getElementById('r-inc').textContent=Rs(tInc);document.getElementById('r-inc-s').textContent=mB.length+' bookings';
  document.getElementById('r-exp').textContent=Rs(tExp);document.getElementById('r-exp-s').textContent=mE.length+' entries';
  document.getElementById('r-prf').textContent=Rs(prf);document.getElementById('r-prf').style.color=prf>=0?'var(--green)':'var(--red)';
  document.getElementById('r-prf-s').textContent=prf>=0?'Profit':'Loss';
  document.getElementById('r-disc').textContent=Rs(tDisc);document.getElementById('r-adv').textContent=Rs(tAdv);document.getElementById('r-due').textContent=Rs(tDue);
  document.getElementById('r-cash').textContent=Rs(cashT);document.getElementById('r-jazz').textContent=Rs(jazzT);document.getElementById('r-bank').textContent=Rs(bankT);
  document.getElementById('r-easy').textContent=Rs(easyT);
  const dI={},dE={};
  mB.forEach(b=>{const d=parseInt(b.date.split('-')[2]);dI[d]=(dI[d]||0)+(parseFloat(b.totalPaid)||0);});
  mE.forEach(e=>{const d=parseInt(e.date.split('-')[2]);dE[d]=(dE[d]||0)+(parseFloat(e.amount)||0);});
  const mx=Math.max(...Object.values(dI),...Object.values(dE),1);
  const days=[...new Set([...Object.keys(dI),...Object.keys(dE)].map(Number))].filter(d=>dI[d]||dE[d]).sort((a,b)=>a-b);
  document.getElementById('ch').innerHTML=!days.length?'<div class="empty">No data this month</div>':days.map(d=>`<div class="br"><div class="br-lbl">${String(d).padStart(2,'0')}</div><div style="flex:1;display:flex;flex-direction:column;gap:3px;"><div class="br-track"><div class="br-fill bi" style="width:${((dI[d]||0)/mx*100).toFixed(1)}%"></div></div><div class="br-track"><div class="br-fill be" style="width:${((dE[d]||0)/mx*100).toFixed(1)}%"></div></div></div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;width:65px;text-align:right;"><div style="color:var(--green);">${dI[d]>0?Rs(dI[d]):''}</div><div style="color:var(--red);">${dE[d]>0?Rs(dE[d]):''}</div></div></div>`).join('');
  const pd=mB.filter(b=>(b.due||0)>0);
  document.getElementById('pd-tbl').innerHTML=!pd.length?'<tr><td colspan="8" class="empty">No pending payments 🎉</td></tr>'
    :pd.map(b=>`<tr>
      <td style="font-size:10px;color:var(--muted);">${b.date}</td><td><b>${b.nm}</b></td><td style="color:var(--blue);">${b.ph||'—'}</td>
      <td>${Rs(b.fin)}</td><td style="color:var(--orange);">${Rs(b.advAmt)}</td>
      <td style="color:var(--green);">${Rs((b.afterCash||0)+(b.afterAcc||0))}</td>
      <td style="color:var(--red);font-weight:800;">${Rs(b.due)}</td>
      <td>${b.ph?`<a class="btn-wa" href="${waLink(b.ph,waDue(b))}" target="_blank">💬 Remind</a>`:'—'}</td>
    </tr>`).join('');
  const cT={};mE.forEach(e=>{cT[e.cat]=(cT[e.cat]||0)+parseFloat(e.amount);});
  const br=Object.entries(cT).sort((a,b)=>b[1]-a[1]);
  document.getElementById('eb-tbl').innerHTML=!br.length?'<tr><td colspan="3" class="empty">No expenses</td></tr>'
    :br.map(([c,a])=>`<tr><td><span class="bx bx-r">${c}</span></td><td style="font-family:'JetBrains Mono',monospace;color:var(--red);">${Rs(a)}</td><td style="color:var(--muted);">${tExp>0?(a/tExp*100).toFixed(1):0}%</td></tr>`).join('');
}

// ─── PDF REPORTS ───
function printDaily(){
  const td=today();
  const bks=allBookings.filter(b=>b.date===td);
  const exps=allExpenses.filter(e=>e.date===td);
  const inc=bks.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
  const exp=exps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Daily ${td}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial;padding:15px;font-size:11px;color:#000;}
.pb{background:#e07b00;color:#fff;border:none;padding:10px;border-radius:6px;width:100%;cursor:pointer;font-size:14px;font-weight:bold;margin-bottom:14px;}
h1{color:#e07b00;font-size:18px;border-bottom:2px solid #e07b00;padding-bottom:8px;margin-bottom:12px;}h2{font-size:13px;margin:14px 0 8px;}
.boxes{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.box{padding:10px 14px;border:2px solid #ddd;border-radius:8px;text-align:center;flex:1;min-width:80px;}
.bv{font-size:15px;font-weight:bold;display:block;}.bl{font-size:9px;color:#888;}
.g{border-color:#22c55e;color:#22c55e;}.r{border-color:#ef4444;color:#ef4444;}.y{border-color:#e07b00;color:#e07b00;}.b{border-color:#3b82f6;color:#3b82f6;}
table{width:100%;border-collapse:collapse;margin-bottom:12px;}
th{background:#060e1a;color:#f0b429;padding:6px 8px;text-align:left;font-size:9px;letter-spacing:1px;}
td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;}tr:nth-child(even){background:#f8fafc;}
.footer{text-align:center;font-size:10px;color:#888;border-top:1px solid #e2e8f0;padding-top:10px;margin-top:14px;}
@media print{.pb{display:none;}@page{margin:8mm;}}</style></head><body>
<button class="pb" onclick="window.print()">🖨️ Print / Save as PDF</button>
<h1>🏏 THE SULTANS — Daily Report (${td})</h1>
<p style="color:#888;font-size:11px;margin-bottom:12px;">${new Date().toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
<div class="boxes">
  <div class="box g"><span class="bv">${Rs(inc)}</span><span class="bl">Earning</span></div>
  <div class="box r"><span class="bv">${Rs(exp)}</span><span class="bl">Expense</span></div>
  <div class="box y"><span class="bv">${Rs(inc-exp)}</span><span class="bl">${inc-exp>=0?'Profit':'Loss'}</span></div>
  <div class="box b"><span class="bv">${bks.length}</span><span class="bl">Bookings</span></div>
</div>
<h2>📅 Bookings</h2>
<table><thead><tr><th>Time</th><th>Name</th><th>Phone</th><th>Total</th><th>Advance</th><th>Method</th><th>Cash(After)</th><th>Account(After)</th><th>Which</th><th>Due</th><th>Status</th></tr></thead><tbody>
${!bks.length?'<tr><td colspan="11" style="text-align:center;color:#888;padding:12px;">No bookings</td></tr>':bks.map(b=>`<tr>
  <td>${b.st||'—'} (${b.hrs}hr)</td><td><b>${b.nm}</b></td><td>${b.ph||'—'}</td>
  <td><b>${Rs(b.fin)}</b></td><td>${Rs(b.advAmt)}</td><td>${b.advMode}</td>
  <td>${Rs(b.afterCash||0)}</td><td>${Rs(b.afterAcc||0)}</td>
  <td>${b.afterAccType?accName(b.afterAccType):'—'}</td>
  <td style="color:${(b.due||0)>0?'#ef4444':'#22c55e'};font-weight:bold;">${(b.due||0)>0?Rs(b.due):'Clear ✅'}</td>
  <td>${b.status==='pre'?'PRE-MATCH':'COMPLETE'}</td>
</tr>`).join('')}</tbody></table>
<h2>💸 Expenses</h2>
<table><thead><tr><th>Category</th><th>Details</th><th>Paid Via</th><th>Amount</th></tr></thead><tbody>
${!exps.length?'<tr><td colspan="4" style="text-align:center;color:#888;padding:12px;">No expenses</td></tr>':exps.map(e=>`<tr><td>${e.cat}</td><td>${e.desc||'—'}</td><td>${e.pay}</td><td>${Rs(e.amount)}</td></tr>`).join('')}
</tbody></table>
<div class="footer">
  <p><b>The Sultans Indoor Cricket Club, Multan</b> | 0300-9634880 | 0319-3510870</p>
  <p>JazzCash: 0300-3510175 (Abdul Gaffar) | Bank Alfalah: 83721010111101 (Mehboob Ahmad)</p>
  <p style="margin-top:4px;"><b>System by Jahanzeb Baloch — 0306-0711529</b></p>
</div>
<script>
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}
</script>
</body></html>`);w.document.close();
}

function printReport(){
  const month=parseInt(document.getElementById('r-m').value);
  const year=parseInt(document.getElementById('r-y').value);
  const bks=allBookings.filter(b=>{const d=new Date(b.date);return d.getMonth()+1===month&&d.getFullYear()===year;});
  const exps=allExpenses.filter(e=>{const d=new Date(e.date);return d.getMonth()+1===month&&d.getFullYear()===year;});
  const tInc=bks.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
  const tExp=exps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${MONTHS[month-1]} ${year}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial;padding:15px;font-size:11px;color:#000;}
.pb{background:#e07b00;color:#fff;border:none;padding:10px;border-radius:6px;width:100%;cursor:pointer;font-size:14px;font-weight:bold;margin-bottom:14px;}
h1{color:#e07b00;font-size:18px;border-bottom:2px solid #e07b00;padding-bottom:8px;margin-bottom:12px;}h2{font-size:13px;margin:14px 0 8px;}
.boxes{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.box{padding:10px 14px;border:2px solid #ddd;border-radius:8px;text-align:center;flex:1;min-width:80px;}
.bv{font-size:14px;font-weight:bold;display:block;}.bl{font-size:9px;color:#888;}
.g{border-color:#22c55e;color:#22c55e;}.r{border-color:#ef4444;color:#ef4444;}.y{border-color:#e07b00;color:#e07b00;}.b{border-color:#3b82f6;color:#3b82f6;}
table{width:100%;border-collapse:collapse;margin-bottom:12px;}
th{background:#060e1a;color:#f0b429;padding:5px 7px;text-align:left;font-size:9px;letter-spacing:1px;}
td{padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:10px;}tr:nth-child(even){background:#f8fafc;}
.footer{text-align:center;font-size:10px;color:#888;border-top:1px solid #e2e8f0;padding-top:10px;margin-top:14px;}
@media print{.pb{display:none;}@page{margin:8mm;size:A4 landscape;}}</style></head><body>
<button class="pb" onclick="window.print()">🖨️ Print / Save as PDF</button>
<h1>🏏 THE SULTANS — ${MONTHS[month-1]} ${year}</h1>
<p style="color:#888;font-size:11px;margin-bottom:12px;">Generated: ${new Date().toLocaleString('en-PK')}</p>
<div class="boxes">
  <div class="box g"><span class="bv">${Rs(tInc)}</span><span class="bl">Monthly Earning</span></div>
  <div class="box r"><span class="bv">${Rs(tExp)}</span><span class="bl">Monthly Expense</span></div>
  <div class="box y"><span class="bv">${Rs(tInc-tExp)}</span><span class="bl">${tInc-tExp>=0?'Profit':'Loss'}</span></div>
  <div class="box b"><span class="bv">${bks.length}</span><span class="bl">Bookings</span></div>
</div>
<h2>📅 All Bookings</h2>
<table><thead><tr><th>Date</th><th>Name</th><th>Phone</th><th>Time</th><th>Hrs</th><th>Total</th><th>Advance</th><th>Method</th><th>Cash</th><th>Account</th><th>Which</th><th>Due</th><th>Status</th></tr></thead><tbody>
${bks.map(b=>`<tr>
  <td>${b.date}</td><td><b>${b.nm}</b></td><td>${b.ph||'—'}</td><td>${b.st||'—'}</td><td>${b.hrs}hr</td>
  <td><b>${Rs(b.fin)}</b></td><td>${Rs(b.advAmt)}</td><td>${b.advMode}</td>
  <td>${Rs(b.afterCash||0)}</td><td>${Rs(b.afterAcc||0)}</td>
  <td>${b.afterAccType?accName(b.afterAccType):'—'}</td>
  <td style="color:${(b.due||0)>0?'#ef4444':'#22c55e'};">${(b.due||0)>0?Rs(b.due):'✅'}</td>
  <td>${b.status==='pre'?'PRE':'DONE'}</td>
</tr>`).join('')}</tbody></table>
<h2>💸 All Expenses</h2>
<table><thead><tr><th>Date</th><th>Category</th><th>Details</th><th>Paid Via</th><th>Amount</th></tr></thead><tbody>
${exps.map(e=>`<tr><td>${e.date}</td><td>${e.cat}</td><td>${e.desc||'—'}</td><td>${e.pay}</td><td>${Rs(e.amount)}</td></tr>`).join('')}
</tbody></table>
<div class="footer">
  <p><b>The Sultans Indoor Cricket Club, Multan</b> | 0300-9634880 | 0319-3510870</p>
  <p>JazzCash: 0300-3510175 (Abdul Gaffar) | Bank Alfalah: 83721010111101 (Mehboob Ahmad)</p>
  <p style="margin-top:4px;"><b>System by Jahanzeb Baloch — 0306-0711529</b></p>
</div>
<script>
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}
</script>
</body></html>`);w.document.close();
}


// ─── ADD PAYMENT (for partial bookings) ───
let activeAddPayId=null;
function openAddPay(id){
  activeAddPayId=id;
  const bk=allBookings.find(b=>b.id===id);if(!bk)return;
  ['ap-cash','ap-acc','ap-cash-note','ap-acc-note'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('ap-acc-type').value='';
  document.getElementById('ap-status').value=(bk.due||0)>0?'partial':'paid';
  document.getElementById('addpay-info').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
      <div><b style="color:var(--muted);">Customer:</b> ${bk.nm}</div>
      <div><b style="color:var(--muted);">Phone:</b> ${bk.ph||'—'}</div>
      <div><b style="color:var(--muted);">Date:</b> ${bk.date}</div>
      <div><b style="color:var(--muted);">Time:</b> ${bk.st||'—'}</div>
      <div><b style="color:var(--muted);">Total:</b> <span style="color:var(--gold);font-weight:800;">${Rs(bk.fin)}</span></div>
      <div><b style="color:var(--muted);">Paid So Far:</b> <span style="color:var(--green);">${Rs(bk.totalPaid||0)}</span></div>
      <div style="grid-column:1/-1;"><b style="color:var(--purple);">Still Due:</b> <span style="color:var(--purple);font-size:16px;font-weight:800;">${Rs(bk.due)}</span></div>
    </div>`;
  document.getElementById('ap-total').textContent=Rs(bk.fin);
  document.getElementById('ap-paid').textContent=Rs(bk.totalPaid||0);
  calcAddPay();
  document.getElementById('addPayModal').classList.add('on');
}
function closeAddPay(){document.getElementById('addPayModal').classList.remove('on');activeAddPayId=null;}
function calcAddPay(){
  if(!activeAddPayId)return;
  const bk=allBookings.find(b=>b.id===activeAddPayId);if(!bk)return;
  const cash=parseFloat(document.getElementById('ap-cash').value)||0;
  const acc=parseFloat(document.getElementById('ap-acc').value)||0;
  const newPay=cash+acc;
  const newTotal=(bk.totalPaid||0)+newPay;
  const remaining=Math.max(0,bk.fin-newTotal);
  document.getElementById('ap-new').textContent=Rs(newPay);
  document.getElementById('ap-remaining').textContent=remaining>0?Rs(remaining):'Sab Clear ✅';
  document.getElementById('ap-remaining').style.color=remaining>0?'var(--red)':'var(--green)';
  document.getElementById('ap-status').value=remaining>0?'partial':'paid';
}
async function saveAddPay(){
  if(!activeAddPayId)return;
  const bk=allBookings.find(b=>b.id===activeAddPayId);if(!bk)return;
  const cash=parseFloat(document.getElementById('ap-cash').value)||0;
  const acc=parseFloat(document.getElementById('ap-acc').value)||0;
  const accType=document.getElementById('ap-acc-type').value;
  const cashNote=document.getElementById('ap-cash-note').value.trim();
  const accNote=document.getElementById('ap-acc-note').value.trim();
  const status=document.getElementById('ap-status').value;
  if(cash===0&&acc===0){toast('Amount enter karo!','err');return;}

  showSync(true);
  try{
    const newAfterCash=(bk.afterCash||0)+cash;
    const newAfterAcc=(bk.afterAcc||0)+acc;
    const newTotalPaid=(bk.totalPaid||0)+cash+acc;
    const newDue=Math.max(0,(bk.fin||0)-newTotalPaid);
    
    const updates = {
      afterCash:newAfterCash,
      afterAcc:newAfterAcc,
      afterAccType:accType||bk.afterAccType||'',
      afterCashNote:(bk.afterCashNote||'')+(cashNote?' | '+cashNote:''),
      afterAccNote:(bk.afterAccNote||'')+(accNote?' | '+accNote:''),
      totalPaid:newTotalPaid,
      due:newDue,
      status:status,
      lastPaymentAt:new Date().toISOString()
    };
    
    console.log("Updating booking (AddPay):", activeAddPayId, updates);
    await db.collection('bookings').doc(activeAddPayId).update(updates);
    closeAddPay();
    toast('Payment add ho gaya! ✅','ok');
  }catch(e){
    console.error("Firebase Update Error (AddPay):", e);
    toast('Error: '+e.message,'err');
  }
  showSync(false);
}


// ─── HELPERS ─────────────────────────────
function parseTimeToMinutes(timeStr){
  if(!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if(!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]||0);
  const ap = (match[3]||'').toUpperCase();
  if(ap==='PM' && h<12) h+=12;
  if(ap==='AM' && h===12) h=0;
  if(!ap && h<8) h+=12;
  return h*60+m;
}

function minutesToTime(mins){
  const totalMins = mins % 1440; // wrap 24hr
  const h24 = Math.floor(totalMins/60);
  const m = totalMins%60;
  const ap = h24>=12?'PM':'AM';
  const h12 = h24>12?h24-12:h24===0?12:h24;
  return h12+':'+(m<10?'0':'')+m+' '+ap;
}

function getEndInfo(startTimeStr, hrs){
  const startMins = parseTimeToMinutes(startTimeStr);
  const endMins = startMins + Math.round((parseFloat(hrs)||0)*60);
  const crossesMidnight = endMins >= 1440;
  const endTime = minutesToTime(endMins);
  return {endTime, crossesMidnight, endMins};
}

// ─── TIME PICKER ─────────────────────────
function buildTime(){
  const h = document.getElementById('b-hour').value;
  const m = document.getElementById('b-min').value;
  const ap = document.getElementById('b-ampm').value;
  const timeStr = h+':'+m+' '+ap;
  document.getElementById('b-st').value = timeStr;
  document.getElementById('b-st-preview').textContent = '⏰ '+timeStr;
  onTimeChange();
}

function onDateChange(){
  checkDateWarning();
  updateDayPreview();
  checkConflict();
}
function onHrChange(){
  calcAmt();
  updateDayPreview();
  checkMidnight();
  checkConflict();
}
function onTimeChange(){
  updateDayPreview();
  checkMidnight();
  checkConflict();
}

// ─── DATE WARNING ─────────────────────────
function checkDateWarning(){
  const date = document.getElementById('b-date').value;
  const dw = document.getElementById('dateWarn');
  if(!dw) return;
  if(!date){dw.style.display='none';return;}
  dw.style.display = date < today() ? 'block' : 'none';
}

// ─── MIDNIGHT CHECK ──────────────────────
function checkMidnight(){
  const st = document.getElementById('b-st').value;
  const hrs = parseFloat(document.getElementById('b-hr').value)||0;
  const mw = document.getElementById('midnightWarn');
  if(!mw) return;
  if(!st||!hrs){mw.style.display='none';return;}
  const {endTime, crossesMidnight} = getEndInfo(st, hrs);
  if(crossesMidnight){
    mw.style.display='block';
    mw.textContent = '🌙 Midnight crossing! Booking ends at '+endTime+' next day. Agle din ka slot bhi block ho jayega.';
  } else {
    mw.style.display='none';
  }
}

// ─── DAY PREVIEW ─────────────────────────
function updateDayPreview(){
  const date = document.getElementById('b-date').value;
  const dp = document.getElementById('dayPreview');
  if(!dp) return;
  if(!date){dp.style.display='none';return;}
  const d = new Date(date+'T00:00:00');
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayEmojis=['☀️','🌙','🌙','🌙','🌙','🌙','🟢'];
  const idx=d.getDay();
  const isToday=date===today();
  const isTomorrow=date===new Date(Date.now()+86400000).toISOString().slice(0,10);
  let lbl='';
  if(isToday)lbl=' — Today';
  if(isTomorrow)lbl=' — Tomorrow';
  if(idx===5)lbl+=' (Friday)';
  if(idx===0)lbl+=' (Sunday)';
  // End time
  const st=document.getElementById('b-st').value;
  const hrs=parseFloat(document.getElementById('b-hr').value)||0;
  let endLbl='';
  if(st&&hrs){
    const {endTime,crossesMidnight}=getEndInfo(st,hrs);
    endLbl=' | End: '+endTime+(crossesMidnight?' (Next Day)':'');
  }
  dp.style.display='block';
  dp.textContent=dayEmojis[idx]+' '+dayNames[idx]+', '+d.getDate()+' '+monthNames[d.getMonth()]+' '+d.getFullYear()+lbl+endLbl;
}

// ─── CONFLICT CHECK (Midnight-aware) ─────
function checkConflict(){
  calcAmt();
  const date=document.getElementById('b-date').value;
  if(!date){document.getElementById('conflictWarn').style.display='none';return;}
  const stVal=document.getElementById('b-st').value;
  const hrs=parseFloat(document.getElementById('b-hr').value)||0;
  if(!stVal||!hrs){document.getElementById('conflictWarn').style.display='none';return;}
  
  const newStart=parseTimeToMinutes(stVal);
  const newEnd=newStart+(hrs*60);
  
  // Check same date bookings
  let conflicts=[];
  allBookings.forEach(b=>{
    if(!b.st||!b.hrs) return;
    // Check if booking dates overlap (same day or midnight from prev day)
    const sameDate=b.date===date;
    const prevDate=b.date===getPrevDate(date);
    if(!sameDate&&!prevDate) return;
    
    let bStart=parseTimeToMinutes(b.st);
    const bEnd=bStart+((parseFloat(b.hrs)||1)*60);
    
    // If checking prev day booking that crosses midnight
    if(prevDate){
      if(bEnd<1440) return; // prev day booking doesnt cross midnight, skip
      const overlapIntoNewDay=bEnd-1440;
      if(newStart<overlapIntoNewDay){
        conflicts.push({nm:b.nm,st:b.st,hrs:b.hrs,note:'(from previous day, crosses midnight)'});
      }
      return;
    }
    
    if(newStart<bEnd&&newEnd>bStart){
      conflicts.push({nm:b.nm,st:b.st,hrs:b.hrs,note:''});
    }
  });
  
  const warn=document.getElementById('conflictWarn');
  if(conflicts.length){
    warn.textContent='🚫 CONFLICT! '+conflicts.map(c=>'"'+c.nm+'" ki '+c.st+' ('+c.hrs+'hr) booking '+c.note).join(', ');
    warn.style.cssText='display:block;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;color:var(--red);margin-bottom:8px;';
  } else if(allBookings.filter(b=>b.date===date).length>0){
    const cnt=allBookings.filter(b=>b.date===date).length;
    warn.textContent='ℹ️ '+cnt+' booking(s) on this date — No time conflict ✅';
    warn.style.cssText='display:block;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;color:var(--green);margin-bottom:8px;';
  } else {
    warn.style.display='none';
  }
}

function getPrevDate(dateStr){
  const d=new Date(dateStr+'T00:00:00');
  d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}
function getNextDate(dateStr){
  const d=new Date(dateStr+'T00:00:00');
  d.setDate(d.getDate()+1);
  return d.toISOString().slice(0,10);
}

// ─── ADVANCE WARNING ─────────────────────
function checkAdvWarn(){
  const adv=parseFloat(document.getElementById('adv-amt').value)||0;
  document.getElementById('advWarn').style.display=adv===0?'block':'none';
  calcAdvance();
}

// ─── SMART PASTE ─────────────────────────
const WA_TEMPLATE=`THE SULTANS INDOOR CRICKET CLUB 🏏
Booking Request - Yeh fill kar ke bhejein:

NAME: 
PHONE: 
DATE: 
TIME: (e.g. 6:00 PM)
HOURS: (e.g. 2)
ADVANCE: (e.g. 1000)`;

function copyTemplate(){
  navigator.clipboard.writeText(WA_TEMPLATE).then(()=>{
    toast('Template copied! Customer ko bhejo 📋','ok');
  }).catch(()=>{
    // Fallback
    const ta=document.createElement('textarea');
    ta.value=WA_TEMPLATE;document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
    toast('Template copied! ✅','ok');
  });
}

function smartPasteLive(val){
  // Just show hint if something is pasted
  const pr=document.getElementById('paste-result');
  if(val.length>10){
    pr.style.display='block';
    pr.style.color='var(--gold)';
    pr.textContent='👆 "Auto Fill" button click karo form fill karne ke liye';
  } else {
    pr.style.display='none';
  }
}

function autofillFromPaste(){
  const txt=document.getElementById('pastebox').value;
  if(!txt.trim()){toast('Pehle message paste karo!','err');return;}
  
  const pr=document.getElementById('paste-result');
  let filled=[];
  
  // Parse NAME
  const nameMatch=txt.match(/NAME\s*:\s*(.+)/i);
  if(nameMatch&&nameMatch[1].trim()){
    document.getElementById('b-nm').value=nameMatch[1].trim();
    filled.push('Name');
  }
  
  // Parse PHONE
  const phoneMatch=txt.match(/PHONE\s*:\s*([0-9\-\s]{10,13})/i);
  if(phoneMatch&&phoneMatch[1].trim()){
    document.getElementById('b-ph').value=phoneMatch[1].trim();
    filled.push('Phone');
  }
  
  // Parse DATE
  const dateMatch=txt.match(/DATE\s*:\s*(.+)/i);
  if(dateMatch&&dateMatch[1].trim()){
    const parsedDate=parseDate(dateMatch[1].trim());
    if(parsedDate){
      document.getElementById('b-date').value=parsedDate;
      filled.push('Date');
      onDateChange();
    }
  }
  
  // Parse TIME
  const timeMatch=txt.match(/TIME\s*:\s*(\d+):?(\d*)\s*(AM|PM)?/i);
  if(timeMatch){
    let h=parseInt(timeMatch[1]);
    const m=timeMatch[2]?parseInt(timeMatch[2]):0;
    let ap=(timeMatch[3]||'PM').toUpperCase();
    if(h>12){ap='PM';h=h-12;}
    if(h===0){h=12;ap='AM';}
    document.getElementById('b-hour').value=h;
    document.getElementById('b-min').value=m<10?'0'+m:''+m;
    document.getElementById('b-ampm').value=ap;
    buildTime();
    filled.push('Time');
  }
  
  // Parse HOURS
  const hrsMatch=txt.match(/HOURS?\s*:\s*(\d+\.?\d*)/i);
  if(hrsMatch){
    document.getElementById('b-hr').value=hrsMatch[1];
    onHrChange();
    filled.push('Hours');
  }
  
  // Parse ADVANCE
  const advMatch=txt.match(/ADVANCE\s*:\s*(\d+)/i);
  if(advMatch){
    document.getElementById('adv-amt').value=advMatch[1];
    calcAdvance();
    filled.push('Advance');
  }
  
  if(filled.length>0){
    pr.style.display='block';
    pr.style.color='var(--green)';
    pr.textContent='✅ Auto filled: '+filled.join(', ')+' — Check karo aur Save karo!';
    toast('Form fill ho gaya! ✅','ok');
    document.getElementById('pastebox').value='';
  } else {
    pr.style.display='block';
    pr.style.color='var(--red)';
    pr.textContent='❌ Koi data nahi mila — Template format use karo!';
    toast('Format match nahi hua!','err');
  }
}

function parseDate(str){
  // Try YYYY-MM-DD
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dm=str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(dm) return dm[3]+'-'+dm[2].padStart(2,'0')+'-'+dm[1].padStart(2,'0');
  // Try "12 April" or "12 Apr"
  const months={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12',january:'01',february:'02',march:'03',april:'04',june:'06',july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'};
  const nm=str.match(/(\d{1,2})\s+([a-zA-Z]+)/);
  if(nm){
    const mon=months[nm[2].toLowerCase()];
    if(mon) return new Date().getFullYear()+'-'+mon+'-'+nm[1].padStart(2,'0');
  }
  return null;
}

// ─── EDIT BOOKING ─────────────────────────
let activeEditId=null;
function openEdit(id){
  activeEditId=id;
  const bk=allBookings.find(b=>b.id===id);if(!bk)return;
  document.getElementById('ed-nm').value=bk.nm||'';
  document.getElementById('ed-ph').value=bk.ph||'';
  document.getElementById('ed-vip').value=bk.vip||'regular';
  document.getElementById('ed-hrs').value=bk.hrs||'';
  document.getElementById('ed-note').value=bk.nt||'';
  if(bk.st){
    const m=bk.st.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if(m){document.getElementById('ed-hour').value=m[1];document.getElementById('ed-min').value=m[2].padStart(2,'0');document.getElementById('ed-ampm').value=(m[3]||'PM').toUpperCase();}
  }
  document.getElementById('editModal').classList.add('on');
}
function closeEdit(){document.getElementById('editModal').classList.remove('on');activeEditId=null;}
async function saveEdit(){
  if(!activeEditId)return;
  const nm=document.getElementById('ed-nm').value.trim();
  const ph=document.getElementById('ed-ph').value.trim();
  const vip=document.getElementById('ed-vip').value;
  const hrs=parseFloat(document.getElementById('ed-hrs').value)||0;
  const nt=document.getElementById('ed-note').value.trim();
  const st=document.getElementById('ed-hour').value+':'+document.getElementById('ed-min').value+' '+document.getElementById('ed-ampm').value;
  if(!nm){
    toast('Naam required!','err');
    return;
  }

  const b=allBookings.find(x=>x.id===activeEditId);
  const upd={nm,ph,vip,nt,st};
  if(hrs>0 && b && hrs!==b.hrs){
    upd.hrs=hrs;
    const nf=Math.max(0,Math.round(hrs*2000)+(b.extraChargeAdded||0)-(b.extraDiscAdded||0));
    upd.fin=nf;
    upd.due=Math.max(0,nf-(b.totalPaid||0));
  }

  if(typeof showSync === 'function') showSync(true);
  try{
    await db.collection('bookings').doc(activeEditId).update(upd);
    closeEdit();
    toast('Booking updated! ✅','ok');
  }catch(e){
    toast('Error: '+e.message,'err');
  }
  if(typeof showSync === 'function') showSync(false);
}

// ─── LIVE TIMER ──────────────────────────
let timerInterval = null;
let currentTimerIdx = 0;

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  renderTimer();
  timerInterval = setInterval(renderTimer, 1000);
}

function timerNav(dir) {
  currentTimerIdx += dir;
  const sec = document.getElementById('timerSection');
  if (sec) sec.setAttribute('data-navigated', 'true');
  renderTimer();
}

function renderTimer() {
  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = today();

  const tc = document.getElementById('timerClock');
  if(tc){
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const dateStr = now.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });
    tc.textContent = dateStr + ' | ' + h12 + ':' + m + ':' + s + ' ' + ap;
  }

  // Build bookings with absolute timestamps — ONLY show today + future (not past days)
  const activeBks = allBookings
    .filter(b => b.st && b.date && b.date >= todayStr)
    .map(b => {
      const sm = parseTimeToMinutes(b.st);
      const s = new Date(`${b.date}T00:00:00`);
      s.setMinutes(sm);
      const startMs = s.getTime();
      const durationMs = (Math.round((parseFloat(b.hrs)||1)*60) + (parseFloat(b.exM)||0)) * 60000;
      const endMs = startMs + durationMs;
      return {...b, startMs, endMs};
    })
    // Show: currently playing, upcoming, or ended within last 30 mins (not next day)
    .filter(b => {
      const isFinished = nowMs >= b.endMs;
      // If match is done, only show if it ended within 30 mins AND it's today
      if(isFinished) return (nowMs - b.endMs < 1800000) && b.date === todayStr;
      return true; // upcoming or playing
    })
    .sort((a,b) => a.startMs - b.startMs);

  const sec = document.getElementById('timerSection');
  if(!sec) return;

  if(!activeBks.length){
    const nextAny = allBookings
      .filter(b => b.st && b.date && b.date > todayStr)
      .sort((a,b) => (a.date+a.st).localeCompare(b.date+b.st))[0];
    if(nextAny){
      sec.innerHTML = `<div class="no-bookings-timer">✅ Aaj koi match nahi<br><span style="color:var(--gold);font-size:11px;">Next: ${nextAny.nm} — ${nextAny.date} @ ${nextAny.st}</span></div>`;
    } else {
      sec.innerHTML = '<div class="no-bookings-timer">📅 Koi booking nahi</div>';
    }
    return;
  }

  if (timerInterval && !sec.getAttribute('data-navigated')) {
    let activeIdx = activeBks.findIndex(b => nowMs >= b.startMs && nowMs < b.endMs);
    if (activeIdx === -1) activeIdx = activeBks.findIndex(b => nowMs < b.startMs);
    if (activeIdx === -1) activeIdx = activeBks.length - 1;
    currentTimerIdx = Math.max(0, activeIdx);
  }
  
  if(currentTimerIdx < 0) currentTimerIdx = 0;
  if(currentTimerIdx >= activeBks.length) currentTimerIdx = activeBks.length - 1;

  const generateCard = (bk, type) => {
    if(!bk) return `<div class="timer-panel side" style="visibility:hidden"></div>`;
    
    const isToday = bk.date === todayStr;
    // Smart date label
    let dateLabel;
    if(isToday){
      dateLabel = 'Aaj';
    } else {
      const d = new Date(bk.date + 'T00:00:00');
      const diffDays = Math.round((d - new Date(todayStr+'T00:00:00')) / 86400000);
      if(diffDays === 1) dateLabel = 'Kal';
      else dateLabel = bk.date.split('-').reverse().join('/');
    }
    const isPlaying = nowMs >= bk.startMs && nowMs < bk.endMs;
    const isDone = nowMs >= bk.endMs;
    const isSide = type === 'side';

    let statusHtml = '';
    if(isDone){
      statusHtml = `
        <div class="timer-card done">
          <div class="timer-badge done">✅ MATCH KHATAM</div>
          <div class="timer-team">${bk.nm}</div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:3px;">📅 ${dateLabel} — ${bk.date}</div>
          <div class="timer-time">${bk.st} (${bk.hrs}hr)</div>
          <div style="font-size:11px;color:var(--green);font-weight:800;">✅ Khatam ho gaya</div>
        </div>`;
    } else if(isPlaying){
      const remainSecs = Math.max(0, (bk.endMs - nowMs) / 1000);
      const isUrgent = remainSecs < 600;
      const totalSecs = (bk.endMs - bk.startMs) / 1000;
      const pct = Math.min(100, (((totalSecs - remainSecs)/totalSecs)*100)||0);
      statusHtml = `
        <div class="timer-card active">
          <div class="timer-badge active">▶️ PLAYING NOW</div>
          <div class="timer-team" style="color:var(--green);">${bk.nm}</div>
          <div style="font-size:11px;color:var(--gold);font-weight:800;margin-bottom:3px;">📅 ${dateLabel} — ${bk.date}</div>
          <div class="timer-time">${bk.st} (${bk.hrs}hr)</div>
          <div class="timer-countdown ${isUrgent?'urgent':'active'}" style="font-size:${isSide?'18px':'28px'}">${formatCountdownExact(remainSecs)}</div>
          <div class="timer-bar-track"><div class="timer-bar-fill ${isUrgent?'urgent':'active'}" style="width:${pct.toFixed(1)}%"></div></div>
        </div>`;
    } else {
      // Upcoming match — show exact time remaining
      const waitSecs = Math.max(0, (bk.startMs - nowMs) / 1000);
      statusHtml = `
        <div class="timer-card waiting">
          <div class="timer-badge waiting">⏳ UPCOMING</div>
          <div class="timer-team" style="color:var(--gold);">${bk.nm}</div>
          <div style="font-size:11px;color:var(--gold);font-weight:800;margin-bottom:3px;">📅 ${dateLabel} — ${bk.date}</div>
          <div class="timer-time">${bk.st} (${bk.hrs}hr)</div>
          <div class="timer-countdown" style="font-size:${isSide?'16px':'22px'};color:var(--gold);">${formatCountdownExact(waitSecs)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px;">Shuru hone mein</div>
        </div>`;
    }
    return `<div class="timer-panel ${type}">${statusHtml}</div>`;
  };

  const prev = activeBks[currentTimerIdx - 1];
  const curr = activeBks[currentTimerIdx];
  const next = activeBks[currentTimerIdx + 1];

  sec.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="nav-btn" onclick="timerNav(-1)" ${!prev?'disabled style="opacity:0.2;cursor:not-allowed"':''}>◄</button>
      <div class="timer-carousel" style="flex:1;">
        <div class="timer-track" id="timerTrack">
          ${generateCard(prev, 'side')}
          ${generateCard(curr, 'curr')}
          ${generateCard(next, 'side')}
        </div>
      </div>
      <button class="nav-btn" onclick="timerNav(1)" ${!next?'disabled style="opacity:0.2;cursor:not-allowed"':''}>►</button>
    </div>
    <div style="text-align:center;font-size:10px;color:var(--muted);margin-top:6px;font-weight:800;letter-spacing:1px;">
      ${activeBks.filter(b=>nowMs>=b.startMs&&nowMs<b.endMs).length>0?'🟢':'⏳'} MATCH ${currentTimerIdx+1} / ${activeBks.length}
    </div>
  `;
}

function formatCountdownExact(totalSecs){
  const days = Math.floor(totalSecs / 86400);
  const hs = totalSecs % 86400;
  const hrs = Math.floor(hs / 3600);
  const m = Math.floor((hs % 3600) / 60);
  const sec = Math.floor(hs % 60);
  let s = '';
  if (days > 0) s += days + 'd ';
  if (hrs > 0 || days > 0) s += String(hrs).padStart(2,'0') + 'h ';
  s += String(m).padStart(2,'0') + 'm ' + String(sec).padStart(2,'0') + 's';
  return s;
}

function goPreWithDate(date){
  go('pre');
  const dInp = document.getElementById('b-date');
  if(dInp){
    dInp.value = date;
    checkConflict();
  }
}

// ─── AUTH LOGIC ───
let APP_PIN = "1122"; // Default fallback

function checkPin() {
  const inp = document.getElementById('pinInp');
  const err = document.getElementById('pinErr');
  if (inp.value === APP_PIN) {
    localStorage.setItem('sultans_auth', 'true');
    localStorage.setItem('always_pin', 'false');
    // Use CSS classes for instant, flicker-free transition
    document.documentElement.classList.remove('auth-none');
    document.documentElement.classList.add('auth-ok');
    inp.value = '';
    err.textContent = '';
  } else {
    err.textContent = '❌ Wrong PIN — Contact Jahanzeb Baloch 0306-0711529';
    inp.value = '';
    inp.focus();
  }
}

// Allow Enter key on PIN input
document.addEventListener('DOMContentLoaded', () => {
  const pinInp = document.getElementById('pinInp');
  if (pinInp) {
    pinInp.addEventListener('keydown', e => { if (e.key === 'Enter') checkPin(); });
  }
});

function logout() {
  localStorage.removeItem('sultans_auth');
  document.documentElement.classList.remove('auth-ok');
  document.documentElement.classList.add('auth-none');
}

// ─── INIT ───
function init(){
  console.log('Initializing app...');
  
  // Auth check is now handled instantly in the <head> using CSS classes.

  // Sync Settings from Admin in Firebase
  db.collection('settings').doc('admin').onSnapshot(doc => {
    if(doc.exists){
      const data = doc.data();
      // 1. PIN Sync
      if(data.password){ APP_PIN = data.password; console.log("PIN Synced"); }
      
      // Sync alwaysPin to localStorage for instant head check
      localStorage.setItem('always_pin', data.alwaysPin ? 'true' : 'false');
      
      // 2. Rate Sync
      if(data.rate){ 
        RATE = data.rate; 
        if(typeof calcAmt === 'function') calcAmt(); 
      }
      
      // 3. Maintenance Mode
      const mOverlay = document.getElementById('maintOverlay');
      if(data.maint){
        mOverlay.classList.add('on');
      } else {
        mOverlay.classList.remove('on');
      }

      // 4. Version Check
      if(data.version && data.version !== APP_VERSION){
        document.getElementById('updateBanner').classList.add('on');
      } else {
        document.getElementById('updateBanner').classList.remove('on');
      }

    }
  }, err => console.error("Firebase Sync Error:", err));

  tick();
  const td=today();
  ['b-date','e-d','ef-d'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=td;});
  // Set default time to 6:00 PM
  const hourEl=document.getElementById('b-hour');
  const ampmEl=document.getElementById('b-ampm');
  if(hourEl)hourEl.value='6';
  if(ampmEl)ampmEl.value='PM';
  buildTime();updateDayPreview();
  document.getElementById('comp-filter').addEventListener('change',renderPostTab);
  ['b-hr','b-ex','b-exc','b-dt'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',calcAmt);});
  document.getElementById('adv-amt').addEventListener('input',checkAdvWarn);
  document.getElementById('ef-d').addEventListener('change',renderET);
  const now=new Date();
  const mSel=document.getElementById('r-m');
  if(mSel&&!mSel.options.length)MONTHS.forEach((m,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=m;if(i===now.getMonth())o.selected=true;mSel.appendChild(o);});
  const ySel=document.getElementById('r-y');
  if(ySel&&!ySel.options.length)for(let y=now.getFullYear();y>=now.getFullYear()-3;y--){const o=document.createElement('option');o.value=y;o.textContent=y;ySel.appendChild(o);}
  const savedTarget=localStorage.getItem('daily_target');
  if(savedTarget&&document.getElementById('targetInput'))document.getElementById('targetInput').value=savedTarget;
  calcAmt();renderDash();startTimer();
  
  // Hide loading overlay on success
  setTimeout(() => {
    const loader = document.getElementById('loadingOverlay');
    if(loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 500);
    }
  }, 800);
}

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}

function renderHistory(){
  const h=document.getElementById('historyList');
  if(!h) return;
  if(!allHistory.length){h.innerHTML='<div class="empty">No snapshots found. Reset krne pr yahan summary nazar ayegi.</div>';return;}
  h.innerHTML=allHistory.map(s=>`
    <div class="card" style="border-left:4px solid var(--gold); border-bottom: 1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1.2px;color:var(--gold);">SNAPSHOT: ${s.date}</div>
        <button class="btn-del" style="font-size:9px;padding:3px 8px;" onclick="delHistory('${s.id}')">Delete Row</button>
      </div>
      <div class="stats" style="margin-bottom:0;grid-template-columns:repeat(2,1fr);gap:8px;">
        <div class="sc"><div class="sc-lbl">Earning</div><div class="sc-val" style="font-size:14px;color:var(--green);">${Rs(s.earned)}</div></div>
        <div class="sc"><div class="sc-lbl">Expense</div><div class="sc-val" style="font-size:14px;color:var(--red);">${Rs(s.expense)}</div></div>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-top:8px;">Archived on: ${s.resetAt || '—'} | Count: ${s.count}</div>
    </div>`).join('');
}

async function delHistory(id) {
  if (!confirm('Are you sure you want to delete this history record?')) return;
  try {
    await db.collection('history_reset').doc(id).delete();
    toast('History record deleted ✅', 'ok');
  } catch (e) {
    toast('Error deleting history: ' + e.message, 'err');
  }
}


async function archiveAndReset(){
  if(!confirm('⚠️ DANGER: Reset krne se Bookings, Expenses or Customers clear ho jayenge.\n\nSummary History me archive ki jaye gi.')) return;
  if(!confirm('Final Confirmation: Kya aap waqai reset chahte hain?')) return;
  
  toast('Archiving data...','info');
  const earned = allBookings.reduce((s,b)=>s+(parseFloat(b.totalPaid)||0),0);
  const expense = allExpenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const count = allBookings.length;
  
  try {
    await db.collection('history_reset').add({
      date: today(),
      earned,
      expense,
      count,
      resetAt: new Date().toLocaleString('en-PK')
    });
    
    toast('Clearing Bookings...','info');
    const bks = await db.collection('bookings').get();
    let batch = db.batch();
    bks.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    toast('Clearing Expenses...','info');
    const exps = await db.collection('expenses').get();
    batch = db.batch();
    exps.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    toast('Clearing Customers...','info');
    const custs = await db.collection('customers').get();
    batch = db.batch();
    custs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    toast('Reset Complete! ✅','ok');
    go('dash');
  } catch(e) {
    toast('Error: '+e.message, 'err');
    console.error(e);
  }
}

async function verifyOnline(id, approve) {
  if (!confirm(approve ? 'Approve this booking?' : 'Reject this booking?')) return;
  try {
    if (approve) {
      await db.collection('bookings').doc(id).update({ status: 'pre' });
      toast('Booking Approved! ✅', 'ok');
    } else {
      await db.collection('bookings').doc(id).update({ status: 'rejected' });
      toast('Booking Rejected ❌', 'err');
    }
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

function renderOnline() {
  const list = document.getElementById('online-tbl');
  const badge = document.getElementById('onlineBadge');
  const pend = allBookings.filter(b => b.status === 'waiting_approval' || b.status === 'pending');
  if (badge) {
    badge.textContent = pend.length;
    badge.style.display = pend.length > 0 ? 'inline-block' : 'none';
  }
  if (!list) return;
  if (!pend.length) {
    list.innerHTML = '<tr><td colspan="7" class="empty">No pending online bookings</td></tr>';
    return;
  }
  list.innerHTML = pend.map(b => `
    <tr>
      <td style="font-size:10px;color:var(--muted);">${b.date}</td>
      <td><b>${b.nm}</b></td>
      <td style="font-size:11px;">${b.st} (${b.hrs}hr)</td>
      <td style="color:var(--gold);">${Rs(b.fin)}</td>
      <td style="color:var(--orange);">${Rs(b.advAmt)}</td>
      <td style="color:var(--blue);font-weight:800;">${b.trid || '—'}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn-green" onclick="verifyOnline('${b.id}', true)" style="font-size:9px;padding:4px 8px;background:var(--green);border:none;color:#000;font-weight:bold;border-radius:6px;cursor:pointer;">APPROVE</button>
        ${b.screenshot ? `<button class="btn-orange" onclick="viewSS('${b.screenshot}')" style="font-size:9px;padding:4px 8px;border-radius:6px;cursor:pointer;">🖼️ SS</button>` : ''}
        <button class="btn-del" onclick="verifyOnline('${b.id}', false)" style="font-size:9px;padding:4px 8px;border-radius:6px;cursor:pointer;">REJECT</button>
      </td>
    </tr>
  `).join('');
}

// ─── EXPOSE FOR INLINE HTML HANDLERS ───
Object.assign(window, {
  downloadInvPDF, shareInvWA, closeInv,
  calcModal, saveComplete, closeModal, closeAddPay,
  saveEdit, closeEdit, openEdit,
  go, saveTarget, printDaily, printReport,
  openInv, openComplete, openAddPay, delBk,
  buildTime, checkConflict, calcAmt, custSearch, calcAdvance, savePreMatch,
  renderPostTab, calNav, showCalDay,
  bulkWAReminder, saveCust, renderCustTable, delCust,
  checkExpCat, saveExp, renderET, clrEF, delEx, renderRep, fillCust,
  calcAddPay, saveAddPay, checkPin, logout,
  archiveAndReset, renderHistory, delHistory, timerNav, formatCountdownExact,
  viewSS, verifyOnline, renderOnline, stopAlarm
});


// ─── BOOT ───
try {
  if (typeof firebase === 'undefined') {
    throw new Error("Firebase SDK not loaded! Check internet connection.");
  }
  init();
  startListeners();
  startAlarmListener();
} catch (e) {
  console.error("App boot error:", e);
  const errBox = document.getElementById('globalErr');
  if (errBox) {
    errBox.style.display = 'block';
    errBox.textContent = '⚠️ System Boot Failed: ' + e.message;
  }
}
