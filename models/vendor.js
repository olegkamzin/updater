import db from '../db.js'

const schema = new db.Schema({
	product: { type: db.Types.ObjectId, ref: 'products', required: true },
	kolobox: { type: Number }
})

export default db.model('Vendor', schema)
