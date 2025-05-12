import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
}

export function getUserIdFromToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); 
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded.userId;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}
// Removed RouteParams type as it was only used by AuthenticatedApiHandler
// Removed AuthenticatedApiHandler type
// Removed withAuth function

export function withAuthStatic(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const userId = getUserIdFromToken(req);
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    return handler(req);
  };
}
