import { PrismaClient } from '../src/generated/client'

const prisma = new PrismaClient()

async function main() {
    // 1. HR Admin
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: { password: '0000' }, // Simple password for testing
        create: {
            username: 'admin',
            password: '0000',
            name: 'System Admin',
            role: 'hr_admin',
        },
    })

    // 2. Employee
    const employee = await prisma.user.upsert({
        where: { username: 'emp' },
        update: { password: '0000' },
        create: {
            username: 'emp',
            password: '0000',
            name: 'John Doe',
            role: 'employee',
        },
    })

    // 3. Mock Applicants for Recruitment
    const applicant1 = await prisma.applicant.upsert({
        where: { email: 'somchai.r@example.com' },
        update: {},
        create: {
            firstName: 'สมชาย',
            lastName: 'รักงาน',
            nickname: 'ชาย',
            positionApplied: 'Fullstack Developer',
            expectedSalary: 55000,
            phone: '081-222-3333',
            email: 'somchai.r@example.com',
            address: '123/45 กทม.',
            dateOfBirth: new Date('1995-05-15'),
            age: 29,
            status: 'pending',
        }
    })

    const applicant2 = await prisma.applicant.upsert({
        where: { email: 'somsri.d@example.com' },
        update: {},
        create: {
            firstName: 'สมศรี',
            lastName: 'ดีใจ',
            nickname: 'ศรี',
            positionApplied: 'UI/UX Designer',
            expectedSalary: 45000,
            phone: '089-999-8888',
            email: 'somsri.d@example.com',
            address: '99/1 นนทบุรี',
            dateOfBirth: new Date('1998-10-20'),
            age: 26,
            status: 'reviewed',
        }
    })

    const applicant3 = await prisma.applicant.upsert({
        where: { email: 'wichai.g@example.com' },
        update: {},
        create: {
            firstName: 'วิชัย',
            lastName: 'กล้าหาญ',
            nickname: 'ชัย',
            positionApplied: 'Project Manager',
            expectedSalary: 75000,
            phone: '085-555-4444',
            email: 'wichai.g@example.com',
            address: '77/77 ปทุมธานี',
            dateOfBirth: new Date('1990-01-10'),
            age: 34,
            status: 'pending',
        }
    })

    console.log({ admin, employee, applicants: [applicant1.firstName, applicant2.firstName, applicant3.firstName] })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
