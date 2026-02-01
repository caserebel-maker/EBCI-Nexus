-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "name" TEXT,
    "biometric_id" TEXT,
    "fingerprint_data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullname_th" TEXT,
    "position_applied" TEXT,
    "salary_expected" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "photo_file" TEXT,
    "resume_file" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_biometric_id_key" ON "User"("biometric_id");
