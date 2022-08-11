import slug from 'slugify'
import Model from '../models/model.js'
import Brand from '../models/brand.js'
import Product from '../models/product.js'
import Kolobox from '../models/kolobox.js'
import { addModel, getImg } from './image.js'
import { Worker } from 'worker_threads'

const worker = new Worker('./worker/app.js')

const brandsList = new Map()
const modelsList = new Map()
const productsList = new Map()
const checkProducts = new Map()

const tyreBrands = async () => {
	// формируем мапу с брендами, чтобы не дрочить БД
	const brandFind = await Brand.find()
	for (const element of Array.from(brandFind)) {
		brandsList.set(element.name, element.id)
	}
}

const tyreModels = async () => {
	// формируем мапу с моделями, чтобы не дрочить БД
	const modelFind = await Model.find()
	for (const element of Array.from(modelFind)) {
		modelsList.set(element.name, element.id)
	}
}

const tyreProducts = async () => {
	// формируем мапу с товарами, чтобы не дрочить БД каждый раз
	Kolobox.find()
		.populate({ path: 'product', model: 'Product' })
		.then(res => {
			for (const element of Array.from(res)) {
				productsList.set(element.id, {
					product: element.product._id,
					quantity: element.product.quantity,
					price: element.product.price
				})
			}
		})
}

const start = async () => {
	await tyreBrands()
	await tyreModels()
	await tyreProducts()
}

start()

const addProduct = async (el) => {
	let { id, articul, mark, model, tread_width, profile_height, diameter, season, is_studded, runflat, eu_fuel_efficiency, eu_noise_level, eu_grip_on_road, weight, other, load_index, speed_index, price, count_local, image_url } = el
	let noise = ''
	model = model.replace(/[()-]/g, ' ').replace(/\s+/g, ' ').trim()
	const modelSlug = slug(model, { lower: true })
	price = Math.ceil(price * (1 - 5 / 100))
	if (eu_noise_level >= 75) noise = '3'
	else if (eu_noise_level >= 61 && eu_noise_level <= 74) noise = '2'
	else if (eu_noise_level <= 60) noise = '1'
	else if (eu_noise_level === 0) noise = '0'

	checkProducts.set(await id, await count_local)

	// проверка наличия бренда в БД, если нет, добавляем
	if (!brandsList.has(mark)) {
		brandsList.set(mark, false)
		await Brand.create({ name: mark, slug: slug(mark, { lower: true }) }).then(brandRes => brandsList.set(brandRes.name, brandRes.id))
	}
	// проверка наличия модели в БД, если нет, добавляем
	if (!modelsList.has(model) && brandsList.get(mark) && model) {
		modelsList.set(model, false)
		await Model.create({ name: model, brand: brandsList.get(mark), slug: modelSlug }).then(async modelRes => {
			modelsList.set(modelRes.name, modelRes.id)
			await addModel(modelRes.id) // обновление мапы с наличием изображений
		})
	}

	// добавляем товары в БД
	if (brandsList.get(mark) && modelsList.get(model) && model && articul) {
		// сохранение и добавление изображения
		await getImg(modelsList.get(model), image_url)
		// проверка на отсутствие товара
		if (!productsList.has(id)) {
			return await Product.create({
				brand: brandsList.get(mark),
				model: modelsList.get(model),
				category: process.env.CATEGORY,
				quantity: Number(count_local),
				price: Number(price),
				weight: Number(weight),
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
			}).then(async productRes => {
				await Kolobox.create({ product: productRes._id, articul, id }).then(() => {
					productsList.set(id, { product: productRes._id, quantity: productRes.quantity, price: productRes.price })
				}).catch(error => console.log(error))
			}).catch(error => console.log(error))
		}
		// обновление данных в БД и мапе
		if (productsList.has(id)) {
			const productMap = productsList.get(id)
			if (productMap.price !== Number(price)) {
				worker.postMessage('Изменилась цена ' + articul + ' | ' + 'Старая цена: ' + productMap.price + ' Новая цена: ' + Number(price))
				await Product.findByIdAndUpdate(productMap.product, { price: Number(price) }, { new: true }).then(el => productsList.set(id, {
					product: productMap.product,
					quantity: el.quantity,
					price: el.price
				})).catch(error => console.log(error))
			}
			if (productMap.quantity !== Number(count_local)) {
				worker.postMessage('Изменилось кол-во ' + articul + ' | ' + 'Было: ' + productMap.quantity + ' Стало: ' + Number(count_local))
				await Product.findByIdAndUpdate(productMap.product, { quantity: Number(count_local) }, { new: true }).then(el => productsList.set(id, {
					product: productMap.product,
					quantity: el.quantity,
					price: el.price
				})).catch(error => console.log(error))
			}
		}
	}
}

const delProduct = async () => {
	const updateTime = new Date().toLocaleTimeString()
	console.log(updateTime, '*** Запуск проверки')
	for (const [key, value] of productsList) {
		if (!checkProducts.has(key) && value.quantity !== 0) {
			await Product.findByIdAndUpdate(value.product, { $set: { quantity: 0 } }, { new: true })
				.then(async res => console.log(`${key} было ${value.quantity} и стало ${res.quantity}`))
			return productsList.set(key, { product: value.product, quantity: 0, price: value.price })
		}
	}
	checkProducts.clear()
}

export { delProduct, addProduct }
