import dotenv from 'dotenv'
import auth from './service/auth.js'
import getTyres from './service/tyres.js'
import fs from 'fs'
import { addProduct, delProduct } from './modules/tyres.js'
dotenv.config()

// import TelegramBot from 'node-telegram-bot-api'

let page = 0
let token = ''

// const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })
const timer = ms => new Promise(resolve => setTimeout(resolve, ms))

const login = async () => {
	auth().then(res => {
		token = res.data.access_token
	}).catch(error => {
		// if (error.response.status === 429) return login()
		fs.appendFileSync('log.txt', `${error}\r\n===========================\r\n`)
		console.log('❗️ НЕУЧТЕННАЯ ОШИБКА АВТОРИЗАЦИИ', error) // предусмотреть аварийную функцию
		// bot.sendMessage(process.env.TELEGRAM_ID, `❗️ НЕУЧТЕННАЯ ОШИБКА ${error}`)
	})
}

login().then(() => tyresUpdater()).catch(error => console.log(error))

const tyresUpdater = async () => {
	while (true) {
		await getTyres(token, page)
			.then(async res => {
				if (res.data.length === 0) {
					page = 0
					return await delProduct()
						.catch(error => fs.appendFileSync('log.txt', `${error}\r\n===========================\r\n`))
				}
				await tyreHandler(res.data)
				page++
			})
			.catch(async error => {
				if (error.response?.status === 429) return null
				if (error.response?.status === 401) return login()
				fs.appendFileSync('log.txt', `${error}\r\n===========================\r\n`) // предусмотреть аварийную функцию
				// bot.sendMessage(process.env.TELEGRAM_ID, `❗️ НЕУЧТЕННАЯ ОШИБКА ${error}`)
				await timer(60000)
			})
		await timer(1200)
	}
}

const tyreHandler = async (data) => {
	console.log(data)
	await Array.from(data).forEach(async el => await addProduct(el)
		.catch(error => fs.appendFileSync('log.txt', `${error}\r\n===========================\r\n`)))
}
