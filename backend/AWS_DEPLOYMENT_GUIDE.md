# AWS Deployment Guide for AI Personal Secretary Backend

This guide walks you through deploying your FastAPI backend to AWS App Runner.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally (for testing)
- All required API keys and credentials

## Architecture Overview

```
Frontend (Firebase) → AWS App Runner → NeonDB (PostgreSQL)
                           ↓
                    Google APIs (OAuth, Calendar)
                    Pinecone (Vector DB)
                    Gemini/Groq (LLM)
```

## Step 1: Set Up Required Services

### 1.1 Create NeonDB Database

1. Go to [Neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (format: `postgresql://user:password@host/dbname`)
4. Save it as `DATABASE_URL`

### 1.2 Set Up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable APIs:
   - Google Calendar API
   - Google+ API (for OAuth)
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs: `https://YOUR-APP-RUNNER-URL.awsapprunner.com/auth/google/callback`
   - Save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
5. Create API Key:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Save as `GOOGLE_API_KEY`

### 1.3 Set Up Pinecone

1. Go to [Pinecone.io](https://www.pinecone.io)
2. Create account and get API key
3. Create an index named `ai-secretary` (or your preferred name)
4. Save `PINECONE_API_KEY` and `PINECONE_INDEX_NAME`

### 1.4 Get LLM API Keys

Choose at least one:
- **Groq**: [console.groq.com](https://console.groq.com) → Get `GROQ_API_KEY`
- **NVIDIA**: [build.nvidia.com](https://build.nvidia.com) → Get `NVIDIA_API_KEY`

### 1.5 Generate Security Keys

Run these commands locally:

```bash
# Generate JWT Secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate Encryption Key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Save as `JWT_SECRET_KEY` and `CREDENTIAL_ENCRYPTION_KEY`

## Step 2: Deploy to AWS App Runner

### Option A: Deploy via AWS Console (Easiest)

1. **Push Code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for AWS deployment"
   git push origin main
   ```

2. **Create App Runner Service**
   - Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner)
   - Click "Create service"
   - **Source**: Repository
   - Connect to GitHub and select your repository
   - **Branch**: main
   - **Build settings**:
     - Configuration file: Use buildspec.yml
     - Or manual:
       - Build command: `pip install -r requirements.txt`
       - Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - **Service settings**:
     - Service name: `ai-secretary-backend`
     - Port: 8000
     - CPU: 1 vCPU
     - Memory: 2 GB
   - Click "Next"

3. **Configure Environment Variables**
   Add all these environment variables in App Runner:
   ```
   GOOGLE_API_KEY=your_google_api_key
   GROQ_API_KEY=your_groq_api_key
   NVIDIA_API_KEY=your_nvidia_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   OAUTH_REDIRECT_URI=https://YOUR-APP-RUNNER-URL/auth/google/callback
   FRONTEND_URL=https://ai-personal-secretary-jatain.web.app
   DATABASE_URL=postgresql://user:password@host/dbname
   JWT_SECRET_KEY=your_generated_jwt_secret
   CREDENTIAL_ENCRYPTION_KEY=your_generated_encryption_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=ai-secretary
   OAUTHLIB_RELAX_TOKEN_SCOPE=1
   ELEVENLABS_API_KEY=your_elevenlabs_key (optional)
   ALLOWED_ORIGINS=https://ai-personal-secretary-jatain.web.app,https://ai-personal-secretary-jatain.firebaseapp.com
   ```

4. **Deploy**
   - Click "Create & deploy"
   - Wait 5-10 minutes for deployment
   - Copy the App Runner URL (e.g., `https://abc123.us-east-1.awsapprunner.com`)

5. **Update Google OAuth Redirect URI**
   - Go back to Google Cloud Console
   - Update OAuth redirect URI with your actual App Runner URL
   - Format: `https://YOUR-ACTUAL-URL.awsapprunner.com/auth/google/callback`

### Option B: Deploy via AWS CLI

1. **Install AWS CLI**
   ```bash
   # Windows (PowerShell as Admin)
   msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
   
   # Verify
   aws --version
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
   ```

3. **Create ECR Repository**

   ```bash
   aws ecr create-repository --repository-name ai-secretary-backend --region us-east-1
   ```

4. **Build and Push Docker Image**
   ```bash
   # Get your AWS account ID
   aws sts get-caller-identity --query Account --output text
   
   # Set variables
   $AWS_ACCOUNT_ID = "YOUR_ACCOUNT_ID"
   $AWS_REGION = "us-east-1"
   $ECR_REPO = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ai-secretary-backend"
   
   # Login to ECR
   aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
   
   # Build image
   cd backend
   docker build -t ai-secretary-backend .
   
   # Tag and push
   docker tag ai-secretary-backend:latest $ECR_REPO:latest
   docker push $ECR_REPO:latest
   ```

5. **Create App Runner Service via CLI**
   ```bash
   aws apprunner create-service \
     --service-name ai-secretary-backend \
     --source-configuration '{
       "ImageRepository": {
         "ImageIdentifier": "'$ECR_REPO':latest",
         "ImageRepositoryType": "ECR",
         "ImageConfiguration": {
           "Port": "8000",
           "RuntimeEnvironmentVariables": {
             "GOOGLE_API_KEY": "your_key",
             "DATABASE_URL": "your_db_url"
           }
         }
       },
       "AutoDeploymentsEnabled": true
     }' \
     --instance-configuration '{
       "Cpu": "1 vCPU",
       "Memory": "2 GB"
     }' \
     --region us-east-1
   ```

## Step 3: Update Frontend Configuration

1. **Get your App Runner URL** from AWS Console or CLI:
   ```bash
   aws apprunner list-services --region us-east-1
   ```

2. **Update Frontend Environment Variables**
   
   Edit `frontend/.env.production`:
   ```env
   VITE_API_BASE=https://YOUR-APP-RUNNER-URL.awsapprunner.com
   VITE_FIREBASE_API_KEY=AIzaSyBiK7nXwIbne8pcudAm8k342AZHVtUt_Y0
   VITE_FIREBASE_AUTH_DOMAIN=ai-personal-secretary-jatain.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=ai-personal-secretary-jatain
   VITE_FIREBASE_STORAGE_BUCKET=ai-personal-secretary-jatain.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=346573152944
   VITE_FIREBASE_APP_ID=1:346573152944:web:cec68e5f4a47ef99ff5175
   VITE_FIREBASE_MEASUREMENT_ID=G-JVGF5X1T4L
   ```

3. **Rebuild and Redeploy Frontend**
   ```bash
   cd frontend
   node node_modules/vite/bin/vite.js build
   cd ..
   node C:\Users\jatai\AppData\Roaming\npm\node_modules\firebase-tools\lib\bin\firebase.js deploy
   ```

## Step 4: Verify Deployment

1. **Test Backend Health**
   ```bash
   curl https://YOUR-APP-RUNNER-URL.awsapprunner.com/
   # Should return: {"message": "Team Leo AI (Persistent) is Ready"}
   ```

2. **Test Authentication Flow**
   - Visit your Firebase app: https://ai-personal-secretary-jatain.web.app
   - Click "Sign in with Google"
   - Should redirect to Google OAuth
   - After authorization, should redirect back to your app

3. **Check App Runner Logs**
   - Go to AWS App Runner Console
   - Select your service
   - Click "Logs" tab
   - Check for any errors

## Step 5: Update Google OAuth Settings

**IMPORTANT**: Update your Google Cloud Console OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Credentials"
3. Click on your OAuth 2.0 Client ID
4. Update **Authorized redirect URIs**:
   ```
   https://YOUR-ACTUAL-APP-RUNNER-URL.awsapprunner.com/auth/google/callback
   ```
5. Update **Authorized JavaScript origins**:
   ```
   https://ai-personal-secretary-jatain.web.app
   https://ai-personal-secretary-jatain.firebaseapp.com
   ```
6. Save changes

## Troubleshooting

### Issue: "404 Not Found" on /auth/google/login

**Solution**: Backend is not deployed or URL is incorrect
- Check App Runner service status in AWS Console
- Verify `VITE_API_BASE` in frontend matches App Runner URL
- Check App Runner logs for startup errors

### Issue: "Invalid OAuth redirect URI"

**Solution**: Google OAuth settings don't match
- Ensure redirect URI in Google Console matches: `https://YOUR-URL/auth/google/callback`
- Check `OAUTH_REDIRECT_URI` environment variable in App Runner
- Wait 5 minutes after updating Google Console settings

### Issue: Database connection errors

**Solution**: Check DATABASE_URL
- Verify NeonDB connection string is correct
- Ensure NeonDB allows connections from AWS (usually automatic)
- Check App Runner logs for specific error messages

### Issue: "CORS policy" errors

**Solution**: Update ALLOWED_ORIGINS
- Add your Firebase URLs to `ALLOWED_ORIGINS` in App Runner environment variables
- Format: `https://ai-personal-secretary-jatain.web.app,https://ai-personal-secretary-jatain.firebaseapp.com`

### Issue: App Runner deployment fails

**Solution**: Check Docker build
- Test Docker build locally:
  ```bash
  cd backend
  docker build -t test-backend .
  docker run -p 8000:8000 test-backend
  ```
- Check `requirements.txt` for incompatible packages
- Verify Dockerfile syntax

## Cost Estimation

**AWS App Runner**:
- 1 vCPU, 2 GB RAM: ~$25-40/month (depending on usage)
- Includes auto-scaling and load balancing

**NeonDB**:
- Free tier: 0.5 GB storage, 1 compute unit
- Paid: Starting at $19/month for more resources

**Pinecone**:
- Free tier: 1 index, 100K vectors
- Paid: Starting at $70/month

**Total Estimated Cost**: $0-130/month depending on tier choices

## Monitoring & Maintenance

1. **Set up CloudWatch Alarms**
   - Monitor CPU/Memory usage
   - Set alerts for errors

2. **Enable Auto-scaling**
   - App Runner auto-scales by default
   - Configure min/max instances if needed

3. **Regular Updates**
   - Update dependencies monthly
   - Monitor security advisories
   - Keep Docker base image updated

## Quick Reference Commands

```bash
# Check App Runner status
aws apprunner list-services --region us-east-1

# View logs
aws apprunner describe-service --service-arn YOUR_SERVICE_ARN

# Trigger new deployment
aws apprunner start-deployment --service-arn YOUR_SERVICE_ARN

# Update environment variables
aws apprunner update-service --service-arn YOUR_SERVICE_ARN \
  --source-configuration '{"ImageRepository": {"ImageConfiguration": {"RuntimeEnvironmentVariables": {"KEY": "VALUE"}}}}'
```

## Next Steps

1. ✅ Deploy backend to AWS App Runner
2. ✅ Update frontend with new backend URL
3. ✅ Configure Google OAuth redirect URIs
4. ✅ Test authentication flow
5. Set up monitoring and alerts
6. Configure custom domain (optional)
7. Set up CI/CD pipeline (optional)

## Support Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [NeonDB Documentation](https://neon.tech/docs)

---

**Created**: January 6, 2026
**Last Updated**: January 6, 2026
