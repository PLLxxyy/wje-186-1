import React from 'react'
import { FloorData, getFloorAvgProgress, getFloorStatus, hasRectification, getAcceptedProgress, getInspectionLabel, InspectionStatus } from '../data/constructionData'

interface Props {
  data: { x: number; y: number; floor: FloorData } | null
}

const STATUS_LABEL: Record<string, string> = {
  completed: '已完工',
  'in-progress': '施工中',
  pending: '未开始',
}

const INSPECTION_COLORS: Record<InspectionStatus, string> = {
  accepted: '#4ade80',
  pending: '#94a3b8',
  rejected: '#fbbf24',
}

const FloorTooltip: React.FC<Props> = ({ data }) => {
  if (!data) return null
  const avg = getFloorAvgProgress(data.floor)
  const accepted = getAcceptedProgress(data.floor)
  const status = getFloorStatus(data.floor)
  const hasRect = hasRectification(data.floor)

  return (
    <div className="tooltip-3d" style={{ left: data.x, top: data.y }}>
      <div className="tooltip-title">
        {data.floor.label} - {STATUS_LABEL[status]}
        {hasRect && <span className="tooltip-rect-badge">需整改</span>}
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">施工班组</span>
        <span className="tooltip-val">{data.floor.team}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">施工进度</span>
        <span className="tooltip-val">{avg}%</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">验收通过</span>
        <span className="tooltip-val" style={{ color: '#4ade80' }}>{accepted}%</span>
      </div>
      <div className="tooltip-divider" />
      {data.floor.tasks.map((task) => (
        <div className="tooltip-row" key={task.name}>
          <span className="tooltip-label">{task.name}</span>
          <span className="tooltip-val" style={{ color: INSPECTION_COLORS[task.inspection] }}>
            {task.progress}% · {getInspectionLabel(task.inspection)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default FloorTooltip
