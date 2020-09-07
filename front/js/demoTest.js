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
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    const token= "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMSIsImlhdCI6MTU4OTUzNDEzOX0.MsLz3ctklftdSHiNYReabdNVWr_7vW3-rPZ1jTssxguEo6SS4jLFbVu16v9NeLKzNEf1e6PVDmYN8je9GcBZXw";
    const stream= "stream1";
    const simulcast = !!getParameterByName('simulcast');
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const worker = parseInt(getParameterByName('worker')||'0')||0;
    const kindsParam=getParameterByName('kinds');
    const kinds=(kindsParam && kindsParam.split(',')) || ['video','audio'];
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
        let startedDate;
        let startedStats={audio:false,video:false};
        const v=$('#playback-video');

        let playing=false;
        v.addEventListener("timeupdate", ()=>{
            if(!playing){
                playing=true;
                console.log(`first timeupdate ${v.currentTime} ${Date.now()-startedDate}ms`)
            }
        });
        try {
            playback = new ConferenceApi({
                url,worker,
                kinds,
                token,
                stream
            }).on('bitRate',({bitRate,kind})=>{
                brIn[kind].innerText='↓ '+Math.round(bitRate).toString();
                if(bitRate>0){
                    if(!startedStats[kind]){
                        startedStats[kind]=true;
                        console.log(`first stats ${kind} ${Date.now()-startedDate}ms`)
                    }
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
            }).on('newConsumerId',({id,kind})=>{
                console.log(`new consumer ${kind} ${Date.now()-startedDate}ms`)
            });
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
        try {
            capture = new ConferenceApi({
                url,worker,
                stream,
                token,
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
            await capture.publish(mediaStream);
            startedDate=Date.now();
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
})();
