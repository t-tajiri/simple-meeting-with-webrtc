const mediasoupClient = require('mediasoup-client')
const io = require('socket.io-client')
const socketPromise = require('socket.io-promise')

let device

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
      device = new mediasoupClient.Device();
    } catch (err) {
      console.error(err);
    }

    await device.load({ routerRtpCapabilities });
  })
}