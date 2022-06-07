import {config as dotenv} from 'dotenv';
dotenv();
import {createServer} from 'http';
import * as express from 'express';
import * as cors from 'cors';
import * as console_stamp from 'console-stamp';
import {join as pathJoin} from "path";
import {json as jsonBodyParser} from "body-parser";
import * as router from 'router';
import {STAT} from 'avcore';
import {sign as signToken,Algorithm} from 'jsonwebtoken';
import {connectMongo, Stat} from './db';
import * as serveIndex from 'serve-index';
import {S3} from "aws-sdk";
import {PassThrough} from 'stream';

const PORT=9099;
const STAT_TYPE={
    [STAT.TRAFFIC]:0,
    [STAT.CPU]:1,
    [STAT.STREAM]:2
};
const auth={
    default:{
        "secret": process.env.AVCORE_SECRET as string,
        "algorithm": "HS512"
    }
};
console_stamp(console, '[HH:MM:ss.l]');
const app = express();
app.use(cors());
app.use(express.static(pathJoin(__dirname,'front')));
app.use('/client/dist',express.static(pathJoin(__dirname,'node_modules/avcore/client/dist')));
app.use('/dist',express.static(pathJoin(__dirname,'node_modules/avcore/dist')));
app.use(jsonBodyParser());
app.use(router());
const server = createServer(app);
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
const s3=new S3({
    accessKeyId: process.env.STORAGE_KEY,
    secretAccessKey: process.env.STORAGE_SECRET,
    params: { Bucket: process.env.STORAGE_BUCKET },
    endpoint: process.env.STORAGE_ENDPOINT,
    s3ForcePathStyle: true, // needed with minio?
    signatureVersion: 'v4'
});
connectMongo().then(()=>{
    app.delete(`/hls/:streamName/:fileName`, async (req, res) => {
        await s3.deleteObject({
            Bucket: process.env.STORAGE_BUCKET as string,
            Key: `hls/${req.params.streamName}/${req.params.fileName}`
        }).promise()
        res.send('OK')
    });
    app.put(`/hls/:streamName/:fileName`, (req, res) => {
        console.log(req.url);
        const pass = new PassThrough();
        s3.upload({
            Bucket: process.env.STORAGE_BUCKET as string,
            Key: `hls/${req.params.streamName}/${req.params.fileName}`,
            Body: pass,
            ContentType:req.params.fileName.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t',
            ACL: 'public-read'
        }, (err, data) => {
            //console.log(err, data);
        });
        req.on('end', async () => {
            res.end();
        });
        req.pipe(pass);
    });
    app.post(`/${STAT.STATS}/:type`,(req,res)=>{
        res.send({success:true});
        if(req.params.type in STAT_TYPE){
            Stat.create({...req.body,type:STAT_TYPE[req.params.type]}).then(()=>{}).catch(()=>{});
        }
    });
    app.get(`/auth/:clientId/:stream/:operation`, async (req, res) => {
        for(const f in req.params){
            if(req.params.hasOwnProperty(f) && req.params[f]==='-'){
                delete req.params[f];
            }
        }
        let _auth=auth.default;
        const serverUrl=req.headers['x-server-url'];
        if( serverUrl && typeof serverUrl==='string' && auth[serverUrl]){
            _auth=auth[serverUrl];
        }
        res.send(signToken({
            ...req.params/* ,exp: Math.floor(Date.now() / 1000 + 12 * 24 * 3600)*/}, _auth.secret, {algorithm: _auth.algorithm as Algorithm}))
    });
    app.use(`/screenshots`,express.static(pathJoin(__dirname,'tests/screenshots')),serveIndex(pathJoin(__dirname,'tests/screenshots'), {'icons': true}));

}).catch(()=>{
});