import { useState, useEffect, useMemo } from "react";

const PAIRS = ["XAUUSD","NAS100","EURUSD","GBPUSD","USDJPY","BTCUSD","Other"];
const SESSIONS = ["London","New York","Asia","London/NY Overlap"];
const EMOTIONS = ["Calm","Confident","Neutral","Rushed","Fearful","Greedy","Anxious"];
const RESULTS = ["Win","Loss","Break Even"];
const HABIT_LABELS = ["⏰ Bangun Tepat Waktu","🚫 Tidak Overtrade","📋 Ikuti Trading Plan","🧠 Tidak FOMO","📊 Review Market","📝 Jurnal Lengkap"];
const RULES_LIST = [
  { id:1, icon:"🎯", text:"Maksimal 1 trade per hari" },
  { id:2, icon:"🛑", text:"Setelah loss wajib stop trading hari itu" },
  { id:3, icon:"⚖️", text:"RR minimal 1:2 setiap entry" },
  { id:4, icon:"🧠", text:"Zero revenge trading" },
  { id:5, icon:"✅", text:"Entry hanya saat setup 100% valid" },
  { id:6, icon:"📈", text:"Fokus consistency, bukan jackpot" },
  { id:7, icon:"🔒", text:"Risk maksimal 0.5%-1% per trade" },
  { id:8, icon:"📰", text:"Tidak trading saat high-impact news" },
];
const RC = { Win:"#00E5A0", Loss:"#FF4D6D", "Break Even":"#FFD166" };
const RB = { Win:"rgba(0,229,160,0.1)", Loss:"rgba(255,77,109,0.1)", "Break Even":"rgba(255,209,102,0.1)" };
const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"◈" },
  { id:"journal",   label:"Journal",   icon:"◻" },
  { id:"addtrade",  label:"+ Add Trade", icon:"＋" },
  { id:"rules",     label:"Rules",     icon:"◆" },
  { id:"weekly",    label:"Weekly",    icon:"◇" },
  { id:"habits",    label:"Habits",    icon:"◉" },
];
const EMPTY_FORM = {
  date:"", pair:"XAUUSD", direction:"BUY", entry:"", sl:"", tp:"",
  risk:"0.5", lot:"", rr:"", result:"Win", pnl:"", session:"London",
  emotion:"Calm", reason:"", mistake:"", lesson:"",
};
const today = () => new Date().toISOString().split("T")[0];
const todayKey = () => today();

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [username, setUsername] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [trades, setTrades] = useState([]);
  const [habits, setHabits] = useState({});
  const [checkedRules, setCheckedRules] = useState({});
  const [form, setForm] = useState({ ...EMPTY_FORM, date: today() });
  const [formMsg, setFormMsg] = useState("");
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!username) return;
    setTrades(loadLS(`trades-${username}`, []));
    setHabits(loadLS(`habits-${username}`, {}));
    setCheckedRules(loadLS(`rules-${username}`, {}));
  }, [username]);

  const handleLogin = () => {
    const u = loginInput.trim().toLowerCase();
    if (!u || u.length < 2) { setLoginError("Nama minimal 2 karakter"); return; }
    if (!/^[a-z0-9_]+$/.test(u)) { setLoginError("Hanya huruf kecil, angka, underscore"); return; }
    setUsername(u); setScreen("app"); setLoginError("");
  };

  useEffect(() => {
    const e = parseFloat(form.entry), s = parseFloat(form.sl), t = parseFloat(form.tp);
    if (e && s && t && e !== s) {
      const rr = (Math.abs(t - e) / Math.abs(e - s)).toFixed(2);
      setForm(f => ({ ...f, rr }));
    }
  }, [form.entry, form.sl, form.tp]);

  const handleAddTrade = () => {
    if (!form.date || !form.entry || !form.sl || !form.tp || !form.pnl) {
      setFormMsg("❌ Lengkapi field wajib: Tanggal, Entry, SL, TP, P&L"); return;
    }
    const newTrade = { ...form, id: Date.now(), entry:+form.entry, sl:+form.sl, tp:+form.tp, pnl:+form.pnl, rr:+form.rr, risk:+form.risk, lot:+form.lot };
    const updated = [newTrade, ...trades];
    setTrades(updated); saveLS(`trades-${username}`, updated);
    setForm({ ...EMPTY_FORM, date: today() });
    setFormMsg("✅ Trade berhasil ditambahkan!");
    setTimeout(() => { setFormMsg(""); setTab("journal"); }, 1200);
  };

  const handleDeleteTrade = (id) => {
    const updated = trades.filter(t => t.id !== id);
    setTrades(updated); saveLS(`trades-${username}`, updated);
    setDeleteConfirm(null); setSelectedTrade(null);
  };

  const toggleHabit = (dayKey, idx) => {
    const key = `${dayKey}-${idx}`;
    const updated = { ...habits, [key]: !habits[key] };
    setHabits(updated); saveLS(`habits-${username}`, updated);
  };

  const toggleRule = (id) => {
    const key = `${todayKey()}-${id}`;
    const updated = { ...checkedRules, [key]: !checkedRules[key] };
    setCheckedRules(updated); saveLS(`rules-${username}`, updated);
  };

  const stats = useMemo(() => {
    if (!trades.length) return { wins:0, losses:0, be:0, total:0, winrate:"0.0", totalPnl:0, avgRR:"0.0", consistency:0 };
    const wins = trades.filter(t => t.result === "Win").length;
    const losses = trades.filter(t => t.result === "Loss").length;
    const be = trades.filter(t => t.result === "Break Even").length;
    const total = trades.length;
    const winrate = ((wins/total)*100).toFixed(1);
    const totalPnl = trades.reduce((a,b) => a+(b.pnl||0), 0);
    const avgRR = (trades.reduce((a,b) => a+(b.rr||0), 0)/total).toFixed(1);
    const consistency = Math.min(100, Math.round((wins/total)*70 + Math.min(parseFloat(avgRR)/3,1)*30));
    return { wins, losses, be, total, winrate, totalPnl, avgRR, consistency };
  }, [trades]);

  const weekTrades = useMemo(() => {
    const now = new Date(); const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate()-(day===0?6:day-1)); mon.setHours(0,0,0,0);
    return trades.filter(t => new Date(t.date) >= mon);
  }, [trades]);

  const monthlyPnl = useMemo(() => {
    const map = {};
    trades.forEach(t => { const m = t.date?.slice(0,7); if(m) map[m]=(map[m]||0)+(t.pnl||0); });
    return Object.entries(map).sort().slice(-6).map(([m,pnl]) => ({ month:m.slice(5), pnl:Math.round(pnl) }));
  }, [trades]);

  const todayHabitScore = HABIT_LABELS.reduce((acc,_,i) => acc+(habits[`${todayKey()}-${i}`]?1:0), 0);
  const todayRulesScore = RULES_LIST.reduce((acc,r) => acc+(checkedRules[`${todayKey()}-${r.id}`]?1:0), 0);

  if (screen === "login") return (
    <div style={{minHeight:"100vh",background:"#080809",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{width:360,padding:"40px 36px",background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:16}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:52,height:52,background:"#00E5A0",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24}}>📊</div>
          <div style={{fontFamily:"Syne",fontSize:22,fontWeight:800,color:"#E8E8EE"}}>TRADE VAULT</div>
          <div style={{fontSize:11,color:"#444455",letterSpacing:2,marginTop:4}}>PRO TRADING JOURNAL</div>
        </div>
        <div style={{fontSize:11,color:"#444455",letterSpacing:1,marginBottom:8}}>USERNAME</div>
        <input value={loginInput} onChange={e=>setLoginInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="contoh: trader_john"
          style={{width:"100%",background:"#111116",border:"1px solid #1A1A22",borderRadius:8,padding:"12px 14px",color:"#E8E8EE",fontSize:13,outline:"none",marginBottom:8,fontFamily:"DM Mono"}}/>
        {loginError && <div style={{fontSize:11,color:"#FF4D6D",marginBottom:8}}>{loginError}</div>}
        <div style={{fontSize:10,color:"#333344",marginBottom:20}}>Data tersimpan di browser kamu. Gunakan username yang sama setiap login.</div>
        <button onClick={handleLogin} style={{width:"100%",background:"#00E5A0",color:"#0A0A0C",border:"none",borderRadius:8,padding:"13px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"DM Mono",letterSpacing:1}}>MASUK →</button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#080809",color:"#E8E8EE",fontFamily:"'DM Mono','Courier New',monospace",display:"flex"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1A1A22}
        input,textarea,select{font-family:'DM Mono',monospace}
        .nav-item{transition:all 0.18s;cursor:pointer;border-left:2px solid transparent}
        .nav-item:hover{background:rgba(255,255,255,0.03)!important}
        .nav-item.active{background:rgba(0,229,160,0.07)!important;color:#00E5A0!important;border-left:2px solid #00E5A0!important}
        .trade-row{transition:background 0.12s;cursor:pointer}
        .trade-row:hover{background:rgba(255,255,255,0.025)!important}
        .btn-primary{background:#00E5A0;color:#0A0A0C;border:none;border-radius:8px;padding:11px 20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Mono',monospace;letter-spacing:1px;transition:opacity 0.15s}
        .btn-primary:hover{opacity:0.88}
        .btn-danger{background:rgba(255,77,109,0.12);color:#FF4D6D;border:1px solid #FF4D6D33;border-radius:6px;padding:7px 14px;font-size:11px;cursor:pointer;font-family:'DM Mono',monospace}
        .inp{background:#111116;border:1px solid #1A1A22;border-radius:8px;padding:10px 12px;color:#E8E8EE;font-size:12px;outline:none;width:100%;transition:border 0.15s}
        .inp:focus{border-color:#00E5A044}
        .inp::placeholder{color:#333344}
        select.inp option{background:#0D0D10}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.25s ease forwards}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .pulse{animation:pulse 2s infinite}
      `}</style>

      {/* SIDEBAR */}
      <div style={{width:210,background:"#0A0A0C",borderRight:"1px solid #141418",display:"flex",flexDirection:"column",padding:"20px 0",flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        <div style={{padding:"0 18px 28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:30,height:30,background:"#00E5A0",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>📊</div>
            <div>
              <div style={{fontSize:11,fontFamily:"Syne",fontWeight:800,color:"#E8E8EE"}}>TRADE VAULT</div>
              <div style={{fontSize:8,color:"#333344",letterSpacing:1}}>PRO JOURNAL</div>
            </div>
          </div>
        </div>
        <div style={{flex:1}}>
          {NAV.map(n=>(
            <div key={n.id} className={`nav-item ${tab===n.id?"active":""}`} onClick={()=>setTab(n.id)}
              style={{display:"flex",alignItems:"center",gap:9,padding:"10px 18px",fontSize:11,color:tab===n.id?"#00E5A0":"#555566",marginBottom:1}}>
              <span style={{fontSize:13,opacity:0.8}}>{n.icon}</span>{n.label}
            </div>
          ))}
        </div>
        <div style={{padding:"0 14px 10px"}}>
          <div style={{background:"#0D0D10",borderRadius:9,padding:"11px 13px",border:"1px solid #1A1A22",marginBottom:8}}>
            <div style={{fontSize:8,color:"#333344",letterSpacing:1,marginBottom:5}}>LOGGED IN AS</div>
            <div style={{fontSize:12,color:"#00E5A0",fontWeight:600}}>@{username}</div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:4}}>
              <div className="pulse" style={{width:5,height:5,borderRadius:"50%",background:"#00E5A0"}}/>
              <span style={{fontSize:9,color:"#444455"}}>{stats.total} trades logged</span>
            </div>
          </div>
          <button onClick={()=>{setScreen("login");setUsername("");setTrades([]);setHabits({});setCheckedRules({});setLoginInput("");}}
            style={{width:"100%",background:"transparent",border:"1px solid #1A1A22",borderRadius:7,padding:"8px",fontSize:10,color:"#444455",cursor:"pointer",fontFamily:"DM Mono"}}>
            Logout
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>

        {/* DASHBOARD */}
        {tab==="dashboard" && (
          <div className="fade-in">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
              <div>
                <div style={{fontSize:10,color:"#444455",letterSpacing:2,marginBottom:5}}>TRADING DASHBOARD</div>
                <div style={{fontSize:26,fontFamily:"Syne",fontWeight:800}}>Overview</div>
              </div>
              <div style={{fontSize:10,color:"#444455",textAlign:"right"}}>
                <div>{new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
                <div style={{color:"#00E5A0",marginTop:2}}>Habit hari ini: {todayHabitScore}/{HABIT_LABELS.length}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"Total P&L",value:stats.totalPnl>=0?`+$${stats.totalPnl.toFixed(0)}`:`-$${Math.abs(stats.totalPnl).toFixed(0)}`,color:stats.totalPnl>=0?"#00E5A0":"#FF4D6D"},
                {label:"Winrate",value:`${stats.winrate}%`,color:"#00E5A0"},
                {label:"Avg RR",value:`1:${stats.avgRR}`,color:"#FFD166"},
                {label:"Total Trades",value:stats.total,color:"#A78BFA"},
                {label:"Consistency",value:`${stats.consistency}%`,color:"#00B4FF"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"16px 14px"}}>
                  <div style={{fontSize:8,color:"#444455",letterSpacing:1,marginBottom:10}}>{s.label}</div>
                  <div style={{fontSize:22,fontFamily:"Syne",fontWeight:700,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14,marginBottom:14}}>
              <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px 22px"}}>
                <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:16}}>EQUITY CURVE (6 BULAN TERAKHIR)</div>
                {monthlyPnl.length===0?(
                  <div style={{color:"#333344",fontSize:11,textAlign:"center",padding:"30px 0"}}>Belum ada data trade</div>
                ):(
                  <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100}}>
                    {monthlyPnl.map((m,i)=>{
                      const maxAbs=Math.max(...monthlyPnl.map(x=>Math.abs(x.pnl)),1);
                      const h=Math.max((Math.abs(m.pnl)/maxAbs)*90,4);
                      const pos=m.pnl>=0;
                      return(
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div style={{fontSize:8,color:pos?"#00E5A0":"#FF4D6D"}}>{pos?"+":""}{m.pnl}</div>
                          <div style={{width:"100%",display:"flex",alignItems:"flex-end",height:80}}>
                            <div style={{width:"100%",height:`${h}%`,background:pos?"linear-gradient(180deg,#00E5A0,rgba(0,229,160,0.15))":"linear-gradient(180deg,#FF4D6D,rgba(255,77,109,0.15))",borderRadius:"3px 3px 0 0",minHeight:4}}/>
                          </div>
                          <div style={{fontSize:8,color:"#444455"}}>{m.month}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px 20px"}}>
                <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:14}}>MINGGU INI</div>
                {[
                  {l:"Win",v:weekTrades.filter(t=>t.result==="Win").length,c:"#00E5A0"},
                  {l:"Loss",v:weekTrades.filter(t=>t.result==="Loss").length,c:"#FF4D6D"},
                  {l:"Break Even",v:weekTrades.filter(t=>t.result==="Break Even").length,c:"#FFD166"},
                  {l:"Net P&L",v:`${weekTrades.reduce((a,b)=>a+(b.pnl||0),0)>=0?"+":"-"}$${Math.abs(weekTrades.reduce((a,b)=>a+(b.pnl||0),0)).toFixed(0)}`,c:weekTrades.reduce((a,b)=>a+(b.pnl||0),0)>=0?"#00E5A0":"#FF4D6D"},
                ].map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<3?"1px solid #111116":"none"}}>
                    <span style={{fontSize:11,color:"#555566"}}>{s.l}</span>
                    <span style={{fontSize:14,fontFamily:"Syne",fontWeight:700,color:s.c}}>{s.v}</span>
                  </div>
                ))}
                <button className="btn-primary" onClick={()=>setTab("addtrade")} style={{width:"100%",marginTop:14,padding:"10px"}}>+ ADD TRADE</button>
              </div>
            </div>
            <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px 22px"}}>
              <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:12}}>📌 DAILY MINDSET</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {["Protect capital first. Profit second.","One setup. One entry. No noise.","The best traders are the most patient.","Process over profit. Always."].map((q,i)=>(
                  <div key={i} style={{background:"#111116",borderRadius:8,padding:"11px 13px",borderLeft:"2px solid #00E5A0"}}>
                    <span style={{fontSize:11,color:"#7777AA",lineHeight:1.6}}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* JOURNAL */}
        {tab==="journal" && (
          <div className="fade-in">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
              <div>
                <div style={{fontSize:10,color:"#444455",letterSpacing:2,marginBottom:5}}>TRADE DATABASE</div>
                <div style={{fontSize:26,fontFamily:"Syne",fontWeight:800}}>Trading Journal</div>
              </div>
              <button className="btn-primary" onClick={()=>setTab("addtrade")}>+ ADD TRADE</button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[{l:"WIN",v:stats.wins,c:"#00E5A0"},{l:"LOSS",v:stats.losses,c:"#FF4D6D"},{l:"BE",v:stats.be,c:"#FFD166"},{l:"NET P&L",v:`${stats.totalPnl>=0?"+":"-"}$${Math.abs(stats.totalPnl).toFixed(0)}`,c:stats.totalPnl>=0?"#00E5A0":"#FF4D6D"}].map((s,i)=>(
                <div key={i} style={{background:"#0D0D10",border:`1px solid ${s.c}22`,borderRadius:8,padding:"9px 14px",display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:8,color:"#444455",letterSpacing:1}}>{s.l}</span>
                  <span style={{fontSize:15,fontFamily:"Syne",fontWeight:700,color:s.c}}>{s.v}</span>
                </div>
              ))}
            </div>
            {trades.length===0?(
              <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:60,textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:12}}>📋</div>
                <div style={{color:"#444455",fontSize:12}}>Belum ada trade. Klik "+ Add Trade" untuk mulai.</div>
              </div>
            ):(
              <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,overflow:"hidden"}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead>
                      <tr style={{background:"#0F0F13"}}>
                        {["Tanggal","Market","Arah","Entry","SL","TP","RR","Session","Hasil","P&L","Emosi",""].map(h=>(
                          <th key={h} style={{padding:"11px 13px",textAlign:"left",fontSize:8,color:"#444455",letterSpacing:1,fontWeight:500,borderBottom:"1px solid #1A1A22",whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map(t=>(
                        <>
                          <tr key={t.id} className="trade-row" onClick={()=>setSelectedTrade(selectedTrade?.id===t.id?null:t)} style={{borderBottom:"1px solid #0F0F13"}}>
                            <td style={{padding:"11px 13px",color:"#555566"}}>{t.date}</td>
                            <td style={{padding:"11px 13px",fontWeight:600}}>{t.pair}</td>
                            <td style={{padding:"11px 13px"}}>
                              <span style={{background:t.direction==="BUY"?"rgba(0,229,160,0.1)":"rgba(255,77,109,0.1)",color:t.direction==="BUY"?"#00E5A0":"#FF4D6D",padding:"2px 7px",borderRadius:3,fontSize:9,fontWeight:600}}>{t.direction}</span>
                            </td>
                            <td style={{padding:"11px 13px",color:"#9999AA"}}>{t.entry}</td>
                            <td style={{padding:"11px 13px",color:"#FF4D6D"}}>{t.sl}</td>
                            <td style={{padding:"11px 13px",color:"#00E5A0"}}>{t.tp}</td>
                            <td style={{padding:"11px 13px",color:"#FFD166"}}>1:{t.rr}</td>
                            <td style={{padding:"11px 13px"}}><span style={{fontSize:8,color:"#444455",background:"#111116",padding:"2px 6px",borderRadius:3}}>{t.session}</span></td>
                            <td style={{padding:"11px 13px"}}>
                              <span style={{background:RB[t.result],color:RC[t.result],padding:"2px 8px",borderRadius:3,fontSize:9,fontWeight:600}}>{t.result}</span>
                            </td>
                            <td style={{padding:"11px 13px",fontWeight:600,color:t.pnl>0?"#00E5A0":t.pnl<0?"#FF4D6D":"#FFD166"}}>{t.pnl>0?"+":""}{t.pnl===0?"–":`$${t.pnl}`}</td>
                            <td style={{padding:"11px 13px",color:"#555566"}}>{t.emotion}</td>
                            <td style={{padding:"11px 13px"}}><button className="btn-danger" onClick={e=>{e.stopPropagation();setDeleteConfirm(t.id);}}>✕</button></td>
                          </tr>
                          {selectedTrade?.id===t.id&&(
                            <tr key={`d-${t.id}`}>
                              <td colSpan={12} style={{background:"#0A0A0C",borderBottom:"1px solid #1A1A22"}}>
                                <div style={{padding:"16px 20px"}}>
                                  <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:12}}>DETAIL TRADE</div>
                                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                                    {[{l:"Alasan Entry",v:t.reason||"-"},{l:"Kesalahan",v:t.mistake||"-"},{l:"Pelajaran",v:t.lesson||"-"}].map(({l,v})=>(
                                      <div key={l} style={{background:"#111116",borderRadius:7,padding:"11px 13px"}}>
                                        <div style={{fontSize:8,color:"#444455",letterSpacing:1,marginBottom:5}}>{l}</div>
                                        <div style={{fontSize:11,color:"#7777AA",lineHeight:1.6}}>{v}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {deleteConfirm&&(
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
                <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:12,padding:"28px 32px",textAlign:"center",width:300}}>
                  <div style={{fontSize:24,marginBottom:10}}>🗑️</div>
                  <div style={{fontSize:13,color:"#E8E8EE",marginBottom:6}}>Hapus trade ini?</div>
                  <div style={{fontSize:11,color:"#444455",marginBottom:20}}>Tindakan ini tidak bisa dibatalkan.</div>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>setDeleteConfirm(null)} style={{flex:1,background:"transparent",border:"1px solid #1A1A22",borderRadius:7,padding:"10px",color:"#666677",cursor:"pointer",fontSize:12,fontFamily:"DM Mono"}}>Batal</button>
                    <button className="btn-danger" onClick={()=>handleDeleteTrade(deleteConfirm)} style={{flex:1,padding:"10px",fontSize:12}}>Hapus</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADD TRADE */}
        {tab==="addtrade"&&(
          <div className="fade-in">
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,color:"#444455",letterSpacing:2,marginBottom:5}}>INPUT TRADE</div>
              <div style={{fontSize:26,fontFamily:"Syne",fontWeight:800}}>Add New Trade</div>
            </div>
            <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:12,padding:"24px 28px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                {[
                  {label:"Tanggal *",key:"date",type:"date"},
                  {label:"Pair/Market *",key:"pair",type:"select",opts:PAIRS},
                  {label:"Arah",key:"direction",type:"select",opts:["BUY","SELL"]},
                  {label:"Entry Price *",key:"entry",type:"number",placeholder:"3285.50"},
                  {label:"Stop Loss *",key:"sl",type:"number",placeholder:"3275.00"},
                  {label:"Take Profit *",key:"tp",type:"number",placeholder:"3306.50"},
                  {label:"Risk %",key:"risk",type:"number",placeholder:"0.5"},
                  {label:"Lot Size",key:"lot",type:"number",placeholder:"0.10"},
                  {label:"RR (auto)",key:"rr",type:"number",placeholder:"2.0"},
                  {label:"Hasil Trade",key:"result",type:"select",opts:RESULTS},
                  {label:"P&L (USD) *",key:"pnl",type:"number",placeholder:"210 atau -130"},
                  {label:"Session",key:"session",type:"select",opts:SESSIONS},
                  {label:"Emosi",key:"emotion",type:"select",opts:EMOTIONS},
                ].map(f=>(
                  <div key={f.key}>
                    <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:6}}>{f.label}</div>
                    {f.type==="select"?(
                      <select className="inp" value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>
                        {f.opts.map(o=><option key={o}>{o}</option>)}
                      </select>
                    ):(
                      <input className="inp" type={f.type} value={form[f.key]} placeholder={f.placeholder||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
                    )}
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginTop:14}}>
                {[
                  {label:"Alasan Entry",key:"reason",placeholder:"Break of structure + OB retest..."},
                  {label:"Kesalahan",key:"mistake",placeholder:"Entry terlalu cepat..."},
                  {label:"Pelajaran Hari Ini",key:"lesson",placeholder:"Selalu tunggu candle close..."},
                ].map(f=>(
                  <div key={f.key}>
                    <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:6}}>{f.label}</div>
                    <textarea className="inp" rows={3} value={form[f.key]} placeholder={f.placeholder} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{resize:"vertical"}}/>
                  </div>
                ))}
              </div>
              {formMsg&&<div style={{marginTop:14,padding:"10px 14px",borderRadius:8,background:formMsg.startsWith("✅")?"rgba(0,229,160,0.08)":"rgba(255,77,109,0.08)",border:`1px solid ${formMsg.startsWith("✅")?"#00E5A033":"#FF4D6D33"}`,fontSize:12,color:formMsg.startsWith("✅")?"#00E5A0":"#FF4D6D"}}>{formMsg}</div>}
              <div style={{display:"flex",gap:10,marginTop:18}}>
                <button className="btn-primary" onClick={handleAddTrade} style={{padding:"12px 28px"}}>SIMPAN TRADE</button>
                <button onClick={()=>{setForm({...EMPTY_FORM,date:today()});setFormMsg("");}} style={{background:"transparent",border:"1px solid #1A1A22",borderRadius:8,padding:"12px 20px",color:"#555566",cursor:"pointer",fontSize:12,fontFamily:"DM Mono"}}>Reset</button>
              </div>
            </div>
          </div>
        )}

        {/* RULES */}
        {tab==="rules"&&(
          <div className="fade-in">
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,color:"#444455",letterSpacing:2,marginBottom:5}}>DISCIPLINE PROTOCOL</div>
              <div style={{fontSize:26,fontFamily:"Syne",fontWeight:800}}>Trading Rules</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div>
                <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:12}}>CHECKLIST HARI INI</div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {RULES_LIST.map(rule=>{
                    const checked=!!checkedRules[`${todayKey()}-${rule.id}`];
                    return(
                      <div key={rule.id} onClick={()=>toggleRule(rule.id)}
                        style={{display:"flex",alignItems:"center",gap:13,background:"#0D0D10",border:`1px solid ${checked?"#00E5A022":"#1A1A22"}`,borderRadius:9,padding:"13px 15px",cursor:"pointer",opacity:checked?0.55:1,transition:"all 0.15s"}}>
                        <div style={{width:17,height:17,border:`1px solid ${checked?"#00E5A0":"#2A2A35"}`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",background:checked?"#00E5A0":"transparent",flexShrink:0}}>
                          {checked&&<span style={{color:"#0A0A0C",fontSize:10,fontWeight:800}}>✓</span>}
                        </div>
                        <span style={{fontSize:15}}>{rule.icon}</span>
                        <span style={{fontSize:11,color:checked?"#444455":"#9999AA",textDecoration:checked?"line-through":"none"}}>{rule.text}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:12,background:"#0D0D10",borderRadius:9,padding:"12px 15px",border:"1px solid #1A1A22"}}>
                  <div style={{fontSize:9,color:"#444455",marginBottom:6}}>PROGRESS HARI INI</div>
                  <div style={{background:"#111116",borderRadius:3,height:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(todayRulesScore/RULES_LIST.length)*100}%`,background:"linear-gradient(90deg,#00E5A0,#00B4FF)",transition:"width 0.4s"}}/>
                  </div>
                  <div style={{fontSize:10,color:"#00E5A0",marginTop:5}}>{todayRulesScore}/{RULES_LIST.length} rules ✓</div>
                </div>
              </div>
              <div>
                <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:12}}>🚫 ABSOLUTE NO-GO LIST</div>
                <div style={{background:"#0D0D10",border:"1px solid #FF4D6D22",borderRadius:11,padding:"18px",marginBottom:12}}>
                  {["Revenge trading setelah loss","Trading tanpa setup valid","Menambah lot saat losing streak","Trading saat emosi tidak stabil","Ignore SL karena yakin akan balik"].map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:i<4?9:0,alignItems:"flex-start"}}>
                      <span style={{color:"#FF4D6D",fontSize:10,marginTop:2}}>✕</span>
                      <span style={{fontSize:11,color:"#666677"}}>{r}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px"}}>
                  <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:14}}>THE TRADER'S OATH</div>
                  {[["🎯","Purpose","Trading untuk membangun kekayaan, bukan excitement."],["🧠","Mindset","Emosi adalah informasi, bukan instruksi."],["🔒","Risk","Melindungi kapital adalah job utama."],["📈","Growth","Setiap loss adalah uang sekolah."]].map(([ic,t,d],i)=>(
                    <div key={i} style={{display:"flex",gap:12,marginBottom:i<3?14:0}}>
                      <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
                      <div>
                        <div style={{fontSize:9,color:"#00E5A0",letterSpacing:1,marginBottom:3}}>{t.toUpperCase()}</div>
                        <div style={{fontSize:11,color:"#555566",lineHeight:1.6}}>{d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WEEKLY */}
        {tab==="weekly"&&(
          <div className="fade-in">
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,color:"#444455",letterSpacing:2,marginBottom:5}}>WEEKLY ANALYSIS</div>
              <div style={{fontSize:26,fontFamily:"Syne",fontWeight:800}}>Weekly Review</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              {[
                {title:"✅ Total Win Minggu Ini",val:`${weekTrades.filter(t=>t.result==="Win").length} trades`,sub:`$${weekTrades.filter(t=>t.result==="Win").reduce((a,b)=>a+(b.pnl||0),0).toFixed(0)} profit`,color:"#00E5A0"},
                {title:"❌ Total Loss Minggu Ini",val:`${weekTrades.filter(t=>t.result==="Loss").length} trades`,sub:`$${Math.abs(weekTrades.filter(t=>t.result==="Loss").reduce((a,b)=>a+(b.pnl||0),0)).toFixed(0)} loss`,color:"#FF4D6D"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px 22px"}}>
                  <div style={{fontSize:11,color:"#666677",marginBottom:8}}>{s.title}</div>
                  <div style={{fontSize:22,fontFamily:"Syne",fontWeight:700,color:s.color}}>{s.val}</div>
                  <div style={{fontSize:10,color:"#444455",marginTop:4}}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px 22px",marginBottom:14}}>
              <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:14}}>PAIR PERFORMANCE</div>
              {PAIRS.filter(p=>p!=="Other").map((pair)=>{
                const pt=trades.filter(t=>t.pair===pair);
                if(!pt.length) return null;
                const pw=pt.filter(t=>t.result==="Win").length;
                const pwr=((pw/pt.length)*100).toFixed(0);
                const ppnl=pt.reduce((a,b)=>a+(b.pnl||0),0);
                return(
                  <div key={pair} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{fontSize:12,fontWeight:600}}>{pair}</span>
                      <div style={{display:"flex",gap:14,fontSize:10}}>
                        <span style={{color:"#444455"}}>{pw}W · {pt.length-pw}L</span>
                        <span style={{color:"#FFD166"}}>WR {pwr}%</span>
                        <span style={{color:ppnl>=0?"#00E5A0":"#FF4D6D",fontWeight:600}}>{ppnl>=0?"+":"-"}${Math.abs(ppnl).toFixed(0)}</span>
                      </div>
                    </div>
                    <div style={{background:"#111116",borderRadius:3,height:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pwr}%`,background:ppnl>=0?"#00E5A0":"#FF4D6D",borderRadius:3}}/>
                    </div>
                  </div>
                );
              })}
              {!trades.length&&<div style={{color:"#333344",fontSize:11,textAlign:"center",padding:"20px 0"}}>Belum ada data</div>}
            </div>
            <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px 22px"}}>
              <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:14}}>📊 STATISTIK KESELURUHAN</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[
                  {l:"Total Trades",v:stats.total,c:"#E8E8EE"},
                  {l:"Winrate",v:`${stats.winrate}%`,c:"#00E5A0"},
                  {l:"Net P&L",v:`${stats.totalPnl>=0?"+":"-"}$${Math.abs(stats.totalPnl).toFixed(0)}`,c:stats.totalPnl>=0?"#00E5A0":"#FF4D6D"},
                  {l:"Avg RR",v:`1:${stats.avgRR}`,c:"#FFD166"},
                  {l:"Consistency",v:`${stats.consistency}%`,c:"#00B4FF"},
                  {l:"Best Pair",v:trades.length?Object.entries(trades.reduce((acc,t)=>{acc[t.pair]=(acc[t.pair]||0)+(t.pnl||0);return acc;},{})).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-":"-",c:"#A78BFA"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#111116",borderRadius:8,padding:"12px 14px",borderLeft:"2px solid #1A1A22"}}>
                    <div style={{fontSize:8,color:"#444455",letterSpacing:1,marginBottom:4}}>{s.l}</div>
                    <div style={{fontSize:18,fontFamily:"Syne",fontWeight:700,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HABITS */}
        {tab==="habits"&&(
          <div className="fade-in">
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,color:"#444455",letterSpacing:2,marginBottom:5}}>DISCIPLINE TRACKER</div>
              <div style={{fontSize:26,fontFamily:"Syne",fontWeight:800}}>Habit Tracker</div>
            </div>
            <div style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"22px",marginBottom:14}}>
              <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:18}}>MINGGU INI</div>
              {(()=>{
                const now=new Date(); const day=now.getDay();
                const mon=new Date(now); mon.setDate(now.getDate()-(day===0?6:day-1)); mon.setHours(0,0,0,0);
                const days=Array.from({length:5},(_,i)=>{
                  const d=new Date(mon); d.setDate(mon.getDate()+i);
                  return{label:["Sen","Sel","Rab","Kam","Jum"][i],key:d.toISOString().split("T")[0]};
                });
                return(
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"180px repeat(5,1fr) 60px",gap:8,marginBottom:10}}>
                      <div style={{fontSize:8,color:"#444455"}}>HABIT</div>
                      {days.map(d=><div key={d.key} style={{textAlign:"center",fontSize:9,color:d.key===today()?"#00E5A0":"#555566",fontWeight:600}}>{d.label}<div style={{fontSize:8,color:"#333344"}}>{d.key.slice(8)}</div></div>)}
                      <div style={{textAlign:"center",fontSize:8,color:"#444455",letterSpacing:1}}>SCORE</div>
                    </div>
                    {HABIT_LABELS.map((habit,hi)=>{
                      const score=days.filter(d=>habits[`${d.key}-${hi}`]).length;
                      return(
                        <div key={hi} style={{display:"grid",gridTemplateColumns:"180px repeat(5,1fr) 60px",gap:8,marginBottom:8,alignItems:"center"}}>
                          <div style={{fontSize:11,color:"#7777AA"}}>{habit}</div>
                          {days.map(d=>{
                            const k=`${d.key}-${hi}`;
                            const checked=!!habits[k];
                            return(
                              <div key={d.key} style={{display:"flex",justifyContent:"center"}}>
                                <div onClick={()=>toggleHabit(d.key,hi)} style={{width:22,height:22,borderRadius:5,background:checked?"#00E5A0":"#111116",border:`1px solid ${checked?"#00E5A0":"#1A1A22"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.15s"}}>
                                  {checked&&<span style={{color:"#0A0A0C",fontSize:11,fontWeight:800}}>✓</span>}
                                </div>
                              </div>
                            );
                          })}
                          <div style={{textAlign:"center"}}>
                            <span style={{fontSize:11,color:score>=4?"#00E5A0":score>=2?"#FFD166":"#FF4D6D",fontWeight:600}}>{score}/5</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                {l:"Habit Score Hari Ini",v:`${todayHabitScore}/${HABIT_LABELS.length}`,c:todayHabitScore>=5?"#00E5A0":todayHabitScore>=3?"#FFD166":"#FF4D6D"},
                {l:"Rules Hari Ini",v:`${todayRulesScore}/${RULES_LIST.length}`,c:todayRulesScore>=6?"#00E5A0":todayRulesScore>=4?"#FFD166":"#FF4D6D"},
                {l:"Total Trades Logged",v:stats.total,c:"#A78BFA"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#0D0D10",border:"1px solid #1A1A22",borderRadius:11,padding:"18px 20px"}}>
                  <div style={{fontSize:9,color:"#444455",letterSpacing:1,marginBottom:8}}>{s.l}</div>
                  <div style={{fontSize:24,fontFamily:"Syne",fontWeight:700,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
