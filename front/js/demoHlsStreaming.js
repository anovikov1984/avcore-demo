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
    const {MediasoupSocketApi,ERROR,HLS}=avcore;
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    const streamTable=$('#streamTable');
    let playback,hls;
    const liveUrl = getParameterByName('rtmpUrl')||getParameterByName('liveUrl');
    const stream = getParameterByName('stream')||"stream1";
    const token = getParameterByName('token') || "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMyIsImlhdCI6MTU5MDE0NjUyNn0.t5cA373_vhP3f1h5zH8sGYuA-C3sjzK5cOVeT5OJdSMXLKo12qvX9sXqcIvaptcjdXi0yKmCUn0SV6GpDxjAbA";
    const codecCopy = !!getParameterByName('codecCopy');
    const streamHls = getParameterByName('streamHls');
    const tokenHls = getParameterByName('tokenHls');
    const v=$('#playback-video');
    const vbr=$(`#video-bit-rate`);
    const abr=$(`#audio-bit-rate`);
    const connectionBox=$('#connection-box');
    const conferenceIds={};
    const socketApi=new MediasoupSocketApi(url,worker,token);
    const socketApiHls=new MediasoupSocketApi(url,worker,tokenHls);
    const subscribe=$('#subscribe');
    subscribe.disabled=false;
    subscribe.addEventListener('click', async (event)=> {
        $('#subscribe').disabled=true;
        event.preventDefault();
        let isError=false;
        try {
            const {kinds} = await socketApi.kindsByFile({filePath: liveUrl});
            console.log('Promise.all');
            await Promise.all([startWebrtc(kinds),startHls(kinds)]);
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
            return;
        }
        if (!isError) {
            $('#stop-playing').disabled = false;
        }

    });
    async function startHls(kinds){
        await socketApiHls.stopFileStreaming({stream:streamHls});
        if (liveUrl) {
            //const kinds=['audio'];
            await socketApiHls.liveToHls({kinds, stream:streamHls, url: liveUrl,formats:codecCopy?undefined:[{videoBitrate:4000},{videoBitrate:1000,height:360}]});
            runHls("video",`${url}/${HLS.ROOT}/${streamHls}/${HLS.PLAYLIST}`)
        }
    }
    async function startWebrtc(kinds){
        console.log('webrtc');
        let isError=false;
        try {
            await socketApi.stopFileStreaming({stream});
            //const kinds=['audio'];
            if (liveUrl) {
                await socketApi.liveStreaming({kinds, stream, url: liveUrl});

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
            }
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
    function runHls(videoId,url) {
        const video = document.getElementById(videoId);
        const play = () => {
            console.log('trying to play');
            let playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                }).catch(error => {
                    video.muted = true;
                    $('#unmute-playback-video').disabled = false;
                    video.play().then(() => {
                        console.log('errorAutoPlayCallback OK');
                    }, (error) => {
                        console.log('errorAutoPlayCallback error again');
                    });
                });
            }
        };
        if(Hls.isSupported())
        {
            hls = new Hls();
            hls.on(Hls.Events.ERROR, (event, data) => {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log("network error on playlist load, retrying.");
                        this.hlsTryLoadTimer = setTimeout(() => runHls(videoId,url), 200);
                }
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED,function()
            {
                play();
            });
        }
        else if (video.canPlayType('application/vnd.apple.mpegurl'))
        {
            video.src = url;
            video.addEventListener('canplay',function()
            {
                play();
            });
        }
    }
    $('#stop-playing').addEventListener('click',async function (event) {
        $('#stop-playing').disabled=true;
        event.preventDefault();
        if(hls){
            hls.stopLoad()
        }
        if (playback) {
            await playback.close();
        }
        await Promise.all([socketApi.stopFileStreaming({stream}),
        socketApiHls.stopFileStreaming({stream:streamHls})]);
        $('#video').pause();
        $('#subscribe').disabled=false;
        $('#unmute-playback-video').disabled=true;
    });
    $('#unmute-playback-video').addEventListener('click', function (event) {
        event.preventDefault();
        for (const vId of ['#playback-video','#video']){
            const v=$(vId);
            console.log('muted before',v.muted, v.volume);
            v.muted=false;
            v.volume=1;
            console.log('muted after',v.muted, v.volume);
            $('#unmute-playback-video').disabled=true;
        }
    });
})();
