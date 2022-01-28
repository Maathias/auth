import pino from 'pino'

const logger = pino({
	level: [{ development: 'debug', production: 'info' }[process.env.NODE_ENV]],
})

export default logger
