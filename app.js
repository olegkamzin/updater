import auth from './service/auth.js'
import getTyres from './service/tyres.js'
import { addProduct, delProduct } from './modules/tyres.js'

// import TelegramBot from 'node-telegram-bot-api'

let page = 0
let token = ''
let check = true

// const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })
const timer = ms => new Promise(res => setTimeout(res, ms))

const login = async () => {
	auth().then(res => {
		token = res.data.access_token
	}).catch(error => {
		// if (error.response.status === 429) return login()
		console.log('❗️ НЕУЧТЕННАЯ ОШИБКА', error) // предусмотреть аварийную функцию
		// bot.sendMessage(process.env.TELEGRAM_ID, `❗️ НЕУЧТЕННАЯ ОШИБКА ${error}`)
	})
}

login().then(() => tyresUpdater()).catch(error => console.log(error))

const tyresUpdater = async () => {
	while (check) {
		await getTyres(token, page)
			.then(async res => {
				if (res.data.length === 0) {
					page = 0
					return await delProduct()
				}
				await tyreHandler(res.data)
				page++
			})
			.catch(async error => {
				if (error.response?.status === 429) return null
				if (error.response?.status === 401) return login()
				console.log('❗️ НЕУЧТЕННАЯ ОШИБКА', error) // предусмотреть аварийную функцию
				// bot.sendMessage(process.env.TELEGRAM_ID, `❗️ НЕУЧТЕННАЯ ОШИБКА ${error}`)
				await timer(60000)
			})
		await timer(1100)
	}
}

const tyreHandler = async (data) => {
	Array.from(data).forEach(async el => await addProduct(el).catch(err => console.log(err)))
}
