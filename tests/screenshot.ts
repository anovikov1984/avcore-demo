import {Browser, launch, Page} from 'puppeteer';
import {spawn} from 'child_process';
import {MediasoupSocketApi, MIXER_RENDER_TYPE} from 'avcore';
import {PNG} from 'pngjs';

export async function test() {
    return new Promise(async (resolve)=>{
        const width=1280;
        const height=200;
        const datas=[{url:'https://codeda.com/data/timer.htm',x:0,y:0,z:1,stream:'screenshot-1'},
            {url:'https://codeda.com/data/timer.htm',x:0,y:300,z:2,stream:'screenshot-2'}];
        const mixerId='64f879a4-29e1-4e6d-9712-bf673eb63c03';
        const listenIp='127.0.0.1';
        const token='eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNvZGVkYSIsInN0cmVhbSI6ImE4ZTBhZmY4LTdjNGItNGVkNC1iYTJlLTlhNjA0NmZlMWQ2ZiIsIm9wZXJhdGlvbiI6IjQiLCJpYXQiOjE2MTI4Nzk4MzJ9.0uCF5cfzUN5bq9OOdd9kKYFqFoZXeaBiPzyozuuzAjYAF10pno6S--7VYcppqPF7bQ2LA6gsWMdGKyjCQ62fFQ';
        const {x, y, z, url, stream} = datas[0];
        const browser: Browser = await launch({
            headless: true,
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
        await page.goto(url);
        const d = Date.now();
        const t = 15000;
        let cur = Date.now();
        const api = new MediasoupSocketApi('https://rpc.codeda.com', 0, token);
        const {port} = await api.allocatePort();
        const options = ['-s', [page.viewport().width, page.viewport().height].join('x'), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-i', '-', '-f', 'rawvideo', '-r', '30', '-s', [width, height].join('x'), '-pix_fmt', 'yuva420p', `tcp://${listenIp}:${port}?listen=1`];
        const ffmpeg = spawn('ffmpeg', options, {detached: false})
        console.log(`ffmpeg ${options.join(' ')}`);
        let running = true;
        ffmpeg.stderr.on('data', data => console.log(port,data.toString()));

        ffmpeg.on('exit', async code => {
            running = false;
            console.log(port,`exit ${code}`);
            await api.mixerRemove({mixerId, stream, kind: 'video'});
            await api.releasePort({port});
            await test()
        })
        await api.mixerAddTcp({
            mixerId,
            stream,
            kind: 'video',
            port,
            options: {width, height, x, y, z, renderType: MIXER_RENDER_TYPE.PAD},
            hasTransparency: true
        });
        do {
            if (running) {
                const buffer = await page.screenshot({
                    omitBackground: true
                });
                new PNG({filterType: 4}).on("parsed", function () {
                    if (running) {
                        ffmpeg.stdin.write(this.data);
                    }
                }).write(buffer);
            }

            cur = Date.now();
        } while (cur < (d + t));
        running = false;
        ffmpeg.stdin.end();
        console.log('done');
    })
}

(async function start() {
    await test()
})().then(()=>{}).catch(()=>{});