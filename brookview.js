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

const referFuns = [
  referName,
  referYoutube,
  referTwitch,
]

const embedFuns = { 
  'blank'      : null,
  'name'       : embedName,
  'ytVideo'    : embedYoutubeVideo,
  'ytChannel'  : embedYoutubeChannel,
  'ytHandle'   : embedYoutubeHandle,
  'ttvVideo'   : embedTwitchVideo,
  'ttvChannel' : embedTwitchChannel,
}

function referName(str) {
  return ['name', str]
}

function referYoutube(str) {
  /* Try to treat the string as a URL */
  var url = new URL(str)
  var pathPieces = url.pathname.split('/')

  /* Youtube video link - www.youtube.com/watch?v=id&t=# */
  if (url.host.includes('www.youtube.com') && url.searchParams.has('v')) { 
    var timeStamp = url.searchParams.get('t')
    var extras = timeStamp ? '&start=' + timeStamp : ''
    return ['ytVideo', url.searchParams.get('v'), extras]
  }

  /* Youtube handle - www.youtube.com/@Handle */
  if (url.host.includes('www.youtube.com') && pathPieces[1].startsWith('@')) {
    return ['ytHandle', pathPieces[1]]
  }

  /* Youtube old handle - www.youtube.com/c/Handle */
  if (url.host.includes('www.youtube.com') && pathPieces[1] == 'c') {
    return ['ytOldHandle', pathPieces[2]]
  }

  /* Youtube channel id - www.youtube.com/channel/ChannelId */
  if (url.host.includes('www.youtube.com') && pathPieces[1] == 'channel') { 
    return ['ytChannel', pathPieces[2]]
  }

  /* Youtube video link - youtu.be/id */
  if (url.host.includes('youtu.be')) { 
    var timestamp = url.searchParams.get('t')
    var extras = timestamp ? '&start=' + timestamp : ''
    return ['ytVideo', pathPieces[1], extras]
  }

  return null
}

function referTwitch(str) {
  /* Start with ttv- as shorthand for twitch channels */
  if (str.startsWith('ttv-')) {
    return ['ttvChannel', str.substring(4)]
  }

  /* Try to treat the string as a URL */
  var url = new URL(str)
  var pathPieces = url.pathname.split('/')

  /* Twitch VOD - www.twitch.tv/videos/id?t=# */
  if (url.host.includes('www.twitch.tv') && pathPieces[1] == 'videos') { 
    var timeStamp = url.searchParams.get('t')
    var extras = timeStamp ? '&time=' + timeStamp : ''
    return ['ttvVideo', pathPieces[2], extras]
  }
   
  /* Twitch Channel - www.twitch.tv/channel */
  if (url.host.includes('www.twitch.tv')) {
    return ['ttvChannel', pathPieces[1]]
  }

  return null
}

function embedName(value, extras) {
  var lookup = global.lookup[value]
  if (lookup) {
    if (lookup.ytChannel) {
      return embedYoutubeChannel(lookup.ytChannel)
    } else if (lookup.ytChannel) {
      return embedTwitchChannel(lookup.ttvChannel)
    }
  }
  return null
}

function embedYoutubeVideo(value, extras) {
  return 'https://www.youtube.com/embed/' + value + '?autoplay=1&mute=1' + extras
}

function embedYoutubeChannel(value) {
  return 'https://www.youtube.com/embed/live_stream?channel=' + value + '&autoplay=1&mute=1'
}

function embedYoutubeHandle(value) {
  var lookup = global.lookup.get(['ytHandle', value])
  return embedYoutubeHandle(lookup.ytChannel)
}

function embedTwitchChannel(value) {
  return 'https://player.twitch.tv/?channel=' + value + '&parent=' + hostDomain + '&autoplay=true&muted=true&height=100%&width=100%'
}

