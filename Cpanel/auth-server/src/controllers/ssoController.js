const { generateTokens } = require('../middleware/auth');
const { postJson } = require('../utils/httpClient');

// Base URL of the main Developer Auth API (where tickets are redeemed)
const AUTH_API_BASE_URL = process.env.AUTH_API_BASE_URL;

/**
 * POST /api/developer/sso/consume
 * Body: { ticket: string }
 * Exchanges a one-time cpanel ticket for a cpanel JWT and returns developer profile
 */
const consumeTicket = async (req, res) => {
  try {
    const ticket = req.body?.ticket || req.query?.ticket;
    if (!ticket) {
      return res.status(400).json({
        success: false,
        message: 'Missing ticket',
        error: 'MISSING_TICKET',
      });
    }

  // Redeem the ticket with the main auth server (expects body { token })
  // Build a redeem URL that tolerates whether AUTH_API_BASE_URL already contains /api or /api/cpanel
  const baseAuth = (AUTH_API_BASE_URL || '').replace(/\/$/, '');
  let redeemUrl;
  if (baseAuth.match(/\/api\/cpanel$/)) {
    redeemUrl = `${baseAuth}/redeem-cpanel-ticket`;
  } else if (baseAuth.endsWith('/api')) {
    redeemUrl = `${baseAuth}/cpanel/redeem-cpanel-ticket`;
  } else {
    redeemUrl = `${baseAuth}/api/cpanel/redeem-cpanel-ticket`;
  }
  console.log('[SSO] Redeem URL:', redeemUrl, 'AUTH_API_BASE_URL:', AUTH_API_BASE_URL);
  const redeemResp = await postJson(redeemUrl, { token: ticket });
  console.log('[SSO] Redeem response:', JSON.stringify(redeemResp));

    if (!redeemResp || !redeemResp.success) {
      return res.status(401).json({
        success: false,
        message: redeemResp?.message || 'Ticket redemption failed',
        error: redeemResp?.error || 'TICKET_REDEEM_FAILED',
      });
    }

    const developer = redeemResp.data?.developer || redeemResp.developer || null;
    if (!developer) {
      return res.status(500).json({
        success: false,
        message: 'Developer info missing from redeem response',
        error: 'NO_DEVELOPER_INFO',
      });
    }

    // Create a cpanel-scoped JWT so frontend can call cpanel APIs
    const payload = {
      developerId: developer.id,
      email: developer.email,
      name: developer.name || developer.username || developer.email,
      is_verified: developer.email_verified ?? developer.is_verified ?? true,
      scope: 'cpanel',
    };

    const { accessToken } = generateTokens(payload);

    return res.json({
      success: true,
      message: 'SSO established',
      data: {
        token: accessToken,
        developer,
      },
    });
  } catch (err) {
    console.error('SSO consume error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Internal error during SSO consume',
      error: 'SSO_CONSUME_ERROR',
    });
  }
};

/**
 * GET /api/developer/me
 * Requires Authorization: Bearer <cpanel token>
 */
const me = async (req, res) => {
  try {
    // req.user populated by authenticateToken
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' });
    }
    return res.json({ success: true, developer: {
      id: user.id || user.developerId,
      email: user.email,
      name: user.name,
      is_verified: user.is_verified !== false,
    }});
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load user', error: 'ME_ERROR' });
  }
};

module.exports = { consumeTicket, me };
