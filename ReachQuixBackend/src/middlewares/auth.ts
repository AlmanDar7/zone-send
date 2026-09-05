import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Request, Response, NextFunction } from 'express';

// Initialize Firebase Admin if projectId / credentials exist
try {
  if (getApps().length === 0 && (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'reachquix-f2653',
    });
  }
} catch (error) {
  // Firebase admin initialized or using dev mode
}

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    if (getApps().length > 0) {
      const decodedToken = await getAuth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
      return next();
    }
  } catch (error) {
    // Proceed to dev/JWT fallback
  }

  // DEV / JWT PAYLOAD PARSER
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
    const decoded = JSON.parse(decodedJson);
    req.user = {
      uid: decoded.user_id || decoded.uid || decoded.sub,
      email: decoded.email
    };
    next();
  } catch (fallbackError) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
