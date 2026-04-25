const { getMyGroup, getMyDeadlines, getMyGrade, DomainError } = require('./me.service');

function extractUserId(req) {
  const id = req.user && req.user.id;
  return Number.isInteger(id) && id > 0 ? id : null;
}

function unauthorized(res) {
  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  });
}

function sendError(res, err, fallbackLog) {
  if (err instanceof DomainError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }
  console.error(fallbackLog, err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}

class MeController {
  async getGroup(req, res) {
    const userId = extractUserId(req);
    if (!userId) return unauthorized(res);
    try {
      const data = await getMyGroup(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return sendError(res, err, 'Erreur me/group:');
    }
  }

  async getDeadlines(req, res) {
    const userId = extractUserId(req);
    if (!userId) return unauthorized(res);
    try {
      const data = await getMyDeadlines(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return sendError(res, err, 'Erreur me/deadlines:');
    }
  }

  async getGrade(req, res) {
    const userId = extractUserId(req);
    if (!userId) return unauthorized(res);
    try {
      const data = await getMyGrade(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return sendError(res, err, 'Erreur me/grade:');
    }
  }
}

module.exports = { MeController };
