import dotenv from 'dotenv'
import auth from './service/auth.js'
import getTyres from './service/tyres.js'
import fs from 'fs'
import { addProduct, delProduct, start } from './modules/tyres.js'
dotenv.config()

// import TelegramBot from 'node-telegram-bot-api'

let page = 0
let token = ''

// const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })
const timer = ms => new Promise(resolve => setTimeout(resolve, ms))

const login = async () => {
	await auth().then(res => {
		token = res.data.access_token
	}).catch(error => {
		if (error.response.status === 429) return null
		fs.appendFileSync('log.txt', `${new Date().toString()} ${error}\r\n===========================\r\n`)
		// bot.sendMessage(process.env.TELEGRAM_ID, `❗️ НЕУЧТЕННАЯ ОШИБКА ${error}`)
	})
}

const tyresUpdater = async () => {
	await start()
	await login()
	while (true) {
		await getTyres(token, page)
			.then(async res => {
				if (res.data.length === 0) {
					page = 0
					return await delProduct()
						.catch(error => fs.appendFileSync('log.txt', `${new Date().toString()} ${error}\r\n===========================\r\n`))
				}
				await tyreHandler(res.data)
				page++
			})
			.catch(async error => {
				if (error.response?.status === 429) return null
				if (error.response?.status === 401) return await login()
				fs.appendFileSync('log.txt', `${new Date().toString()} ${error}\r\n===========================\r\n`) // предусмотреть аварийную функцию
				// bot.sendMessage(process.env.TELEGRAM_ID, `❗️ НЕУЧТЕННАЯ ОШИБКА ${error}`)
				await timer(60000)
			})
		await timer(1000)
	}
}

tyresUpdater()

const tyreHandler = async (data) => {
	await Array.from(data).forEach(async el => await addProduct(el)
		.catch(error => fs.appendFileSync('log.txt', `${new Date().toString()} ${error}\r\n===========================\r\n`)))
}
