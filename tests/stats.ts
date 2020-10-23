import {connectMongo, Stat} from '../db';

let started=false;
console.log('starting');

connectMongo().then(async ()=>{
    if(!started){
        started=true;
        await allIpCpu();
        await allIp();
        //await oneIpSum('116.202.235.118');
        //await oneIpCpu('15.185.120.214');
        //await maxCpu();
        console.log('done');

    }
}).catch(()=>{
});

export async function allIpCpu() {
    const formatData=(d)=>[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-');
    const data=await Stat.aggregate([
        {
            '$match': {
                'type': 1,
                //'ip':/116\.202\.235\.[0-9]+/
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
                'type': 0,
                //'ip':/116\.202\.235\.[0-9]+/
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
                },
                'min': {
                    '$min': {
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
    console.log(data.map(({_id,traffic,date,min})=>`${_id} ${formatData(new Date(min))} - ${formatData(new Date(date))}   ${(traffic/1024/1024/1024).toFixed(1)}G`).join(`
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
export async function oneIpCpu(ip:string) {
    const formatData=(d:Date)=>`${[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-')} ${[`0${d.getHours()}`.slice(-2),`0${d.getMinutes()}`.slice(-2),`0${d.getSeconds()}`.slice(-2)].join(':')}`;
    const data=await Stat.aggregate([
        {
            '$match': {
                'type': 1,
                ip
            }
        }
    ]);
    console.log(data.map(({date,value})=>`${formatData(new Date(date))}   ${value}`).join(`
`));
}
export async function oneIpSum(ip:string) {
    const formatData=(d:Date)=>`${[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-')} ${[`0${d.getHours()}`.slice(-2),`0${d.getMinutes()}`.slice(-2),`0${d.getSeconds()}`.slice(-2)].join(':')}`;
    //const formatData=(d)=>[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-');
    const data=await Stat.aggregate([
        {
            '$match': {
                'type': 0,
                ip,
                date:{$gte:1599256951120-60000, $lte:1599257107608+60000}
            }
        }, {
            '$group': {
                '_id': '$date',
                'traffic': {
                    '$sum': '$value'
                }
            }
        }
    ]);
    console.log(data.map(({_id,traffic})=>`${formatData(new Date(_id))} ${traffic}`).join(`
`));
}
export async function maxCpu() {
    //const formatData=(d:Date)=>`${[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-')} ${[`0${d.getHours()}`.slice(-2),`0${d.getMinutes()}`.slice(-2),`0${d.getSeconds()}`.slice(-2)].join(':')}`;
    const data=await Stat.find({'ip':/116\.202\.235\.[0-9]+/,type:1,value:{$gte:0.8}});
    console.log(data.map(({ip,date,value})=>`${ip} ${date}  ${Math.round(value*100)}%`).join(`
`));
}