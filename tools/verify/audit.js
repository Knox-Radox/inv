const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const URL=process.argv[2];
let fails=0;
const ok=(t,c,x='')=>{ if(!c) fails++; console.log(`  ${c?'PASS':'FAIL'}  ${t}${x?'  '+x:''}`); };

(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});

  console.log('\nViewports 320 -> 1920');
  for (const w of [320,360,390,414,430,768,1024,1280,1440,1920]) {
    const ctx=await b.newContext({viewport:{width:w,height:900},deviceScaleFactor:2});
    const p=await ctx.newPage();
    await p.goto(URL+'#invitation',{waitUntil:'networkidle'});
    await p.waitForTimeout(400);
    const r=await p.evaluate(()=>({
      scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth,
      overflowers:[...document.querySelectorAll('body *')].filter(e=>{
        const b=e.getBoundingClientRect();
        return b.width>0 && (b.right>document.documentElement.clientWidth+1 || b.left<-1);
      }).slice(0,3).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,26)),
    }));
    ok(`${String(w).padStart(4)}px no horizontal scroll`, r.scrollW<=r.clientW,
       r.scrollW>r.clientW?`${r.scrollW}>${r.clientW} ${r.overflowers.join(' ')}`:'');
    await ctx.close();
  }

  console.log('\n200% zoom and large Dynamic Type');
  for (const [label, w, root] of [
    ['reflow 1280px @400% (=320px)', 320, 16],
    ['reflow 1440px @200% (=720px)', 720, 16],
    ['root 32px (2x type) @390', 390, 32],
    ['root 48px (3x type) @390', 390, 48],
  ]) {
    const ctx=await b.newContext({viewport:{width:w,height:844},deviceScaleFactor:1});
    const p=await ctx.newPage();
    await p.goto(URL+'#invitation',{waitUntil:'networkidle'});
    await p.evaluate(v=>{document.documentElement.style.fontSize=v+'px';}, root);
    await p.waitForTimeout(500);
    const r=await p.evaluate(()=>({
      hs:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
      clipped:[...document.querySelectorAll('h1,h2,p,time,address')].filter(e=>e.scrollWidth>e.clientWidth+2).length,
      text:(document.getElementById('invitation')?.textContent||'').length,
    }));
    ok(`${label}: no horizontal scroll`, !r.hs);
    ok(`${label}: no clipped text blocks`, r.clipped===0, r.clipped?`${r.clipped} clipped`:'');
    await ctx.close();
  }

  console.log('\nKeyboard and semantics');
  {
    const ctx=await b.newContext({viewport:{width:390,height:844}});
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'networkidle'});
    const stops=[];
    for (let i=0;i<10;i++){
      await p.keyboard.press('Tab');
      const s=await p.evaluate(()=>{
        const a=document.activeElement; if(!a||a===document.body) return null;
        const cs=getComputedStyle(a);
        return {tag:a.tagName, text:(a.textContent||'').trim().slice(0,30),
          outline:cs.outlineWidth+' '+cs.outlineStyle,
          box:(()=>{const r=a.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];})()};
      });
      if(!s) break;
      if(stops.some(x=>x.tag===s.tag&&x.text===s.text)) break;
      stops.push(s);
    }
    stops.forEach(s=>{
      const visible = s.outline!=='0px none' && !s.outline.startsWith('0px');
      ok(`focus ring on ${s.tag} "${s.text}"`, visible, s.outline);
      ok(`  target >=44px  ${s.tag} "${s.text}"`, s.box[1]>=44, `${s.box[0]}x${s.box[1]}`);
    });
    /*
     * Scroll the page before the semantics pass. Revision 7 moved the map
     * plate — the page's one meaningful illustration — behind the same
     * approach gate the ornament uses, so it is not in the initial DOM at all
     * and the label check had nothing to look at. This walks it down first, so
     * the audit sees every SVG the page ever renders rather than only the ones
     * that arrive with the document.
     */
    await p.goto(URL+'#invitation',{waitUntil:'networkidle'});
    for (let i=0;i<70;i++){ await p.mouse.wheel(0,400); await p.waitForTimeout(40); }
    await p.waitForTimeout(1500);
    const sem = await p.evaluate(()=>({
      h1:document.querySelectorAll('h1').length,
      h2:[...document.querySelectorAll('h2')].map(h=>h.textContent.trim()),
      landmarks:[...document.querySelectorAll('main,article,section,address,nav')].map(e=>e.tagName).join(','),
      lang:document.documentElement.lang,
      imgAlt:[...document.querySelectorAll('svg[role="img"]')].map(s=>s.getAttribute('aria-label')?.slice(0,40)),
      decorativeHidden:[...document.querySelectorAll('svg:not([role="img"])')].every(s=>s.getAttribute('aria-hidden')==='true'),
    }));
    ok('exactly one h1', sem.h1===1, String(sem.h1));
    ok('section headings present', sem.h2.length===2, sem.h2.join(' / '));
    ok('lang set', sem.lang==='en');
    // Every meaningful SVG, not merely the first: the page now has more than
    // one state in which one exists, and only checking [0] would pass a page
    // whose second illustration was unlabelled.
    ok('at least one meaningful svg', sem.imgAlt.length>0, `${sem.imgAlt.length} found`);
    ok('every meaningful svg has a label',
       sem.imgAlt.length>0 && sem.imgAlt.every(a=>(a||'').length>10), sem.imgAlt.join(' | '));
    ok('every decorative svg is aria-hidden', sem.decorativeHidden);
    await ctx.close();
  }

  await b.close();
  console.log(`\n${fails===0?'AUDIT CLEAN':fails+' FAILURE(S)'}`);
})().catch(e=>{console.error('HARNESS FAIL',e.message.slice(0,300));process.exit(2);});
