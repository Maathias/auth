import mongoose from 'mongoose'

const user = new mongoose.Schema(
	{
		id: String,
		uname: String,
		pass: String,
		banned: Boolean,
		socials: {},
	},
	{
		collection: 'users',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	}
)

const User = mongoose.model('User', user)

export default User
export { User, user }
