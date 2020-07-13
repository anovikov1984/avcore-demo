(async function () {
    const {MediasoupSocketApi,ERROR,MIXER_PIPE_TYPE}=avcore;
    const {ConferenceApi,Utils}=avcoreClient;

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    const streamIn = getParameterByName('streamIn');
    const tokenIn = getParameterByName('tokenIn');
    const streamOut = getParameterByName('streamOut');
    const tokenOut = getParameterByName('tokenOut');
    const simulcast = !!getParameterByName('simulcast');
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const worker = parseInt(getParameterByName('worker')||'0')||0;
    const kindsParam=getParameterByName('kinds');
    const kinds=(kindsParam && kindsParam.split(',')) || ['video','audio'];
    const streamMixer = getParameterByName('streamMixer');
    const tokenMixer = getParameterByName('tokenMixer');
    const mixerButton=$('#mixer');
    const mixerButtons=$$('.mixer-button');
    const mixerButtonContainers=$$('.mixer-button-container');
    mixerButtonContainers.forEach(c=>c.style.display='none');
    if(streamMixer && tokenMixer){
        mixerButtonContainers.forEach(c=>c.style.display='');
        mixerButton.disabled=false;
        window.onbeforeunload = async function(e) {
            if(mixerId) {
                await api.mixerClose({mixerId});
            }
        };
    }

    let playback,capture;
    const startButtons=$$('.start-button');
    startButtons.forEach(b=>b.addEventListener('click',async (event)=> {
        startButtons.forEach(b=>b.disabled=true);
        event.preventDefault();
        const brIn=$(`#playback-video-bit-rate`);
        const brOut=$(`#publish-video-bit-rate`);
        const connectionBox=$('#connection-box');
        try {
            playback = new ConferenceApi({
                url,worker,
                kinds,
                token:tokenIn,
                stream:streamIn
            }).on('bitRate',({bitRate,kind})=>{
                if(kind==='video'){
                    brIn.innerText='↓ '+Math.round(bitRate).toString();
                    if(bitRate>0){
                        brIn.classList.add('connected');
                    }
                    else {
                        brIn.classList.remove('connected');
                    }
                }
            }).on('connectionstatechange',({state})=>{
                console.log('connectionstatechange',state);
                if(state==='connected'){
                    connectionBox.classList.add('connected');
                }
                else {
                    connectionBox.classList.remove('connected');
                }
            });
            const v=$('#playback-video');
            const play=()=>{
                console.log('trying to play');
                let playPromise = v.play();
                if (playPromise !== undefined) {
                    playPromise.then(_ => {
                    }).catch(error => {
                        v.muted=true;
                        $('#unmute-playback-video').disabled=false;
                        v.play().then(()=>{
                            console.log('errorAutoPlayCallback OK');
                        },(error)=>{
                            console.log('errorAutoPlayCallback error again');
                        });
                    });
                }
            };
            const mediaStream=await playback.subscribe();
            v.srcObject=mediaStream;
            if(Utils.isSafari){
                const onStreamChange=()=>{
                    v.srcObject=new MediaStream(mediaStream.getTracks());
                    play();
                };
                playback
                    .on('addtrack',onStreamChange)
                    .on('removetrack',onStreamChange);
            }
            else if(Utils.isFirefox){
                v.addEventListener('pause',play)
            }
            play();
        }
        catch (e) {
            if(e && ERROR[e.errorId]){
                alert(ERROR[e.errorId])
            }
            console.log(e);
            if(playback){
                await playback.close();
            }
            return;
        }
        let isScreen=b.id==='screen-share';
        let mediaStream=await Utils.getUserMedia({video:kinds.includes('video'),audio:kinds.includes('audio') && b.id!=='screen-share'},b.id==='screen-share');
        if(isScreen && kinds.includes('audio')){
            const _stream=await Utils.getUserMedia({video:false,audio:true});
            mediaStream=new MediaStream([...mediaStream.getTracks(),..._stream.getTracks()]);
        }
        try {
            capture = new ConferenceApi({
                url,worker,
                stream:streamOut,
                token:tokenOut,
                simulcast
            }).on('bitRate',({bitRate,kind})=>{
                if(kind==='video'){
                    brOut.innerText='↑ '+Math.round(bitRate).toString();
                    if(bitRate>0){
                        brOut.classList.add('connected');
                    }
                    else {
                        brOut.classList.remove('connected');
                    }
                }
            }).on('connectionstatechange',({state})=>{
                console.log('connectionstatechange',state);
                if(state==='connected'){
                    connectionBox.classList.add('connected');
                }
                else {
                    connectionBox.classList.remove('connected');
                }
            });
            await capture.publish(mediaStream);
        }
        catch (e) {
            if(e && ERROR[e.errorId]){
                alert(ERROR[e.errorId])
            }
            console.log(e);
            if(playback){
                await playback.close();
            }
            return;

        }

        $('#stop-playing').disabled=false;
    }));

    $('#stop-playing').addEventListener('click', function (event) {
        $('#stop-playing').disabled=true;
        event.preventDefault();
        if(playback) {
            playback.close();
        }
        if(capture) {
            capture.close();
        }
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
    let api;
    let mixerId;
    mixerButton.addEventListener('click', async function (event) {
        event.preventDefault();
        mixerButton.disabled=true;
        mixerButtons.forEach(b=>b.disabled=true);
        if(!api){
            api = new MediasoupSocketApi(url, worker, tokenMixer);
            await api.initSocket();
        }
        if(mixerId){
            await api.mixerClose({mixerId});
            mixerButton.innerText='Start Mixer';
            mixerId=null;
            mixerLivePipeId=null;
            if(mixerRecPipeId){
                lastRecording=mixerRecPipeId;
                adminRecButton.disabled=false;
                mixerRecPipeId=null;
            }
            mixerRtmpPipeId=null;
            mixerLiveButton.innerText='Start Mixer Live';
            mixerRtmpButton.innerText='Start Mixer RTMP';
            mixerRecButton.innerText='Start Mixer Recording';
        }
        else {
            const res=await api.mixerStart();
            mixerId=res.mixerId;
            await Promise.all([
                api.mixerAdd({mixerId,stream:streamIn,kind:'audio'}),
                api.mixerAdd({mixerId,stream:streamOut,kind:'audio'}),
                api.mixerAdd({mixerId,stream:streamIn,kind:'video',options:{x:0,y:0,width:640,height:480,z:0}}),
                api.mixerAdd({mixerId,stream:streamOut,kind:'video',options:{x:640,y:0,width:640,height:480,z:0}})
            ]);
            mixerButton.innerText='Stop Mixer';
            mixerButtons.forEach(b=>b.disabled=false);
        }
        mixerButton.disabled=false;

    });
    let mixerLivePipeId;
    const mixerLiveButton=$('#mixer-live');
    mixerLiveButton.addEventListener('click', async function (event) {
        event.preventDefault();
        if(mixerId){
            mixerButton.disabled=true;
            mixerButtons.forEach(b=>b.disabled=true);
            if(mixerLivePipeId){
                await api.mixerPipeStop({mixerId,pipeId:mixerLivePipeId});
                mixerLiveButton.innerText='Start Mixer Live';
                mixerLivePipeId=null;
            }
            else {
                const res=await api.mixerPipeStart({mixerId,type:MIXER_PIPE_TYPE.LIVE,stream:streamMixer});
                mixerLivePipeId=res.pipeId;
                mixerLiveButton.innerText='Stop Mixer Live';
            }
            mixerButtons.forEach(b=>b.disabled=false);
            mixerButton.disabled=false;
        }
    });

    const adminRecButton=$('#rec-admin');
    let lastRecording;
    adminRecButton.addEventListener('click', async function (event) {
        if(lastRecording){
            window.open(`demoRecordings.html?url=${url}&stream=${lastRecording}`, '_blank')
        }
    });
    let mixerRecPipeId;
    const mixerRecButton=$('#mixer-rec');
    mixerRecButton.addEventListener('click', async function (event) {
        event.preventDefault();
        if(mixerId){
            mixerButton.disabled=true;
            mixerButtons.forEach(b=>b.disabled=true);
            if(mixerRecPipeId){
                await api.mixerPipeStop({mixerId,pipeId:mixerRecPipeId});
                mixerRecButton.innerText='Start Mixer Recording';
                lastRecording=mixerRecPipeId;
                adminRecButton.disabled=false;
                mixerRecPipeId=null;

            }
            else {
                const res=await api.mixerPipeStart({mixerId,type:MIXER_PIPE_TYPE.RECORDING});
                mixerRecPipeId=res.pipeId;
                mixerRecButton.innerText='Stop Mixer Recording';
            }
            mixerButtons.forEach(b=>b.disabled=false);
            mixerButton.disabled=false;
        }
    });

    let mixerRtmpPipeId;
    const mixerRtmpButton=$('#mixer-rtmp');
    mixerRtmpButton.addEventListener('click', async function (event) {
        event.preventDefault();
        if(mixerId){
            mixerButton.disabled=true;
            mixerButtons.forEach(b=>b.disabled=true);
            if(mixerRtmpPipeId){
                await api.mixerPipeStop({mixerId,pipeId:mixerRtmpPipeId});
                mixerRtmpButton.innerText='Start Mixer RTMP';
                mixerRtmpPipeId=null;

            }
            else {
                const res=await api.mixerPipeStart({mixerId,type:MIXER_PIPE_TYPE.RTMP,url:`${$('#rtmp-url').value}/${$('#rtmp-key').value}`.replace(/([^:])\/\//gi,'$1/')});
                mixerRtmpPipeId=res.pipeId;
                mixerRtmpButton.innerText='Stop Mixer RTMP';
            }
            mixerButtons.forEach(b=>b.disabled=false);
            mixerButton.disabled=false;
        }
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
