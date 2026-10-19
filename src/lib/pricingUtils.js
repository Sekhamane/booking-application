import { SERVICES } from '../constants/services'

export function getPriceForService(serviceId, coverageLevel) {
  const service = SERVICES.find(s => s.id === serviceId)
  if (!service) return 0
  const level = service.coverageLevels.find(l => l.level === coverageLevel)
  return level ? level.price : 0
}

export function getCoverageLevels(serviceId) {
  const service = SERVICES.find(s => s.id === serviceId)
  return service ? service.coverageLevels : []
}
