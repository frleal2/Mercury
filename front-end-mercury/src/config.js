const BASE_URL = process.env.REACT_APP_ENV === 'render'
  ? process.env.REACT_APP_RENDER_API_URL.replace(/\/$/, '') // Remove trailing slash
  : process.env.REACT_APP_LOCAL_API_URL.replace(/\/$/, ''); // Remove trailing slash

export default BASE_URL;
