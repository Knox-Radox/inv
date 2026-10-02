const { chromium } = require('playwright');
const EXE=process.env.CHROME||'/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:900,height:1000},deviceScaleFactor:2});
  const p=await ctx.newPage();
  // The hash keeps the cover off the page, as in mapdraw.js and scrollperf.js.
  await p.goto(process.argv[2]+'#invitation',{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  // Walk the page down first. Sections reveal as they are reached and the map
  // plate is not mounted until a guest is near it, so a crop taken from the top
  // photographs a section that has not arrived: faint type and an empty plate.
  for (let i=0;i<70;i++){ await p.mouse.wheel(0,400); await p.waitForTimeout(40); }
  await p.waitForTimeout(1500);
  const sections = await p.$$('section');
  for (let i=0;i<sections.length;i++){
    await sections[i].screenshot({path:`${process.argv[3]}/sec-${i}.png`});
  }
  console.log('sections:', sections.length);
  await b.close();
})().catch(e=>{console.error('FAIL',e.message.slice(0,200));process.exit(1);});
