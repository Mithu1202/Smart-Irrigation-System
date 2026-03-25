import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getLatestData = async () => {
  const res = await api.get("/data/latest");
  return res.data;
};

export default api;