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

// Updated withAuthStatic to handle dynamic route context and sliding sessions
export function withAuthStatic<TContext = Record<string, unknown>>(
  handler: (req: NextRequest, context: TContext) => Promise<Response>
) {
  return async (req: NextRequest, context: TContext) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Missing or malformed token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Missing token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    } catch (error) {
      console.error('JWT verification error in withAuthStatic:', error);
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Invalid or expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (!decoded.userId) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Invalid token payload' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Proceed with the handler
    const response = await handler(req, context);

    // Sliding session: Check if token needs refresh and issue a new one
    const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
    const tokenExp = decoded.exp; // expiration time from token (already in seconds)
    let newToken: string | null = null;

    if (tokenExp) {
      const fiveMinutesInSeconds = 5 * 60;
      // Refresh if token expires in less than 5 minutes (or any configurable threshold)
      if (tokenExp - currentTime < fiveMinutesInSeconds) {
        newToken = jwt.sign(
          { userId: decoded.userId, email: decoded.email },
          process.env.JWT_SECRET!,
          { expiresIn: '15m' } // Issue a new token for 15 minutes
        );
      }
    }

    if (newToken) {
      // Clone the response to set a new header
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-New-Token', newToken);
      
      // For NextResponse, we need to reconstruct it if we want to change headers and keep the body.
      // If the original response was a NextResponse.json(), its body is already stringified.
      // If it was a simple NextResponse with a ReadableStream body, this gets more complex.
      // Assuming handlers mostly return NextResponse.json() or simple NextResponse with string bodies.
      
      let body = null;
      if (response.body) {
        // This is tricky because response.body is a ReadableStream and can only be consumed once.
        // For JSON responses, NextResponse.json() handles stringifying.
        // If we need to preserve the exact body, we might need to make assumptions or read it.
        // A common pattern is that handlers return NextResponse.json().
        // If the response is already a JSON response, its body is already stringified.
        // For simplicity, let's assume we can get the body if it's JSON.
        // This part might need adjustment based on actual handler return types.
        // A more robust way would be for handlers to return data, and this wrapper forms the NextResponse.
        
        // If the response was created with NextResponse.json(), its body is already stringified.
        // We can try to get it as text.
        try {
            // Clone the response to read its body without consuming the original
            const clonedResponse = response.clone();
            body = await clonedResponse.text(); // Or .json() if sure it's always JSON
        } catch (e) {
            // console.warn("Could not clone response body for token refresh header:", e);
            // If cloning/reading fails, we might have to return the original response without the new token.
            // Or, if the response was simple (e.g. just status), we can reconstruct.
        }
      }
      
      // Reconstruct the response with new headers
      // This is a simplified reconstruction. If handlers return complex Response objects,
      // this might not perfectly preserve them.
      const newResponse = new NextResponse(body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
      return newResponse;
    }

    return response;
  };
}
