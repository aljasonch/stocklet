import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import RevokedToken from '@/models/RevokedToken';
import dbConnect from './dbConnect';

const JWT_ISSUER = 'stocklet-app';
const JWT_AUDIENCE = 'stocklet-users';
const JWT_EXPIRY = '15m';
const COOKIE_MAX_AGE = 15 * 60;
const CLOCK_SKEW_TOLERANCE = 60; 
const REFRESH_THRESHOLD = 5 * 60; 

interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  jti: string;
}

export function verifyTokenFromCookies(req: NextRequest): DecodedToken | null {
  const tokenCookie = req.cookies.get('token');
  if (!tokenCookie || !tokenCookie.value) {
    return null;
  }
  const token = tokenCookie.value;

  try {
    const verifyOptions: VerifyOptions = {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: CLOCK_SKEW_TOLERANCE,
    };    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, verifyOptions) as DecodedToken;
    
    return decoded; 
  } catch {
    return null;
  }
}

export function getUserIdFromToken(req: NextRequest): string | null {
  const decodedToken = verifyTokenFromCookies(req);
  return decodedToken ? decodedToken.userId : null;
}

export interface HandlerResult {
  status: number;
  data?: Record<string, unknown>;
  error?: string;
  message?: string; 
}

// TParams is the type of the *resolved* parameters object, e.g., { id: string } or Record<string, never>
export function withAuthStatic<TParams = Record<string, string | string[] | undefined>>(
  // Inner handler expects context with resolved params
  handler: (
    req: NextRequest,
    context: { params: TParams }, // Context with resolved params
    userId: string,
    userEmail: string,
    jti: string
  ) => Promise<HandlerResult>
) {
  // The function returned to Next.js
  // Its context.params is typed as a Promise to satisfy Next.js's internal type checker.
  return async (
    req: NextRequest,
    contextFromNextJs: { params: Promise<TParams> } // Context with params as a Promise (for type checker)
  ) => {
    await dbConnect();

    const decodedToken = verifyTokenFromCookies(req);
    if (!decodedToken || !decodedToken.userId || !decodedToken.jti) {
      const errResponse = NextResponse.json({ message: 'Unauthorized: Invalid or expired token (decode failed)' }, { status: 401 });
      errResponse.cookies.delete('token');
      return errResponse;
    }

    const isRevoked = await RevokedToken.findOne({ jti: decodedToken.jti });
    if (isRevoked) {
      const errResponse = NextResponse.json({ message: 'Unauthorized: Token has been revoked' }, { status: 401 });
      errResponse.cookies.delete('token');
      return errResponse;
    }

    // Resolve the params. If contextFromNextJs.params is not a promise at runtime, 
    // await will effectively return the value itself. This satisfies the type checker.
    const resolvedParams = await contextFromNextJs.params;
    
    const handlerResult = await handler(
      req,
      { params: resolvedParams }, // Pass context with resolved params to the inner handler
      decodedToken.userId,
      decodedToken.email,
      decodedToken.jti
    );
    const responsePayload = handlerResult.data || { message: handlerResult.message || handlerResult.error };
    const responseStatus = handlerResult.status;
    
    const finalResponse = NextResponse.json(responsePayload, { status: responseStatus });


    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = decodedToken.exp; 
    let newJwtToken: string | null = null;

    if (tokenExp) {
      if ((tokenExp - currentTime) < (REFRESH_THRESHOLD + CLOCK_SKEW_TOLERANCE)) {
        const newJti = randomUUID();
        newJwtToken = jwt.sign(
          { userId: decodedToken.userId, email: decodedToken.email, jti: newJti },
          process.env.JWT_SECRET!,
          { 
            expiresIn: JWT_EXPIRY,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
          }
        );
      }
    }

    if (newJwtToken) {
      finalResponse.cookies.set('token', newJwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
    }
    return finalResponse;
  };
}
