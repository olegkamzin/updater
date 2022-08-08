import db from '../db.js'

const schema = new db.Schema({
	name: { type: String, required: true, maxlength: 255, minlength: 2, trim: true, index: true, unique: true },
	description: { type: String, maxlength: 2000, trim: true },
	brand: { type: db.Types.ObjectId, ref: 'brands', required: true },
    rating: { type: Number, max: 5, min: 0 },
	slug: { type: String, slug: 'name', unique: true },
	img: { type: Array, required: true }
})

export default db.model('Model', schema)