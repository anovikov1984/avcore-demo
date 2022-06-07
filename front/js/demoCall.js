(async function () {
    const {MediasoupSocketApi,ERROR,MIXER_PIPE_TYPE,HLS,MIXER_RENDER_TYPE}=avcore;
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
    const mixerData={width:640,height:480};
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
    const filePath = getParameterByName('filePath');
    const hasTransparency = !!getParameterByName('hasTransparency');
    const test = !!getParameterByName('test');
    const mixerButton=$('#mixer');
    const mixerButtons=$$('.mixer-button');
    const mixerButtonContainers=$$('.mixer-button-container');
    mixerButtonContainers.forEach(c=>c.style.display='none');
    if(streamMixer && tokenMixer){
        mixerButtonContainers.forEach(c=>c.style.display='');
        mixerButton.disabled=false;
    }

    let playback,capture;
    const startButtons=$$('.start-button');
    startButtons.forEach(b=>b.addEventListener('click',async (event)=> {
        startButtons.forEach(b=>b.disabled=true);
        event.preventDefault();
        const brIn={video:$(`#playback-video-bit-rate`),audio:$(`#playback-audio-bit-rate`)};
        const brOut={video:$(`#publish-video-bit-rate`),audio:$(`#publish-audio-bit-rate`)};
        const connectionBox=$('#connection-box');

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
                brOut[kind].innerText='↑ '+Math.round(bitRate).toString();
                if(bitRate>0){
                    brOut[kind].classList.add('connected');
                }
                else {
                    brOut[kind].classList.remove('connected');
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
            const v=$('#own-video');
            v.srcObject=await capture.publish(mediaStream);
            let playPromise = v.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                }).catch(error => {
                    v.muted=true;
                    v.play().then(()=>{
                        console.log('errorAutoPlayCallback OK');
                    },(error)=>{
                        console.log('errorAutoPlayCallback error again');
                    });
                });
            }
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

        try {
            playback = new ConferenceApi({
                url,worker,
                kinds,
                token:tokenIn,
                stream:streamIn
            }).on('bitRate',({bitRate,kind})=>{
                brIn[kind].innerText='↓ '+Math.round(bitRate).toString();
                if(bitRate>0){
                    brIn[kind].classList.add('connected');
                }
                else {
                    brIn[kind].classList.remove('connected');
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
        }
        if(mixerId){
            window.onbeforeunload=null;
            await api.mixerClose({mixerId});
            mixerButton.innerText='Start Mixer';
            mixerId=null;
            mixerLivePipeId=null;
            mixerHlsPipeId=null;
            if(mixerRecPipeId){
                lastRecording=mixerRecPipeId;
                adminRecButton.disabled=false;
                mixerRecPipeId=null;
            }
            mixerRtmpPipeId=null;
            mixerLiveButton.innerText='Start Mixer Live';
            mixerRtmpButton.innerText='Start Mixer RTMP';
            mixerRecButton.innerText='Start Mixer Recording';
            mixerHlsButton.innerText='Start Mixer HLS';
            copyHlsButton.disabled=true;
            playLiveButton.disabled=true;
            hlsUrlInput.value = '';
        }
        else {
            window.onbeforeunload = async function(e) {
                if(mixerId) {
                    await api.mixerClose({mixerId});
                }
            };
            const res=await api.mixerStart(mixerData);
            mixerId=res.mixerId;
            const promises=[
                api.mixerAdd({mixerId,stream:streamIn,kind:'audio'}),
                api.mixerAdd({mixerId,stream:streamOut,kind:'audio'})
            ];
            if(!filePath || hasTransparency){
                promises.push(
                    api.mixerAdd({mixerId,stream:streamIn,kind:'video',options:{x:0,y:0,width:mixerData.width/2,height:mixerData.height,z:0,renderType:MIXER_RENDER_TYPE.CROP}}),
                    api.mixerAdd({mixerId,stream:streamOut,kind:'video',options:{x:mixerData.width/2,y:0,width:mixerData.width/2,height:mixerData.height,z:0,renderType:MIXER_RENDER_TYPE.CROP}})
                );
            }
            else {
                promises.push(
                    api.mixerAdd({mixerId,stream:streamIn,kind:'video',options:{x:0,y:0,width:mixerData.width/2,height:mixerData.height,z:0,renderType:MIXER_RENDER_TYPE.CROP}}),
                    api.mixerAdd({mixerId,stream:streamOut,kind:'video',options:{x:mixerData.width/2,y:0,width:mixerData.width/2,height:mixerData.height,z:0,renderType:MIXER_RENDER_TYPE.CROP}})
                );
                /*promises.push(
                    api.mixerAdd({mixerId,stream:streamIn,kind:'video',options:{x:0,y:0,width:640,height:720,z:1,renderType:MIXER_RENDER_TYPE.PAD}}),
                    api.mixerAdd({mixerId,stream:streamOut,kind:'video',options:{x:640,y:(640-480)/2,width:640,height:480,z:1,renderType:MIXER_RENDER_TYPE.PAD}}),
                    api.mixerAddFile({mixerId,kinds:['audio','video'],options:{x:0,y:0,width:1280,height:720,z:0,renderType:MIXER_RENDER_TYPE.PAD},filePath,removeOnExit:false,loop:true})
                );
                */
            }
            if(filePath){
                if(!hasTransparency){
                    promises.push(api.mixerAddFile(
                        {stream:`${streamMixer}-file`,mixerId,kinds:['audio','video'],options:{x:0,y:360,width:1280,height:360,z:0,renderType:MIXER_RENDER_TYPE.PAD},filePath,removeOnExit:false,loop:true}
                    ));
                }
                else {
                    promises.push(api.mixerAddFile(
                        {stream:`${streamMixer}-file`,mixerId,kinds:['audio','video'],options:{x:0,y:0,width:1280,height:720,z:1,renderType:MIXER_RENDER_TYPE.PAD},filePath,removeOnExit:false,loop:true,hasTransparency}
                    ));
                }

            }
            await Promise.all(promises);
            mixerButton.innerText='Stop Mixer';
            mixerButtons.forEach(b=>b.disabled=false);
        }
        mixerButton.disabled=false;

    });
    let mixerLivePipeId;
    const mixerLiveButton=$('#mixer-live');
    const playLiveButton=$('#live-player');
    mixerLiveButton.addEventListener('click', async function (event) {
        event.preventDefault();
        if(mixerId){
            mixerButton.disabled=true;
            mixerButtons.forEach(b=>b.disabled=true);
            if(mixerLivePipeId){
                await api.mixerPipeStop({mixerId,pipeId:mixerLivePipeId});
                mixerLiveButton.innerText='Start Mixer Live';
                mixerLivePipeId=null;
                playLiveButton.disabled=true;
            }
            else {
                const res=await api.mixerPipeStart({mixerId,type:MIXER_PIPE_TYPE.LIVE,stream:streamMixer/*,simulcast:[{height:360},{}]*/});
                mixerLivePipeId=res.pipeId;
                mixerLiveButton.innerText='Stop Mixer Live';
                playLiveButton.disabled=false;
            }
            mixerButtons.forEach(b=>b.disabled=false);
            mixerButton.disabled=false;
        }
    });
    playLiveButton.addEventListener('click', async function (event) {
        if(mixerLivePipeId){
            window.open(`demoVideo${window.location.pathname.includes('Old')?'Old':''}.html?url=${url}&worker=${worker}&stream=${streamMixer}&token=${tokenMixer}&listen=true`, '_blank')
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

    const mixerTestButton=$('#test-button');
    if(test){
        mixerTestButton.style.display='';
    }
    let mixerHlsPipeId;
    const mixerHlsButton=$('#mixer-hls');
    const copyHlsButton=$('#copy-hls');
    mixerHlsButton.addEventListener('click', async function (event) {
        event.preventDefault();
        if(mixerId){
            mixerButton.disabled=true;
            mixerButtons.forEach(b=>b.disabled=true);
            if(mixerHlsPipeId){
                await api.mixerPipeStop({mixerId,pipeId:mixerHlsPipeId});
                mixerHlsButton.innerText='Start Mixer HLS';
                copyHlsButton.disabled=true;
                mixerHlsPipeId=null;
                hlsUrlInput.value = '';

            }
            else {
                const res=await api.mixerPipeStart({mixerId,kinds,type:MIXER_PIPE_TYPE.HLS,formats:[{videoBitrate:700,height:480}], location:api.location()});
                mixerHlsPipeId=res.pipeId;
                mixerHlsButton.innerText='Stop Mixer HLS';
                copyHlsButton.disabled=false;
                hlsUrlInput.value = `${url}/hls/${mixerHlsPipeId}/master.m3u8`;
            }
            mixerButtons.forEach(b=>b.disabled=false);
            mixerButton.disabled=false;
        }
    });
    const hlsUrlInput=$('#hls-url-input');
    copyHlsButton.addEventListener('click', async function (event) {
        hlsUrlInput.select();
        document.execCommand('copy');
    });
    mixerTestButton.addEventListener('click', async function (event) {
       await api.mixerCommand({mixerId,command:'TEST\n'})
    });
})();
