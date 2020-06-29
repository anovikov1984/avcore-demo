(async function () {
    const {ConferenceApi,Utils,ERROR}=avcoreClient;
    const {MediasoupSocketApi}=avcore;

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
    const recToken = getParameterByName('recToken');
    const listen = !!getParameterByName('listen');
    const simulcast = !!getParameterByName('simulcast');
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const kindsParam=getParameterByName('kinds');
    const kinds=(kindsParam && kindsParam.split(',')) || ['video','audio'];
    const workerStr=getParameterByName('worker')||'0';
    const workerPerServer=4;
    const numServers=1;
    const worker = workerStr==='random'?Math.floor(Math.random()*numServers*workerPerServer):parseInt(workerStr)||0;
    console.log(`worker is ${worker}`);
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    let playback,capture;
    $('#subscribe').addEventListener('click', async (event)=> {
        $('#subscribe').disabled=true;
        event.preventDefault();
        const br=$(`#playback-video-bit-rate`);
        const connectionBox=$('#connection-box');
        if(listen){
            try {
                playback = new ConferenceApi({
                    url,worker,
                    kinds,
                    token,
                    stream,
                    simulcast
                }).on('bitRate',({bitRate,kind})=>{
                    if(kind==='video'){
                        br.innerText=Math.round(bitRate).toString();
                        if(bitRate>0){
                            br.classList.add('connected');
                        }
                        else {
                            br.classList.remove('connected');
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
        }
        else{
            const _stream=await Utils.getUserMedia({video:true,audio:true});
            try {
                capture = new ConferenceApi({
                    kinds,
                    url,worker,
                    stream,
                    token
                }).on('bitRate',({bitRate,kind})=>{
                    if(kind==='video'){
                        br.innerText=Math.round(bitRate).toString();
                        if(bitRate>0){
                            br.classList.add('connected');
                        }
                        else {
                            br.classList.remove('connected');
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
                if(capture){
                    await capture.close();
                }
                return;

            }
        }
        $('#stop-playing').disabled=false;
    });

    $('#stop-playing').addEventListener('click', function (event) {
        event.preventDefault();
        $('#stop-playing').disabled=true;
        if(playback) {
            playback.close();
        }
        if(capture){
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
    $('#playback-video').addEventListener('volumechange', function (event) {
        const v=$('#playback-video');
        console.log('volumechange',v.muted, v.volume);
        $('#unmute-playback-video').disabled=!v.muted && v.volume>0.01;

    });
    const recording=$('#recording');
    recording.disabled=true;
    let isRecording=false;

    if(recToken) {
        const socketApi = new MediasoupSocketApi(url, worker, recToken);
        socketApi.initSocket().then(() => {
            recording.disabled = false;
        });
        recording.addEventListener('click', async (event)=> {
            recording.disabled=true;
            if(isRecording){
                isRecording=false;
                await socketApi.stopRecording({stream,kinds});
                recording.innerText='Start Recording';
            }
            else {
                isRecording=true;
                await socketApi.startRecording({stream,kinds});
                recording.innerText='Stop Recording';
            }
            recording.disabled=false;
        });
    }

})();
