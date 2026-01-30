import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/applicants
export async function GET(request: Request) {
    const session = await getSession()

    if (!session) {
        return NextResponse.json(
            { success: false, message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' },
            { status: 401 }
        )
    }

    if (session.role !== 'hr_admin') {
        return NextResponse.json(
            { success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (เฉพาะ HR Admin)' },
            { status: 403 }
        )
    }

    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const whereCondition = status ? { status } : {}

        const applicants = await prisma.applicant.findMany({
            where: whereCondition,
            orderBy: { createdAt: 'desc' },
            include: {
                educations: true,
                experiences: true,
            }
        })

        return NextResponse.json({
            success: true,
            data: applicants
        })

    } catch (error) {
        console.error('Error fetching applicants:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่' },
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

        const photoPath = photoFile ? `/uploads/${photoFile.name}` : null
        const resumePath = resumeFile ? `/uploads/${resumeFile.name}` : null

        const newApplicant = await prisma.$transaction(async (tx) => {
            // 3.1 Create Main Applicant
            const applicant = await tx.applicant.create({
                data: {
                    // A. Job
                    positionApplied: body.positionApplied,
                    expectedSalary: body.expectedSalary ? Number(body.expectedSalary) : undefined,
                    startDate: body.startDate ? new Date(body.startDate) : undefined,
                    employmentStatus: body.employmentStatus,

                    // B. Personal
                    firstName: body.firstName,
                    lastName: body.lastName,
                    nickname: body.nickname,
                    dateOfBirth: new Date(body.dateOfBirth),
                    age: Number(body.age),
                    gender: body.gender,
                    nationality: body.nationality,
                    religion: body.religion,
                    race: body.race,

                    // C. Contact
                    address: body.address,
                    phone: body.phone,
                    email: body.email,
                    residenceType: body.residenceType,
                    livingDuration: body.livingDuration ? Number(body.livingDuration) : undefined,

                    // D. Family
                    maritalStatus: body.maritalStatus,
                    militaryStatus: body.militaryStatus,
                    childrenCount: body.childrenCount ? Number(body.childrenCount) : 0,

                    // E. Files (Paths)
                    photoPath: photoPath,
                    resumePath: resumePath,

                    // F. JSON Fields
                    skills: body.skills ? JSON.stringify(body.skills) : null,
                    documents: body.documents ? JSON.stringify(body.documents) : null,
                }
            })

            // 3.2 Create Edu Records
            if (body.educations && Array.isArray(body.educations)) {
                await tx.applicantEducation.createMany({
                    data: body.educations.map((edu: any) => ({
                        applicantId: applicant.id,
                        level: edu.level,
                        institution: edu.institution,
                        major: edu.major,
                        graduatedYear: edu.graduatedYear ? Number(edu.graduatedYear) : null,
                        gpa: edu.gpa ? Number(edu.gpa) : null,
                    }))
                })
            }

            // 3.3 Create Experience Records
            if (body.experiences && Array.isArray(body.experiences)) {
                await tx.applicantExperience.createMany({
                    data: body.experiences.map((exp: any) => ({
                        applicantId: applicant.id,
                        company: exp.company,
                        position: exp.position,
                        salary: exp.salary ? Number(exp.salary) : null,
                        startDate: exp.startDate ? new Date(exp.startDate) : null,
                        endDate: exp.endDate ? new Date(exp.endDate) : null,
                        reasonForLeaving: exp.reasonForLeaving,
                    }))
                })
            }

            return applicant
        })

        return NextResponse.json({
            success: true,
            message: 'บันทึกใบสมัครเรียบร้อยแล้ว',
            data: { id: newApplicant.id }
        })

    } catch (error) {
        console.error('Submission Error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
            { status: 500 }
        )
    }
}
