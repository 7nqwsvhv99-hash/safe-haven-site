export type PublicAdoptionStory = {
  publishedAt?: string
  displayOrder: number | null
}

export function orderPublicAdoptionStories<T extends PublicAdoptionStory>(stories: T[], limit = 20) {
  return [...stories].sort((left, right) => {
    const leftTime = Date.parse(left.publishedAt || "")
    const rightTime = Date.parse(right.publishedAt || "")
    const leftHasTime = Number.isFinite(leftTime)
    const rightHasTime = Number.isFinite(rightTime)
    if (leftHasTime && rightHasTime) return rightTime - leftTime
    if (leftHasTime) return -1
    if (rightHasTime) return 1
    return (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER)
  }).slice(0, limit)
}