function embedTwitchVideo(value, extras) {
  return 'https://player.twitch.tv/?video=' + value + '&parent=' + hostDomain + '&autoplay=true&muted=true&height=100%&width=100%' + extras
}

function applyUntilSuccess(funs, val) {
  for (var fun of funs) {
    try {
      var result = fun(val)
      if (result) {
        return result
      }
    } catch {}
  }
  return null
}

function checkReferers(str) {
  /* Check if data is embedded in the string */
  var [type, value] = str.split('=')
  if (type in embedFuns) {
    return [type, value, []]
  }
  
  /* Try each method for something that isn't null */
  return applyUntilSuccess(referFuns, str)
}

function checkEmbeds(type, value, extras) {
  return embedFuns[type](value, extras)
}

function promptSize() {
  toggleOverlay(overlaySize)
  overlaySize.style.top = 0.2 * (window.innerHeight - overlaySize.clientHeight)+ "px"
  overlaySize.style.left = 0.5 * (window.innerWidth - overlaySize.clientWidth) + "px"
  gridSizeInputRows.focus()
}

function acceptGridSizeInput() {
  var rows = parseInt(gridSizeInputRows.value)
  var columns = parseInt(gridSizeInputCols.value)

  /* Handle errors here so that the window stays open */
  if (isNaN(rows) || isNaN(columns) || rows <= 0 || columns <= 0) {
    /* createGrid must receive positive integers */
  } else {
    createGrid(rows, columns)
  }
}

function acceptGridSizeInputKeyPress(e) {
  if (e.key == 'Enter') {
    acceptGridSizeInput()
  }
}

function createGrid(rows, columns) {
  /* Update the css to actually display a grid */
  grid.style.gridTemplateRows    = 'repeat(' + rows    + ', minmax(0, 1fr))'
  grid.style.gridTemplateColumns = 'repeat(' + columns + ', minmax(0, 1fr))'
  
  /* Add bookkeeping */
  grid.rows = rows
  grid.columns = columns

  /* Remove any existing elements */
  while (grid.firstChild) {
    grid.removeChild(grid.firstChild)
  }
  
  /* Fill in the grid using the URL */
  var params = new URLSearchParams(window.location.search)
  var totalElements = rows * columns
  params.forEach(function(value, key) {
    if (grid.children.length < totalElements) {
      if (key == 'blank' || key == 'rows' || key == 'columns') {
        /* Do nothing */
      } else if (key in embedFuns) { /* &type=value */
        var element = grid.appendChild(makeBlankElement())
        setElement(element, key, value, [])
      } else if (checkReferers(key)) { /* &string */
        var element = grid.appendChild(makeBlankElement())
        setElementFromString(element, key)
      }
    }
  })
  
  /* Pad out the grid using blank elements */
  while (grid.children.length < totalElements) {
    grid.appendChild(makeBlankElement())
  }
  
  /* Grid is created, go ahead and update the URL */
  updateURL()
  
  /* Size the grid elements correctly */
  resizeGrid()
  
  /* Ensure the overlays are hidden to clear out lingering references to elements */
  hideOverlays()

  gridSizeInputRows.value = ''
  gridSizeInputCols.value = ''
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
    
    var key = handleStreamGesture(element, event)
    myKeyDown({ key: key })

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
  /* Left mouse only */
  if (event == null || event.button == 0) {
    var key = handleStreamGesture(element, event)
    myKeyUp({ key : key })

    window.onmouseup = null
    window.onmousemove = null
    window.ontouchend = null
    window.ontouchmove = null
  }
}

function gestureMouseMove(element, event) {
  var key = handleStreamGesture(element, event)
  myKeyDown({ key: key })
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

  return key
}

