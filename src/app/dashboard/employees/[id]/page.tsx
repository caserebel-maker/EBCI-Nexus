import { supabaseAdmin } from "@/lib/supabase-admin"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { EmployeeProfileView } from "./employee-profile-view"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: PageProps) {
    const { id } = await params

    // Resolve role from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    let isHrAdmin = false
    if (sessionCookie?.value) {
        try {
            const session = JSON.parse(sessionCookie.value)
            isHrAdmin = session.role === 'hr_admin'
        } catch { /* ignore */ }
    }

    const { data: employee, error } = await supabaseAdmin
        .from('employees')
        .select(`
            *,
            applicants (
                photo_path,
                nickname,
                phone,
                email,
                current_address,
                applicant_educations (*),
                applicant_experiences (*)
            ),
            User:user_id (
                username,
                role
            )
        `)
        .eq('id', id)
        .single()

    if (error || !employee) {
        if (error) console.error("Supabase Error:", error)
        notFound()
    }

    const displayName = `${employee.first_name_th} ${employee.last_name_th}`

    // Resolve Photo URL
    let photoUrl = null
    const photoPath = employee.photo_path || employee.applicants?.photo_path
    if (photoPath) {
        const { data } = await supabaseAdmin.storage
            .from(employee.photo_path ? 'employee-assets' : 'applicant-assets')
            .createSignedUrl(photoPath, 3600)
        photoUrl = data?.signedUrl ?? null
    }

    const stats = {
        attendance: "100%",
        leave: { annual: 6, sick: 30 },
        supervisor: "HR Admin",
        emergencyContact: employee.applicants?.phone || "N/A",
        lastLogin: "Recently",
        notes: `Onboarded from Applicant System on ${new Date(employee.created_at).toLocaleDateString()}.`
    }

    return (
        <EmployeeProfileView
            employee={employee}
            photoUrl={photoUrl}
            displayName={displayName}
            stats={stats}
            id={id}
            isHrAdmin={isHrAdmin}
        />
    )
}
