import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuth, isHrStaff } from '@/lib/route-auth'

const prisma = new PrismaClient()

// GET /api/applicants/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params // Next.js 15 params are async

        const applicant = await prisma.applicant.findUnique({
            where: { id },
            include: {
                educations: true,
                experiences: true,
            }
        })

        if (!applicant) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบข้อมูลผู้สมัครที่ระบุ' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: applicant
        })

    } catch (error) {
        console.error('Error fetching applicant:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
            { status: 500 }
        )
    }
}
