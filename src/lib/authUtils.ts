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

  const token = authHeader.substring(7); // Remove "Bearer " prefix
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

// Helper to create a wrapper for API routes that require authentication
export type AuthenticatedApiHandler = (
  req: NextRequest,
  context: { params?: any; userId: string } // Add userId to context
) => Promise<Response> | Response;

export function withAuth(handler: AuthenticatedApiHandler) {
  return async (req: NextRequest, context: { params?: any }) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return new Response(JSON.stringify({ message: 'Unauthorized: Invalid or missing token.' }), { status: 401 });
    }
    // Add userId to the context passed to the handler
    const newContext = { ...context, userId };
    return handler(req, newContext);
  };
}
