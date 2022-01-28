import { Router } from 'express'
import { stale, validate, decode } from '../jwt.js'

import logger from '../log.js'
import { getUserUuid } from '../mongo/users.js'

const log = logger.child({ route: 'verify' })

const { EXTERNAL_SECRET } = process.env

const router = Router()
export default router

router.get('/verify', async (req, res) => {
	const top = req.top,
		jwt = req.cookies[`${top}_jwt`]

	const ok = validate(jwt),
		isStale = stale(jwt)

	return res.json({
		success: true,
		ok,
		stale: isStale,
	})
})

router.get('/user', async (req, res) => {
	if (req.get('authorization') !== 'Bearer ' + EXTERNAL_SECRET)
		return res.status(403).end(`Bearer token required`)

	const jwt = req.query['jwt'] ?? ''

	const udata = decode(jwt) ?? {}

	log.info(
		{
			udata,
			ip: req.realIp,
		},
		`User info requested`
	)

	return res.json(await getUserUuid(udata.id))
})
