import axios from 'axios'

const auth = async () => {
	let params = new URLSearchParams()
	params.append('grant_type', 'password')
	params.append('client_id', process.env.CLIENT_ID)
	params.append('client_secret', process.env.CLIENT_SECRET)
	params.append('username', process.env.USERNAME)
	params.append('password', process.env.PASSWORD)
	return axios.post(process.env.KOLOBOX_URL + 'oauth/token', params)
}

export default auth