import Vue from 'vue'

// Object of cells (days) containing array of overlapping events.
export let cellOverlappingEvents = {}
// Example of data.
// 2018-03-20: {
//   257_6: ["257_10", "257_11", "257_7"],
//   257_7: ["257_6"],
//   257_10: ["257_6", "257_11"],
//   257_11: ["257_6", "257_10"]
// }
export let cellSortedEvents = {}

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
    checkEventOverlaps(event, cellEvents.filter(e => e.id !== event.id))
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

export const initCellOverlappingEvents = (cellDate, cellEvents) => {
  if (!cellOverlappingEvents[cellDate]) cellOverlappingEvents[cellDate] = {}
  let eventsToCompare = cellEvents.slice(0)

  cellEvents.forEach(event => {
    // Remove the current event from the list when compared for performance.
    eventsToCompare.shift()
    checkEventOverlaps(event, eventsToCompare)
  })

  console.log(cellOverlappingEvents)
  cellSortedEvents[cellDate] = {}
  cellSortedEvents[cellDate] = cellEvents.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes).map(e => e.id)
}

// Will recalculate all the overlaps of the current cell OR split.
// cellEvents will contain only the current split events if in a split.
export const checkEventOverlaps = (event, otherCellEvents) => {
  let { [event.startDate]: cellOverlaps } = cellOverlappingEvents
  if (!cellOverlaps[event.id]) cellOverlaps[event.id] = []

  // For each other event of the cell, check if overlapping current dragging event
  // and add it if not already in overlapping events.
  otherCellEvents.forEach(e => {
    if (!cellOverlaps[e.id]) cellOverlaps[e.id] = []

    if (eventInTimeRange(event.startTimeMinutes, event.endTimeMinutes, e)) {
      if (cellOverlaps[event.id].indexOf(e.id) === -1) cellOverlaps[event.id].push(e.id)
      if (cellOverlaps[e.id].indexOf(event.id) === -1) cellOverlaps[e.id].push(event.id)
    }
    else {
      let dragEventInOverlaps = cellOverlaps && cellOverlaps[event.id] && cellOverlaps[event.id].indexOf(e.id) > -1
      let stillEventInOverlaps = cellOverlaps && cellOverlaps[e.id] && cellOverlaps[e.id].indexOf(event.id) > -1

      // Delete still event id from dragging array.
      if (dragEventInOverlaps) {
        let eventIndex = cellOverlaps[event.id].indexOf(e.id)
        cellOverlaps[event.id].splice(eventIndex, 1)
      }

      // Delete dragging event id from still event.
      if (stillEventInOverlaps) {
        let eventIndex = cellOverlaps[e.id].indexOf(event.id)
        cellOverlaps[e.id].splice(eventIndex, 1)
      }
    }
  })

  console.log(cellOverlaps)
}

export const checkDeepOverlaps = event => {
  let { [event.startDate]: cellOverlaps } = cellOverlappingEvents
  let overlaps = cellOverlaps[event.id]
  let intersecting = []

  overlaps.forEach(id => {
    // check array intersections between current overlap and all its overlaps.
    const eventIds = cellOverlaps[id].filter(id2 => overlaps.includes(id2))
    if (eventIds) intersecting.push(...eventIds)
  })

  // Return unique array.
  return intersecting.filter((v, i, a) => a.indexOf(v) === i)
}

/**
 * Check if an event is intersecting a time range.
 *
 * @param {Number} start Start of time range
 * @param {Number} end End of time range
 * @param {Object} event An event to check if in time range
 * @return {Boolean} true if in range false otherwise
 */
export const eventInTimeRange = (start, end, event) => {
  let dragEventOverlapStillEvent = (start <= event.startTimeMinutes) && (end > event.startTimeMinutes)
  let stillEventOverlapDragEvent = (event.startTimeMinutes <= start) && (event.endTimeMinutes > start)

  return dragEventOverlapStillEvent || stillEventOverlapDragEvent
}

/**
 * Returns an array of event ids in range.
 *
 * @param {Number} start Start of time range
 * @param {Number} end End of time range
 * @param {Array} events An array of events to check if in time range
 * @return {Array} Array of event ids in range
 */
export const eventsInTimeRange = (start, end, events) => {
  let overlaps = []

  events.forEach(e => {
    let stillEventStart = e.startTimeMinutes
    let stillEventEnd = e.endTimeMinutes
    let dragEventOverlapStillEvent = (start <= stillEventStart) && (end > stillEventStart)
    let stillEventOverlapDragEvent = (stillEventStart <= start) && (stillEventEnd > start)

    if (dragEventOverlapStillEvent || stillEventOverlapDragEvent) overlaps.push(e.id)
  })
  return overlaps
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
