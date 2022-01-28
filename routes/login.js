import { Router } from 'express'

import { discord, facebook } from '../code.js'
import { decode, generate, validate } from '../jwt.js'
import logger from '../log.js'

import {
	getUserSocialId,
	getUserUname,
	getUserUnamePass,
	putUser,
} from '../mongo/users.js'
import Token from '../Token.js'

const log = logger.child({ route: 'login' })

const { DOMAINS } = process.env

const platforms = {
	discord,
}

const router = Router()
export default router

router.post('/login', async (req, res) => {
	const top = DOMAINS.split(',').find((domain) =>
		req.get('host').endsWith(domain)
	)

	if (!top) {
		return res.status(400).end('Invalid domain')
	}

	let { socials, uname, pass, rememberme = true, register = false } = req.body,
		jwt = req.cookies[`${top}_jwt`],
		uinfo = JSON.parse(req.cookies[`${top}_udata`] ?? 'null')

	let udata = jwt && uinfo && validate(jwt) && decode(jwt)

	function sendJwt(user) {
		let nuinfo = {
			id: user.id,
			uname: user.uname,
			socials: {},
			logedin: new Date().getTime(),
		}

		for (let platform in user.socials) {
			nuinfo.socials[platform] = encodeURI(user.socials[platform].name)
		}

		const cookieMeta = {
			domain: `.${top}`,
			encode: String,
			...(rememberme && { maxAge: 3.154e10 }),
		}

		let jwt = generate(nuinfo)

		log.info({ nuinfo, top, ip: req.realIp }, `Login successful`)

		res.cookie(`${top}_jwt`, jwt, cookieMeta)
		res.cookie(`${top}_udata`, JSON.stringify(nuinfo), cookieMeta)

		res.json({
			success: true,
			nuinfo,
			jwt,
		})
	}

	function feedback(code, error, other) {
		if (!res.headersSent)
			res.status(code).json({
				success: false,
				error,
				...other,
			})
	}

	var tokens = {},
		tokenOk = false

	// auth connected platforms
	for (let platform in socials) {
		try {
			tokens[platform] = await platforms[platform]?.(
				socials[platform].code,
				top
			)
			tokenOk = tokenOk || !!tokens[platform]
		} catch (err) {
			tokens[platform] = false
			return feedback(400, `Could not verify ${platform} account`)
		}
	}

	logger.debug(
		{ jwt, udata, body: { ...req.body, pass: '*' }, tokens },
		`Requested login/register`
	)

	if (register) {
		if (tokenOk && udata) {
			// add to account
		} else if (uname && pass && !tokenOk) {
			// platform required
			return feedback(
				409,
				'A connected account is required to register a new account'
			)
		} else if (uname && pass && tokenOk) {
			// create account

			// uname and pass required
			if (typeof uname != 'string' || typeof pass != 'string')
				return feedback(400, 'Username and password required')

			// uname and pass non empty
			if (uname.length < 1 || pass.length < 1)
				return feedback(400, 'Username and password cannot be empty')

			// username is taken
			if ((await getUserUname(uname)) !== null) {
				return feedback(409, `username '${uname}' is taken`)
			}

			// check for existing accounts
			for (let platform in tokens) {
				let token = tokens[platform]

				if (token instanceof Token)
					if ((await getUserSocialId(platform, token.id)) !== null) {
						// social account is already connected
						return feedback(
							409,
							`${platform} account is already connected to an existing user`
						)
					}
			}

			// add to db
			putUser({ uname, pass, socials: tokens })
				.then((user) => {
					log.debug(user, `Registered new user`)
					sendJwt(user)
				})
				.catch((err) => {
					log.error(err, `db error: creating a user`)
					feedback(500, `There was an error while creating your account`)
				})
		} else {
			// insufficient data

			return feedback(
				400,
				'Username, password and at least one platform connected is required to register'
			)
		}
	} else {
		if (tokenOk) {
			// log in with platform

			for (let platform in tokens) {
				let token = tokens[platform]

				if (token instanceof Token) {
					let user
					try {
						user = await getUserSocialId(platform, token.id)
					} catch (err) {
						log.error(err, `db error: token login`)
						return feedback(
							500,
							`There was a problem with your ${platform} account`
						)
					}

					if (user === null)
						return feedback(404, `${platform} account is not registered`, {
							registerpls: true,
						})
					else return sendJwt(user)
				}
			}
		} else if (uname && pass) {
			// log in with uname & pass

			// uname and pass required
			if (typeof uname != 'string' || typeof pass != 'string')
				return feedback(400, 'Username and password required')

			// uname and pass non empty
			if (uname.length < 1 || pass.length < 1)
				return feedback(400, 'Username and password cannot be empty')

			getUserUnamePass(uname, pass)
				.then((user) => {
					if (user !== null) sendJwt(user)
					else feedback(404, `Username or password invalid`)
				})
				.catch((err) => {
					log.error(err, `db error: pwd login`)
					feedback(500, `Could not log in`)
				})
		}
	}
})
