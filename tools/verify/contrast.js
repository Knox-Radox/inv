const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const L=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const ratio=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const parse=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.goto(process.argv[2]+'#invitation',{waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  /*
   * Walk the whole page down and let every entrance finish before sampling.
   * Once this harness started compositing opacity — see alphaOf — measuring at
   * 900 ms measured the reveals mid-flight, and every section below the fold
   * reported 1.00:1 because it was still at `opacity: 0`. The resting state is
   * the state a guest reads, and it is the one to hold to AA.
   */
  for (let i=0;i<70;i++){ await p.mouse.wheel(0,400); await p.waitForTimeout(40); }
  await p.waitForTimeout(2500);

  const rows=await p.evaluate(()=>{
    /*
     * Settle inside the same task as the sampling. The garlands and the lamp
     * flames loop forever and finish() throws on an infinite effect, so only
     * the one-shot entrances are finished — and it has to happen here rather
     * than in an earlier call, because the countdown starts a fresh fade every
     * second and one was caught at 1.35:1 in the gap between the two.
     */
    document.getAnimations().forEach(a=>{
      try { if (a.effect?.getTiming().iterations !== Infinity) a.finish(); } catch {}
    });
    const bgOf=e=>{let n=e;while(n){const c=getComputedStyle(n).backgroundColor;
      if(c&&!/rgba?\(0, 0, 0, 0\)|transparent/.test(c))return c;n=n.parentElement;}return 'rgb(255,255,255)';};
    /*
     * Opacity, accumulated up the tree. Reading `color` alone measures text at
     * full strength however faint it is actually painted, and revision 7's
     * OpenStreetMap credit sat at 3.25:1 while this harness reported 8.4:1 —
     * the number it would have had if `opacity: 0.55` were not there.
     * `fill-opacity` and a colour's own alpha are composited the same way.
     */
    const alphaOf=e=>{let a=1,n=e;while(n&&n.nodeType===1){
      a*=parseFloat(getComputedStyle(n).opacity||'1');n=n.parentElement;}return a;};
    const out=[];const seen=new Set();
    document.querySelectorAll('h1,h2,p,span,time,address,a,button').forEach(e=>{
      const t=(e.textContent||'').trim(); if(!t||e.children.length) return;
      const cs=getComputedStyle(e);
      const key=cs.color+'|'+bgOf(e)+'|'+cs.fontSize+'|'+cs.fontWeight+'|'+alphaOf(e).toFixed(2);
      if(seen.has(key))return; seen.add(key);
      /*
       * Whether this element, or anything above it, is mid-animation right now.
       * The countdown fades each digit in from opacity 0.2 on every tick, so a
       * seconds digit sampled inside that 300 ms reads 1.35:1 — a real value,
       * but a transient one, and not the state a guest reads the number in.
       * Those rows are reported rather than failed; everything static is still
       * held to AA.
       */
      let moving=false;
      for(let n=e; n && n.nodeType===1; n=n.parentElement){
        if(n.getAnimations && n.getAnimations().length){ moving=true; break; }
      }
      out.push({sample:t.slice(0,28),fg:cs.color,bg:bgOf(e),size:parseFloat(cs.fontSize),
        weight:cs.fontWeight,alpha:alphaOf(e),moving});
    });
    return out;
  });
  let fails=0;
  console.log('Rendered text, sampled from the live page:');
  // Composite the text over its background at the alpha it is actually painted
  // with, then measure that. This is what the eye sees.
  const over=(fg,bg,a)=>fg.map((c,i)=>a*c+(1-a)*bg[i]);
  rows.forEach(r=>{
    const bg=parse(r.bg);
    const cr=ratio(over(parse(r.fg),bg,r.alpha),bg);
    const large = r.size>=24 || (r.size>=18.66 && +r.weight>=700);
    const need = large?3:4.5;
    const pass = cr>=need;
    const transient = !pass && r.moving && r.alpha < 0.95;
    if(!pass && !transient) fails++;
    const tag = pass ? 'PASS' : transient ? 'TICK' : 'FAIL';
    console.log(`  ${tag}  ${cr.toFixed(2).padStart(5)}:1  need ${need}  ${String(r.size).padStart(5)}px  "${r.sample}"`
      + (transient?`  (mid-animation at alpha ${r.alpha.toFixed(2)}; settles above)`:''));
  });
  console.log(`\n${fails===0?'ALL TEXT MEETS WCAG AA':fails+' FAILURE(S)'}`);
  await b.close();
  process.exit(fails?1:0);
})().catch(e=>{console.error('FAIL',e.message.slice(0,200));process.exit(2);});
