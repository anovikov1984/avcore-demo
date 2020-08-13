import {createServer} from 'http';
import * as express from 'express';
import * as cors from 'cors';
import * as console_stamp from 'console-stamp';
import {join} from "path";
import {json as jsonBodyParser} from "body-parser";
import * as router from 'router';
import {STAT} from 'avcore';
import {connectMongo, Stat} from './db';
const PORT=9099;
const STAT_TYPE={
    [STAT.TRAFFIC]:0,
    [STAT.CPU]:1,
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

connectMongo().then(()=>{
    app.post(`/${STAT.STATS}/:type`,(req,res)=>{
        res.send({success:true});
        Stat.create({...req.body,type:STAT_TYPE[req.params.type]}).then(()=>{}).catch(()=>{});
    });
}).catch(()=>{
});