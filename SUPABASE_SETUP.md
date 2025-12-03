# Supabase Configuration for Password Reset

## Required Configuration

To make password reset work properly, you need to configure the redirect URLs in your Supabase dashboard.

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Authentication** → **URL Configuration**

2. **Add Redirect URLs**
   Add these URLs to the **Redirect URLs** list:
   ```
   http://localhost:3000/reset-password
   http://localhost:3001/reset-password
   https://yourdomain.com/reset-password
   ```
   
   **Important**: Add all variations you might use:
   - Development: `http://localhost:3000/reset-password`
   - Production: `https://yourdomain.com/reset-password`
   - Any other ports you use locally

3. **Site URL**
   Set the **Site URL** to your main application URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

4. **Email Templates** (Optional but Recommended)
   - Go to **Authentication** → **Email Templates**
   - Select **Reset Password** template
   - Make sure the redirect URL in the template matches your app URL
   - The default template should work, but you can customize it

### Why This Is Needed

Supabase validates redirect URLs for security. If the redirect URL in the password reset email doesn't match one of the configured URLs, the link will be rejected and appear as "expired" immediately.

### Testing

After configuring:
1. Request a password reset from `/forgot-password`
2. Check your email for the reset link
3. Click the link - it should redirect to `/reset-password` with tokens in the URL
4. Enter your new password
5. You should be redirected to `/login` after successful reset

### Troubleshooting

If reset links still expire immediately:
- Check that the redirect URL in the email matches exactly what's in Supabase dashboard
- Make sure there are no trailing slashes or extra characters
- Verify the protocol (http vs https) matches
- Check browser console for any errors
- Ensure Supabase project is in the correct environment (development/production)

