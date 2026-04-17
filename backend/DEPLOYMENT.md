# Vercel Deployment Guide

## Prerequisites
- Vercel account
- MongoDB Atlas database
- Git repository (optional but recommended)

## Environment Variables

Add these to your Vercel project settings (Environment Variables section):

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5001
NODE_ENV=production
```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy Project
```bash
# From project root directory
vercel --prod
```

### 4. Set Environment Variables
- Go to your Vercel project dashboard
- Navigate to Settings > Environment Variables
- Add the variables from `.env.example`

### 5. Redeploy (if variables added after initial deploy)
```bash
vercel --prod
```

## Project Structure for Vercel

```
/
 api/
  index.js          # Serverless function entry point
 dist/              # Built React app (created by npm run build)
 public/            # Static assets
 server/            # Backend code
 vercel.json        # Vercel configuration
 package.json       # Dependencies and scripts
```

## API Endpoints

All API requests are automatically routed to the serverless function:

- `GET /api/items` - List items
- `POST /api/items` - Create item
- `GET /api/auth/*` - Authentication routes
- `GET /api/claims/*` - Claims management
- `GET /api/support/*` - Support tickets
- `GET /api/notifications/*` - Notifications

## File Uploads

File uploads are handled via `/uploads` endpoint and served statically. For production, consider:
- Using a CDN for uploaded files
- Implementing file size limits
- Adding virus scanning

## Database Setup

1. Create MongoDB Atlas account
2. Create a new cluster
3. Add your Vercel deployment IP to whitelist (0.0.0.0/0 for all IPs)
4. Get connection string and add to environment variables

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check MONGODB_URI format
   - Verify IP whitelist in MongoDB Atlas
   - Ensure network access is enabled

2. **Build Failures**
   - Check package.json for missing dependencies
   - Verify all imports are correct
   - Check for syntax errors

3. **API Not Responding**
   - Verify vercel.json rewrites are correct
   - Check serverless function logs in Vercel dashboard
   - Ensure environment variables are set

### Debug Commands

```bash
# Check deployment
vercel ls

# View logs
vercel logs

# Test locally
npm run dev
```

## Performance Optimization

- Images are automatically optimized by Vercel
- API responses are cached when possible
- Static assets are served from CDN
- Database queries should be optimized for serverless environment

## Security Considerations

- JWT secrets should be strong and unique
- MongoDB Atlas should use IP whitelisting
- File uploads should be validated
- API rate limiting should be considered
