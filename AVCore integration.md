# AVCore Integration
DEMOS:
 - demoVideo.js - single stream publish or subscribe by input parameters.
 - demoCall.js - call by input parameters
 - demoStreaming.js -for rtmp/rtp or ondemands according to input parameters
 - demoRecordings.js - admin demo for recordings

 - demo1.js - fixed publisher
 - demo2.js - fixed subscriber



# 1: Authorise and publish a stream

The first step is to publish some stream from:
 - web camera
 - microphone
 - screenshare

 The demoVideo.js is an simple code example which demonstrates a single stream publish (and watch - Step 2) by input parameters. [publish demoVideo] is also available. 
 
 Paremetrs:
 - url - server url
 - worker - server worker number
 - stream - stream name (uuid for example), randomly generated
 - token - jwt-token for published stream above

Token generation for the stream with publish permissions:

```sh
import {Algorithm, sign} from "jsonwebtoken"
import {API_OPERATION} from 'avcore';
token = sign({stream,operation:API_OPERATION.PUBLISH, exp: Math.floor(Date.now() / 1000 + 12*24 * 3600)},config.secret,{ algorithm: config.algorithm as Algorithm})
```

 - simulcast - if specified, the stream will be with simulcast
 - kinds - audio, video or audio or video. If not specified, then audio, video

To publish a stream in JS you need to create a new coference (look at demoVideo.js example):

```sh
capture = new ConferenceApi({
                    kinds,
                    url,worker,
                    stream,
                    token
                }

```

and publish:

```sh
 await capture.publish(_stream);
```
 
# 2: Subscribe to a stream

In order to see the published stream you need to subscribe for the stream. The demoVideo.js is an simple code example which demonstrates a  stream subscribe by input parameters. [subscribe demoVideo] is also available.

Paremeters:

 - liste - true to subscribe, (false for publish)
 - url - server url
 - worker - worker number on the server (random - will select random)
 - stream - stream name (uuid for example), randomly generated
 - token - jwt-token for subscriber the stream above

The token generation for the stream with subscribe rights:
```sh
import {Algorithm, sign} from "jsonwebtoken"
import {API_OPERATION} from 'avcore';
token = sign({stream,operation:API_OPERATION.SUBSCRIBE, exp: Math.floor(Date.now() / 1000 + 12*24 * 3600)},config.secret,{ algorithm: config.algorithm as Algorithm})
```
 - kinds - audio, video or audio or video. If not specified, then audio, video

For subscribe in the code you need to create a playback (look at demoVideo.js):
```sh
               playback = new ConferenceApi({
                    url,worker,
                    kinds,
                    token,
                    stream,
                    simulcast
                }
```

and subscribe:
```sh
const mediaStream=await playback.subscribe();
                v.srcObject=mediaStream;
```

# 3: Pull an RTMP stream (from source such as OBS) and expose it as a webrtc stream similar to others (like webcams)










[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)



   [publish demoVideo]: <https://avcore-demo.codeda.com/demoVideo.html?url=https://meeting-mcu.codeda.com:8080&worker=0&stream=e5c8461a-be40-4716-85d7-a009790e9c2b&token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJlNWM4NDYxYS1iZTQwLTQ3MTYtODVkNy1hMDA5NzkwZTljMmIiLCJvcGVyYXRpb24iOiIxIiwiaWF0IjoxNTk0Mzc0MTkxfQ.CrZ7JrutywN_wr6GJFL-C88eGONO9OgyWoYrPeNfCrga3iiAi44GFBzd1Ot5RXqIKAUH_0ktZV9pUV3L1YiwXw&recToken=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJvcGVyYXRpb24iOiIyIiwiaWF0IjoxNTk0Mzc0MTkyfQ.76D3AqsWeiJTge4DBCIwlxBhhDE2MimzcR20GtxopJegZMy5P0YG1oboMHGeZa4J9N5VDebw7-lrbPcvhiCKZQ>
   
   [subsribe demoVideo]: <https://avcore-demo.codeda.com/demoVideo.html?url=https://meeting-mcu.codeda.com:8080&worker=random&stream=e5c8461a-be40-4716-85d7-a009790e9c2b&token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdHJlYW0iOiJlNWM4NDYxYS1iZTQwLTQ3MTYtODVkNy1hMDA5NzkwZTljMmIiLCJvcGVyYXRpb24iOiIxIiwiaWF0IjoxNTk0Mzc0MTkxfQ.CrZ7JrutywN_wr6GJFL-C88eGONO9OgyWoYrPeNfCrga3iiAi44GFBzd1Ot5RXqIKAUH_0ktZV9pUV3L1YiwXw&recToken=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJvcGVyYXRpb24iOiIyIiwiaWF0IjoxNTk0Mzc0MTkyfQ.76D3AqsWeiJTge4DBCIwlxBhhDE2MimzcR20GtxopJegZMy5P0YG1oboMHGeZa4J9N5VDebw7-lrbPcvhiCKZQ&listen=true>
   

