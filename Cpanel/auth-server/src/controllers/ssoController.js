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

    const { accessToken, refreshToken } = generateTokens(payload);

    // Set httpOnly cookies for access and refresh tokens so frontend doesn't store JWT
    const parseExpiryToMs = (str) => {
      if (!str) return undefined;
      if (/^\d+$/.test(str)) return parseInt(str, 10) * 1000;
      const m = str.match(/^(\d+)([smhd])$/);
      if (!m) return undefined;
      const n = parseInt(m[1], 10);
      switch (m[2]) {
        case 's': return n * 1000;
        case 'm': return n * 60 * 1000;
        case 'h': return n * 60 * 60 * 1000;
        case 'd': return n * 24 * 60 * 60 * 1000;
        default: return undefined;
      }
    };

    const accessMaxAge = parseExpiryToMs(process.env.JWT_EXPIRE || '15m');
    const refreshMaxAge = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRE || '7d');

    const cookieDomain = process.env.COOKIE_DOMAIN || undefined; // e.g. .mspkapps.in
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // required for cross-site cookie usage
      domain: cookieDomain,
    };
    if (accessMaxAge) cookieOpts.maxAge = accessMaxAge;

    // Use cPanel-scoped cookie names to avoid colliding with main site's cookies
    res.cookie('cpanel_access_token', accessToken, cookieOpts);
    const refreshOpts = { ...cookieOpts };
    if (refreshMaxAge) refreshOpts.maxAge = refreshMaxAge;
    res.cookie('cpanel_refresh_token', refreshToken, refreshOpts);

    return res.json({
      success: true,
      message: 'SSO established',
      data: {
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
    console.log('[ME] incoming cookies:', req.headers.cookie);
    console.log('[ME] req.user:', user);
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
