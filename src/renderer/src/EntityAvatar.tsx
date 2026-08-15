function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export interface AvatarLike {
  id: string
  name: string
  color: string
  imageDataUrl: string | null
}

export function EntityAvatar({
  entity,
  size = 28,
  className
}: {
  entity: AvatarLike
  size?: number
  className?: string
}): React.JSX.Element {
  if (entity.imageDataUrl) {
    return (
      <img
        src={entity.imageDataUrl}
        alt={entity.name}
        className={className}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={className}
      style={{ width: size, height: size, background: entity.color, fontSize: size * 0.4 }}
    >
      {initials(entity.name) || '?'}
    </span>
  )
}
