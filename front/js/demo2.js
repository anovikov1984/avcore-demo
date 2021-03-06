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
    const layerStr = getParameterByName('layer');
    const {ConferenceApi,Utils}=avcoreClient;
    const {ERROR}=avcore;
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const worker=1;
    let playback;
    const audioPublish=$('#audioPublish');
    const videoPublish=$('#videoPublish');
    $$('.publish-checkbox').forEach(b=>b.addEventListener('change',async (event)=> {
        if(playback){
            const kinds=[];
            if(audioPublish.checked){
                kinds.push('audio')
            }
            if(videoPublish.checked){
                kinds.push('video')
            }
            await playback.updateKinds(kinds);
        }
        else {
            $$('.capture-button').forEach(b=>b.disabled=(!audioPublish.checked && !videoPublish.checked));
        }
    }));
    const conferenceIds={};
    $('#get-stats').addEventListener('click', async (event)=> {
        if(playback){
            const ids=[];
            if(audioPublish.checked && conferenceIds['audio']){
                ids.push( conferenceIds['audio'])
            }
            if(videoPublish.checked && conferenceIds['video']){
                ids.push(conferenceIds['video'])
            }
            if(ids.length){
                console.log(await playback['api'].consumersStats({ids}))
            }
        }
    });
    $('#subscribe').addEventListener('click', async (event)=> {
        $('#subscribe').disabled=true;
        event.preventDefault();

        const br=$(`#playback-video-bit-rate`);
        const connectionBox=$('#connection-box');
        try {
            const kinds=[];
            if(audioPublish.checked){
                kinds.push('audio')
            }
            if(videoPublish.checked){
                kinds.push('video')
            }
            playback = new ConferenceApi({
                url,worker,
                kinds,
                token: "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMSIsImlhdCI6MTU4OTUzNDEzOX0.MsLz3ctklftdSHiNYReabdNVWr_7vW3-rPZ1jTssxguEo6SS4jLFbVu16v9NeLKzNEf1e6PVDmYN8je9GcBZXw",
                stream: "stream1"
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
            }).on('newConsumerId',({id,kind})=>{
                conferenceIds[kind]=id;
                console.log('newConsumerId',id,kind);
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
            if(layerStr){
                const layer=parseInt(layerStr);
                await playback.setPreferredLayers({spatialLayer:layer, temporalLayer:layer})
            }
            play();

            $('#stop-playing').disabled=false;
            $('#get-stats').disabled=false;

        }
        catch (e) {
            console.log(e);
            if(e && ERROR[e.errorId]){
                alert(ERROR[e.errorId])
            }
            if(playback){
                await playback.close();
            }

        }
    });

    $('#stop-playing').addEventListener('click', function (event) {
        event.preventDefault();
        if(playback) {
            playback.close();
            $('#stop-playing').disabled=true;
            $('#subscribe').disabled=false;
            $('#get-stats').disabled=true;
        }
    });
})();
