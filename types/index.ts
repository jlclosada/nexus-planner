import type {
  User,
  Project,
  ProjectMember,
  Sprint,
  Epic,
  Ticket,
  Label,
  Comment,
  Activity,
  Attachment,
  TicketType,
  TicketStatus,
  Priority,
  SprintStatus,
  EpicStatus,
  ProjectStatus,
  MemberRole,
  ActivityType,
} from '@prisma/client'

export type {
  User,
  Project,
  ProjectMember,
  Sprint,
  Epic,
  Ticket,
  Label,
  Comment,
  Activity,
  Attachment,
  TicketType,
  TicketStatus,
  Priority,
  SprintStatus,
  EpicStatus,
  ProjectStatus,
  MemberRole,
  ActivityType,
}

export type AttachmentWithUser = Attachment & {
  uploadedBy: { id: string; name: string | null }
}

export type TicketWithRelations = Ticket & {
  assignee?: User | null
  reporter?: User | null
  sprint?: Sprint | null
  epic?: Epic | null
  parent?: Ticket | null
  subtasks?: Array<Ticket & { assignee?: User | null }>
  labels?: Array<{ label: Label }>
  comments?: CommentWithUser[]
  activities?: Array<Activity & { user: User }>
  attachments?: AttachmentWithUser[]
  _count?: {
    comments: number
    subtasks: number
  }
}

export type ProjectWithRelations = Project & {
  members?: Array<ProjectMember & { user: User }>
  sprints?: Sprint[]
  _count?: {
    tickets: number
    members: number
  }
}

export type SprintWithTickets = Sprint & {
  tickets?: TicketWithRelations[]
  _count?: {
    tickets: number
  }
}

export type EpicWithTickets = Epic & {
  tickets?: TicketWithRelations[]
  _count?: {
    tickets: number
  }
}

export type ActivityWithUser = Activity & {
  user: User
}

export type CommentWithUser = Comment & {
  user: User
}

export interface DashboardStats {
  totalProjects: number
  activeSprints: number
  openTickets: number
  completedThisWeek: number
}

export interface ProjectStats {
  totalTickets: number
  byStatus: Record<string, number>
  completedPoints: number
  totalPoints: number
  velocity: number[]
}

export interface AnalyticsData {
  burndown: Array<{ date: string; remaining: number; ideal: number }>
  velocity: Array<{ sprint: string; points: number }>
  distribution: Array<{ status: string; count: number }>
  cycleTime: Array<{ status: string; avgDays: number }>
}

export interface KanbanColumn {
  id: string
  title: string
  status: TicketStatus
  color: string
  tickets: TicketWithRelations[]
}

export interface CreateTicketInput {
  title: string
  description?: string
  type: TicketType
  status: TicketStatus
  priority: Priority
  storyPoints?: number
  projectId: string
  sprintId?: string
  epicId?: string
  parentId?: string
  assigneeId?: string
  dueDate?: Date
  labelIds?: string[]
}

export interface UpdateTicketInput extends Partial<CreateTicketInput> {
  id: string
}

export interface CreateProjectInput {
  name: string
  key: string
  description?: string
  color?: string
  icon?: string
}

export interface CreateSprintInput {
  projectId: string
  name: string
  goal?: string
  startDate?: Date
  endDate?: Date
}
