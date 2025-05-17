import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto'; // For JTI

const JWT_ISSUER = 'stocklet-app';
const JWT_AUDIENCE = 'stocklet-users';
const JWT_EXPIRY = '15m'; // For token payload
const COOKIE_MAX_AGE = 15 * 60; // 15 minutes in seconds for cookie

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 401 } // Unauthorized
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    // // Placeholder for JWT generation
    // const token = jwt.sign(
    //   { userId: user._id, email: user.email },
    //   process.env.JWT_SECRET || 'your-secret-key', // Store secret in .env.local
    //   { expiresIn: '1h' }
    // );

    const jti = randomUUID();
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      jti, // JWT ID
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET!,
      { 
        expiresIn: JWT_EXPIRY,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }
    );

    // Instead of sending token in body, set it in an HttpOnly cookie
    const response = NextResponse.json(
      {
        message: 'Login successful.',
        user: {
          id: user._id,
          email: user.email,
        }
        // Token is no longer sent in the body
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Using 'lax' is a common recommendation
      maxAge: COOKIE_MAX_AGE, 
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
