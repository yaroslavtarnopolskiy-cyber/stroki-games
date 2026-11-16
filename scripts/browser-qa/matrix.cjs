const {chromium,webkit}=require('playwright'),fs=require('fs'),assert=require('assert');
const out=process.argv[2],results=[];
(async()=>{for(const engine of ['chromium','webkit']){
 const browser=await (engine==='chromium'?chromium.launch({executablePath:require('puppeteer').executablePath(),headless:true}):webkit.launch({headless:true}));
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[],bad=[],gameRequests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()])});page.on('request',r=>{if(/games\/(runner|three-gifts|human-beast)\/index.html/.test(r.url()))gameRequests.push(r.url())});await page.route('https://mc.yandex.ru/**',r=>r.abort());
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1600);assert.equal(gameRequests.length,0,'Games lazy');
 const widths=[];for(const width of [320,360,390,768,1440]){await page.setViewportSize({width,height:width>760?900:844});await page.waitForTimeout(300);widths.push(await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})));}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:out+`/02-${engine}-mobile-hero-fixed.png`});
 for(let i=0;i<4;i++){await page.locator('.header [data-set-theme="death"]').click();await page.locator('.header [data-set-theme="life"]').click();}
 await page.waitForTimeout(450);assert.equal(await page.locator('html').getAttribute('data-theme'),'life');
 await page.locator('#voices').scrollIntoViewIfNeeded();await page.locator('#markers [data-index="0"]').click();await page.waitForTimeout(1700);assert.equal(await page.locator('#land-title').textContent(),'Урал');await page.screenshot({path:out+`/03-${engine}-map.png`});
 // Each real iframe must load after a user click, pause and close back to the site.
 const games=[];
 for(const [section,path] of [['games','runner'],['game-gifts','three-gifts'],['game-human-beast','human-beast']]){
  const stage=page.locator(`#${section} .runner-stage`);await page.locator(`#${section} .runner-launch`).click();await page.waitForFunction(id=>['playing','paused'].includes(document.querySelector(`#${id} .runner-stage`).dataset.state),section,{timeout:60000});await page.waitForTimeout(650);
  const frame=page.frames().find(f=>f.url().includes(`/games/${path}/index.html`));assert(frame);await page.screenshot({path:out+`/04-${engine}-${path}.png`});
  const size=await frame.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,canvas:!!document.querySelector('canvas')}));
  await stage.locator('.runner-close').click();await page.waitForTimeout(300);await stage.locator('.runner-close').click();await page.waitForTimeout(200);assert(!(await stage.getAttribute('class')).includes('is-expanded'));games.push({path,size,state:await stage.getAttribute('data-state')});
 }
 results.push({engine,widths,games,errors,bad,gameRequests:gameRequests.length});await browser.close();console.log(JSON.stringify(results.at(-1)));
 }fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));})().catch(e=>{console.error(e);fs.writeFileSync(out+'/failure.txt',e.stack);process.exit(1)});
