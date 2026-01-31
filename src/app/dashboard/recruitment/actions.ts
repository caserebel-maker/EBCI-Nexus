'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function onboardCandidate(applicantId: string, prevState: any, formData?: FormData) {
    if (!applicantId) {
        return { error: 'Invalid Applicant ID' }
    }

    try {
        // 1. Fetch Applicant
        const applicant = await prisma.applicant.findUnique({
            where: { id: applicantId },
            include: { employee: true }
        })

        if (!applicant) {
            return { error: 'Applicant not found' }
        }

        if (applicant.employee) {
            return { error: 'Applicant is already onboarded as ' + applicant.employee.employeeCode }
        }

        /* 
         Note: In a real world scenario, we should allow HR to override defaults.
         For this "Bridge" feature, we automate as much as possible.
        */

        // 2. Generate Employee Code (Simple Logic: Find Max + 1)
        // Format: EBCI-YYYY (e.g. EBCI-0001) or standard EMP-XXXX
        // Let's stick to existing EMP-XXX format from seed.
        const lastEmployee = await prisma.employee.findFirst({
            orderBy: { employeeCode: 'desc' }
        })

        let nextId = 1
        if (lastEmployee?.employeeCode) {
            // Extract number from EMP-XXX
            const parts = lastEmployee.employeeCode.split('-')
            if (parts.length === 2 && !isNaN(Number(parts[1]))) {
                nextId = Number(parts[1]) + 1
            }
        }

        const employeeCode = `EMP-${nextId.toString().padStart(3, '0')}`

        // 3. Create Employee Record
        const newEmployee = await prisma.employee.create({
            data: {
                employeeCode,
                firstNameTH: applicant.firstName,
                lastNameTH: applicant.lastName,
                firstNameEN: applicant.firstName, // Assuming English name might be same or we map incorrectly. schema has different fields.
                // Wait, Applicant Schema has: firstName (TH), lastName (TH). NO ENGLISH fields in Applicant Schema phase 3.1
                // BUT Employee Schema has TH/EN.
                // We will map TH -> TH, and maybe leave EN blank or use same?
                // Let's use TH for now and let HR update later.
                // Or wait, Applicant Schema MIGHT have EN? 
                // Checking Schema Step 672:
                // Applicant: firstName (@map "first_name"), lastName (@map "last_name"). (Usually implies TH in Govt/Thai context context)
                // Employee: firstNameTH, firstNameEN.
                // Constraint: "Use defaults". I will put TH name in TH fields. Leave EN null.

                position: applicant.positionApplied,
                department: "Unassigned", // Default
                startDate: applicant.startDate || new Date(),
                employmentType: "full-time", // Default
                status: "active",
                email: applicant.email,
                phone: applicant.phone,
                applicantId: applicant.id
            }
        })

        // 4. Update Applicant Status
        await prisma.applicant.update({
            where: { id: applicantId },
            data: {
                status: 'hired',
                // employmentStatus: 'employed' // Optional update
            }
        })

        revalidatePath('/dashboard/recruitment')
        revalidatePath(`/dashboard/recruitment/${applicantId}`)

        return { success: true, employeeId: newEmployee.id }

    } catch (error) {
        console.error("Onboarding Error:", error)
        return { error: 'Failed to onboard candidate. Please try again.' }
    }
}
