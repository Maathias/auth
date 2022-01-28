import mongoose from 'mongoose'
import logger from './log.js'

const log = logger.child({ module: 'mongo' })

const {
	MONGO_HOST,
	MONGO_PORT,
	MONGO_NAME,
	MONGO_AUTH = 'admin',
	MONGO_USER,
	MONGO_PASS,
} = process.env

mongoose.connect(`mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_NAME}`, {
	auth: { authSource: MONGO_AUTH },
	user: MONGO_USER,
	pass: MONGO_PASS,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	// useFindAndModify: false,
})

var db = mongoose.connection

db.on('error', (err) => {
	log.fatal(err, 'db error')
	throw err
})

db.once('open', () => {
	log.info('db connected')
})

var Database = {}

export default Database
