# How to Get an OpenAI API Key

## Quick Guide

The LookLabs app can run in **demo mode** without an API key, but to get real AI-powered clothing analysis, you'll need an OpenAI API key.

## Running Without API Key (Demo Mode)

You can test the app immediately without any API key! It will use mock/demo data for clothing analysis.

Just run:
```bash
./run.sh
```

The app will automatically detect that no API key is set and run in demo mode. You'll see warnings like:
```
⚠️  Running in MOCK MODE - using demo data. Set OPENAI_API_KEY for real AI analysis.
```

## Getting an OpenAI API Key

1. **Sign Up / Log In**
   - Go to [https://platform.openai.com](https://platform.openai.com)
   - Sign up for an account (or log in if you already have one)

2. **Add Payment Method**
   - OpenAI requires a payment method on file (even for free credits)
   - Go to Settings → Billing → Payment methods
   - Add a credit card or other payment method

3. **Get Your API Key**
   - Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Copy the key immediately (you won't be able to see it again!)

4. **Add to Your Project**
   - Create a `.env` file in the project root:
   ```bash
   OPENAI_API_KEY=sk-your-actual-key-here
   DATABASE_URL=sqlite:///./closet.db
   STORAGE_DIR=./storage
   ```
   - Or use the setup script:
   ```bash
   ./setup_env.sh
   ```

## Pricing

- **Free Credits**: New accounts often get $5-10 in free credits to start
- **Pay As You Go**: After free credits, you pay per API call
- **GPT-4 Vision**: Costs approximately:
  - ~$0.01-0.03 per image analysis (varies by image size)
  - Very affordable for personal use!
  
Check current pricing at: [https://openai.com/pricing](https://openai.com/pricing)

## Demo Mode vs Real API

### Demo Mode (No API Key)
- ✅ Works immediately
- ✅ No cost
- ✅ Good for testing UI/features
- ❌ Uses random/mock data
- ❌ Not accurate analysis

### Real API Mode (With API Key)
- ✅ Real AI-powered analysis
- ✅ Accurate clothing detection
- ✅ Proper item separation from outfit photos
- ✅ Detailed attribute extraction
- ⚠️ Small cost per analysis
- ⚠️ Requires internet connection

## Troubleshooting

**"API key not found" error?**
- Make sure your `.env` file is in the project root directory
- Check that the file contains: `OPENAI_API_KEY=your_key_here`
- Restart the server after creating/updating `.env`

**Want to force demo mode even with an API key?**
- Set `USE_MOCK_MODE=true` in your `.env` file

**API errors or rate limits?**
- Check your OpenAI account billing status
- Verify you have credits available
- Check API status: [https://status.openai.com](https://status.openai.com)
