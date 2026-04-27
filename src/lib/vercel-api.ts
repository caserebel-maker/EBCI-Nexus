import 'server-only'

/**
 * Thin Vercel REST API client for the quota dashboard.
 *
 * Reads from the public Vercel API (https://api.vercel.com) using a
 * personal access token in `VERCEL_API_TOKEN`. Optional team scoping
 * via `VERCEL_TEAM_ID`. If either env is missing the helpers return
 * `null` so callers can gracefully degrade to a placeholder card.
 *
 * Free-tier API exposes project + deployment metadata; bandwidth /
 * invocations / Active CPU usage are Pro-tier only and aren't fetched
 * here. When you upgrade, swap `usageSummary` to hit /v1/projects/.../
 * usage and surface the new fields.
 */

const VERCEL_API = 'https://api.vercel.com'

interface FetchOpts {
    method?: 'GET'
    revalidate?: number
}

async function vercelFetch<T>(path: string, opts: FetchOpts = {}): Promise<T | null> {
    const token = process.env.VERCEL_API_TOKEN
    if (!token) return null
    const teamId = process.env.VERCEL_TEAM_ID
    const url = teamId
        ? `${VERCEL_API}${path}${path.includes('?') ? '&' : '?'}teamId=${teamId}`
        : `${VERCEL_API}${path}`
    try {
        const res = await fetch(url, {
            method: opts.method ?? 'GET',
            headers: {
                authorization: `Bearer ${token}`,
                accept: 'application/json',
            },
            // Cache for a few minutes so the dashboard polling doesn't burn
            // through the Vercel API rate limit (100 req / 10s on free).
            next: { revalidate: opts.revalidate ?? 300 },
        })
        if (!res.ok) {
            console.warn(`[vercel-api] ${path} → ${res.status}`)
            return null
        }
        return await res.json() as T
    } catch (err) {
        console.warn('[vercel-api] fetch error:', err)
        return null
    }
}

export interface VercelProjectSummary {
    id: string
    name: string
    framework: string | null
    latest_deployment_at: string | null
    latest_deployment_state: string | null
    latest_deployment_url: string | null
}

interface ProjectResponse {
    id: string
    name: string
    framework?: string | null
    latestDeployments?: Array<{
        url?: string
        readyState?: string
        createdAt?: number
    }>
}

export async function getProject(projectId: string): Promise<VercelProjectSummary | null> {
    const data = await vercelFetch<ProjectResponse>(`/v9/projects/${projectId}`)
    if (!data) return null
    const latest = data.latestDeployments?.[0]
    return {
        id: data.id,
        name: data.name,
        framework: data.framework ?? null,
        latest_deployment_at: latest?.createdAt ? new Date(latest.createdAt).toISOString() : null,
        latest_deployment_state: latest?.readyState ?? null,
        latest_deployment_url: latest?.url ? `https://${latest.url}` : null,
    }
}

export interface VercelDeploymentStats {
    last_30_days: number
    last_7_days: number
    success_rate_30d: number  // 0..1
    failed_30d: number
}

interface DeploymentsResponse {
    deployments?: Array<{
        state?: string
        readyState?: string
        createdAt?: number
    }>
}

export async function getDeploymentStats(projectId: string): Promise<VercelDeploymentStats | null> {
    // Pull the last 100 deployments — enough for 30-day stats on a busy
    // project, and keeps the request cheap. limit=100 is the API max.
    const data = await vercelFetch<DeploymentsResponse>(
        `/v6/deployments?projectId=${projectId}&limit=100`,
    )
    if (!data?.deployments) return null

    const now = Date.now()
    const day30 = now - 30 * 86_400_000
    const day7 = now - 7 * 86_400_000

    let last30 = 0
    let last7 = 0
    let failed30 = 0
    for (const d of data.deployments) {
        const ts = d.createdAt ?? 0
        if (ts < day30) continue
        last30++
        if (ts >= day7) last7++
        const state = (d.readyState ?? d.state ?? '').toUpperCase()
        if (state === 'ERROR' || state === 'CANCELED') failed30++
    }
    return {
        last_30_days: last30,
        last_7_days: last7,
        failed_30d: failed30,
        success_rate_30d: last30 > 0 ? +(1 - failed30 / last30).toFixed(3) : 1,
    }
}

export interface VercelUsageSnapshot {
    project: VercelProjectSummary | null
    deployments: VercelDeploymentStats | null
    has_token: boolean
}

/**
 * Aggregates everything the dashboard needs in one shot.
 *
 *   • returns has_token=false when VERCEL_API_TOKEN is unset, letting
 *     the caller show a setup hint instead of an empty card.
 *   • each individual fetch fails independently, so a flaky API call
 *     doesn't kill the rest of the snapshot.
 */
export async function getVercelUsage(projectId: string | undefined): Promise<VercelUsageSnapshot> {
    const has_token = Boolean(process.env.VERCEL_API_TOKEN)
    if (!has_token || !projectId) {
        return { project: null, deployments: null, has_token }
    }
    const [project, deployments] = await Promise.all([
        getProject(projectId),
        getDeploymentStats(projectId),
    ])
    return { project, deployments, has_token }
}
