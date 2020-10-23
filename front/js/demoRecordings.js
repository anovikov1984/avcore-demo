(async function () {
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
    const _stream = getParameterByName('stream');
    const url = getParameterByName('url')||'https://rpc.codeda.com';
    const token=getParameterByName('token')||"eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJzdHJlYW0xIiwib3BlcmF0aW9uIjoiMiIsImlhdCI6MTU5MDE0NjMxNn0.80ImcNlmRsGLoyDNJ8QUK8W-2lygfvlCWdyBf5VDqrl6Q6hE0FnOj_tL0V5X51v1y8Ah2nCgFykBKahhYW04Nw"
    const worker = parseInt(getParameterByName('worker')||'0')||0;
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    const api=new MediasoupSocketApi(url,worker,token);
    const listStreams=$('#list-streams');
    const streamTable=$('#stream-table');
    const recordingTable=$('#recording-table');
    listStreams.disabled=false;


    listStreams.addEventListener('click', async (event)=> {
        event.preventDefault();
        const {list}=await api.recordedStreams();
        while(streamTable.rows.length > 0) {
            streamTable.deleteRow(0);
        }
        while (list && list.length) {
            addStreamRow(streamTable,list.shift());
        }
        listStreams.disabled=false;
    });
    function formatDate(d){
        return `${[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-')} ${[`0${d.getHours()}`.slice(-2),`0${d.getMinutes()}`.slice(-2),`0${d.getSeconds()}`.slice(-2)].join(':')}`;
    }

    function addStreamRow(table,{stream,lastModified}) {
        const tr=document.createElement('tr');
        const td1=document.createElement('td');
        td1.innerHTML=`${stream}<br/>${formatDate(new Date(lastModified))}`;
        td1.style.width="100%";
        td1.style.fontSize="20px";
        if(stream===_stream){
            td1.classList.add('contact-form-btn-red');
        }
        tr.appendChild(td1);
        const td2=document.createElement('td');
        const listButton=document.createElement('button');
        listButton.classList.add('contact-form-btn');
        if(stream===_stream){
            listButton.classList.add('contact-form-btn-red');

        }
        listButton.addEventListener('click',async ()=>{
            listButton.disabled=true;
            event.preventDefault();
            const {list}=await api.streamRecordings({stream});
            while(recordingTable.rows.length > 0) {
                recordingTable.deleteRow(0);
            }
            if(list){
                list.sort();
                list.reverse();
            }
            while (list && list.length) {
                addRecordRow(recordingTable,list.shift());
            }
            listButton.disabled=false;
        });
        listButton.innerText='List Recordings';
        listButton.style.width="200px";
        td2.appendChild(listButton);
        tr.appendChild(td2);
        const td3=document.createElement('td');
        const deleteButton=document.createElement('button');
        deleteButton.classList.add('contact-form-btn');
        deleteButton.addEventListener('click',async ()=>{
            deleteButton.disabled=true;
            event.preventDefault();
            await api.deleteStreamRecordings({stream:stream});
            table.removeChild(tr);
            while(recordingTable.rows.length > 0) {
                recordingTable.deleteRow(0);
            }
        });
        deleteButton.innerText='Delete';
        td3.appendChild(deleteButton);
        tr.appendChild(td3);
        table.appendChild(tr);
    }
    function addRecordRow(table,recording) {
        const tr=document.createElement('tr');
        const td1=document.createElement('td');
        const a=document.createElement('a');
        a.target='_blank';
        a.href=recording.url;
        a.innerText=recording.key;
        td1.appendChild(a);
        td1.style.width="100%";
        td1.style.fontSize="30px";
        tr.appendChild(td1);
        const td2=document.createElement('td');
        const deleteButton=document.createElement('button');
        deleteButton.classList.add('contact-form-btn');
        deleteButton.addEventListener('click',async ()=>{
            deleteButton.disabled=true;
            event.preventDefault();
            await api.deleteRecording({filePath:recording.key});
            table.removeChild(tr);
        });
        deleteButton.innerText='Delete';
        td2.appendChild(deleteButton);
        tr.appendChild(td2);
        table.appendChild(tr);
    }
})();
