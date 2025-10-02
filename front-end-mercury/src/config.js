const ENV = process.env.REACT_APP_ENV || 'render'; // Default to 'render' if not specified

const API_URLS = {
  local: process.env.REACT_APP_LOCAL_API_URL,
  render: process.env.REACT_APP_RENDER_API_URL,
};

const BASE_URL = API_URLS[ENV] || process.env.REACT_APP_API_URL; // Fallback to REACT_APP_API_URL

export default BASE_URL;
