const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  for (const rate of [1,4,6]) {
    const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
    const p=await ctx.newPage();
    const cdp=await ctx.newCDPSession(p);
    await p.goto(process.argv[2],{waitUntil:'networkidle'});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate});
    await p.evaluate(()=>{window.__f=[];const t=()=>{window.__f.push(performance.now());requestAnimationFrame(t);};requestAnimationFrame(t);});
    await (await p.$('button')).click();
    await p.waitForTimeout(6200);
    const s=await p.evaluate(()=>{
      const f=window.__f, d=[];
      for(let i=1;i<f.length;i++) d.push(f[i]-f[i-1]);
      d.sort((a,b)=>a-b);
      const q=x=>d[Math.floor(d.length*x)];
      return {frames:d.length, median:+q(0.5).toFixed(1), p95:+q(0.95).toFixed(1),
              worst:+d[d.length-1].toFixed(1), over32:d.filter(x=>x>32).length};
    });
    console.log(`CPU x${rate}  frames=${s.frames} median=${s.median}ms p95=${s.p95}ms worst=${s.worst}ms  janky(>32ms)=${s.over32}`);
    await ctx.close();
  }
  await b.close();
})().catch(e=>console.error('FAIL',e.message.slice(0,200)));
