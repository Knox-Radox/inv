const { chromium } = require('playwright');
const fs=require('fs');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const url=process.argv[2], out=process.argv[3];
const sizes=process.argv[4] ? process.argv[4].split(',').map(s=>s.split('x').map(Number)) : [[390,844],[1440,900]];
const full=process.argv[5]==='full';
const rm=process.argv[6]==='rm';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE,args:['--force-color-profile=srgb']});
  fs.mkdirSync(out,{recursive:true});
  for(const [w,h] of sizes){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,
      reducedMotion: rm?'reduce':'no-preference',
      isMobile:w<600,hasTouch:w<600});
    const p=await ctx.newPage();
    const errs=[];
    p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160));});
    p.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,160)));
    await p.goto(url,{waitUntil:'networkidle',timeout:30000});
    await p.waitForTimeout(900);
    await p.screenshot({path:`${out}/${w}x${h}${full?'-full':''}.png`, fullPage:full});
    const diag=await p.evaluate(()=>({
      bodyOverflow:getComputedStyle(document.body).overflow,
      hScroll:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth,
      fonts:[...document.fonts].map(f=>`${f.family}/${f.weight}/${f.status}`),
      bg:getComputedStyle(document.body).backgroundColor,
    }));
    console.log(`${w}x${h}`, JSON.stringify(diag), errs.length?('ERRORS: '+errs.join(' | ')):'');
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,300));process.exit(1);});
