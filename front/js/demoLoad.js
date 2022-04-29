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
    const stream = "stream1";
    const token = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMSIsImlhdCI6MTU4OTUzNDEzOX0.MsLz3ctklftdSHiNYReabdNVWr_7vW3-rPZ1jTssxguEo6SS4jLFbVu16v9NeLKzNEf1e6PVDmYN8je9GcBZXw";
    const kindsParam=getParameterByName('kinds');
    const kinds=(kindsParam && kindsParam.split(',')) || ['video','audio'];
    const workerPerServer=8;
    const servers=['https://edge01.foobarweb.com','https://edge02.foobarweb.com','https://edge03.foobarweb.com'];
    const $ = document.querySelector.bind(document);
    const videoDiv=$('#video-div');
    const startButton=$('#subscribe');

    startButton.addEventListener('click',async (event)=> {
        startButton.disabled=true;
        event.preventDefault();
        for (let i=0;i<5;i++) {
            let playback;
            try {
                const worker = Math.floor(Math.random() * workerPerServer)
                const url = servers[Math.floor(Math.random() * servers.length)]
                let origin;
                const originUrl = servers[0];
                if (originUrl !== url) {
                    origin = {url: originUrl, worker: 0, token}
                }
                console.log(`server is ${url} worker is ${worker} origin is ${(origin && origin.url) || 'same'}`);

                playback = new ConferenceApi({
                    url, worker,
                    kinds,
                    token,
                    stream,
                    origin
                });
                const v = document.createElement('video');
                v.muted = true;
                videoDiv.appendChild(v);
                const play = () => {
                    console.log('trying to play');
                    let playPromise = v.play();
                    if (playPromise !== undefined) {
                        playPromise.then(_ => {
                        }).catch(error => {
                            v.muted = true;
                            v.play().then(() => {
                                console.log('errorAutoPlayCallback OK');
                            }, (error) => {
                                console.log('errorAutoPlayCallback error again');
                            });
                        });
                    }
                };
                const mediaStream = await playback.subscribe();
                v.srcObject = mediaStream;
                if (Utils.isSafari) {
                    const onStreamChange = () => {
                        v.srcObject = new MediaStream(mediaStream.getTracks());
                        play();
                    };
                    playback
                        .on('addtrack', onStreamChange)
                        .on('removetrack', onStreamChange);
                } else if (Utils.isFirefox) {
                    v.addEventListener('pause', play)
                }
                play();
            } catch (e) {
                if (e && ERROR[e.errorId]) {
                    alert(ERROR[e.errorId])
                }
                console.log(JSON.stringify(e));
                if (playback) {
                    await playback.close();
                }
            }
        }
    });

})();
