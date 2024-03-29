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
    const {ConferenceApi,Utils}=avcoreClient;
    const {MediasoupSocketApi,ERROR}=avcore;
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    let capture, mediaStrem;
    let screenshare=false;
    const audioPublish=$('#audioPublish');
    const videoPublish=$('#videoPublish');
    const simulcast=$('#simulcast');
    const connectionBox=$('#connection-box');
    const token= "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMSIsImlhdCI6MTU4OTUzNDEzOX0.MsLz3ctklftdSHiNYReabdNVWr_7vW3-rPZ1jTssxguEo6SS4jLFbVu16v9NeLKzNEf1e6PVDmYN8je9GcBZXw";
    const stream= "stream1";
    const recording=$('#recording');
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const worker=1;
    $$('.publish-checkbox').forEach(b=>b.addEventListener('change',async (event)=> {
        console.log('change',b.id);
        if(mediaStrem && capture){
            if(!audioPublish.checked){
                const tracks=mediaStrem.getAudioTracks();
                for(let i=0;i<tracks.length;i++){
                    const track=tracks[i];
                    capture.removeTrack(track);
                }
            }
            else if(!mediaStrem.getAudioTracks().length){
                const _stream=await Utils.getUserMedia({audio:true,video:false},screenshare);
                const tracks=_stream.getAudioTracks();
                for(let i=0;i<tracks.length;i++){
                    const track=tracks[i];
                    capture.addTrack(track);
                }
            }
            if(!videoPublish.checked){
                const tracks=mediaStrem.getVideoTracks();
                for(let i=0;i<tracks.length;i++){
                    const track=tracks[i];
                    capture.removeTrack(track);
                }
            }
            else if(!mediaStrem.getVideoTracks().length){
                const _stream=await Utils.getUserMedia({audio:false,video:true},screenshare);
                const tracks=_stream.getVideoTracks();
                for(let i=0;i<tracks.length;i++){
                    const track=tracks[i];
                    capture.addTrack(track);
                }
            }

        }
        else {
            $$('.capture-button').forEach(b=>b.disabled=(!audioPublish.checked && !videoPublish.checked));
        }
    }));
    const conferenceIds={};
    $('#get-stats').addEventListener('click', async (event)=> {
        if(capture){
            const ids=[];
            if(audioPublish.checked && conferenceIds['audio']){
                ids.push( conferenceIds['audio'])
            }
            if(videoPublish.checked && conferenceIds['video']){
                ids.push(conferenceIds['video'])
            }
            if(ids.length){
                console.log(await capture['api'].producersStats({ids}))
            }
        }
    });
    $('#get-load').addEventListener('click', async (event)=> {
        const {currentLoad} = await capture['api'].workerLoad();
        $('#get-load-data').value=currentLoad;
    });
    $('#get-num-workers').addEventListener('click', async (event)=> {
        const {num} = await capture['api'].numWorkers();
        $('#get-num-workers-data').value=num;
    });
    $('#get-heap-snapshot').addEventListener('click', async (event)=> {
       await capture['api'].heapSnapshot()
    });
    $$('.capture-button').forEach(b=>b.addEventListener('click',async (event)=> {
        event.preventDefault();
        if(!audioPublish.checked && !videoPublish.checked){
            return;
        }
        $$('.capture-button').forEach(b=>b.disabled=true);
        simulcast.disabled=true;
        screenshare=b.id==='screenshare';
        mediaStrem=await Utils.getUserMedia({audio:audioPublish.checked,video:videoPublish.checked},screenshare);
        const br=$(`#playback-video-bit-rate`);
        const bitrate=parseInt($('#bitrateInput').value);
        try {
            capture=new ConferenceApi({
                url,worker,
                maxIncomingBitrate:bitrate||0,
                simulcast: simulcast.checked,
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
            }).on('newProducerId',({id,kind})=>{
                conferenceIds[kind]=id;
                console.log('newProducerId',id,kind);
            });
            const v=$('#capture-video');
            v.srcObject=await capture.publish(mediaStrem);
            let playPromise = v.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                }).catch(error => {
                    console.log('errorAutoPlayCallback error');
                });
            }

            $('#stop-publish').disabled=false;
            $('#get-stats').disabled=false;
            $('#get-load').disabled=false;
            $('#get-num-workers').disabled=false;
            $('#get-heap-snapshot').disabled=false;

        }
        catch (e) {
            console.log(e);

            if(e && ERROR[e.errorId]){
                alert(ERROR[e.errorId])
            }
            if(capture){
                await capture.close();

            }

        }

    }));
    let isRecording=false;
    const socketApi=new MediasoupSocketApi(url,worker,'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMiIsImlhdCI6MTU5MDE0NjMxNn0.80ImcNlmRsGLoyDNJ8QUK8W-2lygfvlCWdyBf5VDqrl6Q6hE0FnOj_tL0V5X51v1y8Ah2nCgFykBKahhYW04Nw');
    recording.addEventListener('click', async (event)=> {
        recording.disabled=true;
        const kinds=[];
        if(audioPublish.checked){
            kinds.push('audio')
        }
        if(videoPublish.checked){
            kinds.push('video')
        }
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
    $('#update-bitrate').addEventListener('click', async (event)=> {
        if(capture){
            const bitrate=parseInt($('#bitrateInput').value);
            await capture.setMaxPublisherBitrate(bitrate||0)
        }
    });
    $('#stop-publish').addEventListener('click',async function (event) {
        event.preventDefault();
        if(capture){
            capture.close();
            $('#stop-publish').disabled=true;
            $('#get-stats').disabled=true;
            $('#get-load').disabled=true;
            $('#get-num-workers').disabled=true;
            $('#get-heap-snapshot').disabled=true;
            $$('.capture-button').forEach(b=>b.disabled=false);
            simulcast.disabled=false;

        }
    });
})();
