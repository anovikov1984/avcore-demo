(async function () {
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const worker = parseInt(getParameterByName('worker')||'0')||0;
    const {ConferenceApi,Utils}=avcoreClient;
    const {MediasoupSocketApi,ERROR}=avcore;
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    const streamTable=$('#streamTable');
    let playback;
    const stream = getParameterByName('stream')||"stream1";
    const token = getParameterByName('token') || "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMyIsImlhdCI6MTU5MDE0NjUyNn0.t5cA373_vhP3f1h5zH8sGYuA-C3sjzK5cOVeT5OJdSMXLKo12qvX9sXqcIvaptcjdXi0yKmCUn0SV6GpDxjAbA";
    const v=$('#playback-video');
    const vbr=$(`#video-bit-rate`);
    const abr=$(`#audio-bit-rate`);
    const connectionBox=$('#connection-box');
    const playLiveButton=$('#live-player');
    const conferenceIds={};
    const socketApi=new MediasoupSocketApi(url,worker,token);
    const subscribe=$('#subscribe');
    const streamHls = getParameterByName('streamHls');
    const tokenHls = getParameterByName('tokenHls');
    const liveUrl = getParameterByName('rtmpUrl') || getParameterByName('liveUrl');
    if(tokenHls && streamHls && liveUrl){
        const codecCopy = !!getParameterByName('codecCopy');
        const copyHlsButton=$('#copy-hls');
        const hlsUrlInput=$('#hls-url-input');
        hlsUrlInput.value = `${url}/hls/${streamHls}/master.m3u8`;
        copyHlsButton.addEventListener('click', async function (event) {
            hlsUrlInput.select();
            document.execCommand('copy');
        });
        const hlsContainers=$$('.hls-container');
        hlsContainers.forEach(c=>c.style.display='');
        const socketApiHls=new MediasoupSocketApi(url,worker,tokenHls);
        let hlsStarted=false;
        const hlsButton=$('#hls-button');
        hlsButton.addEventListener('click', async (event)=> {
            hlsButton.disabled=true;
            copyHlsButton.disabled=true;
            event.preventDefault();
            await socketApiHls.stopFileStreaming({stream:streamHls});
            if(hlsStarted){
                hlsStarted=false;
                hlsButton.innerText='Start HLS';
            }
            else {
                hlsStarted = true;
                hlsButton.innerText='Stop HLS';
                //rtmp://draco.streamingwizard.com:1935/wizard/_definst_/demo/streaming_320_v2.mp4
                const {kinds} = await socketApi.kindsByFile({filePath: liveUrl});
                //const kinds=['audio'];
                await socketApiHls.liveToHls({kinds, stream:streamHls, url: liveUrl,formats:codecCopy?undefined:[{videoBitrate:4000},{videoBitrate:2000, height:720}]});
                copyHlsButton.disabled=false;
            }
            hlsButton.disabled=false;

        });
    }
    let webrtcStarted=false;
    subscribe.disabled=false;
    subscribe.addEventListener('click', async (event)=> {
        subscribe.disabled=true;
        playLiveButton.disabled=true;
        event.preventDefault();
        if(webrtcStarted){
            webrtcStarted=false;
            subscribe.innerText='Start and Subscribe';
            if (playback) {
                await playback.close();
            }
            await socketApi.stopFileStreaming({stream});
        }
        else {
            webrtcStarted = true;
            subscribe.innerText='Stop';

            let isError = false;
            try {
                await socketApi.stopFileStreaming({stream});
                const filePath = getParameterByName('filePath') || 'https://codeda.com/data/syncTest.mp4';
                const {kinds} = await socketApi.kindsByFile({filePath: liveUrl || filePath});
                //const kinds=['audio'];
                const simulcast = [{height: 240}, {}];
                if (liveUrl) {
                    await socketApi.liveStreaming({kinds, stream, url: liveUrl, simulcast});
                }
                else {
                    await socketApi.fileStreaming({
                        kinds,
                        stream,
                        filePath,
                        additionalInputOptions: ['-stream_loop', '-1'],
                        simulcast
                    });
                }
                playback = new ConferenceApi({
                    url, worker,
                    stream,
                    token,
                    kinds
                }).on('bitRate', ({bitRate, kind}) => {
                    if (kind === 'video') {
                        vbr.innerText = 'V ' + Math.round(bitRate).toString();
                        if (bitRate > 0) {
                            vbr.classList.add('connected');
                        }
                        else {
                            vbr.classList.remove('connected');
                        }
                    }
                    if (kind === 'audio') {
                        abr.innerText = 'A ' + Math.round(bitRate).toString();
                        if (bitRate > 0) {
                            abr.classList.add('connected');
                        }
                        else {
                            abr.classList.remove('connected');
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
                }).on('newConsumerId', ({id, kind}) => {
                    conferenceIds[kind] = id;
                    console.log('newConsumerId', id, kind);
                });
                const play = () => {
                    console.log('trying to play');
                    let playPromise = v.play();
                    if (playPromise !== undefined) {
                        playPromise.then(_ => {
                        }).catch(error => {
                            v.muted = true;
                            $('#unmute-playback-video').disabled = false;
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
                    mediaStream.addEventListener('addtrack', onStreamChange);
                    mediaStream.addEventListener('removetrack', onStreamChange);
                }
                else if (Utils.isFirefox) {
                    v.addEventListener('pause', play)
                }

                play();
                playLiveButton.disabled=false;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (e) {
                console.log(e);
                isError = true;
                if (e && ERROR[e.errorId]) {
                    alert(ERROR[e.errorId])
                }
                if (playback) {
                    await playback.close();
                }

            }
        }
        subscribe.disabled=false;
    });
    playLiveButton.addEventListener('click', async function (event) {
        window.open(`demoVideo.html?url=${url}&worker=${worker}&stream=${stream}&token=${token}&listen=true`, '_blank')
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
    $('#request-keyframe').addEventListener('click',async function (event) {
        event.preventDefault();
        if (conferenceIds['video']) {
            await socketApi.requestKeyframe({consumerId:conferenceIds['video']})
        }
    });
})();
