import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  await dbConnect();

  if (process.env.NEXT_PUBLIC_REGISTRATION_ENABLED !== 'true') {
    return NextResponse.json(
      { message: 'Registration is currently disabled.' },
      { status: 403 } // Forbidden
    );
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Basic password validation (e.g., minimum length)
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists.' },
        { status: 409 } // Conflict
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      email: email.toLowerCase(),
      passwordHash,
    });

    await newUser.save();

    return NextResponse.json(
      {
        message: 'User registered successfully.',
        user: {
          id: newUser._id,
          email: newUser.email,
        },
      },
      { status: 201 } // Created
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    // Handle Mongoose validation errors specifically if needed
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
