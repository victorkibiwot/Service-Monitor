const axios = require('axios');

// Create an Axios instance to persist cookies
const axiosInstance = axios.create({
  baseURL: process.env.GCP_URL,
  withCredentials: true // Enable sending cookies with requests
});

// Create an Axios instance to persist cookies
const axiosInstance2 = axios.create({
  baseURL: process.env.GCP_URL2,
  withCredentials: true // Enable sending cookies with requests
});


module.exports = { axiosInstance, axiosInstance2 };