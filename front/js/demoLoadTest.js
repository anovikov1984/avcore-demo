(async function () {
    const {ConferenceApi,Utils}=avcoreClient;
    const {MediasoupSocketApi,ERROR}=avcore;

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    const stream = getParameterByName('stream');
    const token = getParameterByName('token');
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const kindsParam=getParameterByName('kinds');
    const kinds=(kindsParam && kindsParam.split(',')) || ['video','audio'];
    const workerStr=getParameterByName('worker')||'0';
    const workerPerServer=4;
    const numServers=1;
    const num = getParameterByName('num')||1;
    let origin;
    const originToken = getParameterByName('originToken');
    const originUrl = getParameterByName('originUrl');
    const originWorker = getParameterByName('originWorker')||0;
    if(originUrl){
        origin={url:originUrl, worker:originWorker, token:originToken||token}
    }
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    let playbacks=[];
    const startButtons=$$('.start-button');
    startButtons.forEach(b=>b.addEventListener('click',async (event)=> {
        startButtons.forEach(b=>b.disabled=true);
        event.preventDefault();
        const br=$(`#playback-video-bit-rate`);
        const connectionBox=$('#connection-box');
        try {
            const promises=[];
            const d=Date.now();
            for(let i=0;i<num;i++) {
                const worker = workerStr==='random'?Math.floor(Math.random()*numServers*workerPerServer):parseInt(workerStr)||0;
                console.log(`worker is ${worker}`);
                let connected=false;
                playbacks[i] = new ConferenceApi({
                    url, worker,
                    kinds,
                    token,
                    stream,
                    origin
                }).on('bitRate', ({bitRate, kind}) => {
                    if (kind === kinds[kinds.length-1]) {
                        br.innerText = Math.round(bitRate).toString();
                        if (bitRate > 0) {
                            if(!connected){
                                connected=true;
                                console.info('BITRATE',Date.now()-d);
                            }
                            br.classList.add('connected');
                        }
                        else {
                            br.classList.remove('connected');
                        }
                    }
                }).on('connectionstatechange', ({state}) => {
                    console.log('connectionstatechange', state);
                    if (state === 'connected') {
                        connectionBox.classList.add('connected');
                    }
                    else {
                        connectionBox.classList.remove('connected');
                    }
                }) .on('addtrack',(e)=>{
                    if (e.track.kind === kinds[kinds.length-1]) {
                        console.info('ADDTRACK', Date.now() - d);
                    }
                });
                const v = $('#playback-video');
                promises.push(playbacks[i].subscribe()) ;
            }
            await Promise.all(promises);
        }
        catch (e) {
            if(e && ERROR[e.errorId]){
                alert(ERROR[e.errorId])
            }
            console.log(e);
            await Promise.all(playbacks.map(playback=>playback.close()));
            return;
        }
        $('#stop-playing').disabled=false;
    }));

    $('#stop-playing').addEventListener('click',async function (event) {
        event.preventDefault();
        $('#stop-playing').disabled=true;
        await Promise.all(playbacks.map(playback=>playback.close()));
        startButtons.forEach(b=>b.disabled=false);
        $('#unmute-playback-video').disabled=true;
    });
    $('#unmute-playback-video').addEventListener('click', function (event) {
        event.preventDefault();
        const v=$('#playback-video');
        console.log('muted before',v.muted, v.volume);
        v.muted=false;
        v.volume=1;
        console.log('muted after',v.muted, v.volume);
        $('#unmute-playback-video').disabled=true;
    });
    $('#playback-video').addEventListener('volumechange', function (event) {
        const v=$('#playback-video');
        console.log('volumechange',v.muted, v.volume);
        $('#unmute-playback-video').disabled=!v.muted && v.volume>0.01;

    });
    const fullscreen=$('#fullscreen');
    fullscreen.addEventListener('click', function (event) {
        event.preventDefault();
        const elem=$('#playback-video');
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    });


})();
