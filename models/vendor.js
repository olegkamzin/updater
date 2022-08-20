import db from '../db.js'

const schema = new db.Schema({
	product: { type: db.Types.ObjectId, ref: 'products', required: true },
	vendors: { type: Object }
})

export default db.model('Vendor', schema)
