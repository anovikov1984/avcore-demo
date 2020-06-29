#!/bin/bash
if [[ $# -lt 1 ]]
then
    echo "Usage: ./demo.sh url [worker] [simulcast]" >&2
    exit 1
fi
if [[ -z "$2" ]]
      then
        WORKER=0
      else
        WORKER=$2
    fi
if [[ -z "$3" ]]
      then
        SIMULCAST=""
      else
        SIMULCAST="&simulcast=true"
    fi

SRV=$1

STREAM_VIDEO=`uuidgen`
STREAM_RTMP=`uuidgen`
STREAM_CALL_1=`uuidgen`
STREAM_CALL_2=`uuidgen`

TOKEN_VIDEO=`curl -X GET "${SRV}/auth/${STREAM_VIDEO}/1" -H "accept: text/plain" 2>/dev/null`
TOKEN_RECORDING=`curl -X GET "${SRV}/auth/2" -H "accept: text/plain" 2>/dev/null`
TOKEN_RTMP=`curl -X GET "${SRV}/auth/${STREAM_RTMP}/3" -H "accept: text/plain" 2>/dev/null`
TOKEN_CALL_1=`curl -X GET "${SRV}/auth/${STREAM_CALL_1}/1" -H "accept: text/plain" 2>/dev/null`
TOKEN_CALL_2=`curl -X GET "${SRV}/auth/${STREAM_CALL_2}/1" -H "accept: text/plain" 2>/dev/null`

echo "Publish:"
echo ""
echo "https://avcore-demo.codeda.com/demoVideo.html?url=${SRV}&worker=${WORKER}&stream=${STREAM_VIDEO}&token=${TOKEN_VIDEO}&recToken=${TOKEN_RECORDING}${SIMULCAST}"
echo ""

echo "Subscribe random worker:"
echo ""
echo "https://avcore-demo.codeda.com/demoVideo.html?url=${SRV}&worker=random&stream=${STREAM_VIDEO}&token=${TOKEN_VIDEO}&recToken=${TOKEN_RECORDING}${SIMULCAST}&listen=true"
echo ""

echo "Recordings:"
echo "https://avcore-demo.codeda.com/demoRecordings.html?url=${SRV}&stream=${STREAM_VIDEO}&token=${TOKEN_RECORDING}"
echo ""

echo "Call:"
echo ""
echo "https://avcore-demo.codeda.com/demoCall.html?url=${SRV}&worker=${WORKER}&streamOut=${STREAM_CALL_1}&tokenOut=${TOKEN_CALL_1}&streamIn=${STREAM_CALL_2}&tokenIn=${TOKEN_CALL_2}${SIMULCAST}"
echo ""
echo "https://avcore-demo.codeda.com/demoCall.html?url=${SRV}&worker=${WORKER}&streamOut=${STREAM_CALL_2}&tokenOut=${TOKEN_CALL_2}&streamIn=${STREAM_CALL_1}&tokenIn=${TOKEN_CALL_1}${SIMULCAST}"
echo ""

echo "RTMP:"
echo "url: rtmp://codeda.com/live/"
echo "key: ${STREAM_RTMP}"
echo ""
echo "https://avcore-demo.codeda.com/demoStreaming.html?url=${SRV}&worker=${WORKER}&stream=${STREAM_RTMP}&token=${TOKEN_RTMP}&rtmpUrl=rtmp://127.0.0.1/live/${STREAM_RTMP}"
echo ""
echo "https://avcore-demo.codeda.com/demoVideo.html?url=${SRV}&worker=${WORKER}&stream=${STREAM_RTMP}&token=${TOKEN_RTMP}&listen=true"