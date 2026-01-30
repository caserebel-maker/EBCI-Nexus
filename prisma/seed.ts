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
        where: { email: 'somchai@example.com' },
        update: {
            photoPath: '/uploads/mock/mock1.png',
            status: 'pending',
            age: 29,
        },
        create: {
            firstName: 'Somchai',
            lastName: 'Siriwat',
            nickname: 'Chai',
            positionApplied: 'Full Stack Developer',
            status: 'pending',
            phone: '081-234-5678',
            email: 'somchai@example.com',
            photoPath: '/uploads/mock/mock1.png',
            age: 29,
            dateOfBirth: new Date('1995-05-15'),
            address: 'Bangkok, Thailand',
        }
    })

    const applicant2 = await prisma.applicant.upsert({
        where: { email: 'kanya@example.com' },
        update: {
            photoPath: '/uploads/mock/mock2.png',
            status: 'reviewed',
            age: 26,
        },
        create: {
            firstName: 'Kanya',
            lastName: 'Rakthai',
            nickname: 'Nam',
            positionApplied: 'UI/UX Designer',
            status: 'reviewed',
            phone: '089-876-5432',
            email: 'kanya@example.com',
            photoPath: '/uploads/mock/mock2.png',
            age: 26,
            dateOfBirth: new Date('1998-10-20'),
            address: 'Chiang Mai, Thailand',
        }
    })

    const applicant3 = await prisma.applicant.upsert({
        where: { email: 'somchai.r@example.com' },
        update: {
            photoPath: '/uploads/mock/mock3.png',
            status: 'pending',
            age: 29,
        },
        create: {
            firstName: 'สมชาย',
            lastName: 'รักงาน',
            nickname: 'ชาย',
            positionApplied: 'Fullstack Developer',
            status: 'pending',
            phone: '081-222-3333',
            email: 'somchai.r@example.com',
            photoPath: '/uploads/mock/mock3.png',
            age: 29,
            dateOfBirth: new Date('1995-01-01'),
            address: 'กทม.',
        }
    })

    const applicant4 = await prisma.applicant.upsert({
        where: { email: 'somsri.d@example.com' },
        update: {
            photoPath: '/uploads/mock/mock4.png',
            status: 'reviewed',
            age: 26,
        },
        create: {
            firstName: 'สมศรี',
            lastName: 'ดีใจ',
            nickname: 'ศรี',
            positionApplied: 'UI/UX Designer',
            status: 'reviewed',
            phone: '089-999-8888',
            email: 'somsri.d@example.com',
            photoPath: '/uploads/mock/mock4.png',
            age: 26,
            dateOfBirth: new Date('1998-01-01'),
            address: 'นนทบุรี',
        }
    })

    const applicant5 = await prisma.applicant.upsert({
        where: { email: 'wichai.g@example.com' },
        update: {
            photoPath: '/uploads/mock/mock5.png',
            status: 'pending',
            age: 34,
        },
        create: {
            firstName: 'วิชัย',
            lastName: 'กล้าหาญ',
            nickname: 'ชัย',
            positionApplied: 'Project Manager',
            status: 'pending',
            phone: '085-555-4444',
            email: 'wichai.g@example.com',
            photoPath: '/uploads/mock/mock5.png',
            age: 34,
            dateOfBirth: new Date('1990-01-10'),
            address: 'ปทุมธานี',
        }
    })

    console.log({
        admin,
        employee,
        applicantsCount: 5
    })
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
