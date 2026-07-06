import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'


// gajadi buat ini, karena di prisma 7 cukup url database saja ke adapter
// 1. membuka file dev.db dengan mesin better-sqlite3
// const sqlite = new Database('./dev.db')

//2. membuat mesin menjadi adapter yg dipahami prisma
const adapter = new PrismaBetterSqlite3({
    url: './dev.db'
})

//3. memberikan adapter ke kuris prisma( prisma client )
const prisma = new PrismaClient({ adapter })

export default prisma