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
  const rows=await p.evaluate(()=>{
    const bgOf=e=>{let n=e;while(n){const c=getComputedStyle(n).backgroundColor;
      if(c&&!/rgba?\(0, 0, 0, 0\)|transparent/.test(c))return c;n=n.parentElement;}return 'rgb(255,255,255)';};
    const out=[];const seen=new Set();
    document.querySelectorAll('h1,h2,p,span,time,address,a,button').forEach(e=>{
      const t=(e.textContent||'').trim(); if(!t||e.children.length) return;
      const cs=getComputedStyle(e);
      const key=cs.color+'|'+bgOf(e)+'|'+cs.fontSize+'|'+cs.fontWeight;
      if(seen.has(key))return; seen.add(key);
      out.push({sample:t.slice(0,28),fg:cs.color,bg:bgOf(e),size:parseFloat(cs.fontSize),weight:cs.fontWeight,op:cs.opacity});
    });
    return out;
  });
  let fails=0;
  console.log('Rendered text, sampled from the live page:');
  rows.forEach(r=>{
    const cr=ratio(parse(r.fg),parse(r.bg));
    const large = r.size>=24 || (r.size>=18.66 && +r.weight>=700);
    const need = large?3:4.5;
    const pass = cr>=need;
    if(!pass) fails++;
    console.log(`  ${pass?'PASS':'FAIL'}  ${cr.toFixed(2).padStart(5)}:1  need ${need}  ${String(r.size).padStart(5)}px  "${r.sample}"`);
  });
  console.log(`\n${fails===0?'ALL TEXT MEETS WCAG AA':fails+' FAILURE(S)'}`);
  await b.close();
  process.exit(fails?1:0);
})().catch(e=>{console.error('FAIL',e.message.slice(0,200));process.exit(2);});
