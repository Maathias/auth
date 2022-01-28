class Token {
	constructor({ access_token, expires_in, id, name }) {
		this.access_token = access_token
		this.expires_in = expires_in
		this.id = id
		this.name = name
	}
}

export default Token
