function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/login');
}

function attachUser(req, res, next) {
  res.locals.currentUser = req.session ? (req.session.nombre || req.session.username) : null;
  next();
}

module.exports = { requireLogin, attachUser };
