// Copyright 2022 Sharyndor

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

var hostDomain = new URL(window.location.href).hostname
var supportedBackendVersion = [0, 4, 0] /* vMajor.Minor.Patch */

const reservedWords = [
  'rows',
  'columns',
  'backend',
  'blank'
]

const referFuns = [
  referAlias,
  referYoutube,
  referTwitch,
]

const embedFuns = { 
  'blank'       : null,
  'alias'       : embedAlias,
  'yt-video'    : embedYoutubeVideo,
  'yt-channel'  : embedYoutubeChannel,
  'ttv-video'   : embedTwitchVideo,
  'ttv-channel' : embedTwitchChannel,
}

function referAlias(str) {
  alias = str.toLowerCase()
  return alias in global.aliases ? ['alias', alias, []] : null
}

function referYoutube(str) {
  /* Try to treat the string as a URL */
  var url = new URL(str)

  /* Normal video link, parse out the video id and timestamp (if present) */
  if (url.host.includes('youtube') && url.searchParams.has('v')) { 
      var timeStamp = url.searchParams.get('t')
      var extras = timeStamp ? '&start=' + timeStamp : ''
      return ['yt-video', url.searchParams.get('v'), extras]
  }

  /* Custom channel link cannot be used, actual channel id is needed instead */
  if (url.host.includes('youtube') && url.pathname.includes('/c/')) { 
    return checkReferers(prompt('Embed needs URL with channel ID'))
  }

  /* Normal channel link, parse out the channel id */
  if (url.host.includes('youtube') && url.pathname.includes('/channel/')) { 
    return ['yt-channel', url.pathname.split('/channel/')[1]]
  }

  /* Short video link, parse out the video id and timestamp (if present) */
  if (url.host.includes('youtu.be')) { 
    var timestamp = url.searchParams.get('t')
    var extras = timestamp ? '&start=' + timestamp : ''
    return ['yt-video', url.pathname.substring(1), extras]
  }

  return null
}

function referTwitch(str) {
  /* Start with ttv- as shorthand for twitch channels */
  if (str.startsWith('ttv-')) {
    return ['ttv-channel', str.substring(4)]
  }

  /* Try to treat the string as a URL */
  var url = new URL(str)

  /* VOD */
  if (url.host.includes('twitch.tv') && url.pathname.includes('/videos/')) { 
    var timeStamp = url.searchParams.get('t')
    var extras = timeStamp ? '&time=' + timeStamp : ''
    return ['ttv-video', url.pathname.split('/videos/')[1], extras]
  }
   
  /* Probably trying to reference a channel, parse out the channel name */
  if (url.host.includes('twitch.tv')) {
    return ['ttv-channel', url.pathname.substring(1)]
  }

  return null
}


function embedYoutubeVideo(value, extras) {
  return 'https://www.youtube.com/embed/' + value + '?autoplay=1&mute=1' + extras
}

function embedYoutubeChannel(value) {
  return 'https://www.youtube.com/embed/live_stream?channel=' + value + '&autoplay=1&mute=1'
}

function embedTwitchChannel(value) {
  return 'https://player.twitch.tv/?channel=' + value + '&parent=' + hostDomain + '&autoplay=true&muted=true&height=100%&width=100%'
}

function embedTwitchVideo(value, extras) {
  return 'https://player.twitch.tv/?video=' + value + '&parent=' + hostDomain + '&autoplay=true&muted=true&height=100%&width=100%' + extras
}

function embedAlias(value, extras) {
  var streamer = global.aliases[value]
  var type =  streamer.status ? streamer.status.type  : streamer.streams[0].type
  var value = streamer.status ? streamer.status.value : streamer.streams[0].value

  return checkEmbeds(type, value, extras)
}

function resolveEmbedData(type, value, extras) {
  if (type == 'alias') {
    var streamer = global.aliases[value]
    type =  streamer.status ? streamer.status.type  : streamer.streams[0].type
    value = streamer.status ? streamer.status.value : streamer.streams[0].value
  }
  return [type, value, extras]
}

function applyUntilSuccess(funs, val, otherwise) {
  for (var fun of funs) {
    try {
      var result = fun(val)
      if (result) {
        return result
      }
    } catch {}
  }
  return otherwise
}

function checkReferers(str) {
  /* Check if data is embedded in the string */
  var [type, value] = str.split('=')
  if (type in embedFuns) {
    return [type, value, []]
  }
  
  /* Try each method for something that isn't null */
  return applyUntilSuccess(referFuns, str, [null, null, null])
}

function checkEmbeds(type, value, extras) {
  return embedFuns[type](value, extras)
}

function createGrid(forcePrompt = false) {
  var params = new URLSearchParams(window.location.search)
  
  /* Build the grid based on the URL, prompt if unavailable */
  var rows = params.get('rows')
  if (rows == null || forcePrompt) {
    /* Horrible check to keep prompting until a valid number is entered */
    do {
      rows = prompt('Rows:')
      
      /* Allow cancellation if the page has already been loaded */
      if (rows == null && grid.children.length != 0) {
        return
      }
    } while (!(Number(rows) >= 1))
  }
  var columns = params.get('columns')
  if (columns == null || forcePrompt) {
    /* Horrible check to keep prompting until a valid number is entered */
    do {
      columns = prompt('Columns:')
      
      /* Allow cancellation if the page has already been loaded */
      if (columns == null && grid.children.length != 0) {
        return
      }
    } while (!(Number(columns) >= 1))
  }
  
  var totalElements = rows * columns
  
  /* Show the help dialog if the URL is empty */
  if (Array.from(params).length == 0) {
    toggleOverlayHelp()
  }
  
  /* Update the css to actually display a grid */
  grid.style.gridTemplateRows    = 'repeat(' + rows    + ', minmax(0, 1fr))'
  grid.style.gridTemplateColumns = 'repeat(' + columns + ', minmax(0, 1fr))'
  
  /* Add bookkeeping */
  grid.rows = rows
  grid.columns = columns
  
  /* If children don't exist yet, this is a fresh page load */
  var freshGrid = grid.children.length == 0
  
  /* Pad out the grid using blank elements */
  while (grid.children.length < totalElements) {
    grid.appendChild(makeBlankElement())
  }
  
  if (freshGrid) {
    /* Fill in the grid using the URL */
    var currentElement = 0
    var extras = ''
    params.forEach(function(value, key) {
      if (currentElement < totalElements)
      {
        var [tempType, tempValue, tempExtras] = checkReferers(key)
        if (key in embedFuns) {
          /* Extra data will precede the embed type to make parsing easier */
          setElement(grid.children[currentElement], key, value, extras)
          extras = ''
          ++currentElement
        } else if (tempType || tempValue || tempExtras) {
          /* Found something, load it */
          setElementFromString(grid.children[currentElement], key)
          extras =''
          ++currentElement
        }
        else if (reservedWords.includes(key)) {
          /* Do nothing for reserved keywords */
        }
        else {
          /* Otherwise, must be part of the extra data */
          extras += '&' + key + '=' + value
        }
      }
    })
  } else {
    /* If an element is about to be cut off, move it to the first available blank spot */
    for (var afterIndex = totalElements; afterIndex < grid.children.length; ++afterIndex) {
      /* Swap non-blank trailing elements... */
      if (grid.children[afterIndex].type != 'blank') {
        /* With... */
        for (var currentIndex = 0; currentIndex < totalElements; ++currentIndex) {
          /* Any blank leading elements */
          if (grid.children[currentIndex].type == 'blank') {
            moveElement(grid.children[afterIndex], grid.children[currentIndex])
          }
        }
      }
    }
    
    /* Cut off elements that couldn't fit */
    while (grid.children.length > totalElements) {
      grid.removeChild(grid.lastChild)
    }
  }
  
  /* Grid is created, go ahead and update the URL */
  updateURL()
  
  /* Size the grid elements correctly */
  resizeGrid()
}

