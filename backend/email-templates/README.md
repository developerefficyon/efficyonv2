# Supabase Email Templates

This folder contains email templates for Supabase authentication emails.

## Templates Included

1. **confirm-email.html** - Email verification template
   - Used when users register and need to verify their email
   - Redirects to login page after verification
   - Shows success message

2. **reset-password.html** - Password reset template
   - Used when users request a password reset
   - Contains secure reset link

3. **magic-link.html** - Magic link sign-in template
   - Used for passwordless authentication
   - Provides one-click sign-in

4. **change-email.html** - Email change confirmation template
   - Used when users request to change their email address
   - Requires confirmation of new email

## How to Use in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select the template type you want to customize:
   - **Confirm signup** → Use `confirm-email.html`
   - **Reset password** → Use `reset-password.html`
   - **Magic Link** → Use `magic-link.html`
   - **Change email address** → Use `change-email.html`
4. Copy the HTML content from the corresponding file
5. Paste it into the Supabase template editor
6. Save the template

## Template Variables

Supabase provides these variables that you can use in templates:

- `{{ .ConfirmationURL }}` - The confirmation/reset link URL
- `{{ .Email }}` - User's email address
- `{{ .NewEmail }}` - New email address (for email change)
- `{{ .Token }}` - Confirmation token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL after confirmation

## Customization

All templates use:
- Efficyon branding colors (cyan/blue gradient)
- Responsive design
- Modern, clean styling
- Security notes for user awareness

You can customize:
- Colors (update the gradient colors in the CSS)
- Logo/branding
- Text content
- Button styles
- Footer information

## Redirect Configuration

For the email verification template to redirect to login:

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000` (or your production URL)
3. Set **Redirect URLs** to include:
   - `http://localhost:3000/auth/verify` (verification success page)
   - `http://localhost:3000/login` (login page)
   - For production: `https://yourdomain.com/auth/verify` and `https://yourdomain.com/login`

The verification flow works as follows:
1. User clicks verification link in email
2. Supabase verifies the email
3. User is redirected to `/auth/verify` page
4. Success message is shown
5. User is automatically redirected to `/login` after 5 seconds
   - Manual "Go to Login" button
   - Countdown timer

## Next Steps:

1. Copy email templates to Supabase:
   - Go to Supabase Dashboard → Authentication → Email Templates
   - Copy content from each HTML file into the corresponding template

2. Configure redirect URL in Supabase:
   - Go to Supabase Dashboard → **Authentication** → **URL Configuration**
   - Set **Site URL** to: `http://localhost:3000` (or your production URL)
   - In **Redirect URLs**, add **all ports** your app might use:
     - `http://localhost:3000/auth/verify`
     - `http://localhost:3000/login`
     - `http://localhost:3001/auth/verify` (if Next.js uses port 3001)
     - `http://localhost:3001/login` (if Next.js uses port 3001)
     - For production: `https://yourdomain.com/auth/verify` and `https://yourdomain.com/login`
   - **Important**: Make sure to click "Save" after adding the redirect URLs
   - **Note**: Next.js automatically uses port 3001 if 3000 is already in use

3. Test the flow:
   - Register a new user
   - Check email for verification link
   - Click the link
   - Should redirect to `/auth/verify` showing success message
   - Automatically redirects to `/login` after 5 seconds

## Notes

- All templates are mobile-responsive
- Templates use inline CSS for better email client compatibility
- Security notes are included to help users identify phishing attempts
- The confirmation URL automatically handles the redirect flow

