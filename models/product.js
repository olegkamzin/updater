import db from '../db.js'

const schema = new db.Schema({
	brand: { type: db.Types.ObjectId, ref: 'brands', required: 'Необходимо указать бренд.' },
	model: { type: db.Types.ObjectId, ref: 'models', required: 'Необходимо указать модель.' },
	category: { type: db.Types.ObjectId, ref: 'categories', required: 'Необходимо указать категорию.' },
	quantity: { type: Number, required: 'Необходимо указать количество.' },
	price: { type: Number },
	weight: { type: Number },
	params: { type: Object, required: 'Параметры товара обязательный для заполнения' }
})

export default db.model('Product', schema)
