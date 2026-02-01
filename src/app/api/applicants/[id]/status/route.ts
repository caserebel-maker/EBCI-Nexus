import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status } = body

        if (!status) {
            return NextResponse.json({ error: "Status is required" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('applicants')
            .update({ status })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error("Supabase Error:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, applicant: data })
    } catch (error) {
        console.error("Status Update API Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
