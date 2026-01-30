import { PrismaClient } from '@prisma/client'

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
        update: { password: '0000' }, // Simple password for testing
        create: {
            username: 'emp',
            password: '0000',
            name: 'John Doe',
            role: 'employee',
        },
    })

    console.log({ admin, employee })
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
