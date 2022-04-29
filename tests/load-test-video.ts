import {Browser, launch, Page} from 'puppeteer';
//import * as Xvfb  from 'xvfb';

const num=5;
export async function loadTestVideo() {
    return new Promise(async (resolve)=>{
        let _ready=0;
        //const xvfb=new Xvfb({xvfb_args:['-screen', '0', `1600x900x24`]});
        //xvfb.startSync();
        //const display=xvfb.display();
        const display=':101';
        console.log(`x11vnc -display ${display} -localhost`)
        const browser:Browser = await launch({
            headless:false,
            executablePath: '/usr/bin/google-chrome-stable',
            args: [
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--no-default-browser-check',
                '--window-position=0,0',
                '--start-maximized',
                '--no-sandbox',
                '--autoplay-policy=no-user-gesture-required',
                //'--kiosk',
                `--window-size=1600,900`,
                `--display=${display}`
            ]
        });
        for (let i=0;i<num;i++) {
            let page: Page = await browser.newPage();
            page.on('console', msg => {
                const args = msg.args();
                for (let i = 0; i < args.length; ++i)
                    console.info(args[i].toString());
            });
            const onError = msg => {
                console.log('browser', 'error', JSON.stringify(msg));
            }
            page.on('pageerror', onError);
            page.on('error', onError);
            page.on('load', async () => {
                const click = async () => {
                    try {
                        await page.click('#subscribe');
                        _ready++;
                        console.log('ready',_ready);
                        if(_ready===num){
                            resolve()
                        }
                    }
                    catch (e) {
                        setTimeout(click, 1000);

                    }
                };
                await click();
            });
            await page.goto('https://avcore-demo.codeda.com/demoLoad.html');
        }
    })
  }

(async function start() {
    for (let i=0;i<4;i++){
        await loadTestVideo()
    }
})().then(()=>{}).catch(()=>{});