import db from '../db.js'

const schema = new db.Schema({
	product: { type: db.Types.ObjectId, ref: 'products', required: true },
	articul: { type: String },
	id: { type: Number, unique: true }
})

export default db.model('Kolobox', schema)