function adaptMouseToTouch(fun) {
  return function(e) {
    if (e.touches[0]) {
      e.touches[0].button = 0
    }
    fun(e.touches[0])
  }
}

function makeGesturable(element, callback) {
  element.onmousedown = function(event) {
    gestureMouseDown(element, event, callback)
  }
  element.ontouchstart = adaptMouseToTouch(element.onmousedown)
}

function gestureMouseDown(element, event) {
  /* Gesture was ignored, probably because window focus was lost */
  if (global.ignoreNextGesture) {
    global.ignoreNextGesture = false
    return
  }

  /* Left mouse only */
  if (event.button == 0) {
    gestureStartTime = (new Date()).getTime()
    gestureStartX = event.clientX
    gestureStartY = event.clientY
    
    handleStreamGesture(element, event)

    window.onmouseup = function(event) {
      gestureMouseUp(element, event)
    }
    window.ontouchend = adaptMouseToTouch(window.onmouseup)

    window.onmousemove = function(event) {
      gestureMouseMove(element, event)
    }

    window.ontouchmove = adaptMouseToTouch(window.onmousemove)

    /* Ensure a long press is registered and displayed if the mouse doesn't move */
    gestureTimeout = setTimeout(() => {
      handleStreamGesture(element, event)
    }, 800);
  }
}

function gestureMouseUp(element, event) {
  handleStreamGesture(element, event)

  /* Left mouse only */
  if (event == null || event.button == 0) {
    setElementFromClick(element)
    window.onmouseup = null
    window.onmousemove = null
    window.ontouchend = null
    window.ontouchmove = null
  }
}

function gestureMouseMove(element, event) {
  handleStreamGesture(element, event)
}

function handleStreamGesture(element, event) {
  /* Clear the long press timer */
  if (typeof gestureTimeout != 'undefined') {
    clearTimeout(gestureTimeout)
  }

  var gestureX = event.clientX - gestureStartX
  var gestureY = event.clientY - gestureStartY
  var gestureDuration = (new Date()).getTime() - gestureStartTime

  var distance = Math.sqrt(gestureX * gestureX + gestureY * gestureY)
  var angle = 180.0 + Math.atan2(gestureX, gestureY) * 180.0 / Math.PI

  var key = ' '
  if (distance < 50) {       // Neutral
    if (element.lastChild.tagName == 'DIV') { // Blank element
      key = 's'
    } else if (gestureDuration > 800) { // Do nothing with long press in center
      key = ''
    }
  } else if (angle < 45.0) {  // Up
    key = 'd'
  } else if (angle < 135.0) { // Left
    key = 'j'
  } else if (angle < 225.0) { // Down
    key = 's'
  } else if (angle < 315.0) { // Right
    key = 'k'
  } else if (angle < 360.0) { // Up
    key = 'd'
  }

  myKeyDown({ key: key })
}

function makeBlankElement() {
  var div = document.createElement('div')
  
  /* Add event listeners */
  makeGesturable(div)
  div.ondrop     = function (event) { setElementFromDrop(div, event) }
  div.ondragover = function (event) { event.preventDefault() }
  
  /* Add bookkeeping */
  div.classList.add('grid-element')
  div.type = 'blank'
  div.setAttribute('type', 'blank')
  
  /* First child is the box/text displayed on hover */
  var gridOverlay = div.appendChild(document.createElement('div'))
  gridOverlay.classList.add('grid-overlay')
  gridOverlay.appendChild(document.createElement('div'))
  gridOverlay.addEventListener('mousemove', function(e) {
    e.target.classList.remove('fade')
    
    if (e.interactTimeout) {
      clearTimeout(e.interactTimeout)
    }
    e.target.interactTimeout = setTimeout(function() {
      e.target.classList.add('fade')
    }, 2000)
  })

  /* Second child is shown when cycling between next/prev */
  var gridStatus = gridOverlay.appendChild(document.createElement('div'))
  gridStatus.classList.add('grid-status')

  /* Last child is the actual content */
  div.appendChild(document.createElement('div'))
  
  /* Add extra variables */
  div.channelNameTimeout = null
  return div
}

function setElement(element, type, value, extras) {
  /* Can only set non-null elements with a non-null type */
  if (element == null || type == null) {
    return
  }

  /* Clear the element if blank, otherwise construct the embed based on the type/value */
  if (type == 'blank') {
    removeElement(element)
  } else {
    /* Add bookkeeping */
    [element.type, element.value, element.extras] = resolveEmbedData(type, value, extras)

    /* Remove null properties */
    element.type   ? {} : element.removeAttribute('type')
    element.value  ? {} : element.removeAttribute('value')
    element.extras ? {} : element.removeAttribute('extras')
    
    /* Create and set up the iframe */
    var frame = document.createElement('iframe')
    frame.classList.add('content')
    frame.setAttribute('src', checkEmbeds(type, value, extras))
    frame.setAttribute('allow', 'fullscreen')
    
    /* last child is the actual content */
    element.replaceChild(frame, element.querySelector('.content'))
    
    /* Element was modified, update the URL */
    updateURL()
  }
}

