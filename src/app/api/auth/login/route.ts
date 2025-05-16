import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Import jsonwebtoken

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

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!, // Ensure JWT_SECRET is set in .env
      { expiresIn: '15m' } // Token expires in 15 minutes
    );

    const response = NextResponse.json(
      {
        message: 'Login successful.',
        user: {
          id: user._id,
          email: user.email,
        },
        token, // Send token to client
      },
      { status: 200 }
    );

    // Optionally, set token in an httpOnly cookie for better security
    // response.cookies.set('token', token, { 
    //   httpOnly: true, 
    //   secure: process.env.NODE_ENV === 'production', 
    //   sameSite: 'strict', 
    //   maxAge: 3600, // 1 hour
    //   path: '/',
    // });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
