import crypto from "crypto"
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuth, isHrStaff } from '@/lib/route-auth'

// GET /api/applicants
export async function GET(request: Request) {
    const auth = await getAuth()

    if (!auth) {
        return NextResponse.json(
            { success: false, message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' },
            { status: 401 }
        )
    }

    if (!isHrStaff(auth)) {
        return NextResponse.json(
            { success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (HR เท่านั้น)' },
            { status: 403 }
        )
    }

    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        let query = supabase
            .from('applicants')
            .select('*, applicant_educations(*), applicant_experiences(*)')
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        const { data: applicants, error } = await query

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: applicants
        })

    } catch (error: any) {
        console.error('Error fetching applicants:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.message },
            { status: 500 }
        )
    }
}

// POST /api/applicants
export async function POST(request: Request) {
    try {
        const formData = await request.formData()

        const rawData = formData.get('data') as string
        if (!rawData) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบข้อมูลใบสมัคร (Missing data field)' },
                { status: 400 }
            )
        }

        const body = JSON.parse(rawData)
        const photoFile = formData.get('photo') as File | null
        const resumeFile = formData.get('resume') as File | null

        let photoPath = null
        let resumePath = null

        const timestamp = Date.now()

        // 1. Upload Photo to Supabase Storage
        if (photoFile) {
            const fileName = `${timestamp}_${photoFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('applicant-assets')
                .upload(`photos/${fileName}`, photoFile)

            if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
            photoPath = uploadData.path
        }

        // 2. Upload Resume to Supabase Storage
        if (resumeFile) {
            const fileName = `${timestamp}_${resumeFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('applicant-assets')
                .upload(`resumes/${fileName}`, resumeFile)

            if (uploadError) throw new Error('Resume upload failed: ' + uploadError.message)
            resumePath = uploadData.path
        }

        const applicantId = crypto.randomUUID()
        const now = new Date().toISOString()

        // 3. Insert Main Applicant to Supabase Database
        const { data: applicant, error: applicantError } = await supabase
            .from('applicants')
            .insert({
                id: applicantId,
                position_applied: body.positionApplied,
                expected_salary: body.expectedSalary ? Number(body.expectedSalary) : undefined,
                start_date: body.startDate ? body.startDate : undefined,
                employment_status: body.employmentStatus,
                first_name: body.firstName,
                last_name: body.lastName,
                nickname: body.nickname,
                date_of_birth: body.dateOfBirth,
                age: Number(body.age),
                gender: body.gender,
                nationality: body.nationality,
                religion: body.religion,
                race: body.race,
                current_address: body.address,
                phone: body.phone,
                email: body.email,
                residence_type: body.residenceType,
                living_duration: body.livingDuration ? Number(body.livingDuration) : undefined,
                marital_status: body.maritalStatus,
                military_status: body.militaryStatus,
                children_count: body.childrenCount ? Number(body.childrenCount) : 0,
                photo_path: photoPath,
                resume_path: resumePath,
                skills_json: body.skills ? JSON.stringify(body.skills) : null,
                documents_json: body.documents ? JSON.stringify(body.documents) : null,
                status: 'pending',
                created_at: now,
                updated_at: now
            })
            .select()
            .single()

        if (applicantError) throw applicantError

        // 4. Insert Educations
        if (body.educations && Array.isArray(body.educations)) {
            const { error: eduError } = await supabase
                .from('applicant_educations')
                .insert(body.educations.map((edu: any) => ({
                    id: crypto.randomUUID(),
                    applicant_id: applicant.id,
                    level: edu.level,
                    institution: edu.institution,
                    major: edu.major,
                    graduated_year: edu.graduatedYear ? Number(edu.graduatedYear) : null,
                    gpa: edu.gpa ? Number(edu.gpa) : null,
                    created_at: now,
                    updated_at: now
                })))

            if (eduError) console.error('Error inserting educations:', eduError)
        }

        // 5. Insert Experiences
        if (body.experiences && Array.isArray(body.experiences)) {
            const { error: expError } = await supabase
                .from('applicant_experiences')
                .insert(body.experiences.map((exp: any) => ({
                    id: crypto.randomUUID(),
                    applicant_id: applicant.id,
                    company: exp.company,
                    position: exp.position,
                    salary: exp.salary ? Number(exp.salary) : null,
                    start_date: exp.startDate ? exp.startDate : null,
                    end_date: exp.endDate ? exp.endDate : null,
                    reason_for_leaving: exp.reasonForLeaving,
                    created_at: now,
                    updated_at: now
                })))

            if (expError) console.error('Error inserting experiences:', expError)
        }

        return NextResponse.json({
            success: true,
            message: 'บันทึกใบสมัครเรียบร้อยแล้ว (Supabase Cloud)',
            data: { id: applicant.id }
        })

    } catch (error: any) {
        console.error('Submission Error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message },
            { status: 500 }
        )
    }
}
