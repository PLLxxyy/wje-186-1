import React from 'react'
import { getFloorStatus, getFloorAvgProgress, FloorData, hasRectification, getAcceptedProgress, getInspectionLabel, InspectionStatus } from '../data/constructionData'

interface Props {
  floors: FloorData[]
  activeFloor: number | null
  onSelect: (floorIndex: number) => void
}

const STATUS_LABEL: Record<string, string> = {
  completed: '已完工',
  'in-progress': '施工中',
  pending: '未开始',
}

const TASK_COLORS: Record<string, string> = {
  completed: '#4ade80',
  'in-progress': '#fbbf24',
  pending: '#475569',
}

const INSPECTION_COLORS: Record<InspectionStatus, string> = {
  accepted: '#4ade80',
  pending: '#64748b',
  rejected: '#fbbf24',
}

function getBarColor(progress: number, inspection: InspectionStatus): string {
  if (progress >= 100 && inspection === 'accepted') return '#4ade80'
  if (inspection === 'rejected') return '#fbbf24'
  if (progress > 0.5) return '#38bdf8'
  return '#475569'
}

const FloorPanel: React.FC<Props> = ({ floors, activeFloor, onSelect }) => {
  return (
    <div className="floor-panel">
      {floors.map((floor, i) => {
        const status = getFloorStatus(floor)
        const avg = getFloorAvgProgress(floor)
        const accepted = getAcceptedProgress(floor)
        const isActive = activeFloor === i
        const hasRect = hasRectification(floor)

        return (
          <div
            key={floor.id}
            className={`floor-card${isActive ? ' active' : ''}${hasRect ? ' rectification' : ''}`}
            onClick={() => onSelect(i)}
          >
            <div className="floor-card-header">
              <span className="floor-name">
                {floor.label}
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>{floor.team}</span>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span className={`floor-status ${status}${hasRect ? ' has-rect' : ''}`}>
                  {STATUS_LABEL[status]}
                </span>
                {hasRect && (
                  <span className="rect-tag">
                    需整改
                  </span>
                )}
              </div>
            </div>
            <div className="floor-progress-row">
              <span className="floor-progress-label">施工进度</span>
              <span className="floor-progress-value">{avg}%</span>
            </div>
            <div className="floor-progress-row">
              <span className="floor-progress-label">验收通过</span>
              <span className="floor-progress-value accepted">{accepted}%</span>
            </div>
            {floor.tasks.map((task) => (
              <div className="task-row" key={task.name}>
                <span className="task-name">{task.name}</span>
                <div className="task-bar-bg">
                  <div
                    className="task-bar-fill"
                    style={{
                      width: `${task.progress}%`,
                      background: getBarColor(task.progress, task.inspection),
                    }}
                  />
                </div>
                <span
                  className="task-inspection"
                  style={{ color: INSPECTION_COLORS[task.inspection] }}
                >
                  {getInspectionLabel(task.inspection)}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default FloorPanel
