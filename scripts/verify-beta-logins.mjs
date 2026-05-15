#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const DEFAULT_SMOKE_LOGINS = [
    ['009-35', 'employee dashed'],
    ['00935',  'employee compact'],
    ['048-45', 'new employee dashed'],
    ['04845',  'new employee compact'],
    ['056-47', 'advisor dashed'],
    ['05647',  'advisor compact'],
    ['506-69', 'admin dashed'],
    ['50669',  'admin compact'],
]

function loadEnvFile(file) {
    const full = path.join(ROOT, file)
    if (!fs.existsSync(full)) return
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/)
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx === -1) continue
        const key = trimmed.slice(0, idx).trim()
        let value = trimmed.slice(idx + 1).trim()
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
    }
}

function parseArgs() {
    const args = new Set(process.argv.slice(2))
    return {
        smoke: args.has('--smoke'),
        json: args.has('--json'),
    }
}

function norm(value) {
    return String(value ?? '').trim().toLowerCase()
}

async function listAllAuthUsers(supabase) {
    const users = []
    for (let page = 1; page < 20; page += 1) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw error
        users.push(...(data.users ?? []))
        if (!data.users || data.users.length < 1000) break
    }
    return users
}

async function checkAccountLinkage(supabase) {
    const [
        { data: employees, error: employeesError },
        { data: publicUsers, error: usersError },
        authUsers,
    ] = await Promise.all([
        supabase
            .from('employees')
            .select('id, employee_code, email, first_name_th, last_name_th, status, user_id')
            .eq('status', 'active')
            .order('employee_code'),
        supabase.from('User').select('id, username, role'),
        listAllAuthUsers(supabase),
    ])

    if (employeesError) throw employeesError
    if (usersError) throw usersError

    const authById = new Map(authUsers.map(user => [user.id, user]))
    const authByEmail = new Map(authUsers.map(user => [norm(user.email), user]))
    const userById = new Map((publicUsers ?? []).map(user => [user.id, user]))
    const userByUsername = new Map((publicUsers ?? []).map(user => [norm(user.username), user]))

    const rows = (employees ?? []).map(employee => {
        const authByUserId = employee.user_id ? authById.get(employee.user_id) : null
        const authByEmployeeEmail = authByEmail.get(norm(employee.email)) ?? null
        const userByUserId = employee.user_id ? userById.get(employee.user_id) : null
        const userByEmployeeEmail = userByUsername.get(norm(employee.email)) ?? null

        const issues = []
        if (!employee.user_id) issues.push('NO_EMPLOYEE_USER_ID')
        if (!authByUserId) issues.push('NO_AUTH_BY_EMPLOYEE_USER_ID')
        if (!authByEmployeeEmail) issues.push('NO_AUTH_BY_EMAIL')
        if (authByUserId && authByEmployeeEmail && authByUserId.id !== authByEmployeeEmail.id) {
            issues.push('AUTH_ID_EMAIL_MISMATCH')
        }
        if (!userByUserId) issues.push('NO_PUBLIC_USER_BY_EMPLOYEE_USER_ID')
        if (!userByEmployeeEmail) issues.push('NO_PUBLIC_USER_BY_USERNAME_EMAIL')
        if (userByUserId && userByEmployeeEmail && userByUserId.id !== userByEmployeeEmail.id) {
            issues.push('PUBLIC_USER_ID_USERNAME_MISMATCH')
        }
        if (authByEmployeeEmail && !authByEmployeeEmail.email_confirmed_at) {
            issues.push('AUTH_EMAIL_NOT_CONFIRMED')
        }

        return {
            code: employee.employee_code,
            email: employee.email,
            name: `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim(),
            role: userByEmployeeEmail?.role ?? null,
            issues,
        }
    })

    const issueRows = rows.filter(row => row.issues.length > 0)
    const roleCounts = rows.reduce((acc, row) => {
        const role = row.role ?? 'missing'
        acc[role] = (acc[role] ?? 0) + 1
        return acc
    }, {})

    return {
        activeEmployees: rows.length,
        authUsers: authUsers.length,
        publicUsers: (publicUsers ?? []).length,
        healthyEmployees: rows.length - issueRows.length,
        issueEmployees: issueRows.length,
        roleCounts,
        issues: issueRows,
    }
}

async function smokeLogin() {
    const password = process.env.BETA_LOGIN_PASSWORD ?? '2000Ebc!'
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://ebci-nexus.vercel.app').replace(/\/$/, '')
    const results = []

    for (const [login, label] of DEFAULT_SMOKE_LOGINS) {
        const response = await fetch(`${appUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: login, password, rememberMe: false }),
            redirect: 'manual',
        })
        let body = null
        try {
            body = await response.json()
        } catch {
            body = null
        }
        results.push({
            login,
            label,
            status: response.status,
            ok: response.ok,
            hasSessionCookie: (response.headers.get('set-cookie') ?? '').includes('nexus_session='),
            redirectTo: body?.redirectTo ?? null,
            error: body?.error ?? null,
        })
    }

    return results
}

function printHuman(linkage, smoke) {
    console.log('Account linkage')
    console.log(`- active employees: ${linkage.activeEmployees}`)
    console.log(`- healthy employees: ${linkage.healthyEmployees}`)
    console.log(`- issue employees: ${linkage.issueEmployees}`)
    console.log(`- role counts: ${Object.entries(linkage.roleCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`)
    if (linkage.issues.length) {
        console.log('\nIssues')
        for (const row of linkage.issues) {
            console.log(`- ${row.code} ${row.email}: ${row.issues.join(', ')}`)
        }
    }

    if (smoke) {
        console.log('\nSmoke login')
        for (const row of smoke) {
            const mark = row.ok && row.hasSessionCookie ? 'OK' : 'FAIL'
            console.log(`- ${mark} ${row.login} (${row.label}) -> ${row.status} ${row.redirectTo ?? row.error ?? ''}`)
        }
    }
}

async function main() {
    loadEnvFile('.env.local')
    loadEnvFile('.env')

    const options = parseArgs()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    const linkage = await checkAccountLinkage(supabase)
    const smoke = options.smoke ? await smokeLogin() : null
    const failedSmoke = smoke?.filter(row => !row.ok || !row.hasSessionCookie) ?? []
    const ok = linkage.issueEmployees === 0 && failedSmoke.length === 0

    if (options.json) {
        console.log(JSON.stringify({ ok, linkage, smoke }, null, 2))
    } else {
        printHuman(linkage, smoke)
    }

    if (!ok) process.exit(1)
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
