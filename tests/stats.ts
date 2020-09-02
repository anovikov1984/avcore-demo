import {connectMongo, Stat} from '../db';

let started=false;
console.log('starting');

connectMongo().then(async ()=>{
    if(!started){
        started=true;
        await allIpCpu();
        await allIp();
        //await oneIp('54.37.208.5');
        console.log('done');

    }
}).catch(()=>{
});

export async function allIpCpu() {
    const formatData=(d)=>[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-');
    const data=await Stat.aggregate([
        {
            '$match': {
                'type': 1
            }
        }, {
            '$group': {
                '_id': '$ip',
                'min': {
                    '$min': '$value'
                },
                'avg': {
                    '$avg': '$value'
                },
                'max': {
                    '$max': '$value'
                },
                'date': {
                    '$max': {
                        '$toDate': '$date'
                    }
                }
            }
        }, {
            '$sort': {
                '_id': 1
            }
        }
    ]);
    console.log(data.map(({_id,date,min,avg,max})=>`${_id}  ${formatData(new Date(date))} ${Math.round(avg*100)}% (${Math.round(min*100)}-${Math.round(max*100)}%) `).join(`
`))
}
export async function allIp() {
    const formatData=(d)=>[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-');
    const data=await Stat.aggregate([
        {
            '$match': {
                'type': 0
            }
        }, {
            '$group': {
                '_id': '$ip',
                'traffic': {
                    '$sum': '$value'
                },
                'date': {
                    '$max': {
                        '$toDate': '$date'
                    }
                }
            }
        }, {
            '$sort': {
                'traffic': -1
            }
        }
    ]);
    console.log(data.map(({_id,traffic,date})=>`${_id}  ${formatData(new Date(date))}   ${(traffic/1024/1024/1024).toFixed(1)}G`).join(`
`))
}
export async function oneIp(ip:string) {
    const formatData=(d)=>[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-');
    const data=await Stat.aggregate([
        {
            '$match': {
                'type': 3,
                ip
            }
        }, {
            '$addFields': {
                'd': {
                    '$divide': [
                        '$date', 86400000
                    ]
                }
            }
        }, {
            '$addFields': {
                'd': {
                    '$trunc': [
                        '$d'
                    ]
                }
            }
        }, {
            '$addFields': {
                'd': {
                    '$multiply': [
                        '$d', 86400000
                    ]
                }
            }
        }, {
            '$addFields': {
                'd': {
                    '$toDate': '$d'
                }
            }
        }, {
            '$group': {
                '_id': '$d',
                'traffic': {
                    '$sum': '$value'
                }
            }
        }, {
            '$sort': {
                '_id': 1
            }
        }
    ]);
    console.log(data.map(({_id,traffic})=>`${formatData(_id)}   ${traffic}`).join(`
`));
}