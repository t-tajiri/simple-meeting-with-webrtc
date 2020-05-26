import { Device } from 'mediasoup-client'

const io = require('socket.io-client')
const socketPromise = require('socket.io-promise')

//TODO change to import statement from require
//TODO define types
//TODO remove global variables
let device
let producer

export async function connect() {
  const urlParams = new URLSearchParams(window.location.search)
  const roomId    = urlParams.get('roomId')
  const peerName  = urlParams.get('peerName')

  if (!roomId || !peerName) {
    alert('You have to set roomId and peerName in url params. Like ?roomId=room1&peerName=Alice')
    throw new Error('roomId and peerName weren\'t set in url params')
  }

  const options = {
    query: { roomId, peerName }
  }

  const socket = io('http://localhost:8080', options)
  socket.request = socketPromise(socket)

  socket.on('connect', async () => {
    const routerRtpCapabilities = await socket.request('getRouterRtpCapabilities')

    try {
      device = new Device();
    } catch (err) {
      console.error(err);
    }

    await device.load({ routerRtpCapabilities });
  })

  const data = await socket.request('createProducerTransport', {
    rtpCapabilities: device.rtpCapabilities
  })

  const transport = device.createSendTransport();

  transport.on('connect', async ({ dtlsParameters }, cb, errback) => {
    try {
      socket.request('transport-connect', {
        transportId: transport.id,
        dtlsParameters
      })

      cb()
    } catch (errorContent) {
      errback(errorContent)
    }
  })

  transport.on('produce', async ({ kind, rtpParameters, appData }, cb, errback) => {
    try {
      const { id } = await socket.request('transport-produce', {
        transportId: transport.id,
        kind,
        rtpParameters,
        appData
      })

      cb({ id })
    } catch (errorContent) {
      errback(errorContent)
    }
  })

  let stream
  try {
    stream = await getUserMedia(transport)
    const track = stream.getVideoTracks()[0]

    producer = await transport.produce({
      track,
      encodings: [
        { maxBitrate: 350000 },
        { maxBitrate: 650000 }
      ]
    })
  }
}

async function getUserMedia(transport) {
  if (!device.canProduce('video')) {
    console.error('cannot produce video')
    return
  }

  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  } catch (err) {
    console.error('getUserMedia() failed:', err.message)
    throw err
  }

  return stream
}
