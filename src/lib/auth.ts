import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'persistent_cart_session';

export interface SessionData {
  sessionId: string;
  sessionToken: string;
  expires: Date;
  userId?: string;
}

export async function createSession(userId?: string): Promise<SessionData> {
  const sessionToken = uuidv4();
  const expires = new Date();
  expires.setDate(expires.getDate() + 30); // 30 days expiration

  const session = await prisma.session.create({
    data: {
      id: userId,
      sessionToken,
      userId,
      expires,
    },
  });

  return {
    sessionId: userId || session.id,
    sessionToken: session.sessionToken,
    expires: session.expires,
    userId: session.userId || undefined,
  };
}

export async function getSessionFromToken(sessionToken: string) {
  try {
    const session = await prisma.session.findUnique({
      where: {
        sessionToken,
      },
      include: {
        cart: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!session || session.expires < new Date()) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function getOrCreateSession(request: NextRequest): Promise<SessionData> {
  const requestData = await request.json();
  let userId = requestData.userId;

  if (userId) {
    const existingSession = await prisma.session.findFirst({ where: { id:userId } });
    if (existingSession) {
      return {
        sessionId: userId,
        sessionToken: existingSession.sessionToken,
        expires: existingSession.expires,
        userId: existingSession.userId || undefined,
      };
    }
  }

  return await createSession(userId);
}

export function setSessionCookie(response: NextResponse, sessionData: SessionData) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionData.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: sessionData.expires,
    path: '/',
  });
}

export function generateJWT(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function generateDeviceFingerprint(request: NextRequest): Promise<string> {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Create a simple fingerprint based on headers
  const fingerprint = Buffer.from(
    `${userAgent}:${acceptLanguage}:${acceptEncoding}`
  ).toString('base64');
  
  return fingerprint;
}

export async function registerDevice(sessionId: string, request: NextRequest) {
  const deviceId = await generateDeviceFingerprint(request);
  const userAgent = request.headers.get('user-agent');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ipAddress = forwardedFor || realIp || 'unknown';

  try {
    const existingDevice = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (existingDevice) {
      // Update last access
      await prisma.device.update({
        where: { deviceId },
        data: {
          sessionId,
          lastAccess: new Date(),
          isActive: true,
        },
      });
    } else {
      // Create new device
      await prisma.device.create({
        data: {
          sessionId,
          deviceId,
          userAgent,
          ipAddress,
          lastAccess: new Date(),
          isActive: true,
        },
      });
    }
  } catch (error) {
    console.error('Error registering device:', error);
  }
} 