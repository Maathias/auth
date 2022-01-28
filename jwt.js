import jwt from 'jsonwebtoken'

const { WEBTOKEN_SECRET, STALE_JWT } = process.env

function generate(payload) {
	return jwt.sign(payload, WEBTOKEN_SECRET)
}

function decode(token) {
	try {
		return jwt.decode(token)
	} catch (err) {
		return false
	}
}

function validate(token) {
	try {
		return !!jwt.verify(token, WEBTOKEN_SECRET)
	} catch (err) {
		return false
	}
}

function stale(token) {
	const udata = decode(token)

	if (udata) {
		if (new Date().getTime() / 1e3 - udata.iat > STALE_JWT) {
			return true
		} else return false
	} else return null
}

export { generate, decode, validate, stale }
