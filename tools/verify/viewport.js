const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  for (const [w,h,y,name] of JSON.parse(process.argv[3])) {
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2});
    const p=await ctx.newPage();
    await p.goto(process.argv[2],{waitUntil:'networkidle'});
    await p.waitForTimeout(800);
    if(y) await p.evaluate(v=>window.scrollTo(0,v), y);
    await p.waitForTimeout(600);
    await p.screenshot({path:`${process.argv[4]}/${name}.png`});
    console.log('->',name);
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,200));process.exit(1);});
