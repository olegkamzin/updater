import dotenv from 'dotenv'
import db from 'mongoose'
dotenv.config()

db.connect(process.env.DB_CONNECT).then(() => console.log('📶 БД подключена')).catch(error => console.log(error))

export default db
