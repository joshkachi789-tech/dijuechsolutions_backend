/**
 * Google OAuth2 — uses Node's built-in https module.
 * No external dependencies needed beyond what's already installed.
 */
import https from "https";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:5000/api/auth/google/callback";

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function httpsPost(url: string, data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path:     parsed.pathname,
        method:   "POST",
        headers:  {
          "Content-Type":   "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end",  () => resolve(body));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url: string, accessToken: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path:     `${parsed.pathname}${parsed.search}`,
        method:   "GET",
        headers:  { Authorization: `Bearer ${accessToken}` },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end",  () => resolve(body));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export interface GoogleUserInfo {
  sub:            string;
  email:          string;
  name:           string;
  picture?:       string;
  email_verified: boolean;
}

/** Exchange an auth code for an access token, then fetch user profile */
export async function getGoogleUser(code: string): Promise<GoogleUserInfo> {
  // 1. Exchange code for tokens
  const tokenBody = new URLSearchParams({
    code,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  REDIRECT_URI,
    grant_type:    "authorization_code",
  }).toString();

  const tokenRaw = await httpsPost("https://oauth2.googleapis.com/token", tokenBody);
  const tokens = JSON.parse(tokenRaw) as {
    access_token:  string;
    id_token?:     string;
    error?:        string;
    error_description?: string;
  };

  if (tokens.error) {
    throw new Error(`Google token error: ${tokens.error} — ${tokens.error_description ?? ""}`);
  }

  // 2. Fetch user info using access token
  const userRaw = await httpsGet(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    tokens.access_token,
  );
  const user = JSON.parse(userRaw) as GoogleUserInfo;

  if (!user.email) throw new Error("Google did not return an email address");
  return user;
}