function updateURL() {
  /* Throw away any existing parameters */
  var baseURL = window.location.href.split('?')[0]
  
  /* Add parameters for rows/columns */
  baseURL += '?rows='    + grid.rows
  baseURL += '&columns=' + grid.columns

  /* Save backend location in URL if it isn't the default value */
  if (backendLocation.toLowerCase() != 'localhost:8080') {
    baseURL += '&backend=' + backendLocation
  }
  
  /* Add parameters for the types/value of each piece of the grid */
  document.querySelectorAll('.grid-element').forEach(function(element) {
    baseURL += element.type ? '&' + element.type : ''
    baseURL += element.value ? '=' + element.value : ''
    baseURL += element.extras ? element.extras : ''
  })
  
  /* Actually replace the URL */
  window.history.replaceState('', '', baseURL)
  
  updateChat()
}

function populateChat() {
  var select = chatOptions
  select.onchange = function(event) {
    if (event.target.value == 'None') {
      chatFrame.setAttribute('src', '')
    } else {
      var [type, value] = event.target.value.split('=')
      if (type == 'yt-video') {
        chatFrame.setAttribute('src', 'https://www.youtube.com/live_chat?v=' + value + '&embed_domain=' + hostDomain)
      }
      else if (type == 'ttv-channel') {
        chatFrame.setAttribute('src', 'https://www.twitch.tv/embed/' + value + '/chat?darkpopout&parent=' + hostDomain)
      }
    }
  }
}

function updateChat() {
  var select = chatOptions

  var gridElements = Array.from(document.querySelectorAll('.grid-element'))

  while ((select.children.length - 1) < gridElements.length) {
    select.appendChild(document.createElement('option'))
  }

  while ((select.children.length - 1) > gridElements.length) {
    select.removeChild(select.lastChild)
  }

  for (var index = 0; index < gridElements.length; ++index) {
    var element = gridElements[index]
    var option = select.children[index + 1]

    var type  = element.getAttribute('type')
    var value = element.getAttribute('value')

    option.setAttribute('type', type)

    option.value = type + '=' + value
    option.textContent = crossReference[[type, value]] ?? option.value
  }
}

function resizeGrid() {
  var params = new URLSearchParams(window.location.search)
  var rows    = params.get('rows')
  var columns = params.get('columns')
  
  /* Use integer math to find a row/column multiple for evenly sized divs */
  var realHeight = Math.floor(window.innerHeight / rows)    * rows
  var realWidth  = Math.floor(window.innerWidth  / columns) * columns
  
  if (global.chatEnabled) {
    chatWidth = Math.floor(window.innerWidth * 0.20)
    realWidth -= chatWidth;
    
    chat.style.width = chatWidth + 'px'
    chat.style.height = window.innerHeight + 'px'
  }
  
  /* Using px avoids alignment issues */
  /* Using percents can cause tiny gaps due to rounding */
  grid.style.width  = realWidth  + 'px'
  grid.style.height = realHeight + 'px'
}

function populateOverlayHelp() {
  listElement = null
  
  var escapeDiv = document.createElement('div')
  escapeDiv.textContent = ('Esc to close')
  overlayHelp.append(escapeDiv)
  
  var helpText = ""
  for (var [key, value] of Object.entries(getActions())) {
    var helpDiv = document.createElement('div')
    helpDiv.textContent = key + ' - ' + value[0] + '\r\n'
    helpDiv.setAttribute('title', value[2])
    overlayHelp.append(helpDiv)
  }
}

function populateOverlayList() {
  listElement = null
  
  var escapeDiv = document.createElement('div')
  escapeDiv.textContent = ('Esc to close')
  overlayList.append(escapeDiv)
}

function updateOverlayListElements() {
  updateOverlayListGroup(overlayList, global.groups)
}

function updateOverlayListGroup(element, group) {
  /* Ensure each subgroup is represented */
  for (var [name, subgroup] of Object.entries(group.groups)) {
    /* Search for an existing details child with a same-named summary */
    var updatedDetails = null
    for (var subgroupDetails of element.children) {
      if (subgroupDetails.tagName == 'DETAILS' && subgroupDetails.name == name) {
        updatedDetails = subgroupDetails
        break
      }
    }

    /* If one wasn't found, add one */
    if (updatedDetails == null) {
      updatedDetails = addOverlayListSubgroup(element, name)
    }
    
    /* Recurse over the group */
    updateOverlayListGroup(updatedDetails, subgroup)
  }

  for (var [name, streamer] of Object.entries(group.streamers)) {
    /* Search for an existing same-named div */
    var updatedStreamer = null
    for (var streamerElement of element.children) {
      if (streamerElement.tagName == 'DIV' && streamerElement.name == name) {
        updatedStreamer = streamerElement
        break
      }
    }

    if (updatedStreamer == null) {
      updatedStreamer = addOverlayListStreamer(element, streamer)
      updatedStreamer.classList.add('overlayListElement')
    }

    updateOverlayListStreamer(updatedStreamer, name)
  }
}

function updateOverlayListStreamer(listElement, name) {
  var streamer = global.streamers[name]

  var status = streamer.status ?? null
  if (status) {
    var dTime = (status.startTime ?? 0) - (new Date().getTime() / 1000)
    var lateTime = 4 * 60 * 60 /* Treat as offline if longer than 4 hours til start time */

    var statusType = status.status == 'upcoming' && (dTime > lateTime) ? 'offline' : status.status

    listElement.setAttribute('status', statusType)
    listElement.lastChild.textContent = streamer.name + ' ' + status.title
    listElement.lastChild = status.type
    listElement.lastChild = status.value

    crossReference[[status.type, status.value]] = listElement.textContent
  }
}

function addOverlayListSubgroup(element, name) {
  var details = document.createElement('details')
  details.name = name

  var summary = details.appendChild(document.createElement('summary'))
  summary.textContent = name
  element.append(details)

  return details
}

function addOverlayListStreamer(element, streamer) {
  var div = document.createElement('div')

  var child = null
  var template = document.createElement('template')

  for (var stream of streamer.streams) {
    if (stream.type == 'yt-channel') {
      template.innerHTML = '<span>[YT]</span>'
    } else if (stream.type == 'ttv-channel') {
      template.innerHTML = '<span>[TTV]</span>'
    } else {
      template.innerHTML = null
    }

    if (template.innerHTML) {
      child = div.appendChild(template.content.firstChild)
      addOverlayStreamerInteraction(child, stream.type, stream.value)
    }
  }

  div.alias = streamer.aliases[0]
  template.innerHTML = '<span>' + streamer.name + '</span>'
  child = div.appendChild(template.content.firstChild)
  addOverlayStreamerInteraction(child, 'alias', streamer.aliases[0])

  div.name = streamer.name    
  
  return element.appendChild(div)
}

