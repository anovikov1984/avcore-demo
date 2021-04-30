import {Browser, launch, Page} from 'puppeteer';
import {spawn} from 'child_process';
import {MediasoupSocketApi, MIXER_RENDER_TYPE} from 'avcore';

export async function test() {
    return new Promise(async (resolve)=>{
        const width=1280;
        const height=128;
        const mixerId='66dcc39a-66ab-4f0a-ad42-0ecf2055acb2';
        const stream='screenshot';
        const listenIp='127.0.0.1';
        const token='eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNvZGVkYSIsInN0cmVhbSI6ImE4ZTBhZmY4LTdjNGItNGVkNC1iYTJlLTlhNjA0NmZlMWQ2ZiIsIm9wZXJhdGlvbiI6IjQiLCJpYXQiOjE2MTI4Nzk4MzJ9.0uCF5cfzUN5bq9OOdd9kKYFqFoZXeaBiPzyozuuzAjYAF10pno6S--7VYcppqPF7bQ2LA6gsWMdGKyjCQ62fFQ';
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
                width,
                height,
                isLandscape: true
            }
        });
        let page: Page = await browser.newPage();
        await page.goto('https://codeda.com/data/timer.htm');
        const d=Date.now();
        const t=15000;
        let cur = Date.now();
        const api=new MediasoupSocketApi('https://rpc.codeda.com',0,token);
        const {port}=await api.allocatePort();
        const ffmpeg=spawn('ffmpeg',['-f','image2pipe','-i','-', '-f', 'rawvideo', '-s', [width,height].join('x'), '-pix_fmt','yuva420p', `tcp://${listenIp}:${port}?listen=1`])
        ffmpeg.stderr.on('data',data=>console.log(data.toString()));
        ffmpeg.on('exit', async code=>{
            console.log(`exit ${code}`);
            await api.mixerRemove({mixerId,stream,kind:'video'});
            await api.releasePort({port});
        })
        await api.mixerAddTcp({mixerId,stream,kind:'video',port,options:{width,height,x:640,y:0,z:1,renderType:MIXER_RENDER_TYPE.PAD},hasTransparency:true});
        do {
            const buffer= await page.screenshot({
                omitBackground: true
            });
            ffmpeg.stdin.write(buffer);
            cur = Date.now();
        }while (cur<(d+t));
        ffmpeg.stdin.end();
        console.log('done');

    })
}

(async function start() {
    await test()
})().then(()=>{}).catch(()=>{});