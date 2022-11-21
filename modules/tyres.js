import fs from 'fs'
import Brand from '../models/brand.js'
import Product from '../models/product.js'
import Vendor from '../models/vendor.js'
// import broadcastMessage from '../service/websocket.js'

const brandsList = new Map()
const modelsList = new Map()
const productsList = new Map()
// const pricesList = new Map()
const checkProducts = new Map()

const tyreBrands = async () => {
	// формируем мапу с брендами, чтобы не дрочить БД
	const brandFind = await Brand.find()
	for (const element of Array.from(brandFind)) {
		brandsList.set(element.name, element.id)
	}
}

// const tyresPrice = async () => {
// 	const prices = fs.readFileSync('prices.csv').toString().split('\r\n')
// 	await prices.forEach(el => {
// 		const price = el.split(',')
// 		// if (model.length === 1) return null
// 		pricesList.set(price[0], price[1])
// 	})
// }

const tyreModels = async () => {
	const modelsLog = fs.readFileSync('log.csv').toString().split('\r\n')
	const models = fs.readFileSync('models.csv').toString().split('\r\n')
	await models.forEach(el => {
		const model = el.split(',')
		if (model[1] === 'null') {
			return modelsList.set(model[0], true)
		}
		modelsList.set(model[0], model[1])
	})
	await modelsLog.forEach(el => {
		const model = el.split(',')
		if (model.length === 1) return null
		modelsList.set(model[1], true)
	})
}

const tyreProducts = async () => {
	// формируем мапу с товарами, чтобы не дрочить БД каждый раз
	await Vendor
		.find()
		.populate({ path: 'product', model: 'Product' })
		.then(async res => {
			await res.forEach(el => {
				productsList.set(el.kolobox, {
					product: el.product._id,
					quantity: el.product.quantity,
					price: el.product.wholesale_price
				})
			})
		})
	
}

const start = async () => {
	await tyreBrands()
	await tyreModels()
	await tyreProducts()
	// await tyresPrice()
	// console.log(pricesList)
}

const addProduct = async (el) => {
	let { id, articul, mark, model, tread_width, profile_height, diameter, season, is_studded, runflat, eu_fuel_efficiency, eu_noise_level, eu_grip_on_road, weight, other, load_index, speed_index, price, count_local } = el
	model = model.trim()
	let noise = ''
	price = Number(price)
	checkProducts.set(id, count_local)
	if (eu_noise_level >= 75) noise = '3'
	else if (eu_noise_level >= 61 && eu_noise_level <= 74) noise = '2'
	else if (eu_noise_level <= 60) noise = '1'
	else if (eu_noise_level === 0) noise = '0'

	// проверка наличия бренда в БД, если нет, добавляем
	// if (!brandsList.has(mark)) {
	// 	brandsList.set(mark, false)
	// 	await Brand.create({ name: mark, slug: slug(mark, { lower: true }) })
	// 		.then(brandRes => brandsList.set(brandRes.name, brandRes.id))
	// 		.catch(() => null)
	// }

	// проверка наличия модели в БД, если нет, добавляем
	if (!modelsList.get(model) && brandsList.get(mark) && model) {
		modelsList.set(model, true)
		fs.appendFileSync('log.csv', `${mark},${model},${articul}\r\n`)
	}
	// добавляем товары в БД
	if (brandsList.get(mark) && model && modelsList.get(model) && modelsList.get(model) !== true && articul && !articul.includes('_')) {
		// проверка на отсутствие товара
		if (!productsList.has(id)) {
			return await Product.create({
				brand: brandsList.get(mark),
				model: modelsList.get(model),
				category: process.env.CATEGORY,
				quantity: Number(count_local),
				price: price * 1.23,
				wholesale_price: price,
				weight: Number(weight),
				article: articul,
				params: {
					width: Number(tread_width),
					height: Number(profile_height),
					diameter: diameter.toString(),
					speed_index,
					load_index: Number(load_index),
					thorns: is_studded.toString(),
					fuel_efficiency: eu_fuel_efficiency.toString(),
					grip: eu_grip_on_road.toString(),
					noise,
					runflat: runflat.toString(),
					other,
					season: season.toString()
				}
			}).then(async res => {
				await Vendor.create({ product: res._id, kolobox: id }).then(() => {
					// broadcastMessage({ status: 'ok', update: 'add', id: res._id })
					productsList.set(id, { product: res._id, quantity: res.quantity, price: res.price })
				}).catch(() => null)
			}).catch(() => null)
		}
		// обновление данных в БД и map
		if (productsList.has(id)) {
			const productMap = productsList.get(id)
			if (productMap.price !== price) {
				await Product.findByIdAndUpdate(productMap.product, { wholesale_price: price }, { new: true }).then(async res => {
					productsList.set(id, { product: productMap.product, quantity: res.quantity, price: price })
					// broadcastMessage({ status: 'ok', update: 'price', before: productMap.price, after: price, id: res.id })
				}).catch(() => null)
			}
			if (productMap.quantity !== Number(count_local)) {
				await Product.findByIdAndUpdate(productMap.product, { quantity: Number(count_local) }, { new: true }).then(res => {
					productsList.set(id, { product: productMap.product, quantity: res.quantity, price: productMap.price })
					// broadcastMessage({ status: 'ok', update: 'quantity', before: productMap.quantity, after: Number(count_local), id: res.id })
				}).catch(() => null)
			}
		}
	}
}

const delProduct = async () => {
	for (const [key, value] of productsList) {
		if (!checkProducts.has(key) && value.quantity !== 0) {
			await Product.findByIdAndUpdate(value.product, { $set: { quantity: 0 } }, { new: true })
				.then(res => {
					// broadcastMessage({ status: 'delete', id: res.id })
					return productsList.set(key, { product: value.product, quantity: 0, price: value.price })
				})
				.catch(() => null)
		}
	}
	checkProducts.clear()
}

export { delProduct, addProduct, start }
