// middlewares/validateToken.js
const { axiosInstance} = require('../../utils/axios');

const validateTokenMiddleware = async (req, res, next) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;

  if (!token || !jsessionid) {
    return res.redirect('/?error=Session expired. Please login again!');
  }

  try {
    await axiosInstance.get('/auth/isTokenValid', {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: jsessionid
      }
    });

    next(); // External token is valid
  } catch (err) {
    console.error('Token validation failed:', err.response?.data || err.message);

    // Destroy local session first
    req.session.destroy(() => {
      // Check if it's a fetch (AJAX) request
      const isFetch = req.headers.accept?.includes('application/json') || req.xhr;

      if (isFetch) {
        // Tell the frontend to redirect
        return res.status(401).json({
          error: 'Session expired. Please login again!',
          redirect: '/'
        });
      }

      // Normal browser request — redirect directly
      res.redirect('/?error=Session expired. Please login again!');
    });
  }
};



module.exports = validateTokenMiddleware;
