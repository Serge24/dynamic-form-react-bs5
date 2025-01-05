import axios from "axios"
import defaultConfig from "../configs/default";

// define the api
const api = axios.create({
  baseURL: defaultConfig.API_BASE,
  //headers: { Accept: 'application/vnd.github.v3+json' },
})

export default api;