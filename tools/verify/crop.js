const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:900,height:1000},deviceScaleFactor:2});
  const p=await ctx.newPage();
  await p.goto(process.argv[2],{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  const sections = await p.$$('section');
  for (let i=0;i<sections.length;i++){
    await sections[i].screenshot({path:`${process.argv[3]}/sec-${i}.png`});
  }
  console.log('sections:', sections.length);
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,200));process.exit(1);});
