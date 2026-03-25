import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/* ── GET /api/projects/[projectId]/repository ──────────────────────
   Query params:
   - branch: (optional) if provided, returns commits for that branch
   Without branch: returns { branches, repo }
   With branch:    returns { commits }
────────────────────────────────────────────────────────────────────── */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.repoOwner || !project.repoName || !project.repoToken) {
    return NextResponse.json({ error: 'No repository connected' }, { status: 400 })
  }

  const { repoOwner: owner, repoName: repo, repoToken: token, repoDefaultBranch } = project
  const branch = req.nextUrl.searchParams.get('branch')

  /* ── Return commits for a specific branch ── */
  if (branch) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=40`,
      { headers: ghHeaders(token) },
    )
    if (!res.ok) {
      const b = await res.json().catch(() => ({}))
      return NextResponse.json({ error: b.message ?? `GitHub ${res.status}` }, { status: res.status })
    }
    const raw: GhCommit[] = await res.json()
    const commits = raw.map(c => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
      fullMessage: c.commit.message,
      authorName: c.commit.author.name,
      authorLogin: c.author?.login ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      date: c.commit.author.date,
      url: c.html_url,
      parents: c.parents.map(p => p.sha.slice(0, 7)),
    }))
    return NextResponse.json({ commits })
  }

  /* ── Return branch list with last commit + associated ticket ── */
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
    { headers: ghHeaders(token) },
  )
  if (!branchRes.ok) {
    const b = await branchRes.json().catch(() => ({}))
    return NextResponse.json({ error: b.message ?? `GitHub ${branchRes.status}` }, { status: branchRes.status })
  }
  const rawBranches: GhBranch[] = await branchRes.json()

  // Fetch all tickets in this project that have a branchName set
  const ticketsWithBranch = await prisma.ticket.findMany({
    where: { projectId, branchName: { not: null } },
    select: { id: true, code: true, title: true, branchName: true, status: true },
  })
  const branchToTicket = Object.fromEntries(
    ticketsWithBranch.map(t => [t.branchName!, t])
  )

  // For each branch, fetch last commit details (in parallel, max 10 concurrent)
  const branchDetails = await Promise.all(
    rawBranches.map(async (b) => {
      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${b.commit.sha}`,
        { headers: ghHeaders(token) },
      ).catch(() => null)

      let lastCommit = null
      if (commitRes?.ok) {
        const c: GhCommit = await commitRes.json()
        lastCommit = {
          sha: c.sha,
          shortSha: c.sha.slice(0, 7),
          message: c.commit.message.split('\n')[0],
          authorName: c.commit.author.name,
          authorLogin: c.author?.login ?? null,
          authorAvatar: c.author?.avatar_url ?? null,
          date: c.commit.author.date,
          url: c.html_url,
        }
      }

      return {
        name: b.name,
        sha: b.commit.sha,
        isDefault: b.name === (repoDefaultBranch ?? 'main'),
        lastCommit,
        ticket: branchToTicket[b.name] ?? null,
      }
    })
  )

  // Sort: default first, then alphabetical
  branchDetails.sort((a, b) => {
    if (a.isDefault) return -1
    if (b.isDefault) return 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({
    repo: {
      owner,
      name: repo,
      url: `https://github.com/${owner}/${repo}`,
      defaultBranch: repoDefaultBranch ?? 'main',
    },
    branches: branchDetails,
  })
}

/* ── GitHub API types ── */
interface GhBranch {
  name: string
  commit: { sha: string; url: string }
}

interface GhCommit {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { name: string; email: string; date: string }
  }
  author: { login: string; avatar_url: string } | null
  parents: { sha: string }[]
}
