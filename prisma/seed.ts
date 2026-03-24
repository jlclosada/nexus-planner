import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ──────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('demo1234', 12)

  const demo = await prisma.user.upsert({
    where: { email: 'demo@nexus.app' },
    update: {},
    create: {
      email: 'demo@nexus.app',
      name: 'Alex Rivera',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const alice = await prisma.user.upsert({
    where: { email: 'alice@nexus.app' },
    update: {},
    create: {
      email: 'alice@nexus.app',
      name: 'Alice Chen',
      password: hashedPassword,
      role: 'MEMBER',
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@nexus.app' },
    update: {},
    create: {
      email: 'bob@nexus.app',
      name: 'Bob Martinez',
      password: hashedPassword,
      role: 'MEMBER',
    },
  })

  console.log('✅ Users created')

  // ── Project ────────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { key: 'NX' },
    update: {},
    create: {
      key: 'NX',
      name: 'Nexus Platform',
      description: 'Core SaaS platform development — authentication, billing, and the main product features.',
      color: '#6366f1',
      status: 'ACTIVE',
      members: {
        create: [
          { userId: demo.id, role: 'OWNER' },
          { userId: alice.id, role: 'MEMBER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  })

  const projectB = await prisma.project.upsert({
    where: { key: 'API' },
    update: {},
    create: {
      key: 'API',
      name: 'API Gateway',
      description: 'Microservices API gateway, rate limiting, and observability.',
      color: '#8b5cf6',
      status: 'ACTIVE',
      members: {
        create: [
          { userId: demo.id, role: 'OWNER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  })

  console.log('✅ Projects created')

  // ── Labels ─────────────────────────────────────────────────────────────────
  const labels = await Promise.all([
    prisma.label.create({ data: { projectId: project.id, name: 'frontend', color: '#3b82f6' } }),
    prisma.label.create({ data: { projectId: project.id, name: 'backend', color: '#10b981' } }),
    prisma.label.create({ data: { projectId: project.id, name: 'auth', color: '#f59e0b' } }),
    prisma.label.create({ data: { projectId: project.id, name: 'performance', color: '#ef4444' } }),
    prisma.label.create({ data: { projectId: project.id, name: 'ux', color: '#8b5cf6' } }),
  ])

  console.log('✅ Labels created')

  // ── Epics ──────────────────────────────────────────────────────────────────
  const epicAuth = await prisma.epic.create({
    data: {
      projectId: project.id,
      title: 'Authentication System',
      description: 'Complete auth flow: signup, login, OAuth, 2FA, session management.',
      color: '#f59e0b',
      status: 'IN_PROGRESS',
    },
  })

  const epicDashboard = await prisma.epic.create({
    data: {
      projectId: project.id,
      title: 'Dashboard & Analytics',
      description: 'User-facing dashboards, charts, reports and real-time data.',
      color: '#6366f1',
      status: 'IN_PROGRESS',
    },
  })

  const epicInfra = await prisma.epic.create({
    data: {
      projectId: project.id,
      title: 'Infrastructure & DevOps',
      description: 'CI/CD pipeline, Docker, Kubernetes, monitoring, alerting.',
      color: '#10b981',
      status: 'TODO',
    },
  })

  console.log('✅ Epics created')

  // ── Sprints ────────────────────────────────────────────────────────────────
  const now = new Date()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const fourWeeksFromNow = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)

  const sprint1 = await prisma.sprint.create({
    data: {
      projectId: project.id,
      number: 1,
      name: 'Sprint 1',
      goal: 'Set up project foundation, authentication, and basic UI components.',
      status: 'COMPLETED',
      startDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      endDate: twoWeeksAgo,
      velocity: 34,
    },
  })

  const sprint2 = await prisma.sprint.create({
    data: {
      projectId: project.id,
      number: 2,
      name: 'Sprint 2',
      goal: 'Build dashboard, analytics views, and user profile management.',
      status: 'ACTIVE',
      startDate: twoWeeksAgo,
      endDate: twoWeeksFromNow,
    },
  })

  const sprint3 = await prisma.sprint.create({
    data: {
      projectId: project.id,
      number: 3,
      name: 'Sprint 3',
      goal: 'Billing integration, notifications system, and performance optimization.',
      status: 'PLANNED',
      startDate: twoWeeksFromNow,
      endDate: fourWeeksFromNow,
    },
  })

  console.log('✅ Sprints created')

  // ── Tickets ────────────────────────────────────────────────────────────────
  // Sprint 1 tickets (COMPLETED sprint — all DONE)
  await prisma.ticket.createMany({
    data: [
      {
        code: 'NX-1', projectId: project.id, sprintId: sprint1.id, epicId: epicAuth.id,
        title: 'Set up Next.js project with TypeScript', type: 'TASK', status: 'DONE',
        priority: 'HIGH', storyPoints: 3, order: 1, reporterId: demo.id, assigneeId: demo.id,
        completedAt: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'NX-2', projectId: project.id, sprintId: sprint1.id, epicId: epicAuth.id,
        title: 'Implement JWT authentication with NextAuth', type: 'STORY', status: 'DONE',
        priority: 'CRITICAL', storyPoints: 8, order: 2, reporterId: demo.id, assigneeId: demo.id,
        completedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'NX-3', projectId: project.id, sprintId: sprint1.id, epicId: epicAuth.id,
        title: 'Design and implement login/register pages', type: 'STORY', status: 'DONE',
        priority: 'HIGH', storyPoints: 5, order: 3, reporterId: demo.id, assigneeId: alice.id,
        completedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'NX-4', projectId: project.id, sprintId: sprint1.id,
        title: 'Set up PostgreSQL with Prisma ORM', type: 'TASK', status: 'DONE',
        priority: 'HIGH', storyPoints: 3, order: 4, reporterId: demo.id, assigneeId: bob.id,
        completedAt: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'NX-5', projectId: project.id, sprintId: sprint1.id,
        title: 'Configure CI/CD with GitHub Actions', type: 'TASK', status: 'DONE',
        priority: 'MEDIUM', storyPoints: 5, order: 5, reporterId: demo.id, assigneeId: bob.id,
        completedAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'NX-6', projectId: project.id, sprintId: sprint1.id,
        title: 'Create design system with shadcn/ui', type: 'TASK', status: 'DONE',
        priority: 'MEDIUM', storyPoints: 5, order: 6, reporterId: demo.id, assigneeId: alice.id,
        completedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'NX-7', projectId: project.id, sprintId: sprint1.id,
        title: 'Write unit tests for auth module', type: 'TASK', status: 'DONE',
        priority: 'MEDIUM', storyPoints: 5, order: 7, reporterId: demo.id, assigneeId: demo.id,
        completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  // Sprint 2 tickets (ACTIVE — mixed statuses)
  const t8 = await prisma.ticket.create({
    data: {
      code: 'NX-8', projectId: project.id, sprintId: sprint2.id, epicId: epicDashboard.id,
      title: 'Build main dashboard overview page', type: 'STORY', status: 'IN_PROGRESS',
      priority: 'HIGH', storyPoints: 8, order: 1, reporterId: demo.id, assigneeId: demo.id,
      description: 'Create the main dashboard with project stats, recent activity, and quick actions. Should be responsive and load data efficiently.',
    },
  })

  const t9 = await prisma.ticket.create({
    data: {
      code: 'NX-9', projectId: project.id, sprintId: sprint2.id, epicId: epicDashboard.id,
      title: 'Implement sprint burndown chart', type: 'STORY', status: 'IN_PROGRESS',
      priority: 'HIGH', storyPoints: 5, order: 2, reporterId: demo.id, assigneeId: alice.id,
      description: 'Build a real-time burndown chart using Recharts showing remaining story points vs ideal line.',
    },
  })

  await prisma.ticket.create({
    data: {
      code: 'NX-10', projectId: project.id, sprintId: sprint2.id, epicId: epicDashboard.id,
      title: 'Kanban board drag & drop functionality', type: 'STORY', status: 'DONE',
      priority: 'CRITICAL', storyPoints: 13, order: 3, reporterId: demo.id, assigneeId: demo.id,
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      description: 'Implement drag & drop between kanban columns using @dnd-kit. Should have optimistic updates and proper error handling.',
    },
  })

  await prisma.ticket.create({
    data: {
      code: 'NX-11', projectId: project.id, sprintId: sprint2.id,
      title: 'Fix: session expires prematurely on mobile', type: 'BUG', status: 'BLOCKED',
      priority: 'HIGH', storyPoints: 3, order: 4, reporterId: alice.id, assigneeId: bob.id,
      description: 'Users on mobile devices are being logged out after 10 minutes even with "remember me" checked. Needs investigation into cookie settings.',
    },
  })

  await prisma.ticket.create({
    data: {
      code: 'NX-12', projectId: project.id, sprintId: sprint2.id, epicId: epicDashboard.id,
      title: 'User profile page with avatar upload', type: 'STORY', status: 'TODO',
      priority: 'MEDIUM', storyPoints: 5, order: 5, reporterId: demo.id, assigneeId: alice.id,
    },
  })

  await prisma.ticket.create({
    data: {
      code: 'NX-13', projectId: project.id, sprintId: sprint2.id,
      title: 'Add command palette (⌘K) global search', type: 'SPIKE',
      status: 'IN_REVIEW', priority: 'MEDIUM', storyPoints: 5,
      order: 6, reporterId: demo.id, assigneeId: demo.id,
      description: 'Global command palette for quick navigation. Should support fuzzy search for tickets, projects, and actions.',
    },
  })

  await prisma.ticket.create({
    data: {
      code: 'NX-14', projectId: project.id, sprintId: sprint2.id,
      title: 'API response time exceeds 500ms on ticket list', type: 'BUG', status: 'TODO',
      priority: 'HIGH', storyPoints: 3, order: 7, reporterId: bob.id, assigneeId: bob.id,
      description: 'The ticket list endpoint takes 500-800ms. Need to add database indexes and optimize the Prisma query.',
    },
  })

  await prisma.ticket.create({
    data: {
      code: 'NX-15', projectId: project.id, sprintId: sprint2.id, epicId: epicDashboard.id,
      title: 'Implement velocity chart for sprint analytics', type: 'TASK', status: 'BACKLOG',
      priority: 'LOW', storyPoints: 3, order: 8, reporterId: demo.id,
    },
  })

  // Backlog tickets (no sprint)
  await prisma.ticket.createMany({
    data: [
      {
        code: 'NX-16', projectId: project.id, epicId: epicInfra.id,
        title: 'Set up Kubernetes deployment manifests', type: 'TASK', status: 'BACKLOG',
        priority: 'MEDIUM', storyPoints: 8, order: 1, reporterId: demo.id,
      },
      {
        code: 'NX-17', projectId: project.id,
        title: 'Integrate Stripe billing and subscription tiers', type: 'STORY', status: 'BACKLOG',
        priority: 'HIGH', storyPoints: 13, order: 2, reporterId: demo.id,
        description: 'Implement Stripe Checkout, webhooks for subscription events, and usage-based billing.',
      },
      {
        code: 'NX-18', projectId: project.id, epicId: epicInfra.id,
        title: 'Add OpenTelemetry distributed tracing', type: 'TASK', status: 'BACKLOG',
        priority: 'MEDIUM', storyPoints: 5, order: 3, reporterId: demo.id,
      },
      {
        code: 'NX-19', projectId: project.id,
        title: 'Email notification system with templates', type: 'STORY', status: 'BACKLOG',
        priority: 'MEDIUM', storyPoints: 8, order: 4, reporterId: alice.id,
      },
      {
        code: 'NX-20', projectId: project.id,
        title: 'Dark/light theme toggle in user settings', type: 'TASK', status: 'BACKLOG',
        priority: 'LOW', storyPoints: 2, order: 5, reporterId: bob.id,
      },
      {
        code: 'NX-21', projectId: project.id, epicId: epicInfra.id,
        title: 'Implement Redis caching for expensive queries', type: 'SPIKE', status: 'BACKLOG',
        priority: 'MEDIUM', storyPoints: 5, order: 6, reporterId: demo.id,
      },
      {
        code: 'NX-22', projectId: project.id,
        title: 'WCAG 2.1 AA accessibility audit and fixes', type: 'TASK', status: 'BACKLOG',
        priority: 'HIGH', storyPoints: 8, order: 7, reporterId: alice.id,
      },
    ],
  })

  // Sprint 3 (PLANNED) tickets
  await prisma.ticket.createMany({
    data: [
      {
        code: 'NX-23', projectId: project.id, sprintId: sprint3.id,
        title: 'Design billing and subscription UI', type: 'STORY', status: 'BACKLOG',
        priority: 'HIGH', storyPoints: 5, order: 1, reporterId: demo.id,
      },
      {
        code: 'NX-24', projectId: project.id, sprintId: sprint3.id,
        title: 'Webhook handler for Stripe events', type: 'TASK', status: 'BACKLOG',
        priority: 'HIGH', storyPoints: 5, order: 2, reporterId: demo.id,
      },
    ],
  })

  console.log('✅ Tickets created')

  // ── Comments ───────────────────────────────────────────────────────────────
  await prisma.comment.createMany({
    data: [
      {
        ticketId: t8.id,
        userId: alice.id,
        content: "I've started on the stats cards. Using Recharts for the mini sparklines — looks great with the dark theme.",
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        ticketId: t8.id,
        userId: demo.id,
        content: "Nice! Make sure the loading skeleton matches the card dimensions exactly — no layout shift.",
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        ticketId: t9.id,
        userId: bob.id,
        content: "Need clarification — should the burndown auto-refresh every minute or only on manual reload?",
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        ticketId: t9.id,
        userId: demo.id,
        content: "Auto-refresh every 60 seconds using React Query's refetchInterval. Use a subtle pulse indicator when fetching.",
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
    ],
  })

  // ── Activities ─────────────────────────────────────────────────────────────
  await prisma.activity.createMany({
    data: [
      { ticketId: t8.id, userId: demo.id, type: 'CREATED', newValue: t8.title },
      { ticketId: t8.id, userId: demo.id, type: 'STATUS_CHANGED', field: 'status', oldValue: 'TODO', newValue: 'IN_PROGRESS' },
      { ticketId: t9.id, userId: demo.id, type: 'CREATED', newValue: t9.title },
      { ticketId: t9.id, userId: demo.id, type: 'ASSIGNED', field: 'assigneeId', oldValue: '', newValue: alice.id },
      { ticketId: t9.id, userId: alice.id, type: 'STATUS_CHANGED', field: 'status', oldValue: 'TODO', newValue: 'IN_PROGRESS' },
    ],
  })

  console.log('✅ Comments & activities created')
  console.log('\n🎉 Seed complete!')
  console.log('   Login: demo@nexus.app / demo1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
