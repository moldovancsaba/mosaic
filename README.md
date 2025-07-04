![Version](https://img.shields.io/badge/version-6.0.0-blue.svg)

_Last updated: 2025-07-01T00:08:01.000Z_

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

1. Set up MongoDB configuration:
   - Create a `.env.local` file in the root directory
   - Add your MongoDB connection string (refer to `.env.example` for the format)
   - The database name will be automatically extracted from your connection string

2. Configure Authentication and User Management:
   - Add JWT_SECRET to `.env.local` for token signing
   - Configure EMAIL_SERVICE settings for magic links:
     ```env
     EMAIL_SERVICE_API_KEY=your_api_key
     EMAIL_FROM=noreply@yourdomain.com
     ```
   - Set up initial admin user:
     ```env
     ADMIN_EMAIL=admin@yourdomain.com
     ```

3. User Management and Access Control:
   - Access the user management interface at `/users` (admin only)
   - Default roles:
     - admin: Full system access including user management
     - user: Basic access with restricted permissions
   - Role management:
     - Only admins can modify user roles
     - Users must log in before accessing protected routes
     - Admin rights required for organization creation
   - Authentication State:
     - Navigation updates automatically after login
     - Role-based visibility of features
     - Secure session management with JWT tokens

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
