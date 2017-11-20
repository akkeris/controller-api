"use strict"

let i = 0;
setInterval(() => {
  i++;
  console.log("worker test [" + process.env.HOSTNAME + "] " + process.env.RETURN_VALUE + " interval " + i);
}, 1000);