function addOverlayStreamerInteraction(element, type, value) {
  element.type = type
  element.value = value

  element.onclick = function(event){ 
    setElement(listElement, event.target.type, event.target.value, [])

    toggleOverlayInput(false)
    
    /* Refresh automatic removal */
    setOverlayAutoRemoveTimer()
  }

  element.onmousedown = function(event) { 
    /* Needed to allow dragging from list elements without moving the list */
    event.stopPropagation()
    /* Treat this as an interaction to prevent the overlay from timing out */
    setOverlayAutoRemoveTimer()
    /* Disable interactions to allow dropping onto iframes */
    disableStreamInteractions()
  }
  element.onmouseup = resetInteractions

  /* Allow the element to be dragged */
  element.setAttribute('draggable', true)
  element.ondragstart = function(event) {
    /* Use the stream data as the drop data */
    event.dataTransfer.setData('text/plain', event.target.type + '=' + event.target.value)
  }
  element.ondragend = resetInteractions

  return element
}

function populateOverlaySettings() {
  /* Disable key presses while the forms have focus */
  overlaySettings.addEventListener('focusin', function() { setKeyEvents(false) })
  overlaySettings.addEventListener('focusout', function() { setKeyEvents(true) })
  
  var div = overlaySettings.appendChild(document.createElement('div'))
  overlaySettings.lastChild.textContent = 'Esc to close'
  
  var form = overlaySettings.appendChild(document.createElement('form'))
  form.onsubmit = function(e) { e.preventDefault() }
  
  backendInput = addOverlaySetting(form, 'Backend', 'checkbox', connectBackend)

  backendLocationSetting = addOverlaySetting(form, 'Backend Location', 'text', updateBackendLocation)
  backendLocationSetting.value = backendLocation

  backendRestartSetting = addOverlaySetting(form, 'Restart Backend', 'button', null)
  backendRestartSetting.addEventListener('click', requestBackendRestart)

  backendUpdateSetting = addOverlaySetting(form, 'Update Backend', 'button', null)
  backendUpdateSetting.addEventListener('click', requestBackendAutoUpdate)
  
  overlayTimeoutInput = addOverlaySetting(form, 'Overlay Timeout', 'number', function(e) { overlayTimeoutSeconds = e.target.value; setOverlayAutoRemoveTimer() })
  overlayTimeoutInput.value = overlayTimeoutSeconds = 0
}

function populateOverlayMod() {
  /* Disable key presses while the forms have focus */
  overlayMod.addEventListener('focusin', function() { setKeyEvents(false) })
  overlayMod.addEventListener('focusout', function() { setKeyEvents(true) })
  
  var div = overlayMod.appendChild(document.createElement('div'))
  overlayMod.lastChild.textContent = 'Esc to close'
  
  var form = overlayMod.appendChild(document.createElement('form'))
  form.onsubmit = function(e) { e.preventDefault() }

  global.mod = {}
  global.mod.name = addOverlaySetting(form, 'Name', 'text', null)
  global.mod.group = addOverlaySetting(form, 'Group', 'text', null)
  global.mod.stream1 = addOverlaySetting(form, 'Stream', 'text', null)
  global.mod.stream2 = addOverlaySetting(form, 'Stream', 'text', null)
  global.mod.aliases = addOverlaySetting(form, 'Aliases', 'text', null)

  var accept = global.mod.accept = addOverlaySetting(form, null, 'button', null)
  accept.value = 'Add Streamer'
  accept.onclick = addStreamer

  var dump = addOverlaySetting(form, null, 'button', null)
  dump.value = 'Dump JSON'
  dump.onclick = dumpStreamersToPrompt

  var load = addOverlaySetting(form, null, 'button', null)
  load.value = 'Load JSON'
  load.onclick = loadStreamersFromPrompt
}

function dumpStreamersToPrompt() {
  var values = Object.values(global.streamers)
  console.log(values)
  prompt('JSON Dump of Streamers', JSON.stringify(values, null, 4))
}

function loadStreamersFromPrompt() {
  var load = prompt()
  if (load) {
    global.streamers = new Map()
    global.aliases = new Map()
    global.groups = { groups : {}, streamers : new Map() }

    updateStreamers(JSON.parse(load))

    if (backendSocket.readyState == WebSocket.OPEN) {
      backendSocket.close()
      setTimeout(() => {
        connectBackend()
      }, 1000);
    }
  }
}

function toggleOverlayMod() {
  toggleOverlay(overlayMod)
  return true
}

function addStreamer() {
  var streamer = {
    name : '',
    groups : [],
    streams : [],
    aliases : [],
  }

  streamer.name = global.mod.name.value
  if (global.streamers[streamer.name]) {
    alert(streamer.name + ' already exists!')
    return
  }

  streamer.groups = [global.mod.group.value.split(',').map(e => e.trim()).filter(e => e)]

  var [type, value, extras] = checkReferers(global.mod.stream1.value)
  if (type && value) {
    streamer.streams.push({
      type : type,
      value : value,
    })
  }

  var [type, value, extras] = checkReferers(global.mod.stream2.value)
  if (type && value) {
    streamer.streams.push({
      type : type,
      value : value,
    })
  }

  streamer.aliases =  global.mod.aliases.value.split(',').map(e => e.trim().toLowerCase()).filter(e => e)

  updateStreamers([streamer])
  
  backendSocket.send(JSON.stringify({
    messageType : 'initUpdate',
    version : supportedBackendVersion,
    streamer : streamer,
  }))
}

function addOverlaySetting(form, name, type, fun) {
  var label = form.appendChild(document.createElement('label'))
  label.textContent = name
  
  var input = form.appendChild(document.createElement('input'))
  input.type = type
  input.onchange = fun
  
  /* Leave checkboxes at default width */
  if (input.type != 'checkbox') {
    input.style.width = '100px'
  }
  
  /* Line break after each input option */
  form.appendChild(document.createElement('br'))
  
  return input
}

function setKeyEvents(enabled) {
  if (enabled) {
    window.onkeydown = myKeyDown
    window.onkeyup = myKeyUp
  } else {
    window.onkeydown = null
    window.onkeyup = null
  }
}

