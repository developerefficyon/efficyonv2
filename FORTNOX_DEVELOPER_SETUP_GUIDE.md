# Fortnox Developer Setup Guide

## Overview
This guide walks you through the complete process of registering as a Fortnox developer, creating integrations, setting up test environments, and connecting your application to Fortnox's API.

---

## Step 1: Register as a Developer

### What You Need to Do
1. **Register as a developer** on the Fortnox Developer Portal
   - This allows Fortnox to know who you are and how to contact you
   - Visit: https://developer.fortnox.se

### Why Register?
- Access to your own developer portal
- Create test databases (sandboxes)
- Get support for products and API
- Access to latest updates in developer environment
- Invitations to special developer events
- Join the Fortnox developer community

### Important Notes
- **If you already have a company** with an organization number in Fortnox, contact Fortnox support to add the developer portal to your existing company for free
- By registering, you agree to Fortnox's Change Policy

### Action Items
- [ ] Fill out the registration form
- [ ] Follow the instructions sent via email
- [ ] Verify your developer account

---

## Step 2: Create Your Integration

### Accessing the Developer Portal
1. Log in to your Fortnox account
2. Navigate to **Menu** → **Developer portal**
3. You'll see your developer portal dashboard

### Creating Your First Integration

#### 2.1 Click "Create Integration"
- Click the **"Create integration"** button in the developer portal

#### 2.2 Choose a Name
- **Take your time** choosing a descriptive name
- This name will be visible to users when they connect your integration
- Examples: "Efficyon AI", "Efficyon Staging", "Development"

#### 2.3 Select Scopes
**What are scopes?**
- Scopes determine which parts of Fortnox your integration can access
- Each scope corresponds to a specific module or feature
- Example: If you want to access payroll data, you need the "Lön" (Salary) scope

**Common Scopes for Cost Leak Analysis:**
- `companyinformation` - Company basic info (works with any license)
- `settings` - Company settings (works with any license)
- `profile` - User profile information (works with any license)
- `archive` - Archive access (works with any license)
- `inbox` - Inbox access (works with any license)
- `invoice` - Customer invoices (requires "Kundfaktura" or "Order" license)
- `supplierinvoice` - Supplier invoices (requires "Leverantörsfaktura" license)
- `expense` - Expenses (requires "Utlägg" license)
- `voucher` - Accounting vouchers (requires "Bokföring" license)
- `account` - Chart of accounts (requires "Bokföring" license)
- `salary` - Employee/salary data (requires "Lön" license)
- `customer` - Customer register (requires "Kundfaktura" or "Order" license)

**How to Choose:**
- Check the boxes for all scopes your integration needs
- You can always add more scopes later (requires re-authorization)
- Start with basic scopes and add more as needed

#### 2.4 Configure Redirect URI
- Set your redirect URI in the integration settings
- For local development: `http://localhost:4000/api/integrations/fortnox/callback`
- For production: `https://your-backend-domain.com/api/integrations/fortnox/callback`
- **Important:** This must match exactly what you use in your OAuth flow

#### 2.5 Save Your Integration
- Click **"Save"** to create your integration
- **Congratulations!** You've created your first integration

### What You Get After Creation
- **Client ID** - Unique identifier for your integration (e.g., "PJXSFQMcbFeJ")
- **Client Secret** - Secret key for authentication (keep this secure!)
- Ability to add descriptive information about your integration
- Statistics and analytics dashboard
- Option to publish your integration

### Action Items
- [ ] Create integration in developer portal
- [ ] Choose descriptive name
- [ ] Select required scopes
- [ ] Configure redirect URI
- [ ] Save Client ID and Client Secret securely
- [ ] Add descriptive information about your integration

---

## Step 3: Create Your Test Database

### Why Test Databases?
- Test your code in a **safe environment** before connecting live customers
- No risk of affecting real data
- All licenses available for testing
- Create up to **30 simultaneous test databases**

### Creating a Test Database
1. In the developer portal, navigate to **"Test environments"**
2. Click **"Create test environment"**
3. Choose a name (e.g., "Efficyon test environment / staging")
4. The test database will be created automatically

### Test Database Details
- **User Account:** Created using the email address of the user creating it in the developer portal
- **Login:** Use the credentials you receive to log in at www.fortnox.se
- **Access:** Full access to all Fortnox features for testing
- **Data:** Isolated test data, separate from production

