import {connectMongo, Stat} from '../db';

connectMongo().then(async ()=>{
    const ip='54.255.98.180';
    const formatData=(d)=>[`0${d.getDate()}`.slice(-2),`0${d.getMonth()+1}`.slice(-2),d.getFullYear()].join('-');
    const data=await Stat.aggregate([
        {
            '$match': {
                'type': 0,
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
        }
    ]);
    console.log(data.map(({_id,traffic})=>`${formatData(_id)}   ${traffic}`).join(`
`))
}).catch(()=>{
});