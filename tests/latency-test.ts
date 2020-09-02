import {Browser, launch, Page} from 'puppeteer';
export async function latencyTest() {
    return new Promise(async (resolve)=>{
        const browser:Browser = await launch({
            headless:true,
            ignoreDefaultArgs: ['--enable-automation'],
            executablePath: '/usr/bin/google-chrome-stable',
            args: [
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--no-default-browser-check',
                '--start-maximized',
                '--no-sandbox',
                '--autoplay-policy=no-user-gesture-required',
                '--kiosk'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080,
                isLandscape: true
            }
        });
            let page: Page = await browser.newPage();
            page.on('console', msg => {
                const args = msg.args();
                /*for (let i = 0; i < args.length; ++i){
                    console.log(args[i].toString());
                }*/
                const s:string=args.map(_=>_.toString().replace('JSHandle:', '')).join(' ');
                if(s.startsWith('_LATENCY_')){
                    //const latencyMatch=s.match(/ ([0-9]+ms)/);
                    console.log(s);

                    /*const screenshotPath=join(__dirname,`screenshots/${Date.now()}_${(latencyMatch && latencyMatch[1]) || 'error'}.png`);
                    page.screenshot({path: screenshotPath}).then(()=>{
                        console.log(screenshotPath);
                    }).catch(e=>console.error());*/
                }
                //console.log(s)

            });
            const onError = msg => console.log('browser', 'error', msg);
            page.on('pageerror', onError);
            page.on('error', onError);
            page.on('load', async () => {

            });
            await page.goto('https://app.avcore.io/latency?server=https://node99.meshub.tv&worker=0&worker1=0&worker2=1&worker3=2');

    })
  }

(async function start() {
        await latencyTest()
})().then(()=>{}).catch(()=>{});