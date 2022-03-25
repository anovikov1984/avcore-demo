#!/bin/bash
if [[ $# -lt 2 ]]
then
    echo "Usage: ./demoOrigin.sh pubUrl subUrl [pubWorker] [subWorker]" >&2
    exit 1
fi
if [[ -z "$3" ]]
      then
        PUB_WORKER=0;
      else
        PUB_WORKER=$3
    fi
if [[ -z "$4" ]]
      then
        SUB_WORKER=0
      else
        SUB_WORKER=$4
    fi
PUB_SRV=$1
SUB_SRV=$2
CLIENT_ID='codeda';
STREAM_VIDEO="test`date +%s`"

TOKEN_VIDEO=`curl -X GET "https://avcore-demo.codeda.com/auth/${CLIENT_ID}/${STREAM_VIDEO}/1" -H "x-server-url: ${PUB_SRV}" -H "accept: text/plain" 2>/dev/null`

echo "Publish:"
echo ""
echo "https://avcore-demo.codeda.com/demoVideo.html?url=${PUB_SRV}&stream=${STREAM_VIDEO}&token=${TOKEN_VIDEO}&worker=${PUB_WORKER}"
echo ""

echo "Subscribe:"
echo ""
echo "https://avcore-demo.codeda.com/demoVideo.html?url=${SUB_SRV}&worker=${SUB_WORKER}&originUrl=${PUB_SRV}&originWorker=${PUB_WORKER}&stream=${STREAM_VIDEO}&token=${TOKEN_VIDEO}&originToken=${TOKEN_VIDEO}&listen=true"
echo ""