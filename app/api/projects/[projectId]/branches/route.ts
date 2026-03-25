import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/* ── helpers ── */
function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function getProject(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId } })
}

/* ── GET /api/projects/[projectId]/branches ─────────────────────────
   Returns the list of branches from the connected GitHub repository.
────────────────────────────────────────────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const project = await getProject(projectId)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.repoOwner || !project.repoName || !project.repoToken) {
    return NextResponse.json({ error: 'No repository connected' }, { status: 400 })
  }

  const res = await fetch(
    `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/branches?per_page=100`,
    { headers: ghHeaders(project.repoToken) },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.message ?? `GitHub error ${res.status}` },
      { status: res.status },
    )
  }

  const branches: { name: string; commit: { sha: string } }[] = await res.json()
  return NextResponse.json(branches.map((b) => ({ name: b.name, sha: b.commit.sha })))
}

/* ── POST /api/projects/[projectId]/branches ────────────────────────
   Creates a new branch in the connected GitHub repository.
   Body: { name: string, baseBranch: string }
────────────────────────────────────────────────────────────────────── */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const project = await getProject(projectId)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.repoOwner || !project.repoName || !project.repoToken) {
    return NextResponse.json({ error: 'No repository connected' }, { status: 400 })
  }

  const { name, baseBranch, ticketId } = await req.json()
  if (!name || !baseBranch) {
    return NextResponse.json({ error: 'name and baseBranch are required' }, { status: 400 })
  }

  /* 1. Get SHA of base branch */
  const baseRes = await fetch(
    `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/branches/${encodeURIComponent(baseBranch)}`,
    { headers: ghHeaders(project.repoToken) },
  )
  if (!baseRes.ok) {
    const body = await baseRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.message ?? `Could not find base branch '${baseBranch}'` },
      { status: baseRes.status },
    )
  }
  const { commit } = await baseRes.json()

  /* 2. Create the new ref */
  const createRes = await fetch(
    `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/git/refs`,
    {
      method: 'POST',
      headers: { ...ghHeaders(project.repoToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha: commit.sha }),
    },
  )

  if (!createRes.ok) {
    const body = await createRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.message ?? `GitHub error ${createRes.status}` },
      { status: createRes.status },
    )
  }

  const created = await createRes.json()

  // Persist the branch name on the ticket so the modal can show it
  if (ticketId) {
    await prisma.ticket.update({ where: { id: ticketId }, data: { branchName: name } }).catch(() => {/* ignore if ticket doesn't exist */})
  }

  return NextResponse.json({
    name,
    sha: created.object?.sha,
    url: `https://github.com/${project.repoOwner}/${project.repoName}/tree/${name}`,
  })
}
