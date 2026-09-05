const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{ window.__s=[];
    new PerformanceObserver(l=>{for(const e of l.getEntries()){ if(e.hadRecentInput) continue;
      for(const s of e.sources||[]) window.__s.push({v:+e.value.toFixed(4),
        el:(s.node?.tagName||'?')+'.'+((s.node?.className||'')+'').slice(0,34)}); }})
      .observe({type:'layout-shift',buffered:true}); });
  await p.goto(process.argv[2],{waitUntil:'networkidle'});
  await p.waitForTimeout(3500);
  const s=await p.evaluate(()=>window.__s);
  const by={}; s.forEach(x=>by[x.el]=(by[x.el]||0)+x.v);
  Object.entries(by).sort((a,c)=>c[1]-a[1]).slice(0,8).forEach(([k,v])=>console.log(`  ${v.toFixed(4)}  ${k}`));
  await b.close();
})().catch(e=>console.error('FAIL',e.message.slice(0,150)));
