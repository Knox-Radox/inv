const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const p=await ctx.newPage();
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  // Slow 4G, as the brief specifies, plus 4x CPU for a mid-range Android.
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,
    downloadThroughput:400*1024/8, uploadThroughput:400*1024/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});

  const bytes={}; let total=0;
  p.on('response', async r=>{
    try{
      const t=r.request().resourceType();
      const h=r.headers();
      const len=parseInt(h['content-length']||'0',10) || (await r.body().catch(()=>Buffer.alloc(0))).length;
      bytes[t]=(bytes[t]||0)+len; total+=len;
    }catch(e){}
  });

  await p.evaluateOnNewDocument?.(()=>{});
  await p.addInitScript(()=>{
    window.__lcp=0; window.__cls=0;
    new PerformanceObserver(l=>{for(const e of l.getEntries()){ window.__lcp=e.startTime; const el=e.element; window.__lcpEl=el?(el.tagName+'.'+(el.className||'').toString().slice(0,40)+' '+Math.round(e.size)+'px2 '+(e.url||'').slice(-40)):'?'; }})
      .observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value;})
      .observe({type:'layout-shift',buffered:true});
  });

  const t0=Date.now();
  await p.goto(process.argv[2],{waitUntil:'load',timeout:120000});
  await p.waitForTimeout(4000);
  const v=await p.evaluate(()=>({
    lcp: Math.round(window.__lcp),
    cls: +window.__cls.toFixed(4),
    fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),
    dcl: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd||0),
    el: window.__lcpEl,
  }));
  console.log('Slow 4G (400kbps, 150ms RTT) + 4x CPU throttle, 390x844');
  console.log(`  FCP  ${v.fcp} ms`);
  console.log(`  LCP  ${v.lcp} ms   ${v.lcp<2500?'PASS (<2500)':'FAIL'}`);
  console.log(`  CLS  ${v.cls}      ${v.cls<0.1?'PASS (<0.1)':'FAIL'}`);
  console.log(`  LCP element: ${v.el}`);
  console.log('\nTransfer by type:');
  Object.entries(bytes).sort((a,c)=>c[1]-a[1]).forEach(([k,val])=>console.log(`  ${k.padEnd(12)} ${(val/1024).toFixed(1)} KB`));
  console.log(`  ${'TOTAL'.padEnd(12)} ${(total/1024).toFixed(1)} KB`);
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,300));process.exit(1);});
