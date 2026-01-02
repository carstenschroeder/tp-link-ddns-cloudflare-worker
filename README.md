# TP-Link DDNS Cloudflare Worker

A Cloudflare Worker that acts as a Dynamic DNS (DDNS) service for TP-Link routers, automatically updating Cloudflare DNS records with your router's current public IP address.

## Features

- Basic authentication for secure access
- Support for dual WAN configurations (WAN1 and WAN2)
- Automatic IP detection using Cloudflare's `CF-Connecting-IP` header
- Updates Cloudflare DNS A records via API
- Simple JSON response format

## Prerequisites

- Cloudflare account with API access
- Cloudflare Zone ID for your domain
- Cloudflare API Token with DNS edit permissions
- TP-Link router with DDNS support

## Setup

### 1. Deploy to Cloudflare Workers

Deploy this worker to your Cloudflare account using Wrangler or the Cloudflare dashboard.

### 2. Configure Environment Variables

Set the following environment variables in your Cloudflare Worker settings:

**Required:**
- `API_TOKEN` - Your Cloudflare API token with DNS edit permissions
- `ZONE_ID` - Your Cloudflare Zone ID
- `USERNAME` - Username for Basic Authentication
- `PASSWORD` - Password for Basic Authentication
- `DNS_WAN1_HOSTNAME` - The hostname for WAN1 (e.g., `home.example.com`)
- `DNS_WAN1_RECORD_ID` - The Cloudflare DNS record ID for WAN1

**Optional (for dual WAN):**
- `DNS_WAN2_HOSTNAME` - The hostname for WAN2 (e.g., `home2.example.com`)
- `DNS_WAN2_RECORD_ID` - The Cloudflare DNS record ID for WAN2

### 3. Get Your DNS Record ID

To find your DNS record ID, use the Cloudflare API:

```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json"
```

### 4. Configure Your TP-Link Router

1. Log in to your TP-Link router admin panel
2. Navigate to the DDNS settings
3. Select "Custom" or "No-IP" as the service provider
4. Configure:
   - **Service Provider:** Custom/No-IP
   - **Domain Name:** Your hostname (e.g., `home.example.com`)
   - **Username:** The username you set in environment variables
   - **Password:** The password you set in environment variables
   - **Server Address:** Your worker URL (e.g., `your-worker.workers.dev`)

## Usage

The worker expects requests in the following format:

```
GET https://your-worker.workers.dev/?hostname=home.example.com
Authorization: Basic {base64(username:password)}
```

### Response Format

**Success:**
```json
{
  "success": true,
  "message": "DNS record for home.example.com updated",
  "clientIP": "203.0.113.1"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Security

- Uses Basic Authentication to protect the endpoint
- Requires valid credentials matching the configured USERNAME and PASSWORD
- API token is stored securely in Cloudflare Worker environment variables
- Only updates pre-configured hostnames

## References

For more information and discussion about this solution, see the original Reddit thread: [Figured out how to get Dynamic DNS on TP-Link Omada routers](https://www.reddit.com/r/TPLink_Omada/comments/1hbzrlg/figured_out_how_to_get_dynamic_dns_on_tplink/)

Thanks to [u/MrPrezident0](https://www.reddit.com/user/MrPrezident0/) for sharing this solution!

## License

MIT
