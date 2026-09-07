const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const url=process.argv[2], out=process.argv[3];
const rm=process.argv[4]==='rm';
const sizes=[[390,844,'m390'],[430,932,'m430'],[768,1024,'t768'],[1440,900,'d1440']];
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE,args:['--force-color-profile=srgb']});
  require('fs').mkdirSync(out,{recursive:true});
  for(const [w,h,name] of sizes){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,
      isMobile:w<600,hasTouch:w<600, reducedMotion: rm?'reduce':'no-preference'});
    const p=await ctx.newPage();
    const errs=[];
    p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160));});
    p.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,200)));
    await p.goto(url+'#invitation',{waitUntil:'networkidle',timeout:60000});
    await p.waitForTimeout(900);
    for(let i=0;i<60;i++){ await p.mouse.wheel(0,350); await p.waitForTimeout(45); }
    await p.waitForTimeout(1500);
    const box=await p.evaluate(()=>{
      const a=[...document.querySelectorAll('a')].find(x=>/google maps/i.test(x.textContent||''));
      if(!a) return null; a.scrollIntoView({block:'center'});
      return null;});
    await p.waitForTimeout(4000);
    const r=await p.evaluate(()=>{
      const a=[...document.querySelectorAll('a')].find(x=>/google maps/i.test(x.textContent||''));
      if(!a) return null; const q=a.getBoundingClientRect();
      return {x:q.x,y:q.y,w:q.width,h:q.height,href:a.href,name:a.textContent.trim()};});
    if(r) await p.screenshot({path:`${out}/${name}.png`, clip:{x:Math.max(0,r.x-14),y:Math.max(0,r.y-14),
      width:Math.min(w-Math.max(0,r.x-14), r.w+28), height:Math.min(h-Math.max(0,r.y-14), r.h+28)}});
    else await p.screenshot({path:`${out}/${name}.png`});
    console.log(name, JSON.stringify(r), errs.length?('ERRORS '+errs.join(' | ')):'clean');
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,300));process.exit(1);});
