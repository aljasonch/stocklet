import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyTokenFromCookies } from '@/lib/authUtils'; // Use the updated verification
import RevokedToken from '@/models/RevokedToken';

export async function POST(req: NextRequest) {
  await dbConnect();

  const decodedToken = verifyTokenFromCookies(req);

  if (decodedToken && decodedToken.jti && decodedToken.exp) {
    try {
      // Add the JTI to the blacklist with its original expiry time
      // The TTL index on RevokedToken schema will handle cleanup
      const existingRevokedToken = await RevokedToken.findOne({ jti: decodedToken.jti });
      if (!existingRevokedToken) {
        await RevokedToken.create({
          jti: decodedToken.jti,
          expiresAt: new Date(decodedToken.exp * 1000), // exp is in seconds, Date needs milliseconds
        });
      }
    } catch (error) {
      console.error('Error adding token to blacklist:', error);
      // Proceed to clear cookie even if blacklist fails, to ensure logout
    }
  }

  const response = NextResponse.json({ message: 'Logout successful' }, { status: 200 });
  
  // Clear the token cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1, // Expire the cookie immediately
    path: '/',
  });

  return response;
}
