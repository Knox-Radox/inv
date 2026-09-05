const { chromium } = require('playwright');
const fs=require('fs');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const URL=process.argv[2], OUT=process.argv[3];
fs.mkdirSync(OUT,{recursive:true});
const MUST = ['Advika','Sooraj','27 November 2026','Artistry Venue','Anna'];
let fails=0;
const ok=(t,c,extra='')=>{ if(!c) fails++; console.log(`  ${c?'PASS':'FAIL'}  ${t}${extra?'  '+extra:''}`); };

(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});

  // ---- T1: JavaScript disabled -------------------------------------------
  console.log('\nT1  JavaScript disabled');
  {
    const ctx=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:false,deviceScaleFactor:2});
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(600);
    const html=await p.content();
    ok('invitation content present', MUST.every(m=>html.includes(m)),
       MUST.filter(m=>!html.includes(m)).join(',')||'all 5 facts');
    // The overlay is server-rendered but display:none until the pre-paint
    // script arms it. What matters is that it is not *visible*, and that the
    // invitation beneath it is.
    const ov = await p.$('.envelope-overlay');
    ok('envelope overlay not visible', !ov || !(await ov.isVisible()));
    ok('invitation visible and laid out', await (await p.$('#invitation')).isVisible());
    const box = await (await p.$('#invitation')).boundingBox();
    ok('invitation has real height', (box?.height ?? 0) > 200, `${Math.round(box?.height ?? 0)}px`);
    await p.screenshot({path:`${OUT}/t1-nojs.png`});
    await ctx.close();
  }

  // ---- T2: animations cancelled mid-sequence -----------------------------
  console.log('\nT2  every animation cancelled at t=1.2s');
  {
    const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'networkidle'});
    await (await p.$('button')).click();
    await p.waitForTimeout(1200);
    const killed=await p.evaluate(()=>{let n=0;document.querySelectorAll('*').forEach(e=>e.getAnimations().forEach(a=>{a.cancel();n++;}));return n;});
    await p.waitForTimeout(400);
    const state=await p.evaluate(()=>{
      const bad=[];
      document.querySelectorAll('#invitation, #invitation *').forEach(e=>{
        const cs=getComputedStyle(e);
        if(parseFloat(cs.opacity)===0) bad.push('opacity0:'+e.tagName+'.'+(e.className||'').toString().slice(0,24));
        if(cs.visibility==='hidden') bad.push('hidden:'+e.tagName);
      });
      const inv=document.getElementById('invitation');
      return {bad:bad.slice(0,4), text:(inv?.textContent||''), overflow:getComputedStyle(document.body).overflow,
              rect:inv?.getBoundingClientRect().height||0};
    });
    ok(`${killed} animations cancelled; nothing left hidden`, state.bad.length===0, state.bad.join(' '));
    ok('invitation still carries every fact', MUST.every(m=>state.text.includes(m)));
    ok('invitation has real height', state.rect>200, `${Math.round(state.rect)}px`);
    ok('body overflow not hidden after cancel', state.overflow!=='hidden', state.overflow);
    await p.screenshot({path:`${OUT}/t2-cancelled.png`});
    await ctx.close();
  }

  // ---- T3: prefers-reduced-motion ----------------------------------------
  console.log('\nT3  prefers-reduced-motion: reduce');
  {
    const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce',hasTouch:true,isMobile:true});
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'networkidle'});
    ok('envelope still present (object kept)', !!(await p.$('.envelope-overlay')));
    await p.screenshot({path:`${OUT}/t3-rm-before.png`});
    await (await p.$('button')).click();
    await p.waitForTimeout(900);
    const after=await p.evaluate(()=>({
      overlay: !!document.querySelector('.envelope-overlay'),
      text: document.getElementById('invitation')?.textContent||'',
      overflow: getComputedStyle(document.body).overflow,
      drawn: [...document.querySelectorAll('#invitation path')].every(p=>{
        const o=getComputedStyle(p).strokeDashoffset; return o==='0px'||o==='none'||o==='';}),
    }));
    ok('resolves to the invitation quickly', !after.overlay);
    ok('thread already stitched (no dashoffset left)', after.drawn);
    ok('invitation readable', MUST.every(m=>after.text.includes(m)));
    ok('body overflow not hidden', after.overflow!=='hidden', after.overflow);
    await p.screenshot({path:`${OUT}/t3-rm-after.png`});
    await ctx.close();
  }

  // ---- T4: the lockout itself --------------------------------------------
  console.log('\nT4  body overflow sampled across the whole sequence');
  {
    const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'networkidle'});
    const samples=[];
    const grab=async(label)=>samples.push([label, await p.evaluate(()=>getComputedStyle(document.body).overflow)]);
    await grab('t=0');
    await (await p.$('button')).click();
    for (const ms of [1000,3000,6000,10000]) { await p.waitForTimeout(ms===1000?1000:2000+(ms===10000?2000:0)); await grab(`t=${ms}`); }
    ok('never `hidden` at any sample', samples.every(([,v])=>v!=='hidden'), samples.map(([k,v])=>`${k}:${v}`).join(' '));
    // and the skip anchor with no JS listener at all
    const ctx2=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
    const p2=await ctx2.newPage();
    await p2.goto(URL+'#invitation',{waitUntil:'domcontentloaded'});
    const ov2 = await p2.$('.envelope-overlay');
    ok('deep link to #invitation works with JS off', !ov2 || !(await ov2.isVisible()));
    await ctx.close(); await ctx2.close();
  }

  await b.close();
  console.log(`\n${fails===0?'ALL LOCKOUT TESTS PASS':fails+' FAILURE(S)'}`);
  process.exit(fails?1:0);
})().catch(e=>{console.error('HARNESS FAIL',e.message.slice(0,300));process.exit(2);});
