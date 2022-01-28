const {
	host: DOMAIN,
	socials: { DISCORD_APP_ID, FACEBOOK_APP_ID },
	top: TOP,
	customs: { REDIRECT_URI },
} = window.meta

document.domain = TOP

// extract logedin user's data from cookies
// don't judge my 🍝
var udata = JSON.parse(
	(document.cookie
		.split('; ')
		.map((cookie) => cookie.split('='))
		.filter(([key]) => key == `${TOP}_udata`)
		.at(0) ?? [, false])[1]
)

// user's form inputs
var inputs = {
	uname: '',
	pass: '',
	rememberme: true,
	ready: false,
	register: false,
	socials: {},
}

// display pending actions
function info(content, pending = true) {
	const el = document.querySelector('.status')

	el.setAttribute('data-content', content)
	pending ? el.classList.add('pending') : el.classList.remove('pending')
}

// send form
function send() {
	info('Preparing')

	let { ready } = inputs,
		socials = Object.keys(inputs.socials).length > 0

	if (inputs.register) {
		if (!ready) return info('Please enter login info', false)
	} else if (!socials) if (!ready) return info('Please enter login info', false)

	fetch('/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(inputs),
	})
		.then((response) => response.json())
		.then(({ success, nuinfo: uinfo, error, registerpls }) => {
			if (success) {
				info('Success', false)
				udata = uinfo

				inputs.socials = {}
				document.querySelector('input[id=password]').value = ''
				fieldChange()

				document
					.querySelectorAll('.fetched')
					.forEach((el) => el.classList.remove('fetched'))

				displayUser(udata)
				window.opener?.return(udata)
			} else {
				info(error, false)
				if (registerpls) {
					document.querySelector('.fields').classList.add('social-only')

					doRegister(true)
				}
			}
			fieldChange()
		})

	info('Sending')
}

// display loged in account info
function displayUser({ uname, socials, logedin }) {
	document.querySelector('.user').setAttribute('data-logedin', true)
	document.querySelector('.user .uname').textContent = uname
	document.querySelector('.user .logedin').textContent = new Date(
		logedin
	).toLocaleString()

	for (let platform in socials) {
		document.querySelector(
			`.user .socials .platform[data-social=${platform}]`
		).textContent = decodeURI(socials[platform] ?? '')
	}
}

// remove jwt
function logout() {
	document.querySelector('.user').setAttribute('data-logedin', false)

	function delCookie(name) {
		document.cookie = `${name}=; Path=/; Expires=${new Date(
			-1
		)}; Domain=.${TOP}`
	}

	delCookie(`${TOP}_jwt`)
	delCookie(`${TOP}_udata`)
	udata = false

	fieldChange()
}

// display external login form
function promptLogin(platform) {
	return new Promise((resolve, reject) => {
		// target oauth uri, with window sizes
		const { target, width, height } = {
			facebook: {
				target: `https://www.facebook.com/v11.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&state=facebook`,
				width: 400,
				height: 550,
			},
			discord: {
				target: `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify&state=discord`,
				width: 450,
				height: 750,
			},
		}[platform]

		delete localStorage.code

		let popup = window.open(
			target,
			`login with platform`,
			[
				'scrollbars=no',
				'resizable=no',
				'status=no',
				'location=no',
				'toolbar=no',
				'menubar=no',
				`width=${width}`,
				`height=${height}`,
			].join(',')
		)

		// periodically check if the login is complete
		let interval = setInterval(() => {
			// window manually closed, login failed
			if (popup.closed) {
				clearInterval(interval)
				return reject('Failed to log in')
			}

			if (localStorage.code) {
				// parse and cleanup fetched code
				let code = JSON.parse(localStorage.code)
				delete localStorage.code

				// oauth state mismatch
				if (code.state != platform) reject('Invalid state')
				// somehow there's no code
				else if (typeof code.code != 'string') reject('Log in denied')
				// success
				else resolve(code)

				// cleanup the timer and popup window
				clearInterval(interval)
				popup.close()
			}
		}, 5e2)
	})
}

// switch register/login
function doRegister(on) {
	inputs.register = on ?? !inputs.register

	const biswitch = document.querySelector('.biswitch')

	if (inputs.register) biswitch.classList.add('second')
	else biswitch.classList.remove('second')

	document.querySelector('#submit').value = inputs.register
		? 'sign up'
		: 'log in'

	fieldChange()
}

// change submit button label
function submitButton(
	display = inputs.ready,
	label = inputs.register ? 'sign up' : 'log in'
) {
	let submit = document.querySelector('input[id=submit]')

	label && (submit.value = label)
	inputs.ready = display

	if (display) submit.removeAttribute('disabled')
	else submit.setAttribute('disabled', true)
}

// update form metadata
function fieldChange() {
	inputs.uname = document.querySelector('input[id=username]').value
	inputs.pass = document.querySelector('input[id=password]').value
	inputs.rememberme = document.querySelector('input[id=rememberme]').checked

	let fields = document.querySelector('.fields')
	if (udata) fields.classList.add('logedin')
	else fields.classList.remove('logedin')

	let { uname, pass, register } = inputs
	socials = Object.keys(inputs.socials).length > 0

	// remove highlight on input
	if (uname || pass) fields.classList.remove('social-only')

	// loged in, socials added
	if (udata && socials && register) {
		submitButton(true, 'add to account')
	} else {
		if (register) {
			if (uname.length > 0 && pass.length > 0 && socials) submitButton(true)
			else submitButton(false)
		} else {
			if ((uname.length > 0 && pass.length > 0) || socials) submitButton(true)
			else submitButton(false)
		}
	}
}

window.addEventListener('load', (e) => {
	// display loged in user data
	udata && displayUser(udata)
	fieldChange()

	const fields = document.querySelector('.fields')

	// login button activation
	fields.onkeyup = fields.onchange = fieldChange

	// submit handler
	document.querySelector('#submit').onclick = send
	fields.addEventListener('keydown', (e) => e.key == 'Enter' && send())

	// logout button
	document.querySelector('#logout').onclick = logout

	// close popup button
	if (window?.opener?.return) {
		r = document.querySelector('.return')
		r.classList.add('enabled')
		r.onclick = () => window.opener?.return(null)
	}

	// login/register switch
	document.querySelector('.biswitch').onclick = () => doRegister()

	// enable external login buttons
	for (let platform in window.meta.socials) {
		let label = platform.split('_')[0].toLowerCase()
		document
			.querySelector(`.socials .external[data-social=${label}]`)
			.removeAttribute('disabled')
	}

	// external login buttons events
	document
		.querySelector('.content > .socials')
		.addEventListener('click', function (e) {
			if (this === e.target) return

			if (e.target.hasAttribute('disabled')) return

			let social = e.target.getAttribute('data-social')

			info(`Connecting ${social} account`)

			promptLogin(social)
				.then((data) => {
					inputs.socials[social] = data

					info(`Connected ${social}`, false)

					document
						.querySelector(`.external[data-social=${social}]`)
						.classList.add('fetched')

					fieldChange()

					if (!inputs.register) send()
				})
				.catch((err) => {
					console.warn(err)
					info(`Failed to connect ${social}`, false)
				})
		})
})
