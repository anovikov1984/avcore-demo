import {connect, connection as db, Document, model, Schema} from "mongoose";
const dbConf={
    "uri": "mongodb://127.0.0.1:27017/avcore-stats",
    "reconnectTimeout": 1000
};
db.on('error', (err)=>{
    console.log('connection error:', err.message);
    setTimeout(connectMongo,dbConf.reconnectTimeout);
});
db.once('open', ()=>{
    console.log("Connected to DB!");
});
export interface IStat extends Document{
    date:number
    value:number
    type:number
    ip:string
    clientId?:string
}
export const Stat=model<IStat>('Stat', new Schema({
    date: {type: Number, required:true, default:Date.now},
    value: {type: Number, required:true},
    type: {type: Number, required:true},
    clientId: {type: String, required:false},
    ip: {type: String, required:true}
}));


export function connectMongo() {
    return new Promise((resolve,reject)=>{
        connect(dbConf.uri, {
            useCreateIndex: true,
            useNewUrlParser: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        }).then(async ()=>{
            resolve();
        }).catch(reject);
    })
}