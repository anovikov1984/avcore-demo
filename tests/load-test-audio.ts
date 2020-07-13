import {Browser, launch, Page} from 'puppeteer';

export async function loadTestAudio() {
    const browser:Browser = await launch({
        headless:true,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--no-default-browser-check',
            '--start-maximized',
            '--no-sandbox',
            '--autoplay-policy=no-user-gesture-required',
            '--kiosk'
        ]
    });
    let page:Page = await browser.newPage();
    page.on('console', msg => {
        const args=msg.args();

        for (let i = 0; i < args.length; ++i)
            if(i>0 && msg.args()[i-1] && args[i-1].toString().indexOf('ADDTRACK')>-1){
                console.log(args[i]);
            }
    });
    const onError=msg => console.log('browser', 'error', msg);
    page.on('pageerror', onError);
    page.on('error', onError);
    page.on('load', async () => {
            await page.click('#subscribe');
        }
    );
    await page.goto('https://avcore-demo.codeda.com/demoLoadTest.html?originUrl=https://meeting-mcu.codeda.com:8080&worker=random&stream=09beafb1-32e2-437a-87b0-e08d07ba66f8&token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiIwOWJlYWZiMS0zMmUyLTQzN2EtODdiMC1lMDhkMDdiYTY2ZjgiLCJvcGVyYXRpb24iOiIxIiwiaWF0IjoxNTk0NjA5MjAwfQ.YHPtobQhdiH6O9I2QsBshkDO-aLWdkuXT00GtQo_m2uZsYQm0tFrDj44d-nqOx-OHLzUv_KUlzQ03DWGYbtOzw&kinds=audio&num=50');
}