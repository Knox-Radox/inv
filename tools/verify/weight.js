const { chromium } = require('playwright');
const zlib=require('zlib');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  const p=await ctx.newPage();
  const seen=new Map();
  p.on('response', async r=>{
    try{
      const t=r.request().resourceType();
      if(!['script','stylesheet','document','font','image','media'].includes(t)) return;
      const buf=await r.body();
      // Fonts and images are already compressed; text is served gzipped in prod.
      const gz=['script','stylesheet','document'].includes(t) ? zlib.gzipSync(buf).length : buf.length;
      seen.set(r.url(), {t, raw:buf.length, gz});
    }catch(e){}
  });
  await p.goto(process.argv[2],{waitUntil:'networkidle'});
  await p.waitForTimeout(1500);
  const by={};
  for (const {t,raw,gz} of seen.values()){ by[t]=by[t]||{raw:0,gz:0,n:0}; by[t].raw+=raw; by[t].gz+=gz; by[t].n++; }
  let tg=0, tr=0;
  console.log('What the invitation actually loads (first visit, 390px):');
  console.log('  type          files    raw       over the wire');
  for (const [t,v] of Object.entries(by).sort((a,c)=>c[1].gz-a[1].gz)){
    console.log(`  ${t.padEnd(12)} ${String(v.n).padStart(4)}  ${(v.raw/1024).toFixed(1).padStart(7)} KB  ${(v.gz/1024).toFixed(1).padStart(7)} KB`);
    tg+=v.gz; tr+=v.raw;
  }
  console.log(`  ${'TOTAL'.padEnd(12)} ${String(seen.size).padStart(4)}  ${(tr/1024).toFixed(1).padStart(7)} KB  ${(tg/1024).toFixed(1).padStart(7)} KB`);
  const js=by.script?by.script.gz/1024:0;
  console.log(`\n  JS over the wire: ${js.toFixed(1)} KB gz  ${js<150?'PASS (budget ~150 KB)':'OVER BUDGET'}`);
  console.log(`  Images/video:     ${((by.image?.gz||0)+(by.media?.gz||0))/1024} KB   (photographs and baked sheets, lazy below the fold)`);
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,200));process.exit(1);});