### Managing Test Databases
- Create and delete test databases in the developer portal
- Each test database has its own Subscription ID
- You can log in directly to test databases via the "Login" button

### Action Items
- [ ] Create your first test database
- [ ] Note the Subscription ID
- [ ] Log in to the test environment
- [ ] Explore Fortnox functionality in test mode

---

## Step 4: Connect Your Integration

### Prerequisites
- Integration created in developer portal
- Redirect URI configured in integration settings
- Test database created and accessible

### Connecting to Test Environment
1. **Log in to your test database** at www.fortnox.se
2. Navigate to your integration connection page
3. Initiate the OAuth flow

### Manual Authorization Request (Optional)
You can also test the authorization manually using this format:

```
GET https://apps.fortnox.se/oauth-v1/auth?
    client_id={Client-ID}&
    redirect_uri=https%3A%2F%2Fmysite.org%2Factivation&
    scope=companyinformation&
    state=somestate123&
    access_type=offline&
    response_type=code
```

**Parameters:**
- `client_id` - Your Client ID from the developer portal
- `redirect_uri` - Your configured redirect URI (URL encoded)
- `scope` - Space-separated list of scopes (e.g., "companyinformation settings invoice")
- `state` - Random string for security (store this to verify on callback)
- `access_type=offline` - Required to get refresh tokens
- `response_type=code` - Always "code" for authorization code flow

### What Happens Next
- User (you, in test environment) will be redirected to Fortnox authorization page
- User approves the requested scopes
- Fortnox redirects back to your redirect URI with an authorization code
- Your application exchanges the code for access tokens

### Action Items
- [ ] Log in to test database
- [ ] Test OAuth connection flow
- [ ] Verify redirect URI works correctly
- [ ] Confirm authorization code is received

---

## Step 5: Authorize Your Integration

### OAuth2 Authorization Code Flow
The authorization uses **OAuth2 Authorization Code Flow**, which means:
- User must explicitly grant access to their account
- User approves the scope of access during activation
- Secure token-based authentication

### Authorization Code Details
- **Validity:** Authorization code is valid for **10 minutes**
- **Single Use:** Can only be used once to retrieve Access Token
- **Expiration:** Becomes invalid after 10 minutes or after first use

### Getting Access Token
Send a POST request to `/oauth-v1/token` endpoint:

**Example using cURL:**
```bash
curl -X "POST" "https://apps.fortnox.se/oauth-v1/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -H "Authorization: Basic {Credentials}" \
     -d "code=126573b6-9233-4636-9671-a009f652fe3d" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=https://mysite.org/activation"
```

**Parameters:**
- `code` - The authorization code received from Step 4
- `grant_type` - Always "authorization_code"
- `redirect_uri` - Must match the redirect URI used in Step 4
- `Authorization: Basic` - Base64 encoded `client_id:client_secret`

**Response:**
- `access_token` - Token for API requests (expires in 1 hour)
- `refresh_token` - Token to get new access tokens (expires in 45 days)
- `expires_in` - Access token expiration time in seconds (3600)
- `token_type` - Usually "bearer"
- `scope` - Granted scopes (may differ from requested)

### Action Items
- [ ] Implement token exchange endpoint
- [ ] Store access token and refresh token securely
- [ ] Implement token refresh logic
- [ ] Test token expiration handling

---

## Step 6: Making API Requests

### Using Your Access Token
Once you have the Access Token, you can start making API requests to Fortnox.

### Example API Request
```bash
curl -X "GET" "https://api.fortnox.se/3/customers" \
     -H "Authorization: Bearer {Access-Token}" \
     -H "Client-Id: {Your-Client-ID}" \
     -H "Client-Secret: {Your-Client-Secret}" \
     -H "Accept: application/json"
```

### Important Headers
- `Authorization: Bearer {Access-Token}` - Your access token
- `Client-Id: {Your-Client-ID}` - Your integration's Client ID
- `Client-Secret: {Your-Client-Secret}` - Your integration's Client Secret
- `Accept: application/json` - Request JSON response

### Rate Limits
- **Limit:** 25 requests per 5 seconds per access token
- **Equivalent:** 300 requests per minute
- **Strategy:** Implement rate limiting and request queuing

### Available Endpoints
Check Fortnox API documentation for available endpoints:
- `/3/companyinformation` - Company info
- `/3/customers` - Customer register
- `/3/invoices` - Customer invoices
- `/3/supplierinvoices` - Supplier invoices
- `/3/expenses` - Expenses
- `/3/vouchers` - Accounting vouchers
- `/3/employees` - Employee data
- And many more...

