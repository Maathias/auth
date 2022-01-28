import { Router } from 'express'
import { decode } from '../jwt.js'

import logger from '../log.js'
import { reIssueJwt } from '../mongo/users.js'

const log = logger.child({ route: 'reissue' })

const router = Router()
export default router

router.get('/reissue', async (req, res) => {
	const top = req.top,
		rememberme = req.query['rememberme'] ?? false,
		jwt = req.cookies[`${top}_jwt`],
		result = await reIssueJwt(jwt)

	if (result) {
		const { udata, jwt: nujwt } = result,
			cookieMeta = {
				domain: `.${top}`,
				encode: String,
				...(rememberme && { maxAge: 3.154e10 }),
			}

		udata.logedin = new Date().getTime()

		res.cookie(`${top}_jwt`, nujwt, cookieMeta)
		res.cookie(`${top}_udata`, JSON.stringify(udata), cookieMeta)
		res.end(`successfuly re-issued your token`)
		log.debug({ before: decode(jwt), after: decode(nujwt) })
	} else {
		res.status(400).end(`could not re-issue your token`)
	}
})
