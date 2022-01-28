import env from './env.js'

import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

import Database from './mongo.js'
import logger from './log.js'

import login from './routes/login.js'
import reissue from './routes/reissue.js'
import verify from './routes/verify.js'

import { reIssueJwt } from './mongo/users.js'

const { HTTP_PORT, DOMAINS, REDIRECT_URI } = process.env

const http = express()

// express settings
http.use(express.static('public'))
http.use(express.json())
http.use(
	cors({
		origin: DOMAINS.split(',').map(
			(domain) => new RegExp(`^(.*\\.)?${domain.split('.').join('\\.')}$`)
		),
	})
)

http.use(cookieParser())

http.set('views', './views')
http.set('view engine', 'ejs')

http.use((req, res, next) => {
	req.realIp = req.get('cf-connecting-ip') ?? req.get('x-real-ip') ?? req.ip
	req.top = DOMAINS.split(',').find((domain) =>
		req.get('host').endsWith(domain)
	)

	next()
})

http.use(login)
http.use(reissue)
http.use(verify)

http.listen(HTTP_PORT, () => {
	console.log(`HTTP Listening: ${HTTP_PORT}`)
})

http.get('/', (req, res) => {
	const host = req.get('host'),
		top = req.top

	if (!top) {
		logger.warn({ host, ip: req.realIp }, `Invalid domain`)
		return res.status(400).end('Invalid domain')
	}

	logger.debug(
		{
			host,
			top,
			ip: req.realIp,
		},
		`Homepage hit`
	)

	reIssueJwt(req.cookies[`${top}_jwt`])

	res.render('index.ejs', {
		meta: {
			top,
			host,

			REDIRECT_URI,
			socials: {
				DISCORD_APP_ID: process.env[`DISCORD_APP_ID_${top}`],
				// FACEBOOK_APP_ID: process.env[`FACEBOOK_APP_ID_${top}`],
			},
			customs: {
				colors: {
					primary: process.env[`COLOR_PRIMARY_${top}`],
					secondary: process.env[`COLOR_SECONDARY_${top}`],
				},
				REDIRECT_URI: process.env[`REDIRECT_URI_${top}`],
			},
		},
	})
})
