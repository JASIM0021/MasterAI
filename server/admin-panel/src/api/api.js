// // api.js
// import axios from 'axios';

// const api = axios.mergeConfig({
//   // Use REACT_APP_ prefix for Create React App environment variables
//   baseURL: process.env.REACT_APP_API_URL,
//   headers: {
//     'Content-Type': 'application/json',
//     // Use REACT_APP_ prefix here too if using Create React App
//     apiKey: process.env.REACT_APP_API_KEY,
//   },
// });

// // Optional: Keep interceptor commented or uncomment if needed later
// // api.interceptors.request.use(config => {
// //   const token = localStorage.getItem('token');
// //   if (token) {
// //     config.headers.Authorization = `Bearer ${token}`;
// //   }
// //   return config;
// // });

// // --- FIX IS HERE ---
// export default api; // Export the lowercase 'api' instance
