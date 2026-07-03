const { google } = require("googleapis");

function getAuthClient() {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "https://developers.google.com/oauthplayground");
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

async function getAccessToken() {
  const auth = getAuthClient();
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    const { token } = await auth.getAccessToken();
    return token;
  } else {
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    return token;
  }
}

module.exports = { getAccessToken };
