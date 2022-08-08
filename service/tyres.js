import axios from 'axios'

const getTyres = async (token, page) => {
	return axios.get(process.env.KOLOBOX_URL + 'catalog/tyres/' + page + '/?onstock=only_available&pricetype=retail', {
		headers: { 'Authorization': 'Bearer ' + token }
	})
}

export default getTyres