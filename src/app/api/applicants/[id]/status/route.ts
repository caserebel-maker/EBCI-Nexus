import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { status } = await request.json()

        if (!status) {
            return NextResponse.json({ error: "Status is required" }, { status: 400 })
        }

        const updated = await prisma.applicant.update({
            where: { id },
            data: { status }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("DEBUG: Update Status Error:", error)
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
    }
}
