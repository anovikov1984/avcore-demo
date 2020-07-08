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
    const mixerButtonContainers=$$('.mixer-button');
    mixerButtonContainers.forEach(c=>c.style.display='none');
    if(streamMixer && tokenMixer){
        mixerButtonContainers.forEach(c=>c.style.display='');
        mixerButton.disabled=false;
    }
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    let playback,capture;
    $('#subscribe').addEventListener('click', async (event)=> {
        $('#subscribe').disabled=true;
        event.preventDefault();
        const brIn=$(`#playback-video-bit-rate`);
        const brOut=$(`#publish-video-bit-rate`);
        const connectionBox=$('#connection-box');
        try {
            playback = new ConferenceApi({
                url,worker,
                kinds,
                token:tokenIn,
                stream:streamIn,
                simulcast
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

        const _stream=await Utils.getUserMedia({video:kinds.includes('video'),audio:kinds.includes('audio')});
        try {
            capture = new ConferenceApi({
                url,worker,
                stream:streamOut,
                token:tokenOut
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
            await capture.publish(_stream);
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
    });

    $('#stop-playing').addEventListener('click', function (event) {
        event.preventDefault();
        if(playback) {
            playback.close();
        }
        if(capture) {
            capture.close();
        }
        $('#subscribe').disabled=false;

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
            api = new MediasoupSocketApi(url, worker, recToken);
            await api.initSocket();
        }
        if(mixerId){
            await api.mixerClose({mixerId});
            mixerButton.innerText='Start Mixer';
            mixerId=null;

        }
        else {
            const res=await api.mixerStart();
            mixerId=res.mixerId;
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
                const res=await api.mixerPipeStart({mixerId,type:MIXER_PIPE_TYPE.LIVE});
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
                const res=await api.mixerPipeStart({mixerId,type:MIXER_PIPE_TYPE.RTMP,url:`${$('#rtmp-url').value}/${$('#rtmp-key').value}`});
                mixerRtmpPipeId=res.pipeId;
                mixerRtmpButton.innerText='Stop Mixer RTMP';
            }
            mixerButtons.forEach(b=>b.disabled=false);
            mixerButton.disabled=false;
        }
    });

})();
