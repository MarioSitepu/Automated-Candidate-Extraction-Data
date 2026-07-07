import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'


// gajadi buat ini, karena di prisma 7 cukup url database saja ke adapter
// 1. membuka file dev.db dengan mesin better-sqlite3
// const sqlite = new Database('./dev.db')

const prismaClientSingleton = () => {
    //2. membuat mesin menjadi adapter yg dipahami prisma
    const adapter = new PrismaBetterSqlite3({
        url: './dev.db'
    })

    //3. memberikan adapter ke kuris prisma( prisma client )
    return new PrismaClient({ adapter })
}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma
}

export default prisma