function allowStreamInteractions() {
  document.querySelectorAll('.grid-overlay').forEach(function(frame) {
    frame.classList.add('disabled')
  })

  document.querySelectorAll('iframe').forEach(function(e) {
    e.blur()
  })

  if (global.interactTimeout) {
    clearTimeout(global.interactTimeout)
  }
  global.interactTimeout = setTimeout(disableStreamInteractions, 4000);

  return true
}

function disableStreamInteractions() {
  document.querySelectorAll('.grid-overlay').forEach(function(frame) {
    frame.classList.remove('disabled')
  })
}

function resetInteractions() {
  /* Reset the global state used for tracking keys/clicks */
  lastKey = null
  lastElementClicked = null
  firstElementKey = null
  
  /* Clear the text */
  document.querySelectorAll('.grid-overlay :first-child').forEach(function(text) {
    text.textContent = ''
  })
}

function getActions() {
  /* Functions here must return true/false */
  /* Returning true will clear the interactions currently being tracked */
  /* Returning false should only be used if further selections are needed */
  /* e.g. Move/Copy require multiple inputs */
  var dict = {
    'h'  : ['help',          toggleOverlayHelp,       'Toggles the help overlay'],
    'l'  : ['list',          toggleOverlayList,       'Toggles the stream list overlay'],
    's'  : ['switch',        setElementFromPrompt,    'Prompts to select a new stream'],
    'n'  : ['next',          nextElement,             'Skips to the next stream within the current group'],
    'p'  : ['previous',      previousElement,         'Skips to the previous stream within the current group'],
    'j'  : ['next+',         nextGlobalElement,       'Skips to the next stream, regardless of current group'],
    'k'  : ['previous+',     previousGlobalElement,   'Skips to the previous stream, regardless of current group'],
    'd'  : ['delete',        removeElement,           'Removes the stream'],
    'm'  : ['move',          moveElement,             'Moves the stream between locations'],
    'c'  : ['chat',          toggleChat,              'Toggles the chat panel'],
    'r'  : ['reload',        reloadElement,           'Reloads the stream'],
    'f'  : ['fullscreen',    toggleFullscreen,        'Toggles fullscreen'],
    'a'  : ['adjust layout', adjustLayout,            'Prompts to select new row/column inputs'],
    'b'  : ['backend',       connectBackend,          'Connects to a background service for fetching video data'],
    '`'  : ['settings',      toggleOverlaySettings,   'Toggles the settings menu'],
    '\\' : ['modify list',   toggleOverlayMod,        'Toggles the window for modifying the streamer list'],
    ' '  : ['interact',      allowStreamInteractions, 'Disable page interactions and allow access to the stream']
  }
  return dict
}

function setElementFromClick(element) {
  /* Do nothing if no click action */
  if (!lastKey) {
    return
  }

  /* Find an action, otherwise just prompt for a new embed */
  var action = setElementFromPrompt
  if (lastKey in getActions()) {
    action = getActions()[lastKey][1]
  }
  
  /* Save the last element clicked to use with the action */
  lastElement = lastElementClicked
  
  /* Set the last element clicked now in case the action needs to change it */
  lastElementClicked = element
  
  /* Do something with the elements, extra arguments will be discarded naturally */
  if (action(element, lastElement)) {
    /* Action succeeded when true, reset interactions */
    resetInteractions()
  }
  
  /* Don't reset everything after a click, just the element from a key press */
  firstElementKey = null
}

function setElementFromKey(element, key) {
  /* Find an action, otherwise do nothing */
  if (key in getActions()) {
    /* Do something with the elements, extra arguments will be discarded naturally */
    if (getActions()[key][1](element, firstElementKey)) {
      /* Action succeeded when true, reset interactions */
      resetInteractions()
    }
  }
}

function setElementFromDrop(element, event) {
  /* Prevent the default action that reloads the page with the dropped link */
  event.preventDefault()
  
  /* Extract the text from the drop event */
  setElementFromString(element, event.dataTransfer.getData('text/plain'))
}

function setOverlayAutoRemoveTimer() {
  /* Reset any ongoing timeout before starting a new one*/
  if (typeof overlayTimeout != 'undefined') {
    clearTimeout(overlayTimeout)
  }
  
  if (overlayTimeoutSeconds > 0) {
    overlayTimeout = setTimeout(hideOverlays, overlayTimeoutSeconds * 1000)
  }
  return true
}

function setElementFromPrompt(element) {
  if (element && element.classList.contains('grid-element')) {
    listElement = element
    toggleOverlayInput(true)
  }
  return true
}

function setElementFromString(element, str) {
  if (element && element.classList.contains('grid-element')) {
    var [type, value, extras] = checkReferers(str)
    setElement(element, type, value, extras)
  }
}

function removeElement(element) {
  if (element && element.classList.contains('grid-element')) {
    grid.replaceChild(makeBlankElement(), element)
    
    /* Element was modified, update the URL */
    updateURL()
  }
  
  return true
}

function reloadElement(element) {
  if (element && element.classList.contains('grid-element')) {
    /* Reuse the existing data from the element */
    setElement(element, element.type, element.value, element.extras)
    return true
  }
}

function moveElement(currentElement, lastElement) {
  if (currentElement && currentElement.classList.contains('grid-element') && lastElement && lastElement.classList.contains('grid-element')) {
    if (currentElement != lastElement) {
      /* Save the last element */
      var lastType   = lastElement.type
      var lastValue  = lastElement.value
      var lastExtras = lastElement.extras
      
      /* Set last element from the current */
      setElement(lastElement, currentElement.type, currentElement.value, currentElement.extras)
      
      /* Set the current element from the last */
      setElement(currentElement, lastType, lastValue, lastExtras)
    }
    return true
  }
  return false
}

function copyElement(currentElement, lastElement) {
  if (currentElement && currentElement.classList.contains('grid-element') && lastElement && lastElement.classList.contains('grid-element')) {
    if (currentElement != lastElement) {
      /* Set the element using the data from the last element */
      setElement(currentElement, lastElement.type, lastElement.value, lastElement.extras)
    }
    return true
  }
  return false
}

function myKeyDown(event) {
  var key = event.key.toLowerCase()
  
  /* Disallow any modifiers that aren't shift */
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return
  }
  
  /* Special case for escape to close the overlay */
  if (key == 'escape') {
    hideOverlays()
    resetInteractions()
    return
  }
  
  if (lastKey != key) {
    /* Save the pressed key */
    lastKey = key
    
    /* Grab whatever is underneath when an action is started */
    firstElementKey = document.querySelector('.grid-element:hover')
    
    /* Disable interactions via css to allow for click events to reach the parent div */
    disableStreamInteractions()
    
    /* Add the overlay text for the active action */
    var content = ''
    if (lastKey in getActions()) {
      content = getActions()[lastKey][0] ?? ''
    }

    document.querySelectorAll('.grid-overlay :first-child').forEach(function(overlay) {
      overlay.textContent = content
    })
  }
}

