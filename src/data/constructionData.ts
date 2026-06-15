// 建筑施工进度模拟数据

export type TaskStatus = 'completed' | 'in-progress' | 'pending'
export type InspectionStatus = 'accepted' | 'pending' | 'rejected'

export interface Task {
  name: string
  progress: number // 0-100
  inspection: InspectionStatus
}

export interface FloorData {
  id: number
  label: string
  team: string
  tasks: Task[]
}

export interface DaySnapshot {
  date: string
  workerCount: number
  floors: FloorData[]
}

const TASK_TYPES = ['水电', '砌墙', '装修', '消防', '通风']

const TEAMS = [
  '一队-张伟班组', '二队-李强班组', '三队-王刚班组',
  '四队-刘洋班组', '五队-陈杰班组', '六队-赵斌班组',
  '七队-周涛班组', '八队-吴鹏班组', '九队-孙磊班组',
  '十队-黄勇班组',
]

const TOTAL_FLOORS = 15

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function getInspectionStatus(progress: number, rand: () => number): InspectionStatus {
  if (progress < 100) return 'pending'
  const r = rand()
  if (r < 0.55) return 'accepted'
  if (r < 0.8) return 'pending'
  return 'rejected'
}

function generateDayData(dayIndex: number): DaySnapshot {
  const rand = seededRandom(dayIndex * 137 + 42)
  const date = new Date(2026, 0, 6 + dayIndex)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const floors: FloorData[] = []
  for (let f = 1; f <= TOTAL_FLOORS; f++) {
    const floorRatio = f / TOTAL_FLOORS
    const timeRatio = dayIndex / 59
    const baseProgress = Math.max(0, Math.min(100, (timeRatio - floorRatio * 0.7) * 160))

    const tasks: Task[] = TASK_TYPES.map((name, ti) => {
      const taskRand = seededRandom(dayIndex * 137 + f * 31 + ti * 17 + 42)
      const offset = ti * 8
      const raw = baseProgress - offset + (taskRand() - 0.5) * 15
      let progress = Math.max(0, Math.min(100, Math.round(raw)))
      if (progress >= 88 && progress < 100 && taskRand() < 0.7) {
        progress = 100
      }
      const inspection = getInspectionStatus(progress, () => taskRand())
      return { name, progress, inspection }
    })

    floors.push({
      id: f,
      label: f === 1 ? '首层' : f === TOTAL_FLOORS ? '屋面层' : `${f}层`,
      team: TEAMS[(f - 1) % TEAMS.length],
      tasks,
    })
  }

  const baseWorkers = 85 + Math.floor(rand() * 40)
  const workerVariation = Math.sin(dayIndex * 0.3) * 15
  const workerCount = Math.max(60, Math.round(baseWorkers + workerVariation - dayIndex * 0.3))

  return { date: dateStr, workerCount, floors }
}

export const ALL_SNAPSHOTS: DaySnapshot[] = Array.from({ length: 60 }, (_, i) => generateDayData(i))

export const PROJECT_NAME = '鑫苑·未来城 3#楼'
export const PLAN_DURATION = 60

export function getFloorStatus(floor: FloorData): TaskStatus {
  const allAccepted = floor.tasks.every((t) => t.progress >= 100 && t.inspection === 'accepted')
  if (allAccepted) return 'completed'
  const anyStarted = floor.tasks.some((t) => t.progress > 0.5)
  if (anyStarted) return 'in-progress'
  return 'pending'
}

export function hasRectification(floor: FloorData): boolean {
  return floor.tasks.some((t) => t.inspection === 'rejected')
}

export function getFloorAvgProgress(floor: FloorData): number {
  return Math.round(floor.tasks.reduce((s, t) => s + t.progress, 0) / floor.tasks.length)
}

export function getAcceptedProgress(floor: FloorData): number {
  const acceptedCount = floor.tasks.filter((t) => t.progress >= 100 && t.inspection === 'accepted').length
  return Math.round((acceptedCount / floor.tasks.length) * 100)
}

export function getOverallProgress(snapshot: DaySnapshot): number {
  const total = snapshot.floors.reduce((s, f) => s + getFloorAvgProgress(f), 0)
  return Math.round(total / snapshot.floors.length)
}

export function getRectificationCount(snapshot: DaySnapshot): number {
  return snapshot.floors.filter((f) => hasRectification(f)).length
}

export function getInspectionLabel(status: InspectionStatus): string {
  const labels: Record<InspectionStatus, string> = {
    accepted: '验收通过',
    pending: '待验收',
    rejected: '需整改',
  }
  return labels[status]
}
