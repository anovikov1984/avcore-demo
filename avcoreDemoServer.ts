import {createServer} from 'http';
import * as express from 'express';
import * as cors from 'cors';
import * as console_stamp from 'console-stamp';
import {join} from "path";
import {json as jsonBodyParser} from "body-parser";
import * as router from 'router';
const PORT=9099;
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