function makeBlankElement() {
  var div = document.createElement('div')
  
  /* Add event listeners */
  makeGesturable(div)
  div.ondrop     = function (event) { setElementFromDrop(div, event) }
  div.ondragover = function (event) { event.preventDefault() }

  div.addEventListener('mouseenter', () => disableStreamInteractions(div))
  div.addEventListener('mouseleave', () => disableStreamInteractions(div))

  /* Prevent right-click to allow right-click to exit input box*/
  div.addEventListener('contextmenu', e => e.preventDefault())
  
  /* Add bookkeeping */
  div.classList.add('grid-element')
  div.type = 'blank'
  div.setAttribute('type', 'blank')
  
  var gridOverlay = div.appendChild(document.createElement('div'))
  gridOverlay.classList.add('grid-overlay')

  /* First child is the box/text displayed on hover */
  var gridAction = gridOverlay.appendChild(document.createElement('div'))
  gridAction.classList.add('gridAction')

  /* Second child is shown when cycling between next/prev */
  var gridStatus = gridOverlay.appendChild(document.createElement('div'))
  gridStatus.classList.add('gridStatus')

  /* Last child is the actual content */
  var content = div.appendChild(document.createElement('div'))
  content.classList.add('content')
  
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
    [element.type, element.value, element.extras] = [type, value, extras]
    /* Remove null properties */
    element.type   ? element.setAttribute('type',   element.type)   : element.removeAttribute('type')
    element.value  ? element.setAttribute('value',  element.value)  : element.removeAttribute('value')
    element.extras ? element.setAttribute('extras', element.extras) : element.removeAttribute('extras')
    
    /* Create and set up the iframe */
    var embedString = checkEmbeds(type, value, extras)
    if (embedString) {
      setIFrameContent(element, embedString)
    
      /* Element was modified, update the URL */
      updateURL()
    }
  }
}

function setIFrameContent(element, src) {
  /* Create and set up the iframe */
  var frame = document.createElement('iframe')
  frame.classList.add('content')
  frame.setAttribute('src', src)
  frame.setAttribute('allow', 'fullscreen')
  
  /* last child is the actual content */
  element.replaceChild(frame, element.querySelector('.content'))
}

function embedLink(element) {
  setIFrameContent(element, prompt())
}

function updateURL() {
  /* Do nothing if grid hasn't been created */
  if (grid.rows == null || grid.columns == null) {
    return
  }

  /* Throw away any existing parameters */
  var baseURL = window.location.href.split('?')[0]
  
  /* Add parameters for rows/columns */
  baseURL += '?rows='    + grid.rows
  baseURL += '&columns=' + grid.columns
  
  /* Add parameters for the types/value of each piece of the grid */
  document.querySelectorAll('.grid-element').forEach(function(element) {
    baseURL += element.type ? '&' + element.type : ''
    baseURL += element.value ? '=' + element.value : ''
    baseURL += element.extras ? element.extras : ''
  })
  
  /* Actually replace the URL */
  if (window.location.href != baseURL) {
    window.history.replaceState('', '', baseURL)
  }
  
  updateChat()
}

