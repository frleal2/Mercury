const BASE_URL =
  process.env.ENV === 'render'
    ? process.env.REACT_APP_RENDER_API_URL
    : process.env.REACT_APP_LOCAL_API_URL;

export default BASE_URL;
