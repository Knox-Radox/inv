const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const URL=process.argv[2], LABEL=process.argv[3]||'';
/**
 * Fails on ANY console error or page error. Written after a hydration mismatch
 * shipped unnoticed: the earlier harness collected `pageerror` only, and a
 * hydration warning is a console.error. It also only ever ran against a
 * production build, where React is far less vocal.
 */
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const problems=[];
  for (const [w,h,mode] of [[390,844,'mobile'],[1440,900,'desktop']]) {
    for (const armed of [true,false]) {
      const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2});
      const p=await ctx.newPage();
      p.on('console', m=>{ if(m.type()==='error') problems.push(`[${mode}${armed?'':' returning'}] console: ${m.text().slice(0,150)}`); });
      p.on('pageerror', e=>problems.push(`[${mode}${armed?'':' returning'}] pageerror: ${e.message.slice(0,150)}`));
      if(!armed){
        await p.addInitScript(()=>{ try{localStorage.setItem('advika-sooraj-envelope-seen','1');}catch(e){} });
      }
      await p.goto(URL,{waitUntil:'networkidle'});
      await p.waitForTimeout(2500);
      await ctx.close();
    }
  }
  await b.close();
  const real = problems.filter(x=>!/favicon|404 \(Not Found\)/i.test(x));
  if(real.length===0) console.log(`  PASS  ${LABEL}: no console or page errors in any of the four states`);
  else { console.log(`  FAIL  ${LABEL}: ${real.length} problem(s)`); real.slice(0,6).forEach(x=>console.log('     '+x)); }
  const suppressed = problems.length - real.length;
  if(suppressed) console.log(`        (${suppressed} favicon 404s ignored)`);
  process.exit(real.length?1:0);
})().catch(e=>{console.error('HARNESS FAIL',e.message.slice(0,200));process.exit(2);});
