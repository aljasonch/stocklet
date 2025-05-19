import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyTokenFromCookies } from '@/lib/authUtils';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import RevokedToken from '@/models/RevokedToken';

const JWT_ISSUER = 'stocklet-app';
const JWT_AUDIENCE = 'stocklet-users';
const JWT_EXPIRY = '15m';
const COOKIE_MAX_AGE = 15 * 60;

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const decodedToken = verifyTokenFromCookies(req);
    
    if (!decodedToken || !decodedToken.userId || !decodedToken.email || !decodedToken.jti) {
      return NextResponse.json({ message: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const isRevoked = await RevokedToken.findOne({ jti: decodedToken.jti });
    if (isRevoked) {
      const response = NextResponse.json({ message: 'Unauthorized: Token has been revoked' }, { status: 401 });
      response.cookies.delete('token');
      return response;
    }

    const newJti = randomUUID();
    const newToken = jwt.sign(
      { 
        userId: decodedToken.userId, 
        email: decodedToken.email, 
        jti: newJti 
      },
      process.env.JWT_SECRET!,
      { 
        expiresIn: JWT_EXPIRY,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }
    );

    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      user: {
        id: decodedToken.userId,
        email: decodedToken.email
      }
    }, { status: 200 });

    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ message: 'An error occurred during token refresh' }, { status: 500 });
  }
}
