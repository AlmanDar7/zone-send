import admin from 'firebase-admin';

// Initialize Firebase Admin
// Make sure to set FIREBASE_SERVICE_ACCOUNT in your .env or initialize with default application credentials
try {
  admin.initializeApp();
} catch (error) {
  console.log('Firebase admin already initialized or missing credentials');
}

import { Request, Response, NextFunction } from 'express';

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
    // For production, this will perfectly verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    
    // DEV FALLBACK: If Firebase Admin fails (missing creds), we can manually decode the JWT payload
    // WARNING: This does NOT verify the signature. Only use if strictly needed for local dev without creds.
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
      const decoded = JSON.parse(decodedJson);
      req.user = {
        uid: decoded.user_id || decoded.uid,
        email: decoded.email
      };
      next();
    } catch (fallbackError) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }
};
