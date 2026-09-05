const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.goto(process.argv[2],{waitUntil:'networkidle'});
  await p.evaluate(()=>{
    window.__ev=[]; const t0=performance.now();
    document.addEventListener('animationend', e=>window.__ev.push([Math.round(performance.now()-t0), 'end', e.animationName, e.target.className?.toString().slice(0,30)]), true);
    document.addEventListener('animationstart', e=>window.__ev.push([Math.round(performance.now()-t0), 'start', e.animationName, e.target.className?.toString().slice(0,30)]), true);
    const ov=document.querySelector('.envelope-overlay');
    window.__obs=new MutationObserver(()=>{ if(!document.querySelector('.envelope-overlay')) window.__ev.push([Math.round(performance.now()-t0),'OVERLAY REMOVED']); });
    window.__obs.observe(document.body,{childList:true,subtree:true});
  });
  const btn=await p.$('button');
  console.log('button text:', await btn.textContent());
  await btn.click();
  await p.waitForTimeout(3200);
  const ev=await p.evaluate(()=>window.__ev);
  ev.filter(e=>!String(e[2]).includes('draw-on')).forEach(e=>console.log('  ', e.join('  ')));
  await b.close();
})().catch(e=>console.error('FAIL',e.message.slice(0,200)));
