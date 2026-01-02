function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

function parseBasicAuth(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;

  const encoded = authHeader.slice("Basic ".length).trim();

  let decoded;
  try {
    decoded = atob(encoded);
  } catch {
    return null;
  }

  const idx = decoded.indexOf(":");
  if (idx === -1) return null;

  return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
}

function normalizeEnvString(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function buildDnsRecordsFromEnv(env) {
  const records = {};

  const wan1Hostname = normalizeEnvString(env.DNS_WAN1_HOSTNAME);
  const wan1RecordId = normalizeEnvString(env.DNS_WAN1_RECORD_ID);
  if (wan1Hostname && wan1RecordId) {
    records[wan1Hostname] = wan1RecordId;
  }

  // WAN2 is optional: if missing/empty => ignore (no error)
  const wan2Hostname = normalizeEnvString(env.DNS_WAN2_HOSTNAME);
  const wan2RecordId = normalizeEnvString(env.DNS_WAN2_RECORD_ID);
  if (wan2Hostname && wan2RecordId) {
    records[wan2Hostname] = wan2RecordId;
  }

  return records;
}

export default {
  async fetch(request, env, ctx) {
    const creds = parseBasicAuth(request);
    if (!creds) return unauthorized();

    const API_TOKEN = normalizeEnvString(env.API_TOKEN);
    const ZONE_ID = normalizeEnvString(env.ZONE_ID);
    const USERNAME = normalizeEnvString(env.USERNAME);
    const PASSWORD = normalizeEnvString(env.PASSWORD);

    if (!API_TOKEN || !ZONE_ID || !USERNAME || !PASSWORD) {
      return json(
        { success: false, error: "Server misconfigured: missing env vars (API_TOKEN/ZONE_ID/USERNAME/PASSWORD)" },
        500
      );
    }

    if (creds.username !== USERNAME || creds.password !== PASSWORD) {
      return unauthorized();
    }

    const dnsRecords = buildDnsRecordsFromEnv(env);

    // WAN1 should exist; WAN2 is optional
    if (Object.keys(dnsRecords).length === 0) {
      return json(
        {
          success: false,
          error:
            "Server misconfigured: no DNS records configured. Set at least DNS_WAN1_HOSTNAME and DNS_WAN1_RECORD_ID.",
        },
        500
      );
    }

    const url = new URL(request.url);
    const hostname = url.searchParams.get("hostname");
    if (!hostname) return json({ success: false, error: "Hostname missing" }, 400);

    const dnsRecordId = dnsRecords[hostname];
    if (!dnsRecordId) {
      return json(
        {
          success: false,
          error: "Hostname not found or not configured",
          configured_hostnames: Object.keys(dnsRecords),
        },
        404
      );
    }

    const clientIP = request.headers.get("CF-Connecting-IP");
    if (!clientIP) return json({ success: false, error: "Could not determine client IP" }, 500);

    const updateURL = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${dnsRecordId}`;

    const updateResponse = await fetch(updateURL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "A",
        name: hostname,
        content: clientIP,
        ttl: 3600,
        proxied: false,
      }),
    });

    const updateResult = await updateResponse.json();

    if (updateResult?.success) {
      return json({ success: true, message: `DNS record for ${hostname} updated`, clientIP }, 200);
    }

    return json({ success: false, error: updateResult?.errors ?? "Unknown error" }, 500);
  },
};