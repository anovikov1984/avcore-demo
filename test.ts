import {MediasoupSocketApi} from "avcore";
const url='https://virtual-streaming.sajilni.com';
const token='eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNvZGVkYSIsInN0cmVhbSI6ImE4ZTBhZmY4LTdjNGItNGVkNC1iYTJlLTlhNjA0NmZlMWQ2ZiIsIm9wZXJhdGlvbiI6IjQiLCJpYXQiOjE2MTI4Nzk4MzJ9.0uCF5cfzUN5bq9OOdd9kKYFqFoZXeaBiPzyozuuzAjYAF10pno6S--7VYcppqPF7bQ2LA6gsWMdGKyjCQ62fFQ';
(async function(){
    const api=new MediasoupSocketApi(url,0,token);
    const {num}=await api.numWorkers();
    console.log(`numWorkers ${num}`)
    for (let i=0;i<num;i++){
        const api=new MediasoupSocketApi(url,i,token);
        const {currentLoad}=await api.workerLoad();
        console.log(`currentLoad ${currentLoad} for ${i}`)
    }
    return 'done'

})().then(console.log).catch(console.error);
