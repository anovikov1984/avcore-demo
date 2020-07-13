import {createServer} from 'http';
import * as express from 'express';
import * as cors from 'cors';
import * as console_stamp from 'console-stamp';
import {connect, connection as db, Document, model, Schema} from "mongoose";
import {join} from "path";
import {json as jsonBodyParser} from "body-parser";
import * as router from 'router';
import {STAT} from 'avcore';
import {loadTestAudio} from './tests/load-test-audio';
const PORT=9099;
const STAT_TYPE={
    [STAT.TRAFFIC]:0,
    [STAT.CPU]:1,
};
const dbConf={
    "uri": "mongodb://127.0.0.1:27017/avcore-stats",
    "reconnectTimeout": 1000
};
console_stamp(console, '[HH:MM:ss.l]');
const app = express();
app.use(cors());
app.use(express.static(join(__dirname,'front')));
app.use('/client/dist',express.static(join(__dirname,'node_modules/avcore/client/dist')));
app.use('/dist',express.static(join(__dirname,'node_modules/avcore/dist')));
app.use(jsonBodyParser());
app.use(router());
const server = createServer(app);
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

db.on('error', (err)=>{
    console.log('connection error:', err.message);
    setTimeout(connectMongo,dbConf.reconnectTimeout);
});
db.once('open', ()=>{
    console.log("Connected to DB!");
});
interface IStat extends Document{
    date:number
    value:number
    type:number
    ip:string
}
const Stat=model<IStat>('Stat', new Schema({
    date: {type: Number, required:true, default:Date.now},
    value: {type: Number, required:true},
    type: {type: Number, required:true},
    ip: {type: String, required:true}
}));


function connectMongo() {
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
connectMongo().then(()=>{
    app.post(`/${STAT.STATS}/:type`,(req,res)=>{
        res.send({success:true});
        Stat.create({...req.body,type:STAT_TYPE[req.params.type]}).then(()=>{}).catch(()=>{});
    });
}).catch(()=>{
});
loadTestAudio().then(()=>{}).catch(()=>{});