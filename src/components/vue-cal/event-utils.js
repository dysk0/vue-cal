import Vue from 'vue'
import { updateEventOverlaps } from './event-overlaps'

export const deleteAnEvent = (event, vuecal) => {
  vuecal.emitWithEvent('event-delete', event)

  let eventDate = (event.multipleDays && event.multipleDays.startDate) || event.startDate
  // Filtering from vuecal.mutableEvents since current cell might only contain all day events or vice-versa.
  let cellEvents = vuecal.mutableEvents[eventDate]
  // Delete the event.
  vuecal.mutableEvents[eventDate] = cellEvents.filter(e => e.eid !== event.eid)
  cellEvents = vuecal.mutableEvents[eventDate]

  // Delete event from overlaps cached array.
  let { [event.startDate]: cellOverlaps } = cellOverlappingEvents
  cellOverlaps[event.eid].forEach(id => {
    cellOverlaps[id] = cellOverlaps[id].filter(id2 => id2 !== event.eid)
  })
  delete cellOverlaps[event.eid]
  debugger

  // @todo: redo multiple day events after overlaps is working.
  // If deleting a multiple-day event, delete all the events pieces (days).
  // if (event.multipleDays.daysCount) {
  //   event.linked.forEach(e => {
  //     let dayToModify = vuecal.mutableEvents[e.date]
  //     let eventToDelete = dayToModify.find(e2 => e2.eid === e.eid)
  //     vuecal.mutableEvents[e.date] = dayToModify.filter(e2 => e2.eid !== e.eid)

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
  // Object.keys(event.overlapped).forEach(id => (delete cellEvents.find(item => item.eid === id).overlapping[event.eid]))
  // Object.keys(event.overlapping).forEach(id => (delete cellEvents.find(item => item.eid === id).overlapped[event.eid]))
  // Object.keys(event.simultaneous).forEach(id => (delete cellEvents.find(item => item.eid === id).simultaneous[event.eid]))
}


export const onResizeEvent = (cellEvents, vuecal) => {
  let { eventId, newHeight } = vuecal.domEvents.resizeAnEvent
  let event = cellEvents.find(e => e.eid === eventId)

  if (event) {
    const minEventHeight = Math.max(newHeight, 10)
    const eventStart = !isNaN(event.multipleDays.startTimeMinutes)
                     ? Math.max(event.multipleDays.startTimeMinutes, vuecal.timeFrom) : event.startTimeMinutes

    // While dragging event, prevent event to span beyond vuecal.timeTo.
    let maxEventHeight = (vuecal.timeTo - eventStart) * vuecal.timeCellHeight / vuecal.timeStep
    event.height = Math.min(minEventHeight, maxEventHeight)

    // Allow dragging until midnight but block height at vuecal.timeTo.
    maxEventHeight = (24 * 60 - eventStart) * vuecal.timeCellHeight / vuecal.timeStep
    event.maxHeight = Math.min(minEventHeight, maxEventHeight)
    updateEndTimeOnResize(event, vuecal)

    // if (!event.background) checkCellOverlappingEvents(cellEvents)
    updateEventOverlaps(event, cellEvents)
  }
}

const updateEndTimeOnResize = (event, vuecal) => {
  // event.maxHeight is the maximum height the event can take, up to midnight.
  // But event.height is limited to vuecal.timeTo to prevent event overflowing the view.
  const bottom = event.top + event.maxHeight
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
      const dayToModify = vuecal.mutableEvents[e.date]
      let eventToModify = dayToModify.find(e2 => e2.eid === e.eid)

      eventToModify.endTimeMinutes = event.endTimeMinutes
      eventToModify.endTime = event.endTime
      eventToModify.end = event.end
    })
  }
}

export const updateEventPosition = (event, vuecal) => {
  const src = (event.multipleDays.daysCount && event.multipleDays) || event
  const { startTimeMinutes, endTimeMinutes } = src

  // Top of event.
  let minutesFromTop = startTimeMinutes - vuecal.timeFrom
  const top = Math.round(minutesFromTop * vuecal.timeCellHeight / vuecal.timeStep)

  // Bottom of event.
  minutesFromTop = Math.min(endTimeMinutes, vuecal.timeTo) - vuecal.timeFrom
  const bottom = Math.round(minutesFromTop * vuecal.timeCellHeight / vuecal.timeStep)

  event.top = Math.max(top, 0)
  event.height = bottom - event.top
}