function myKeyUp(event) {
  var key = event.key.toLowerCase()
  
  /* Ignore release events that weren't the first key pressed */
  if (key == lastKey) {
    /* Complete the action with whatever is under the mouse */
    setElementFromKey(document.querySelector('.grid-element:hover'), lastKey)
    
    lastKey = null
  }
}

function findAdjacentEntry(list, entry, offset) {
  var divList = []
  for (var element of list) {
    if (element.tagName == 'DIV') {
      /* Add the current entry */
      if (element == entry) {
        divList.push(element)
        continue
      }

      /* Add any entries that aren't offline */
      if (element.getAttribute('status') != 'offline') {
        divList.push(element)
        continue
      }

      if (element.getAttribute('status') == null) {
        divList.push(element)
        continue
      }
    }
  }

  var elementIndex = 0
  for (var element of divList) {
    if (element == entry) {
      /* Add the array length to help with negative offsets */
      return divList[(elementIndex + divList.length + offset) % divList.length].name
    }
    ++elementIndex
  }
  return null
}

function setChannelNameTimer(element, name) {
  /* Set the name */
  element.firstChild.lastChild.textContent = name.charAt(0).toUpperCase() + name.slice(1)
  
  /* Clear any existing timers */
  if (element.channelNameTimeout != null) {
    clearTimeout(element.channelNameTimeout)
  }
  
  /* Create a new one remove the text */
  element.channelNameTimeout = setTimeout(
  function() {
    element.firstChild.lastChild.textContent = ''
  }, 1000
  )
}

function findStreamer(type, value) {
  if (type == 'alias') {
    return global.aliases[value]
  }

  for (var streamer of Object.values(global.streamers)) {
    if (streamer.status && streamer.status.type == type && streamer.status.value == value) {
      return streamer
    }

    for (var stream of streamer.streams) {
      if (stream.type == type && stream.value == value) {
        return streamer
      }
    }
  }

  return null
}

function findListElementFromGridElement(element) {
  var streamer = null
  streamer = streamer ?? findStreamer(element.type, element.value)
  streamer = streamer ?? findStreamer(element.getAttribute('type'), element.getAttribute('value'))

  if (streamer) {
    for (var listElement of document.querySelectorAll('.overlayListElement')) {
      if (streamer.name == listElement.name) {
        return listElement
      }
    }
  }

  return null
}

function nextElement(element) {
  if (element && element.classList.contains('grid-element')) {
    var listElement = findListElementFromGridElement(element)

    var name = null
    if (listElement) {
      name = findAdjacentEntry(listElement.parentElement.children, listElement, 1)
    }

    /* Default to the first streamer if nothing can be found */
    name = name ?? Object.values(global.streamers)[0].name

    setElementFromString(element, global.streamers[name].aliases[0])
    setChannelNameTimer(element, name)
  }
  return true
}

function previousElement(element) {
  if (element && element.classList.contains('grid-element')) {
    var listElement = findListElementFromGridElement(element)

    var name = findAdjacentEntry(
      overlayList.querySelectorAll('.overlayListElement'), listElement, -1
    )

    /* Default to the first streamer if nothing can be found */
    name = name ?? Object.values(global.streamers)[0].name

    setElementFromString(element, global.streamers[name].aliases[0])
    setChannelNameTimer(element, name)
  }
  return true
}

function nextGlobalElement(element) {
  if (element && element.classList.contains('grid-element')) {
    var listElement = findListElementFromGridElement(element)

    var name = findAdjacentEntry(
      overlayList.querySelectorAll('.overlayListElement'), listElement, 1
    )

    /* Default to the first streamer if nothing can be found */
    name = name ?? Object.values(global.streamers)[0].name

    setElementFromString(element, global.streamers[name].aliases[0])
    setChannelNameTimer(element, name)
  }
  return true
}

function previousGlobalElement(element) {
  if (element && element.classList.contains('grid-element')) {
    var listElement = findListElementFromGridElement(element)

    var name = findAdjacentEntry(
      overlayList.querySelectorAll('.overlayListElement'), listElement, -1
    )

    /* Default to the first streamer if nothing can be found */
    name = name ?? Object.values(global.streamers)[0].name

    setElementFromString(element, global.streamers[name].aliases[0])
    setChannelNameTimer(element, name)
  }
  return true
}

function toggleFullscreen(element) {
  if (element && element.classList.contains('grid-element')) {
    /* Only fullscreen iframes */
    if (document.fullscreenElement == null) {
      if (element.lastChild.tagName.toLowerCase() == 'iframe') {
        element.lastChild.requestFullscreen()
      }
    }
    else {
      document.exitFullscreen()
    }
  }
  return true
}

function adjustLayout() {
  /* Recreate the grid and prompt for new row/column inputs */
  createGrid(true)
  
  /* Ensure the overlays are hidden to clear out lingering references to elements */
  hideOverlays()
  
  return true
}

function toggleOverlay(overlay) {
  /* Toggle the element passed in, if it exists */
  if (overlay) {
    if (overlay.style.display == 'none') {
      /* Reposition the window when it gets shown */
      overlay.style.display = 'inline-block'
      overlay.style.top = '2%'
      overlay.style.left = '2%'
      
      /* Refresh automatic removal */
      setOverlayAutoRemoveTimer()
    } else {
      overlay.style.display = 'none'
    }
  }
}

function toggleOverlays(overlay) {
  /* Disable everything */
  for (var element of document.querySelectorAll('.overlay')) {
    element.style.display = 'none'
  }
  
  /* Toggle the element passed in */
  toggleOverlay(overlay)
}

function toggleOverlayHelp() {
  toggleOverlays(overlayHelp)
  return true
}

function toggleOverlayList(element) {
  toggleOverlays(overlayList)
  listElement = element
  return true
}

function toggleOverlaySettings(element) {
  toggleOverlays(overlaySettings)
  return true
}

function hideOverlays() {
  /* Reset the overlay elements */
  listElement = null
  toggleOverlays(null)
  return true
}

function toggleChat(e) {
  global.chatEnabled = !global.chatEnabled

  if (global.chatEnabled) {
    chat.removeAttribute('style')
  } else {
    chat.setAttribute('style', 'display: none')
  }

  resizeGrid()

  return true
}

