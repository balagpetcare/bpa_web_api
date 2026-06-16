import { prisma } from '../../database/prisma';
import { verifyPassword } from '../../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getAccessTokenExpiryDate,
  getRefreshTokenExpiryDate,
} from '../../utils/jwt';
import { AppError } from '../../utils/AppError';
import { ERROR_CODES } from '../../config/constants';
import { AuthPayload } from '../../types';
import { LoginDto, AuthResponse, MeResponse } from './auth.types';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function login(dto: LoginDto): Promise<AuthResponse> {
  const user = await prisma.user.findFirst({
    where: { email: dto.email, deletedAt: null },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    // No audit trail update needed — unknown email, nothing to lock
    throw AppError.unauthorized('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw AppError.unauthorized(
      `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
      ERROR_CODES.INVALID_CREDENTIALS,
    );
  }

  const valid = await verifyPassword(dto.password, user.passwordHash);

  if (!valid) {
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });

    // Audit the failed attempt
    await prisma.auditLog.create({
      data: {
        action: 'update',
        resource: 'auth',
        resourceId: user.id,
        actorEmail: dto.email,
        newValues: {
          event: 'login_failed',
          failedAttempts: newAttempts,
          locked: shouldLock,
        },
      },
    });

    if (shouldLock) {
      throw AppError.unauthorized(
        'Account locked for 30 minutes after too many failed login attempts.',
        ERROR_CODES.INVALID_CREDENTIALS,
      );
    }

    throw AppError.unauthorized('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
  }

  // Successful login — reset lockout state
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  return issueTokenPair(user);
}

export async function refresh(rawToken: string): Promise<AuthResponse> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw AppError.unauthorized('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
  }

  const stored = await prisma.refreshToken.findFirst({
    where: { token: rawToken, revokedAt: null },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token expired or revoked', ERROR_CODES.TOKEN_INVALID);
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null, isActive: true },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw AppError.unauthorized('User not found', ERROR_CODES.UNAUTHORIZED);
  }

  return issueTokenPair(user);
}

export async function logout(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: rawToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string): Promise<MeResponse> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!user) throw AppError.notFound('User');

  return formatMeResponse(user);
}

// ─── Helpers ────────────────────────────────────────────

type UserWithRoles = Awaited<ReturnType<typeof prisma.user.findFirst>> & {
  userRoles: Array<{
    role: {
      name: string;
      rolePermissions: Array<{ permission: { resource: string; action: string } }>;
    };
  }>;
};

async function issueTokenPair(user: NonNullable<UserWithRoles>): Promise<AuthResponse> {
  const roles = user.userRoles.map((ur) => ur.role.name);
  // permissions are NOT put in the JWT.
  // A super_admin has 100+ permissions; signing them into the token produces ~32 KB,
  // which exceeds Nginx's upstream header buffer and NextAuth's cookie limit → 502.
  // The login response includes permissions via formatMeResponse() for UI bootstrap.
  // authorize() fetches them from DB on demand for non-super-admin users.
  const accessPayload: AuthPayload = {
    sub: user.id,
    email: user.email,
    roles,
  };

  const accessToken = signAccessToken(accessPayload);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiryDate(),
    },
  });

  return {
    user: formatMeResponse(user),
    accessToken,
    refreshToken,
    accessTokenExpires: getAccessTokenExpiryDate().getTime(),
  };
}

function formatMeResponse(user: NonNullable<UserWithRoles>): MeResponse {
  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
      ),
    ),
  ];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    roles,
    permissions,
  };
}
