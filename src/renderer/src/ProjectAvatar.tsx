import type { Project } from '../../shared/types'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function ProjectAvatar({
  project,
  size = 28,
  className
}: {
  project: Pick<Project, 'name' | 'color' | 'imageDataUrl'>
  size?: number
  className?: string
}): React.JSX.Element {
  if (project.imageDataUrl) {
    return (
      <img
        src={project.imageDataUrl}
        alt={project.name}
        className={className}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={className}
      style={{ width: size, height: size, background: project.color, fontSize: size * 0.4 }}
    >
      {initials(project.name) || '?'}
    </span>
  )
}
