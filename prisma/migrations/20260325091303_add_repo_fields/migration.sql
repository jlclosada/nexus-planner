-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "repoDefaultBranch" TEXT DEFAULT 'main',
ADD COLUMN     "repoName" TEXT,
ADD COLUMN     "repoOwner" TEXT,
ADD COLUMN     "repoProvider" TEXT,
ADD COLUMN     "repoToken" TEXT;
