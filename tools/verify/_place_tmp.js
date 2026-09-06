const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const url=process.argv[2], out=process.argv[3];
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE,args:['--force-color-profile=srgb']});
  for(const [w,h,name] of [[390,844,'m390'],[1440,900,'d1440']]){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:w<600,hasTouch:w<600});
    const p=await ctx.newPage();
    await p.goto(url+'#invitation',{waitUntil:'networkidle',timeout:60000});
    await p.waitForTimeout(1500);
    const y=await p.evaluate(()=>{const e=document.getElementById('the-place');if(!e)return -1;
      const r=e.getBoundingClientRect();window.scrollTo(0,window.scrollY+r.top-120);return window.scrollY;});
    await p.waitForTimeout(2500);
    await p.screenshot({path:`${out}/${name}.png`});
    console.log(name,'scrollY',y);
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,300));process.exit(1);});
