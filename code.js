import got from 'got'

import Token from './Token.js'

const cached = {}

function _cache(code, token) {
	setTimeout(() => {
		delete cached[code]
	}, 60e3)

	cached[code] = token
	return token
}

function discord(code, top) {
	if (cached[code]) return cached[code]

	const DISCORD_APP_ID = process.env[`DISCORD_APP_ID_${top}`],
		DISCORD_APP_SECRET = process.env[`DISCORD_APP_SECRET_${top}`],
		REDIRECT_URI = process.env[`REDIRECT_URI_${top}`]

	return got
		.post(`https://discord.com/api/oauth2/token`, {
			form: {
				client_id: DISCORD_APP_ID,
				client_secret: DISCORD_APP_SECRET,
				code,
				grant_type: 'authorization_code',
				redirect_uri: REDIRECT_URI,
				state: 'discord',
			},
		})
		.json()
		.then(({ access_token, expires_in, refresh_token }) => {
			return got('https://discord.com/api/oauth2/@me', {
				headers: { authorization: 'Bearer ' + access_token },
			})
				.json()
				.then(({ user: { id, username, discriminator } }) =>
					_cache(
						code,
						new Token({
							access_token,
							expires_in,
							refresh_token,
							id,
							name: `${username}#${discriminator}`,
						})
					)
				)
		})
}

async function facebook(code, top) {
	if (cached[code]) return cached[code]

	return got(
		`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`
	)
		.json()
		.then(({ access_token, expires_in }) =>
			got(`https://graph.facebook.com/me?access_token=${access_token}`)
				.json()
				.then(({ id, name }) =>
					_cache(
						code,
						new Token({
							access_token,
							expires_in,
							id,
							name,
						})
					)
				)
		)
}

export { discord, facebook }
