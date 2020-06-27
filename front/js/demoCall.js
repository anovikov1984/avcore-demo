(async function () {
    const {ConferenceApi,Utils,ERROR}=avcoreClient;

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
    const kinds=(kindsParam && kindsParam.split(',')) || ['video','audio'];
    const kindsParam=getParameterByName('kinds');

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

    });
})();
