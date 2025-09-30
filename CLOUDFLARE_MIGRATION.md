# Cloudflare Pages Migration Guide

This project has been migrated from Vercel to Cloudflare Pages.

## 🚀 Deployment Steps

### 1. Install Wrangler CLI (if not already installed)

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Deploy to Cloudflare Pages

#### Option A: Via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
5. Set environment variables (see below)
6. Click **Save and Deploy**

#### Option B: Via CLI

```bash
# Build the project first
npm run build

# Deploy to Cloudflare Pages
npm run pages:deploy
```

## 🔐 Environment Variables

Set these in the Cloudflare Pages dashboard under **Settings** → **Environment
variables**:

### Required Variables

- `DISCORD_WEBHOOK_URL` - Discord webhook URL for feedback API (set as a Secret)

### Optional Variables (Build-time)

All `VITE_*` variables from your `.env.local`:

- `VITE_CLAUDE_API_KEY` - Claude API key (if using AI features)
- `VITE_LOG_TO_DISCORD_IN_DEV` - Enable Discord logging in dev
- `VITE_DEV_MODE` - Development mode flag
- `VITE_ENABLE_CACHE_MONITOR` - Enable cache monitor
- `VITE_ENABLE_PWA` - Enable PWA features

**Note**: For `DISCORD_WEBHOOK_URL`, mark it as a **Secret** (encrypted) in
Cloudflare dashboard.

## 📁 Files Created/Modified

### New Files

- `wrangler.toml` - Cloudflare Pages configuration
- `functions/api/feedback.js` - Cloudflare Worker for feedback API
- `public/_headers` - HTTP headers configuration
- `public/_redirects` - Routing rules for SPA

### Removed Files

- `vercel.json` - Vercel-specific configuration

### Modified Files

- `package.json` - Removed `@vercel/analytics`, added Cloudflare scripts
- `src/main.jsx` - Removed Vercel Analytics component

## 🧪 Local Testing

### Test the static site

```bash
npm run build
npm run pages:dev
```

This will start a local Cloudflare Pages development server with Workers
Functions support.

### Test with local proxy (for development)

```bash
npm run dev
```

This continues to use the local Express proxy server for API endpoints.

## 🔄 API Endpoints

The feedback API is now handled by Cloudflare Workers Functions:

- **Production**: `https://your-site.pages.dev/api/feedback`
- **Local dev**: `http://localhost:3002/api/feedback` (via local proxy)

## 📊 Performance & Caching

Cloudflare Pages automatically provides:

- Global CDN distribution
- HTTP/2 and HTTP/3 support
- Brotli compression
- Edge caching

Custom caching rules are defined in `public/_headers`.

## 🔍 Monitoring

After deployment:

1. Check **Cloudflare Dashboard** → **Pages** → **Your Project** for deployment
   logs
2. Use **Analytics** tab for traffic insights
3. Check **Workers Functions** tab for function logs and errors

## 🐛 Troubleshooting

### Build fails

- Check that all environment variables are set
- Verify Node.js version (18+)
- Clear build cache: Delete `dist/` and rebuild

### Worker function errors

- Check function logs in Cloudflare Dashboard
- Verify `DISCORD_WEBHOOK_URL` is set as a secret
- Test locally with `npm run pages:dev`

### 404 errors on routes

- Verify `public/_redirects` is present
- Check SPA fallback is working: `/*  /index.html  200`

## 📚 Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Functions](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

## 🔐 Security Note

**Important**: The `.env.local` file contains sensitive API keys and should
NEVER be committed to version control. Make sure it's in `.gitignore` and set
all secrets via the Cloudflare Dashboard.
