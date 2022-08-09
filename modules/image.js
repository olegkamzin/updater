import sharp from 'sharp'
import fs from 'fs'
import axios from 'axios'
import Model from '../models/model.js'

const checkImg = new Map()

const getModels = async () => {
	await Model.find().then(res => {
		for (const el of res) {
			if (el.img.length === 0) checkImg.set(el._id, false)
			else checkImg.set(el._id, true)
		}
	})
}

getModels()

const addModel = async (id) => checkImg.set(id, false)

const getImg = async (id, model) => {
	if (!checkImg.has(model)) return null
	if (checkImg.get(model)) return null

	await axios.get(process.env.KOLOBOX_URL + 'catalog/image/' + id, { responseType: 'arraybuffer' }).then(async res => {
		checkImg.set(model, true)
		await saveImg(res.data).then(async result => {
			await Model.findByIdAndUpdate(model, { $set: { img: result } })
		})
	}).catch(() => null)
}

const saveImg = async (img) => {
	const sizes = [200, 400, 800, null]
	const dir = genName(2) + '/'
	const result = []

	const name = dir + genName(16) + '.webp'
	for (let i = 0; i < sizes.length; i++) {
		const sizeDir = '../api/static/' + sizes[i] + '/'
		if (!fs.existsSync(sizeDir)) fs.mkdirSync(sizeDir)
		const imgDir = sizeDir + dir
		if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir)
		await sharp(img)
			.resize(sizes[i], sizes[i], {fit: 'inside'})
			.toFile(sizeDir + name)
	}
	result.push(name)
	return result
}

const genName = (len) => {
	const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789'
	let str = ''
	for (let i = 0; i < len; i++) {
		const pos = Math.floor(Math.random() * abc.length)
		str += abc.substring(pos,pos+1)
	}
	return str
}

export { getImg, getModels, addModel }