function populateChat() {
  var select = chatOptions
  select.onchange = function(event) {
    if (event.target.value == 'None') {
      chatFrame.setAttribute('src', '')
    } else {
      var [type, value] = event.target.value.split('=')
      if (type == 'ytVideo') {
        chatFrame.setAttribute('src', 'https://www.youtube.com/live_chat?v=' + value + '&embed_domain=' + hostDomain)
      }
      else if (type == 'ttvChannel') {
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
  
  /* TODO: Rework chat */
  if (chat.hasAttribute('style') == false) {
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
  global.listElement = null
  
  var escapeDiv = document.createElement('div')
  escapeDiv.textContent = ('Esc to close')
  overlayHelp.append(escapeDiv)
  
  for (var [key, action] of Object.entries(actions)) {
    var helpDiv = document.createElement('div')
    helpDiv.textContent = key + ' - ' + action.name + '\r\n'
    helpDiv.setAttribute('title', action.text)
    overlayHelp.append(helpDiv)
  }
}

function populateOverlayList() {
  global.listElement = null
  
  var escapeDiv = document.createElement('div')
  escapeDiv.textContent = ('Esc to close')
  overlayList.append(escapeDiv)
}

function updateOverlayListGroup(element, name, group) {
  /* Ensure each subgroup is represented */
  for (var subgroup of group) {
    var subgroupElement = null
    for (var child of element.children) {
      if (child.tagName == 'DETAILS' && child.name == subgroup) {
        subgroupElement = child
        break
      }
    }

    if (subgroupElement == null) {
      subgroupElement = addOverlayListSubgroup(element, subgroup)
    }

    element = subgroupElement
  }

  /* Ensure the streamer is represented */
  var streamerElement = null
  for (var child of element.children) {
    if (child.tagName == 'DIV' && child.name == name) {
      streamerElement = child
      break
    }
  }

  if (streamerElement == null) {
    streamerElement = addOverlayListStreamer(element, name)
  }

  updateOverlayListStreamer(streamerElement, name)
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

function addOverlayListStreamer(element, name) {
  var streamer = global.streamers[name]

  var div = document.createElement('div')
  div.classList.add('overlayListElement')

  var child = null
  var template = document.createElement('template')

  if (streamer.ytChannel) {
    template.innerHTML = '<span>[YT]</span>'
    child = div.appendChild(template.content.firstChild)
    addOverlayStreamerInteraction(child, 'ytChannel', streamer.ytChannel)
  }

  if (streamer.ttvChannel) {
    template.innerHTML = '<span>[TTV]</span>'
    child = div.appendChild(template.content.firstChild)
    addOverlayStreamerInteraction(child, 'ttvChannel', streamer.ttvChannel)
  }

  div.name = streamer.name
  template.innerHTML = '<span>' + streamer.name + '</span>'
  child = div.appendChild(template.content.firstChild)
  addOverlayStreamerInteraction(child, 'name', streamer.name)

  div.name = streamer.name

  if (streamer.status) {
    var status = streamer.status
    var dTime = (status.startTime ?? 0) - (new Date().getTime() / 1000)
    var lateTime = 4 * 60 * 60 /* Treat as offline if longer than 4 hours til start time */

    var statusType = status.status == 'upcoming' && (dTime > lateTime) ? 'offline' : status.status
    div.setAttribute('status', statusType)
  }
  
  return element.appendChild(div)
}

function addOverlayStreamerInteraction(element, type, value) {
  element.type = type
  element.value = value

  element.onclick = function(event){ 
    setElement(global.listElement, event.target.type, event.target.value, [])

    toggleOverlayInput(false)
  }

  element.onmousedown = function(event) { 
    /* Needed to allow dragging from list elements without moving the list */
    event.stopPropagation()

    disableStreamInteractions()
  }

  /* Allow the element to be dragged */
  element.setAttribute('draggable', true)
  element.ondragstart = function(event) {
    /* Use the stream data as the drop data */
    event.dataTransfer.setData('text/plain', event.target.type + '=' + event.target.value)
  }

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

  backendLocationSetting = addOverlaySetting(form, 'Backend Location', 'text', e => setBackendLocation(e.target.value))
  backendLocationSetting.value = getBackendLocation()
}

function populateOverlayMod() {
  var div = overlayMod.appendChild(document.createElement('div'))
  overlayMod.lastChild.textContent = 'Esc to close'
  
  var form = overlayMod.appendChild(document.createElement('form'))
  form.onsubmit = function(e) { e.preventDefault() }

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

    updateStreamers(JSON.parse(load))

    if (backendSocket.readyState == WebSocket.OPEN) {
      backendSocket.close()
      setTimeout(() => {
        connectBackend()
      }, 1000);
    }
  }
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

function allowStreamInteractions(element) {
  window.focus()
  element.firstChild.classList.add('disabled')
}

function disableStreamInteractions(element) {
  window.focus()

  if (element) {
    element.firstChild.classList.remove('disabled')
  }
}

class Action {
  constructor(name, action, text) {
    this.name = name
    this.action = action
    this.text = text
  }
}

const actions = {
  /*                Name             UpAction                                 HelpText */
  'h'  : new Action('help',          () => toggleOverlay(overlayHelp),        'Toggles the help overlay'),
  'l'  : new Action('list',          toggleOverlayList,                       'Toggles the stream list overlay'),
  's'  : new Action('switch',        setElementFromPrompt,                    'Prompts to select a new stream'),
  'n'  : new Action('next',          e => setElementRelativeToGroup(e,  1),   'Skips to the next stream within the current group'),
  'p'  : new Action('previous',      e => setElementRelativeToGroup(e, -1),   'Skips to the previous stream within the current group'),
  'j'  : new Action('next+',         e => setElementRelativeToGlobal(e, 1),   'Skips to the next stream, regardless of current group'),
  'k'  : new Action('previous+',     e => setElementRelativeToGlobal(e, -1),  'Skips to the previous stream, regardless of current group'),
  'd'  : new Action('delete',        removeElement,                           'Removes the stream'),
  'm'  : new Action('move',          moveElement,                             'Moves the stream between locations'),
  'c'  : new Action('chat',          toggleChat,                              'Toggles the chat panel'),
  'r'  : new Action('reload',        reloadElement,                           'Reloads the stream'),
  'f'  : new Action('fullscreen',    toggleFullscreen,                        'Toggles fullscreen'),
  'a'  : new Action('adjust layout', promptSize,                              'Prompts to select new row/column inputs'),
  'b'  : new Action('backend',       connectBackend,                          'Connects to a background service for fetching video data'),
  '`'  : new Action('settings',      () => toggleOverlay(overlaySettings),    'Toggles the settings menu'),
  '\\' : new Action('modify list',   () => toggleOverlay(overlayMod),         'Toggles the window for modifying the streamer list'),
  ' '  : new Action('interact',      allowStreamInteractions,                 'Disable page interactions and allow access to the stream'),
  'e'  : new Action('embed',         embedLink,                               'Embeds the target link'),
  'escape' : new Action('',          toggleOverlays,                          'Closes all overlay windows'),
}

function setElementFromDrop(element, event) {
  /* Prevent the default action that reloads the page with the dropped link */
  event.preventDefault()
  
  /* Extract the text from the drop event */
  setElementFromString(element, event.dataTransfer.getData('text/plain'))
}

function setElementFromPrompt(element) {
  if (element && element.classList.contains('grid-element')) {
    global.listElement = element
    toggleOverlayInput(true)
  }
}

function setElementFromString(element, str) {
  if (element && element.classList.contains('grid-element')) {
    var lookup = checkReferers(str)
    if (lookup) {
      var [type, value, extras] = checkReferers(str) ?? [null, null, null]
      setElement(element, type, value, extras)
    } else {
      backendDeferredCheckReferers(element, str)
    }
  }
}

function backendDeferredCheckReferers(element, str) {
  requestBackendResponse('refer', str, (response) => {
    if (response.data) {
      setElementFromString(element, response.data)
    } else {
      setElementFromPrompt(element)
    }
  })
}

function removeElement(element) {
  if (element && element.classList.contains('grid-element')) {
    grid.replaceChild(makeBlankElement(), element)
    
    /* Element was modified, update the URL */
    updateURL()
  }
}

function reloadElement(element) {
  if (element && element.classList.contains('grid-element')) {
    /* Reuse the existing data from the element */
    setElement(element, element.type, element.value, element.extras)
  }
}

function moveElement(element, firstElement) {
  if (element && element.classList.contains('grid-element') && firstElement && firstElement.classList.contains('grid-element')) {
    if (element != firstElement) {
      /* Save the key element's data */
      var [lastType, lastValue, lastExtras] = [firstElement.type, firstElement.value, firstElement.extras]
      
      /* Set key element from the passed element */
      setElement(firstElement, element.type, element.value, element.extras)
      
      /* Set the passed element from the saved data */
      setElement(element, lastType, lastValue, lastExtras)
    }
  }
}

function setCurrentAction(action, element) {
  global.currentAction = action
  global.originalElement = element

  /* Add the overlay text for the active action */
  document.querySelectorAll('.grid-overlay :first-child').forEach(function(overlay) {
    overlay.textContent = action ? action.name : ''
  })
}

function clearCurrentAction() {
  setCurrentAction(null, null)
}

function activateAction(action, element) {
  if (action && action == global.currentAction) {
    action.action(element, global.originalElement)

    clearCurrentAction()
  }
}

function getAction(key) {
  key = key.toLowerCase()
  return key in actions ? actions[key.toLowerCase()] : null
}

function myKeyDown(event) {
  /* Grab whatever is underneath when an action is started */
  global.originalElement = global.originalElement ? global.originalElement : document.querySelector('.grid-element:hover')
  setCurrentAction(getAction(event.key), global.originalElement)
}

function myKeyUp(event) {
  /* Grab whatever is underneath when an action is completed */
  activateAction(getAction(event.key), document.querySelector('.grid-element:hover'))
  global.originalElement = null
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

/* TODO: Update */
function findStreamer(type, value) {
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
  var streamer = global.lookup[element.value] ?? null
  streamer = streamer ?? findStreamer(element.type, element.value)
  streamer = streamer ?? findStreamer(element.getAttribute('type'), element.getAttribute('value'))
  return streamer ? Array.prototype.find.call(overlayList.querySelectorAll('.overlayListElement'), e => e.name == streamer.name) : null
}

function setElementRelative(gridElement, listElement, elements, offset) {
  var adjElement = overlayList.querySelectorAll('.overlayListElement')[0]

  if (listElement) {
    var elementIndex = Array.prototype.indexOf.call(elements, listElement)
    adjElement = elements[(elementIndex + elements.length + offset) % elements.length]
  }

  if (adjElement) {
    setElementFromString(gridElement, adjElement.name)
  }
}

function setElementRelativeToGroup(element, offset) {
  var listElement = findListElementFromGridElement(element)
  return setElementRelative(
    element, 
    listElement, 
    listElement ? listElement.parentElement.querySelectorAll('.overlayListElement') : null, 
    offset
  )
}

function setElementRelativeToGlobal(element, offset) {
  var listElement = findListElementFromGridElement(element)
  return setElementRelative(element, listElement, overlayList.querySelectorAll('.overlayListElement'), offset)
}

function toggleFullscreen(element) {
  if (document.fullscreenElement == null) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function toggleOverlay(overlay) {
  /* Toggle the element passed in, if it exists */
  if (overlay) {
    if (overlay.style.display == 'none') {
      /* Reposition the window when it gets shown */
      overlay.style.display = 'inline-block'
      overlay.style.top = '2%'
      overlay.style.left = '2%'
    } else {
      overlay.style.display = 'none'
    }
  }
}

function toggleOverlays(overlay) {
  /* Disable everything but the selected overlay */
  for (var element of document.querySelectorAll('.overlay')) {
    if (element != overlay) {
      element.style.display = 'none'
    }
  }
  
  /* Toggle the element passed in */
  toggleOverlay(overlay)
}

function toggleOverlayList(element) {
  global.listElement = element
  toggleOverlays(overlayList)
}

function hideOverlays() {
  /* Reset the overlay elements */
  global.listElement = null
  toggleOverlays(null)
}

function toggleChat(e) {
  if (chat.hasAttribute('style')) {
    chat.removeAttribute('style')
  } else {
    chat.setAttribute('style', 'display: none')
  }

  /* Resize grid to account for chat */
  resizeGrid()
}

function setBackendLocation(location) {
  localStorage.setItem('backendLocation', location)
}

function getBackendLocation() {
  return localStorage.getItem('backendLocation')
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
    backendSocket = new WebSocket('ws://' + getBackendLocation())
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
      if (firstAttempt == false) {
        alert('Backend encountered a problem connecting to: ' + getBackendLocation())
      }
    }
  } else {
    backendSocket.close()
    
    /* Update the settings menu checkbox */
    backendInput.checked = false
  }

  setTimeout(function() {
    if (backendSocket.readyState != WebSocket.OPEN) {
      backendSocket.close()
    }
  }, 500)
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
  } else if (message.messageType == 'refer') {
    global.responseHandlers[message.responseId](message)
  }
}

function requestBackendResponse(type, data, fun) {
  if (backendSocket.readyState == WebSocket.OPEN) {
    global.backendResponseId += 1
    global.responseHandlers[global.backendResponseId] = fun

    backendSocket.send(JSON.stringify({
      messageType : type,
      messageValue : data,
      version : supportedBackendVersion,
      responseId : global.backendResponseId,
    }))
  }
}

function processInitMessage(message) {

}

function processUpdateMessage(message) {
  updateStreamers(message.streamers)
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
    disableStreamInteractions(element)
    
    dragStartX = event.clientX
    dragStartY = event.clientY
    
    window.onmouseup = function(event) {
      dragMouseUp(element, event)
    }
    window.onmousemove = function(event) {
      dragMouseMove(element, event)
    }
  }
}

function dragMouseUp(element, event) {
  /* Left mouse only */
  if (event == null || event.button == 0) {
    window.onmouseup = null
    window.onmousemove = null
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
  
  /* Prevent text selection while dragging */
  event.preventDefault()
}

class Streamer {
  constructor(name, group) {
    /* This data should not change after creation*/
    this.name = name
    this.group = group

    /* This data can be added to after creation */
    this.terms = {}
    this.aliases = {}

    /* This data can be changed from null after creation */
    this.ytHandle = null
    this.ytChannel = null
    this.ttvChannel = null

    /* This data will only come from the backend and may change whenever */
    this.status = null
    this.streams = []
  }
}

function updateGroups(name, group) {
  updateOverlayListGroup(overlayList, name, group)
}

function updateLiveStatus(streamer, status, streams) {
  
}

function updateGlobalLookup(streamer, lookup) {
  /* Check for an existing lookup */
  if (lookup in global.lookup) {
    /* Fail if the lookup is for something else */
    if (global.lookup[lookup] != streamer) {
      console.log("Warning: data exists for:", global.lookup[lookup].name, "vs", streamer.name)
    }
  }
  else {
    global.lookup[lookup] = streamer
  }
}

function updateStreamerTerms(streamer, term) {
  streamer.terms[term] = term
}

function updateLookups(streamer) {
  /* Add name lookups */
  updateGlobalLookup(streamer, streamer.name)
  for (var subname in streamer.name.split(' ')) {
    updateStreamerTerms(streamer, subname)
  }

  /* Add group lookups */
  for (var subgroup in streamer.group) {
    updateStreamerTerms(streamer, subgroup)
  }

  /* Add alias lookups */
  for (var alias in streamer.aliases) {
    updateGlobalLookup(streamer, alias)
    updateStreamerTerms(streamer, alias)
  }

  /* Add stream lookups */
  for (var prop in streamer) {
    if (prop in embedFuns && streamer[prop]) {
      updateGlobalLookup(streamer, [prop, streamer[prop]])
    }
  }
}

function updateStreamer(streamerData) {
  if (streamerData.name == null) {
    console.log("Weird streamer data. Name was not found!")
    return
  }

  var newStreamer = false
  var streamer = global.streamers[streamerData.name] ?? null
  if (streamer == null) {
    /* Streamer not found, create one */
    var [name, group] = [streamerData.name, streamerData.group]
    streamer = global.streamers[name] = new Streamer(name, group)
    newStreamer = true
  }

  /* Update aliases */
  for (var alias of streamerData.aliases) {
    streamer.aliases[alias] = alias
  }

  /* Update channel data */
  streamer.ytHandle = streamer.ytHandle ?? streamerData.ytHandle
  streamer.ytChannel = streamer.ytChannel ?? streamerData.ytChannel
  streamer.ttvChannel = streamer.ttvChannel ?? streamerData.ttvChannel

  /* New streamer added, update the groups */
  /* Must be done after setting channel data for links to be populated */
  if (newStreamer) {
    updateGroups(name, group)
  }

  /* Update live status */
  updateLiveStatus(streamer, streamerData.status, streamerData.streams)

  /* Update lookups */
  updateLookups(streamer)
}

function updateStreamers(streamerList) {
  for (var streamer of streamerList) {
    updateStreamer(streamer)
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
      var lookup = inputList.children.length > 0 ? inputList.children[0].name : inputText.value
      e.preventDefault()
      setElementFromString(global.listElement, lookup)
      inputText.blur()
      toggleOverlayInput(false)
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
    /* Clear the existing list */
    while (inputList.firstChild) {
      inputList.removeChild(inputList.firstChild)
    }

    var searchString = e.target.value;
    var searchTerms = searchString.split(' ').map(e => e.trim().toLowerCase()).filter(e => e)

    /* Every search term must have some matching streamer term */
    var streamerMatches = Object.values(global.streamers).filter(
      streamer => searchTerms.every(term => Object.keys(streamer.terms).some(info => info.startsWith(term)))
    )

    /* Add using the same logic as the list */
    for (var streamer of streamerMatches) {
      addOverlayListStreamer(inputList, streamer.name)
    }
  }
}

function setup() {
  /* Key events only work if an iframe doesn't have focus */
  window.onresize = resizeGrid
  window.onkeydown = myKeyDown
  window.onkeyup = myKeyUp
  window.onblur = function() { clearCurrentAction() }
  
  /* Set globals here */
  global = {}
  global.streamers = new Map()
  global.lookup = new Map()
  global.ignoreNextGesture = false
  global.backendResponseId = 0
  global.responseHandlers = new Map()

  setBackendLocation(getBackendLocation() || 'localhost:8080')
  crossReference = new Map()

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
  makeDraggable(overlaySize)

  /* Show the help dialog if the URL is empty */
  var params = new URLSearchParams(window.location.search)
  if (Array.from(params).length == 0) {
    toggleOverlay(overlayHelp)
  }

  initializePage()
}

function initializePage(streamerList) {
  global.initialized = global.initialized ?? false

  if (!global.initialized) {
    global.initialized = true

    Promise.all(fetchStreamers())
    .then(streamerLists => streamerLists.map(streamerList => updateStreamers(streamerList)))
    .then(() => finishInitializing())
  }
}

function finishInitializing() {
  var params = new URLSearchParams(window.location.search)
  var [rows, columns] = [params.get('rows'), params.get('columns')]
  if (rows && columns) {
    createGrid(rows, columns)
  } else {
    promptSize()
  }

  connectBackend()
}

function fetchStreamers() {
  return defaultStreamers.map(
    streamer => 
      fetch(streamer)
      .then(response => response.json())
  )
}

defaultStreamers = [
  'streamers/HoloEN.json',
  'streamers/HoloJP.json',
  'streamers/HoloID.json',
  'streamers/NijiEN.json',
  'streamers/VOMS.json',
  'streamers/PhaseConnect.json',
  'streamers/PRISM.json',
  'streamers/Tsunderia.json',
  'streamers/4V.json',
  'streamers/AkioAIR.json',
  'streamers/VShojo.json',
  'streamers/VReverie.json',
  'streamers/Indie.json',
]

window.addEventListener('load', setup)
