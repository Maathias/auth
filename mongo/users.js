import { v4 as uuid } from 'uuid'
import bcrypt from 'bcrypt'

import User from './models/user.js'
import { decode, generate, validate } from '../jwt.js'

function putUser({ uname, pass, socials }) {
	return User.create({
		id: uuid(),
		uname,
		pass: bcrypt.hashSync(pass, 10),
		banned: false,
		socials,
	})
}

function getUserUname(uname) {
	return User.findOne({ uname })
}

function getUserUuid(id) {
	return User.findOne({ id })
}

async function getUserUnamePass(uname, pass) {
	const user = await getUserUname(uname)

	if (user !== null) if (bcrypt.compareSync(pass, user.pass)) return user

	return null
}

function getUserSocialId(platform, id) {
	return User.findOne({ [`socials.${platform}.id`]: id })
}

async function reIssueJwt(token) {
	if (validate(token)) {
		const udata = decode(token)

		const nudata = stripUser(await getUserUuid(udata.id))

		const payload = {
			udata: nudata,
			jwt: generate(nudata),
		}

		return payload
	} else return false
}

function stripUser(user) {
	let udata = {
		id: user.id,
		uname: user.uname,
		socials: {},
	}

	for (let platform in user.socials) {
		udata.socials[platform] = encodeURI(user.socials[platform].name)
	}

	return udata
}

export {
	putUser,
	getUserUname,
	getUserUnamePass,
	getUserSocialId,
	getUserUuid,
	reIssueJwt,
}
