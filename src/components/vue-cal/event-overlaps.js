import Vue from 'vue'

// Object of cells (days) containing array of overlapping events.
export let cellOverlappingEvents = {}
// Example of data.
// 2018-11-21: {
//   258_6: [],
//   258_7: ["258_10"],
//   258_10: ["258_7", "258_11", "258_12"],
//   258_11: ["258_10", "258_12"],
//   258_12: ["258_10", "258_11"]
// }
export let cellSortedEvents = {}
export let cellEventWidths = {}

export const checkCellOverlaps = (cellDate, cellEvents) => {
  if (!cellOverlappingEvents[cellDate]) cellOverlappingEvents[cellDate] = {}

  cellEvents.forEach(e1 => {
    let { [cellDate]: { [e1.eid]: eventOverlaps } } = cellOverlappingEvents
    if (!eventOverlaps) eventOverlaps = cellOverlappingEvents[cellDate][e1.eid] = []

    // Foreach cell event compare with all others to see if overlapping and store in a global array.
    updateEventOverlaps(e1, cellEvents, true)
  })

  // console.log(cellOverlappingEvents)

  if (cellDate === '2018-11-21') getLongestOverlapsLine(cellDate)

  cellSortedEvents[cellDate] = cellEvents.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes).map(e => e.eid)
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
  const dragEventOverlapStillEvent = (start <= event.startTimeMinutes) && (end > event.startTimeMinutes)
  const stillEventOverlapDragEvent = (event.startTimeMinutes <= start) && (event.endTimeMinutes > start)

  return dragEventOverlapStillEvent || stillEventOverlapDragEvent
}

export const updateEventOverlaps = (e1, cellEvents, init = false) => {
  // Foreach cell event compare with all others to see if overlapping and store in a global array.
  cellEvents.forEach(e2 => {
    if (e2.eid === e1.eid) return

    const overlaps = eventInTimeRange(e1.startTimeMinutes, e1.endTimeMinutes, e2)
    const inOverlapsArray = cellOverlappingEvents[e1.startDate][e1.eid].indexOf(e2.eid)
    if (overlaps && inOverlapsArray === -1) cellOverlappingEvents[e1.startDate][e1.eid].push(e2.eid)
    else if (!overlaps && inOverlapsArray > -1) cellOverlappingEvents[e1.startDate][e1.eid].splice(inOverlapsArray, 1)
  })

  if (!init) getLongestOverlapsLine(e1.startDate)
  // if (!init) cellEventWidths[e1.startDate][e1.eid] = getRecursiveOverlaps(e1.eid, cellOverlappingEvents[e1.startDate])
}

// Example of data.
// 2018-11-21: {
//   258_6: [],
//   258_7: ["258_10"],
//   258_10: ["258_7", "258_11", "258_12"],
//   258_11: ["258_10", "258_12"],
//   258_12: ["258_10", "258_11"]
// }
export const getLongestOverlapsLine = cellDate => {
  // Foreach cell event compare with all others to see if overlapping.
  const cellEvents = Object.keys(cellOverlappingEvents[cellDate])
  const cellOverlaps = Object.values(cellOverlappingEvents[cellDate])
  if (!cellEventWidths[cellDate]) cellEventWidths[cellDate] = {}
  // let eventWidths = {
  //   258_6: 1,
  //   258_7: 4,
  //   258_10: 3,
  //   258_11: 3,
  //   258_12: 3
  // }

  cellEvents.forEach(id => {
    cellEventWidths[cellDate][id] = getRecursiveOverlaps(id, cellOverlappingEvents[cellDate])
  })

  // cellEventWidths[cellDate] = eventWidths
  console.log(cellEventWidths[cellDate])
}

// Recursively get the number of event overlaps of a given event on the same line.
const getRecursiveOverlaps = (id, cellEvents, overlapLines = {}) => {
  let max = 0

  // if (id === '258_10') debugger
  if (!overlapLines[id]) overlapLines[id] = [[id]]
  let currentLine = overlapLines[id][overlapLines[id].length - 1]
  const lastEventOfArray = currentLine[currentLine.length - 1]

  if (cellEvents[lastEventOfArray].length) {
    console.log('checking overlaps for ', currentLine[0], [...overlapLines[id]])
    cellEvents[lastEventOfArray].forEach(id2 => {
      if (!currentLine.includes(id2)) {
        const inFirstEventOverlaps = cellEvents[id].includes(id2)
        // All the overlaps in currentLine are present in list of cellEvents[id2]
        const containsFullLine = currentLine.filter(id3 => cellEvents[id2].includes(id3)).length === currentLine.length

        if (inFirstEventOverlaps && containsFullLine) {
          currentLine.push(id2)
          // if (cellEvents[id2]) getRecursiveOverlaps(id, cellEvents, overlapLines)
        }
        else if (inFirstEventOverlaps) {
          overlapLines[id].push([id, id2])
          getRecursiveOverlaps(id, cellEvents, overlapLines)
        }
      }
    })
  }

  // Count the highest possibility from array lengths.
  return Math.max(...overlapLines[id].map(array => array.length))
}