function updateBackendLocation(e) {
  backendLocation = e.target.value
  updateURL()
}

function requestBackendData(sock) {
  if (sock.readyState != WebSocket.CLOSED) {
    var initData = Object.values(global.streamers)
    initData = initData.length > 0 ? initData : JSON.parse(streamerData.innerHTML)

    sock.send(JSON.stringify({
      messageType : 'init',
      version : supportedBackendVersion,
      initData : initData,
    }))

    /* Repeat this call every minute */
    setTimeout(() => {
      requestBackendData(sock)
    }, 1 * 60 * 1000)
  }
}

function connectBackend() {
  if (typeof backendSocket == 'undefined' || backendSocket.readyState == WebSocket.CLOSED) {
    backendSocket = new WebSocket('ws://' + backendLocation)
    backendSocket.onopen = function() { requestBackendData(backendSocket) }
    backendSocket.onmessage = processBackendResponse
    
    /* Set up the backend error message on second connection attempt */
    /* This prevents spurious errors if the backend failed on initial page load */
    if (typeof firstAttempt == 'undefined') {
      firstAttempt = true
    } else {
      firstAttempt = false
    }
    
    /* Update the settings menu checkbox */
    backendInput.checked = true
    backendSocket.onclose = function() { backendInput.checked = false }
    backendSocket.onerror = function() { 
      initializePage()
      if (firstAttempt == false) {
        alert('Backend encountered a problem connecting to: ' + backendLocation)
      }
    }
  } else {
    backendSocket.close()
    
    /* Update the settings menu checkbox */
    backendInput.checked = false
  }

  setTimeout(function() {
    if (backendSocket.readyState != WebSocket.OPEN) {
      console.log('Too slow')
      backendSocket.close()
    }
  }, 500)

  return true
}

function requestBackendRestart() {
  backendSocket.send(JSON.stringify({
    messageType : 'restart',
    version : supportedBackendVersion,
    restart : true
  }))
}

function requestBackendAutoUpdate() {
  backendSocket.send(JSON.stringify({
    messageType : 'autoUpdate',
    version : supportedBackendVersion,
    autoUpdate : true
  }))
}

function processBackendResponse(response) {
  var message = JSON.parse(response.data)

  if (message.messageType == 'init') {
    processInitMessage(message)
  } else if (message.messageType == 'update') {
    processUpdateMessage(message)
  }
}

function checkMessageVersion(message) {
  var version = message.version

  var sameVersion = true
  for (var i = 0; i < 3; ++i) {
    if (version[i] != supportedBackendVersion[i]) {
      sameVersion = false
    }
  }

  /* Only update if the versions match, otherwise notify the user */
  /* TODO: Proper backwards compatibility */ 
  if (!sameVersion) {
    alert('Your backend is out of date. Please update from the settings menu.')
  }

  return sameVersion
}

function processInitMessage(init) {
  if (checkMessageVersion(init)) {
    initializePage(init.initData)
  } else {
    initializePage()
  }
}

function processUpdateMessage(update) {
  /* Search for the updated streamer */
  var updatedStreamer = global.streamers[update.name] ?? null

  /* Add a new streamer if none was found */
  if (updatedStreamer == null) {
    updatedStreamer = {
      name : update.name,
      groups : [],
      videos : [],
    }
    global.streamers[update.name] = updatedStreamer
  }

  /* Update each video in the message */
  for (var video of update.videos) {
    var foundVideo = false
    for (var stream of updatedStreamer.streams) {
      if (video.type == stream.type && video.value == stream.value) {
        foundVideo = true
        break
      }
    }

    if (!foundVideo) {
      updatedStreamer.streams.push({
        type : video.type,
        value : video.value,
      })
    }
  }

  for (var video of update.videos) {
    if (video.status == 'live') {
      updatedStreamer.status = video
      return
    }
  }

  for (var video of update.videos) {
    if (video.status == 'upcoming') {
      updatedStreamer.status = video
      return
    }
  }

  updatedStreamer.status = {
    status : 'offline'
  }
}

function maintainGridElement(element) {
  var type = element.type
  var value = element.value

  for (var streamer of Object.values(global.streamers)) {
    for (var stream of streamer.streams) {
      if (stream.type != type || stream.value != value) {
        continue
      }

      if ('status' in streamer && streamer.status.status == 'offline') {
        removeElement(element)
      } else if ('status' in streamer && streamer.status.status != 'offline') {
        element.type = streamer.status.type
        element.value = streamer.status.value
      }
      
      return
    }
  }
}

function maintainVideoElements() {
  for (var element of document.querySelectorAll('.grid-element')) {
    maintainGridElement(element)
  }

  updateURL()
  updateChat()
}

function makeDraggable(element) {
  element.onmousedown = function(event) {
    dragMouseDown(element, event)
  }
}

function dragMouseDown(element, event) {
  /* Left mouse only */
  if (event.button == 0) {
    /* Disable interactions via css to allow for keep dragging smooth */
    disableStreamInteractions()
    
    dragStartX = event.clientX
    dragStartY = event.clientY
    
    window.onmouseup = function(event) {
      dragMouseUp(element, event)
    }
    window.onmousemove = function(event) {
      dragMouseMove(element, event)
    }
  }
  
  /* If an overlay is manipulated, refresh automatic removal */
  if (element.classList.contains('overlay')) {
    setOverlayAutoRemoveTimer()
  }
}

function dragMouseUp(element, event) {
  /* Left mouse only */
  if (event == null || event.button == 0) {
    /* Allow interactions again */
    resetInteractions()
    
    window.onmouseup = null
    window.onmousemove = null
  }
  
  /* If an overlay is manipulated, refresh automatic removal */
  if (element.classList.contains('overlay')) {
    setOverlayAutoRemoveTimer()
  }
}

function dragMouseMove(element, event) {
  var dragX = event.clientX - dragStartX
  var dragY = event.clientY - dragStartY
  
  var box = element.getBoundingClientRect()
  
  /* Terrible looking clamp code*/
  /* Ensures the element stays entirely within the window */
  dragX = Math.min(Math.max(dragX, -box.left), window.innerWidth - box.right)
  dragY = Math.min(Math.max(dragY, -box.top), window.innerHeight - box.bottom)
  
  element.style.left = (100 * (element.offsetLeft + dragX) / window.innerWidth)+ '%'
  element.style.top  = (100 * (element.offsetTop  + dragY) / window.innerHeight)+ '%'
  
  dragStartX = event.clientX
  dragStartY = event.clientY
  
  /* If an overlay is manipulated, refresh automatic removal */
  if (element.classList.contains('overlay')) {
    setOverlayAutoRemoveTimer()
  }
  
  /* Prevent text selection while dragging */
  event.preventDefault()
}

