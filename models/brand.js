import db from '../db.js'

const schema = new db.Schema({
	name: { type: String, required: true, maxlength: 255, minlength: 2, trim: true, index: true, unique: true },
	description: { type: String, maxlength: 2000, trim: true, default: 'Описания пока нет.' },
	slug: { type: String, slug: 'name', unique: true }
})

export default db.model('Brand', schema)