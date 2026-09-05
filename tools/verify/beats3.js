const { chromium } = require('playwright');
const fs=require('fs');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const URL=process.argv[2], OUT=process.argv[3];
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
  const p=await ctx.newPage();
  await p.goto(URL,{waitUntil:'networkidle'});
  await p.waitForTimeout(600);
  await p.screenshot({path:`${OUT}/beat-0000.png`});
  const seal=await p.$('button');
  const now=()=>performance.now();
  const c0=now();
  // Dispatch the click directly so the harness clock is not at the mercy of
  // Playwright's actionability wait; the earlier "removed at 1700ms" was that.
  await seal.dispatchEvent('click');
  const t0=now();
  console.log(`click dispatched in ${Math.round(t0-c0)}ms`);
  for (const ms of [250,900,1600,2300,3000,3800,4600,5200,5900,6800]) {
    const w=ms-(now()-t0); if(w>0) await p.waitForTimeout(w);
    const actual=Math.round(now()-t0);
    const st=await p.evaluate(()=>{const o=document.querySelector('.envelope-overlay'); return o?'overlay':'page';});
    const s0=now();
    await p.screenshot({path:`${OUT}/beat-${String(actual).padStart(4,'0')}.png`});
    console.log(`  target ${String(ms).padStart(4)}  actual ${String(actual).padStart(4)}ms  ${st}  (screenshot took ${Math.round(now()-s0)}ms)`);
  }
  console.log('body overflow:', await p.evaluate(()=>getComputedStyle(document.body).overflow),
              '| stored:', await p.evaluate(()=>localStorage.getItem('advika-sooraj-envelope-seen')));
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,300));process.exit(1);});
