
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 3001 })

wss.on('connection', ws => {
	ws.send(JSON.stringify({ status: 'ok' }))
})

const broadcastMessage = (msg) => {
	wss.clients.forEach(client => {
		client.send(JSON.stringify(msg))
	})
}

export default broadcastMessage
