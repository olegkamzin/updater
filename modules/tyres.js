import slug from 'slugify'
import Model from '../models/model.js'
import Brand from '../models/brand.js'
import Product from '../models/product.js'
import Vendor from '../models/vendor.js'
import { addModel, getImg } from './image.js'
import broadcastMessage from '../service/websocket.js'

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
	const productFind = await Vendor
		.find()
		.populate({ path: 'product', model: 'Product' })
	for (const element of Array.from(productFind)) {
		productsList.set(element.vendors.kolobox.id, {
			product: element.product._id,
			quantity: element.product.quantity,
			price: element.vendors.kolobox.price
		})
	}
}

const start = async () => {
	await tyreBrands()
	await tyreModels()
	await tyreProducts()

	console.log(brandsList)
	console.log(modelsList)
	console.log(productsList)
}

start()

const addProduct = async (el) => {
	let { id, articul, mark, model, tread_width, profile_height, diameter, season, is_studded, runflat, eu_fuel_efficiency, eu_noise_level, eu_grip_on_road, weight, other, load_index, speed_index, price, count_local, image_url } = el
	let noise = ''
	model = model.replace(/[()-]/g, ' ').replace(/\s+/g, ' ').trim()
	price = Number(price)
	const modelSlug = slug(model, { lower: true })
	const retail_price = Math.ceil(price * 1.18)
	if (eu_noise_level >= 75) noise = '3'
	else if (eu_noise_level >= 61 && eu_noise_level <= 74) noise = '2'
	else if (eu_noise_level <= 60) noise = '1'
	else if (eu_noise_level === 0) noise = '0'

	checkProducts.set(id, count_local)

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
			await addModel(modelRes.id) // обновление map с наличием изображений
		})
	}

	// добавляем товары в БД
	if (brandsList.get(mark) && modelsList.get(model) && model && articul) {
		// сохранение и добавление изображения
		await getImg(modelsList.get(model), image_url)
		// проверка на отсутствие товара
		if (!productsList.has(id)) {
			console.log(123123)
			return await Product.create({
				brand: brandsList.get(mark),
				model: modelsList.get(model),
				category: process.env.CATEGORY,
				quantity: Number(count_local),
				price: Number(retail_price),
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
				await Vendor.create({
					product: productRes._id,
					vendors: {
						kolobox: {
							articul,
							id,
							price: Number(price)
						}
					}
				}).then(() => {
					broadcastMessage({ status: 'add', id: productRes._id })
					productsList.set(id, { product: productRes._id, quantity: productRes.quantity, price })
				}).catch(error => console.log(error))
			}).catch(error => console.log(error))
		}
		// обновление данных в БД и map
		if (productsList.has(id)) {
			const productMap = productsList.get(id)
			if (productMap.price !== Number(price)) {
				await Product.findByIdAndUpdate(productMap.product, { price: Number(retail_price) }, { new: true }).then(async el => {
					productsList.set(id, { product: productMap.product, quantity: el.quantity, price: Number(price) })
					await Vendor.findOneAndUpdate({ product: el._id }, { $set: { price_wholesale: price } })
					broadcastMessage({ status: 'price', before: productMap.price, after: price, id: el.id })
				}).catch(error => console.log(error))
			}
			if (productMap.quantity !== Number(count_local)) {
				await Product.findByIdAndUpdate(productMap.product, { quantity: Number(count_local) }, { new: true }).then(el => {
					productsList.set(id, { product: productMap.product, quantity: el.quantity, price: Number(retail_price) })
					broadcastMessage({ status: 'quantity', before: productMap.quantity, after: Number(count_local), id: el.id })
				}).catch(error => console.log(error))
			}
		}
	}
}

const delProduct = async () => {
	for (const [key, value] of productsList) {
		if (!checkProducts.has(key) && value.quantity !== 0) {
			await Product.findByIdAndUpdate(value.product, { $set: { quantity: 0 } }, { new: true })
				.then(res => {
					broadcastMessage({ status: 'delete', id: res.id })
				})
			return productsList.set(key, { product: value.product, quantity: 0, price: value.price })
		}
	}
	checkProducts.clear()
}

export { delProduct, addProduct }