function updateStreamers(streamerList) {
  for (var streamer of streamerList) {
    global.streamers[streamer.name] = global.streamers[streamer.name] ?? streamer

    /* Populate list of streamers by name */
    for (var alias of streamer.aliases) {
      global.aliases[alias] = global.aliases[alias] ?? streamer
    }
    
    for (var groupSet of streamer.groups) {
      /* Create nested groups */
      var group = global.groups
      for (var subgroup of groupSet) {
        group = group.groups[subgroup] = group.groups[subgroup] ?? { groups : new Map(), streamers : new Map() }
      }
      
      /* Add streamer if it doesn't exist */
      group.streamers[streamer.name] = group.streamers[streamer.name] ?? streamer
    }
  }
}

function toggleOverlayInput(state) {
  if (state == true) {
    /* Want to show AND reposition AND clear the input AND focus AND clear the results*/
    overlayInput.style.display = 'inline-block';
    overlayInput.style.top = '30%'
    overlayInput.style.left = '50%'
    inputText.value = ''
    inputText.focus()

    /* Also show a blur over the entire window */
    overlayBlur.style.display = 'inline-block';

    while (inputList.firstChild) {
      inputList.removeChild(inputList.firstChild)
    }

  } else if (state == false) {
    overlayInput.style.display = 'none';
    overlayBlur.style.display = 'none';
    inputText.value = ''
  }
}

function populateOverlayInput() {
  overlayInput.addEventListener('focusin', function() { setKeyEvents(false) })
  overlayInput.addEventListener('focusout', function() { setKeyEvents(true) })

  inputText.addEventListener('keypress', function (e) {
    if (e.key == 'Enter') {
      if (inputList.children.length > 0)
      {
        e.preventDefault()
        setElementFromString(listElement, inputList.children[0].alias)
        inputText.blur()
        toggleOverlayInput(false)
      }
      else
      {
        e.preventDefault()
        console.log(inputText)
        setElementFromString(listElement, inputText.value)
        inputText.blur()
        toggleOverlayInput(false)
      }
    }
  })

  inputText.addEventListener('keydown', function (e) {
    if (e.key == 'Escape') {
      e.preventDefault()
      inputText.blur()
      toggleOverlayInput(false)
    }
  })

  inputText.addEventListener('focusout', function() {
    if (inputText.value.trim() == '') {
      toggleOverlayInput(false)
    }
  })

  inputText.oninput = function (e) { 
    while (inputList.firstChild) {
      inputList.removeChild(inputList.firstChild)
    }

    var searchTerms = e.target.value.split(' ').map(e => e.trim().toLowerCase()).filter(e => e)
    if (searchTerms) {
      var channelSet = new Set()
      for (var [name, channel] of Object.entries(global.streamers)) {
        /* Start with the name as filter criteria */
        var infoList = name.split(' ')

        /* Add any aliases */
        for (var alias of channel.aliases) {
          infoList.push(alias)
        }

        /* Add any groups */
        for (var group of channel.groups) {
          for (var subgroup of group) {
            infoList.push(subgroup)
          }
        }

        infoList = infoList.map(e => e.trim().toLowerCase())

        /* If online status is available, skip offline streamers */
        /* Otherwise, take anything where the beginning matches */
        var status = channel?.status?.status ?? 'live'
        if (status == 'live') {
          var matchesTerms = true
          for (var term of searchTerms) {
            var validInfo = false
            for (var info of infoList) {
              if (info.startsWith(term)) {
                validInfo = true
                break
              }
            }
            
            if (!validInfo) {
              matchesTerms = false
              break
            }
          }

          if (matchesTerms) {
            channelSet.add(channel)
          }
        }
      }

      /* Add using the same logic as the list */
      for (var channel of channelSet) {
        addOverlayListStreamer(inputList, channel)
      }
    }
  }
}

function setup() {
  /* Key events only work if an iframe doesn't have focus */
  window.onresize = resizeGrid
  window.onkeydown = myKeyDown
  window.onkeyup = myKeyUp
  window.onfocus = resetInteractions
  window.onblur = function() { global.ignoreNextGesture = true; disableStreamInteractions() } /* Ignore first gesture when focus has been lost */
  
  /* Temporary workaround, set globals here */
  global = {}
  lastKey = null
  global.streamers = new Map()
  global.aliases = new Map()
  global.groups = { groups : {}, streamers : new Map() }
  global.chatEnabled = false
  global.ignoreNextGesture = false

  overlayTimeoutSeconds = 0
  backendLocation = new URLSearchParams(window.location.search).get('backend') || 'localhost:8080'
  crossReference = new Map()
  alreadyWarnedVersion = false
  
  populateOverlayInput()
  populateOverlayHelp()
  populateOverlayList()
  populateOverlaySettings()
  populateOverlayMod()
  populateChat()

  makeDraggable(overlayHelp)
  makeDraggable(overlayList)
  makeDraggable(overlaySettings)
  makeDraggable(overlayMod)
  makeDraggable(overlayInput)

  connectBackend()
}

function initializePage(streamerList) {
  global.initialized = global.initialized ?? false

  if (!global.initialized) {
    global.initialized = true

    if (streamerList && streamerList.length > 0) {
      console.log('Loading from server!')
      updateStreamers(streamerList)
      finishInitializing()
    } else {
      fetchStreamers()
      .then(() => finishInitializing())
    }
  }
}

function finishInitializing()
{
  createGrid()
  resetInteractions()

  updateOverlayListElements()
  setInterval(updateOverlayListElements, 1000)

  setInterval(maintainVideoElements, 1000)
}

function fetchStreamers() {
  return fetchStreamer(0, defaultStreamers)
}

function fetchStreamer(i, list) {
  return i < list.length
  ? fetch('streamers/' + list[i] + '.json')
    .then(response => response.json())
    .then(streamers => updateStreamers(streamers))
    .then(() => fetchStreamer(i + 1, list))
  : Promise.resolve()
}

defaultStreamers = [
  'HoloEN',
  'HoloJP',
  'HoloID',
  'NijiEN',
  'VOMS',
  'PhaseConnect',
  'PRISM',
  'Tsunderia',
  '4V',
  'AkioAIR',
  'VShojo',
  'VReverie',
  'Indie',
]

window.addEventListener('load', setup)