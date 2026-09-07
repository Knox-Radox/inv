const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE,args:['--force-color-profile=srgb']});
  const ctx=await b.newContext({viewport:{width:Number(process.argv[4]||1000),height:900},deviceScaleFactor:2});
  const p=await ctx.newPage();
  await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});
  await p.waitForTimeout(500);
  const el=await p.$('svg');
  await el.screenshot({path:process.argv[3]});
  console.log('ok');
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,300));process.exit(1);});