### Action Items
- [ ] Review Fortnox API documentation
- [ ] Implement API request functions
- [ ] Add rate limiting logic
- [ ] Handle API errors gracefully
- [ ] Test API endpoints with test database

---

## Step 7: Publishing Your Integration

### When to Publish
Once your integration is working and tested, you can choose to publish it at Fortnox. However, publishing is **optional**:
- If you built an integration for a specific customer, you might not need to publish
- Publishing makes your integration available to all Fortnox users

### Publishing Options

#### Option 1: Purchasable Integration
- **What it is:** Your software is available for customers to purchase directly within Fortnox
- **Benefits:**
  - Customers can buy your integration while logged into Fortnox
  - Dedicated space on Fortnox website
  - Increased visibility and discoverability
- **Best for:** Commercial products you want to sell through Fortnox

#### Option 2: Activatable Integration
- **What it is:** You sell your integration independently, and Fortnox serves as the activation channel
- **Benefits:**
  - You control pricing and sales
  - Fortnox platform makes activation easy for customers
  - More control over customer relationship
- **Best for:** Products you sell through your own channels

#### Option 3: Don't Publish
- Keep integration private
- Only accessible to customers you manually connect
- Best for custom integrations or internal tools

### Getting Help
If you have questions about publishing, contact Fortnox support for guidance.

### Action Items
- [ ] Decide if you want to publish
- [ ] Choose publishing option (if applicable)
- [ ] Prepare integration for publication
- [ ] Contact Fortnox support if needed
- [ ] Submit for review (if publishing)

---

## Quick Reference Checklist

### Initial Setup
- [ ] Register as Fortnox developer
- [ ] Access developer portal
- [ ] Create integration
- [ ] Configure scopes
- [ ] Set redirect URI
- [ ] Save Client ID and Client Secret

### Testing Setup
- [ ] Create test database
- [ ] Log in to test environment
- [ ] Test OAuth connection
- [ ] Verify token exchange
- [ ] Test API endpoints

### Development
- [ ] Implement OAuth flow
- [ ] Store tokens securely
- [ ] Implement token refresh
- [ ] Add rate limiting
- [ ] Handle errors gracefully
- [ ] Test with test database

### Production
- [ ] Test with real customer account
- [ ] Verify all scopes work
- [ ] Monitor API usage
- [ ] Set up error logging
- [ ] Prepare for publishing (optional)

---

## Common Issues and Solutions

### Issue: "Invalid client_id"
**Solution:** Verify your Client ID is correct (not an email address). Client IDs are alphanumeric strings like "PJXSFQMcbFeJ"

### Issue: "Invalid redirect_uri"
**Solution:** Ensure the redirect URI in your OAuth request exactly matches what's configured in the developer portal

### Issue: "Invalid scope"
**Solution:** Check that all requested scopes are enabled in your integration settings in the developer portal

### Issue: "Missing license"
**Solution:** Some scopes require specific Fortnox licenses. In test environment, all licenses are available. In production, customer must have the required license.

### Issue: "Token expired"
**Solution:** Access tokens expire after 1 hour. Use the refresh token to get a new access token before it expires.

### Issue: Rate limit exceeded
**Solution:** Implement rate limiting (max 25 requests per 5 seconds). Queue requests and retry after the limit resets.

---

## Next Steps

After completing this setup guide:
1. Review the [Cost Leak Analysis Roadmap](./COST_LEAK_ANALYSIS_ROADMAP.md) for implementation details
2. Start implementing backend endpoints for data collection
3. Build the AI analysis engine
4. Create the frontend dashboard
5. Test thoroughly with test database
6. Deploy to production

---

## Resources

- **Fortnox Developer Portal:** https://developer.fortnox.se
- **Fortnox API Documentation:** https://apps.fortnox.se/apidocs
- **OAuth Documentation:** https://developer.fortnox.se/documentation/oauth/
- **Scope Reference:** https://developer.fortnox.se/documentation/oauth/scopes/
- **Support:** Contact Fortnox support through developer portal

---

## Notes

- Test databases are completely isolated from production
- All licenses are available in test environment
- You can create up to 30 test databases simultaneously
- Test databases can be deleted and recreated as needed
- Always test thoroughly in test environment before connecting to production
- Keep your Client Secret secure and never expose it in frontend code

