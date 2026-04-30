import type { SessionUser } from './auth-types'

export const SESSION_COOKIE_NAME = 'nexus_session'
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
/**
 * Extended lifetime when the user ticks "จำฉันไว้" at login. 30 days
 * is a balance: long enough that older staff don't get logged out
 * weekly, short enough that a forgotten device on a shared computer
 * still expires within a typical leave/quarter cycle. Same signed +
 * HMAC-verified cookie underneath; the difference is purely the `exp`
 * field on the payload + the cookie's max-age.
 */
export const SESSION_COOKIE_REMEMBER_AGE_SECONDS = 60 * 60 * 24 * 30

const SESSION_COOKIE_VERSION = 'v1'
const HMAC_ALGORITHM = { name: 'HMAC', hash: 'SHA-256' }

type SignedSessionPayload = SessionUser & {
    exp: number
}

function getSessionSecret(): string | null {
    return process.env.NEXUS_SESSION_SECRET
        ?? process.env.SESSION_COOKIE_SECRET
        ?? process.env.SUPABASE_SERVICE_ROLE_KEY
        ?? null
}

function base64UrlEncode(bytes: Uint8Array): string {
    const binary = String.fromCharCode(...bytes)
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

function base64UrlDecode(value: string): Uint8Array {
    const padded = value
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(value.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        HMAC_ALGORITHM,
        false,
        ['sign', 'verify'],
    )
}

function isSessionUser(value: unknown): value is SessionUser {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<SessionUser>
    return typeof candidate.id === 'string'
        && typeof candidate.name === 'string'
        && (
            candidate.role === 'hr_admin'
            || candidate.role === 'manager'
            || candidate.role === 'employee'
        )
        && (
            candidate.email === undefined
            || typeof candidate.email === 'string'
        )
        && (
            candidate.employeeId === undefined
            || typeof candidate.employeeId === 'string'
        )
}

export async function createSessionCookie(
    session: SessionUser,
    options: { expiresInSeconds?: number } = {},
): Promise<string> {
    const secret = getSessionSecret()
    if (!secret) {
        throw new Error('Missing NEXUS_SESSION_SECRET or SESSION_COOKIE_SECRET')
    }

    const lifetime = options.expiresInSeconds ?? SESSION_COOKIE_MAX_AGE_SECONDS
    const payload: SignedSessionPayload = {
        ...session,
        exp: Math.floor(Date.now() / 1000) + lifetime,
    }
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
    const encodedPayload = base64UrlEncode(payloadBytes)
    const key = await importSigningKey(secret)
    const signature = new Uint8Array(
        await crypto.subtle.sign(HMAC_ALGORITHM, key, new TextEncoder().encode(encodedPayload)),
    )

    return `${SESSION_COOKIE_VERSION}.${encodedPayload}.${base64UrlEncode(signature)}`
}

export async function verifySessionCookie(cookieValue: string | undefined | null): Promise<SessionUser | null> {
    if (!cookieValue) return null

    const [version, encodedPayload, encodedSignature] = cookieValue.split('.')
    if (version !== SESSION_COOKIE_VERSION || !encodedPayload || !encodedSignature) {
        return null
    }

    const secret = getSessionSecret()
    if (!secret) return null

    try {
        const key = await importSigningKey(secret)
        const isValid = await crypto.subtle.verify(
            HMAC_ALGORITHM,
            key,
            asArrayBuffer(base64UrlDecode(encodedSignature)),
            new TextEncoder().encode(encodedPayload),
        )
        if (!isValid) return null

        const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as SignedSessionPayload
        if (!isSessionUser(payload)) return null
        if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null

        return {
            id: payload.id,
            role: payload.role,
            name: payload.name,
            ...(payload.email ? { email: payload.email } : {}),
            ...(payload.employeeId ? { employeeId: payload.employeeId } : {}),
        }
    } catch {
        return null
    }
}
