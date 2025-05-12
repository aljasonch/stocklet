import { NextRequest } from 'next/server';
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
type RouteParams = Record<string, string | string[]>;

export type AuthenticatedApiHandler<P = RouteParams> = (
  req: NextRequest,
  context: { params?: P; userId: string } 
) => Promise<Response> | Response;

export function withAuth<P = RouteParams>(handler: AuthenticatedApiHandler<P>) {
  return async (req: NextRequest, context: { params?: P }) => { // Use generic P
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return new Response(JSON.stringify({ message: 'Unauthorized: Invalid or missing token.' }), { status: 401 });
    }
    const newContext = { ...context, userId };
    return handler(req, newContext);
  };
}
