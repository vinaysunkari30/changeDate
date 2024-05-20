let addDays = require('date-fns/addDays')

let dateAfterXDays = num => {
  let changeDate = addDays(new Date(2020, 7, 22), num)
  return `${changeDate.getDate()}-${changeDate.getMonth()}-${changeDate.getFullYear()}`
}

module.exports = dateAfterXDays
