import Vue from 'vue'
import { updateEventOverlaps } from './event-overlaps'

export const deleteAnEvent = ({ event, vuecal }) => {
  vuecal.emitWithEvent('event-delete', event)

  let eventDate = (event.multipleDays && event.multipleDays.startDate) || event.startDate
  // Filtering from vuecal.mutableEvents since current cell might only contain all day events or vice-versa.
  let cellEvents = vuecal.mutableEvents[eventDate]
  // Delete the event.
  vuecal.mutableEvents[eventDate] = cellEvents.filter(e => e.id !== event.id)
  cellEvents = vuecal.mutableEvents[eventDate]

  // Delete event from overlaps cached array.
  let { [event.startDate]: cellOverlaps } = cellOverlappingEvents
  cellOverlaps[event.id].forEach(id => {
    cellOverlaps[id] = cellOverlaps[id].filter(id2 => id2 !== event.id)
  })
  delete cellOverlaps[event.id]
  debugger

  // @todo: redo multiple day events after overlaps is working.
  // If deleting a multiple-day event, delete all the events pieces (days).
  // if (event.multipleDays.daysCount) {
  //   event.linked.forEach(e => {
  //     let dayToModify = vuecal.mutableEvents[e.date]
  //     let eventToDelete = dayToModify.find(e2 => e2.id === e.id)
  //     vuecal.mutableEvents[e.date] = dayToModify.filter(e2 => e2.id !== e.id)

  //     if (!e.background) {
  //       // Remove this event from possible other overlapping events of the same cell.
  //       deleteLinkedEvents(eventToDelete, dayToModify)
  //     }
  //   })
  // }

  // Remove this event from possible other overlapping events of the same cell, then
  // after mutableEvents has changed, rerender will start & checkCellOverlappingEvents()
  // will be run again.
  if (!event.background) deleteLinkedEvents(event, cellEvents)
}

const deleteLinkedEvents = (event, cellEvents) => {
  // Object.keys(event.overlapped).forEach(id => (delete cellEvents.find(item => item.id === id).overlapping[event.id]))
  // Object.keys(event.overlapping).forEach(id => (delete cellEvents.find(item => item.id === id).overlapped[event.id]))
  // Object.keys(event.simultaneous).forEach(id => (delete cellEvents.find(item => item.id === id).simultaneous[event.id]))
}

export const onResizeEvent = ({ vuecal, cellEvents }) => {
  let { eventId, newHeight } = vuecal.domEvents.resizeAnEvent
  let event = cellEvents.find(e => e.id === eventId)

  if (event) {
    event.height = Math.max(newHeight, 10)
    updateEndTimeOnResize(event, vuecal)

    // if (!event.background) checkCellOverlappingEvents({ event, split: event.split || 0, cellEvents, vuecal })
    updateEventOverlaps(event, cellEvents)
  }
}

export const updateEndTimeOnResize = (event, vuecal) => {
  const bottom = event.top + event.height
  const endTime = (bottom / vuecal.timeCellHeight * vuecal.timeStep + vuecal.timeFrom) / 60
  const hours = parseInt(endTime)
  const minutes = parseInt((endTime - hours) * 60)

  event.endTimeMinutes = endTime * 60
  event.endTime = `${hours}:${(minutes < 10 ? '0' : '') + minutes}`
  event.end = event.end.split(' ')[0] + ` ${event.endTime}`

  if (event.multipleDays.daysCount) {
    event.multipleDays.endTimeMinutes = event.endTimeMinutes
    event.multipleDays.endTime = event.endTime
    event.multipleDays.end = event.end

    event.linked.forEach(e => {
      let dayToModify = vuecal.mutableEvents[e.date]
      let eventToModify = dayToModify.find(e2 => e2.id === e.id)

      eventToModify.endTimeMinutes = event.endTimeMinutes
      eventToModify.endTime = event.endTime
      eventToModify.end = event.end
    })
  }
}

export const updateEventPosition = ({ event, vuecal }) => {
  const src = (event.multipleDays.daysCount && event.multipleDays) || event
  const { startTimeMinutes, endTimeMinutes } = src

  let minutesFromTop = startTimeMinutes - vuecal.timeFrom
  const top = Math.round(minutesFromTop * vuecal.timeCellHeight / vuecal.timeStep)

  minutesFromTop = Math.min(endTimeMinutes, vuecal.timeTo) - vuecal.timeFrom
  const bottom = Math.round(minutesFromTop * vuecal.timeCellHeight / vuecal.timeStep)

  event.top = Math.max(top, 0)
  event.height = bottom - event.top
}