// Will recalculate all the overlaps of the current cell OR split.
// cellEvents will contain only the current split events if in a split.
/* export const checkEventOverlaps = (event, otherCellEvents) => {
  let { [event.startDate]: cellOverlaps } = cellOverlappingEvents
  if (!cellOverlaps[event.eid]) cellOverlaps[event.eid] = []

  // For each other event of the cell, check if overlapping current dragging event
  // and add it if not already in overlapping events.
  otherCellEvents.forEach(e => {
    if (!cellOverlaps[e.eid]) cellOverlaps[e.eid] = []

    if (eventInTimeRange(event.startTimeMinutes, event.endTimeMinutes, e)) {
      if (cellOverlaps[event.eid].indexOf(e.eid) === -1) cellOverlaps[event.eid].push(e.eid)
      if (cellOverlaps[e.eid].indexOf(event.eid) === -1) cellOverlaps[e.eid].push(event.eid)
    }
    else {
      let dragEventInOverlaps = cellOverlaps && cellOverlaps[event.eid] && cellOverlaps[event.eid].indexOf(e.eid) > -1
      let stillEventInOverlaps = cellOverlaps && cellOverlaps[e.eid] && cellOverlaps[e.eid].indexOf(event.eid) > -1

      // Delete still event id from dragging array.
      if (dragEventInOverlaps) {
        let eventIndex = cellOverlaps[event.eid].indexOf(e.eid)
        cellOverlaps[event.eid].splice(eventIndex, 1)
      }

      // Delete dragging event id from still event.
      if (stillEventInOverlaps) {
        let eventIndex = cellOverlaps[e.eid].indexOf(event.eid)
        cellOverlaps[e.eid].splice(eventIndex, 1)
      }
    }
  })
} */

// {
//   6:  [10, 11, 7]
//   10: [6, 11, 7]
//   11: [6, 10]
//   7:  [6, 10]
// }
// event = 6
/* export const checkDeepOverlaps = event => {
  let { [event.startDate]: cellOverlaps } = cellOverlappingEvents
  let overlaps = cellOverlaps[event.eid]

  // Start with all overlaps count, then run through each and decrement when 1 does not overlap all others.
  let overlapsCount = overlaps.length
  let checkedEvents = []

  // 6: [10, 11, 7], overlapsCount=3
  //-------------------- now foreach overlap decrement if needed:
  // 10 | [6ø, 11, 7]    =>   11, 7 from `overlaps` in this array.      ok
  // 11 | [6ø, 10]       =>   10, 7 from overlaps not in this array.    -1
  // 7: | [6ø, 10]       =>   pass
  overlaps.forEach(id => {
    // id = 10
    // id = 11
    // id = 7

    // if (overlaps of id does not have 11 and 7) overlapsCount--
    // if (overlaps of id does not have 10 and 7) overlapsCount--
    // if (overlaps of id does not have 10 and 11) overlapsCount--

    // Remove requested event id from array.
    let overlapOverlaps = cellOverlaps[id].filter(id2 => id2 !== event.eid) // [6, 11, 7] => [11, 7]

    // If requested event overlaps are all in the overlapOverlaps, ok. otherwise decrement 1 & put the missing event in checkedEvents.
    let reqEventOverlapsWOCurrent = overlaps.filter(id2 => id2 !== id) // [11, 7]
    // if all reqEventOverlapsWOCurrent are in overlapOverlaps, then ok. otherwise decrement overlapsCount.
    let notOverlappingAll = reqEventOverlapsWOCurrent.filter(id2 => !overlapOverlaps.includes(id2))
    let notOverlappingNotInChecked = notOverlappingAll.every(i => checkedEvents.includes(i))
    // if (notOverlappingAll.filter(id2 => id2 !== id).length && !checkedEvents.includes(id) && !notOverlappingNotInChecked) {
    //   overlapsCount -= notOverlappingAll.length
    //   checkedEvents.push(...notOverlappingAll)
    // }
    if (notOverlappingAll.filter(id2 => id2 !== id).length) {
      if (!checkedEvents.includes(id) && !notOverlappingNotInChecked) overlapsCount -= notOverlappingAll.length
      checkedEvents.push(...notOverlappingAll)
    }
  })

  return overlapsCount
} */
