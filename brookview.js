// @ts-nocheck

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

const referFuns = [
  referName,
  referYoutube,
  referTwitch,
]

const embedFuns = { 
  'blank'      : null,
  'name'       : embedName,
  'yt_video'   : embedYoutubeVideo,
  'yt_id'      : embedYoutubeChannel,
  'ttv_video'  : embedTwitchVideo,
  'ttv_handle' : embedTwitchChannel,
}

function convertToURL(str) {
  if (!str.includes('://')) {
    str = 'https://' + str
  }

  try {
    return new URL(str)
  } catch {
    return null
  }
}

function referName(str) {
  var streamer = globalThis.lookup['name'][str] ?? null
  if (streamer) {
    if (streamer.yt_id) {
      return ['yt_id', streamer.yt_id]
    }
    if (streamer.ttv_handle) {
      return ['ttv_handle', streamer.ttv_handle]
    }
  }
  return null
}

function referYoutube(str) {
  /* Try to treat the string as a URL */
  var url = convertToURL(str)

  /* Wasn't a URL, fail here */
  if (url == null) {
    return null
  }

  var pathPieces = url.pathname.split('/')

  /* Youtube video link - www.youtube.com/watch?v=id&t=# */
  if (url.host.includes('www.youtube.com') && url.searchParams.has('v')) { 
    var timeStamp = url.searchParams.get('t')
    var extras = timeStamp ? '&start=' + timeStamp : ''
    return ['yt_video', url.searchParams.get('v'), extras]
  }

  /* Youtube handle - www.youtube.com/@Handle */
  if (url.host.includes('www.youtube.com') && pathPieces[1].startsWith('@')) {
    return ['yt_handle', pathPieces[1].substring(1)]
  }

  /* Youtube channel id - www.youtube.com/channel/ChannelId */
  if (url.host.includes('www.youtube.com') && pathPieces[1] == 'channel') { 
    return ['yt_id', pathPieces[2]]
  }

  /* Youtube video link - youtu.be/id */
  if (url.host.includes('youtu.be')) { 
    var timestamp = url.searchParams.get('t')
    var extras = timestamp ? '&start=' + timestamp : ''
    return ['yt_video', pathPieces[1], extras]
  }

  return null
}

function referTwitch(str) {
  /* Start with ttv- as shorthand for twitch channels */
  if (str.startsWith('ttv-')) {
    return ['ttv_handle', str.substring(4)]
  }

  /* Try to treat the string as a URL */
  var url = convertToURL(str)

  /* Wasn't a URL, fail here */
  if (url == null) {
    return null
  }

  var pathPieces = url.pathname.split('/')

  /* Twitch VOD - www.twitch.tv/videos/id?t=# */
  if (url.host.includes('www.twitch.tv') && pathPieces[1] == 'videos') { 
    var timeStamp = url.searchParams.get('t')
    var extras = timeStamp ? '&time=' + timeStamp : ''
    return ['ttv_video', pathPieces[2], extras]
  }
   
  /* Twitch Channel - www.twitch.tv/channel */
  if (url.host.includes('www.twitch.tv')) {
    return ['ttv_handle', pathPieces[1]]
  }

  return null
}

function embedName(value, extras) {
  var streamer = globalThis.lookup['name'][value]
  if (streamer) {
    if (streamer.yt_id) {
      return embedYoutubeChannel(streamer.yt_id)
    } else if (streamer.ttv_handle) {
      return embedTwitchChannel(streamer.ttv_handle)
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

function makeGesturable(element) {
  element.onmousedown = function(event) {
    gestureMouseDown(element, event)
  }
  element.ontouchstart = adaptMouseToTouch(element.onmousedown)
}

function gestureMouseDown(element, event) {
  /* Gesture was ignored, probably because window focus was lost */
  if (globalThis.ignoreNextGesture) {
    globalThis.ignoreNextGesture = false
    return
  }

  /* Left mouse only */
  if (event.button == 0) {
    globalThis.gestureStartTime = (new Date()).getTime()
    globalThis.gestureStartX = event.clientX
    globalThis.gestureStartY = event.clientY
    
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
    globalThis.gestureTimeout = setTimeout(() => {
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
  if (typeof globalThis.gestureTimeout != 'undefined') {
    clearTimeout(globalThis.gestureTimeout)
  }

  var gestureX = event.clientX - globalThis.gestureStartX
  var gestureY = event.clientY - globalThis.gestureStartY
  var gestureDuration = (new Date()).getTime() - globalThis.gestureStartTime

  var distance = Math.sqrt(gestureX * gestureX + gestureY * gestureY)
  var angle = 180.0 + Math.atan2(gestureX, gestureY) * 180.0 / Math.PI

  var key = ' '
  if (distance < 50) {       // Neutral
    if (element.contentDiv.content.tagName == 'DIV') { // Blank element
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

  // div.addEventListener('mouseenter', () => disableStreamInteractions(div))
  div.addEventListener('mouseleave', () => disableStreamInteractions(div))

  /* Prevent right-click to allow right-click to exit input box*/
  div.addEventListener('contextmenu', e => e.preventDefault())
  
  /* Add bookkeeping */
  div.classList.add('grid-element')
  div.type = 'blank'
  div.setAttribute('type', 'blank')
  
  /* Grid element - First child is the overlay */
  div.gridOverlay = div.appendChild(document.createElement('div'))
  div.gridOverlay.classList.add('grid-overlay')

  /* Overlay - First child is the box/text displayed on hover */
  div.gridOverlay.gridAction = div.gridOverlay.appendChild(document.createElement('div'))
  div.gridOverlay.gridAction.classList.add('gridAction')

  /* Overlay - Second child is shown when cycling between next/prev */
  div.gridOverlay.gridStatus = div.gridOverlay.appendChild(document.createElement('div'))
  div.gridOverlay.gridStatus.classList.add('gridStatus')

  /* Grid element - Second child contains the actual content */
  div.contentDiv = div.appendChild(document.createElement('div'))
  div.contentDiv.classList.add('content')

  /* Actual content starts as a blank div */
  div.contentDiv.content = div.contentDiv.appendChild(document.createElement('div'))
  
  /* Add extra variables */
  div.channelNameTimeout = null
  return div
}

function setElement(element, type, value, extras) {
  /* Can only set non-null elements with a non-null type */
  if (element == null || type == null) {
    return
  }

  if (canLearnFromBackend(type, value)) {
    fetch('/live?id_type=' + type + '&id=' + value)
    .then(response => response.json())
    .then(json => updateStreamer(json))
  }

  /* Clear the element if blank, otherwise construct the embed based on the type/value */
  if (type == 'blank') {
    removeElement(element)
  } else if (canUpgradeFromBackend(type)) {
    setElementFromBackend(element, type, value)
  } else {
    /* Add bookkeeping */
    setElementBookkeeping(element, type, value, extras)
    /* Create and set up the iframe */
    var embedString = checkEmbeds(type, value, extras)
    if (embedString) {
      setIFrameContent(element, embedString)
    
      /* Element was modified, update the URL */
      updateURL()
    }
  }
}

function setElementBookkeeping(element, type, value, extras) {
  /* Add bookkeeping */
  [element.type, element.value, element.extras] = [type, value, extras]
  /* Remove null properties */
  element.type   ? element.setAttribute('type',   element.type)   : element.removeAttribute('type')
  element.value  ? element.setAttribute('value',  element.value)  : element.removeAttribute('value')
  element.extras ? element.setAttribute('extras', element.extras) : element.removeAttribute('extras')
  
}

function setIFrameContent(element, src) {
  /* Create and set up the iframe */
  var frame = document.createElement('iframe')
  frame.classList.add('content')
  frame.setAttribute('src', src)
  frame.setAttribute('allow', 'fullscreen')
  
  /* last child is the actual content */
  element.contentDiv.replaceChild(frame, element.contentDiv.content)
  element.contentDiv.content = frame
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
      if (type == 'yt_video') {
        chatFrame.setAttribute('src', 'https://www.youtube.com/live_chat?v=' + value + '&embed_domain=' + hostDomain)
      }
      else if (type == 'ttv_handle') {
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
    option.textContent = globalThis.crossReference[[type, value]] ?? option.value
  }
}

function resizeGrid() {
  var params = new URLSearchParams(window.location.search)
  var rows    = parseInt(params.get('rows') ?? '1')
  var columns = parseInt(params.get('columns') ?? '1')
  
  /* Use integer math to find a row/column multiple for evenly sized divs */
  var realHeight = Math.floor(window.innerHeight / rows)    * rows
  var realWidth  = Math.floor(window.innerWidth  / columns) * columns
  
  /* TODO: Rework chat */
  if (chat.hasAttribute('style') == false) {
    var chatWidth = Math.floor(window.innerWidth * 0.20)
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
  globalThis.listElement = null
  
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
  globalThis.listElement = null
  
  var escapeDiv = document.createElement('div')
  escapeDiv.textContent = ('Esc to close')
  overlayList.append(escapeDiv)
}

function updateOverlayListGroup(element, name, grouping) {
  /* Ensure each subgroup is represented */
  for (var subgroup of grouping) {
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
  var streamer = globalThis.streamers[name]

  // if (streamer.live) {
  //   var dTime = (status.startTime ?? 0) - (new Date().getTime() / 1000)
  //   var lateTime = 4 * 60 * 60 /* Treat as offline if longer than 4 hours til start time */

  //   var statusType = status.status == 'upcoming' && (dTime > lateTime) ? 'offline' : status.status
    
  //   listElement.setAttribute('status', statusType)
  //   listElement.lastChild.textContent = streamer.name + ' ' + status.title
  //   listElement.lastChild = status.type
  //   listElement.lastChild = status.value

  //   globalThis.crossReference[[status.type, status.value]] = listElement.textContent
  // }
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
  var streamer = globalThis.streamers[name]

  var div = streamer.listElement = document.createElement('div')
  div.classList.add('overlayListElement')

  var child = null
  var template = document.createElement('template')

  if (streamer.yt_id) {
    template.innerHTML = '<span>[YT]</span>'
    child = div.appendChild(template.content.firstChild)
    addOverlayStreamerInteraction(child, 'yt_id', streamer.yt_id)
  }

  if (streamer.ttv_handle) {
    template.innerHTML = '<span>[TTV]</span>'
    child = div.appendChild(template.content.firstChild)
    addOverlayStreamerInteraction(child, 'ttv_handle', streamer.ttv_handle)
  }

  div.name = streamer.name
  template.innerHTML = '<span>' + streamer.name + '</span>'
  child = div.appendChild(template.content.firstChild)
  addOverlayStreamerInteraction(child, 'name', streamer.name)

  div.name = streamer.name

  // if (streamer.status) {
  //   var status = streamer.status
  //   var dTime = (status.startTime ?? 0) - (new Date().getTime() / 1000)
  //   var lateTime = 4 * 60 * 60 /* Treat as offline if longer than 4 hours til start time */

  //   var statusType = status.status == 'upcoming' && (dTime > lateTime) ? 'offline' : status.status
  //   div.setAttribute('status', statusType)
  // }
  
  return element.appendChild(div)
}

function addOverlayStreamerInteraction(element, type, value) {
  element.type = type
  element.value = value

  element.onclick = function(event){ 
    setElement(globalThis.listElement, event.target.type, event.target.value, [])

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
  
  globalThis.backendInput = addOverlaySetting(form, 'Backend', 'checkbox', updateBackendEnabled)
  globalThis.backendInput.checked = getBackendEnabled()
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
  var values = Object.values(globalThis.streamers)
  console.log(values)
  prompt('JSON Dump of Streamers', JSON.stringify(values, null, 4))
}

function loadStreamersFromPrompt() {
  var load = prompt()
  if (load) {
    try {
      /* Start with parsing the data */
      var promptData = JSON.parse(load)

      /* Clear old map */
      globalThis.streamers = new Map()

      /* Update with provided data */
      updateStreamers(promptData)
    } catch { }
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

  if (element && element.classList.contains('grid-element')) {
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
  'h'   : new Action('help',          () => toggleOverlay(overlayHelp),        'Toggles the help overlay'),
  'l'   : new Action('list',          toggleOverlayList,                       'Toggles the stream list overlay'),
  's'   : new Action('switch',        setElementFromPrompt,                    'Prompts to select a new stream'),
  'n'   : new Action('next',          e => setElementRelativeToGroup(e,  1),   'Skips to the next stream within the current group'),
  'p'   : new Action('previous',      e => setElementRelativeToGroup(e, -1),   'Skips to the previous stream within the current group'),
  'j'   : new Action('next+',         e => setElementRelativeToGlobal(e, 1),   'Skips to the next stream, regardless of current group'),
  'k'   : new Action('previous+',     e => setElementRelativeToGlobal(e, -1),  'Skips to the previous stream, regardless of current group'),
  'd'   : new Action('delete',        deleteElement,                           'Removes the stream, the link will be saved to local storage'),
  'm'   : new Action('move',          moveElement,                             'Moves the stream between locations'),
  'c'   : new Action('chat',          toggleChat,                              'Toggles the chat panel'),
  'r'   : new Action('reload',        reloadElement,                           'Reloads the stream'),
  'f'   : new Action('fullscreen',    toggleFullscreen,                        'Toggles fullscreen'),
  'F11' : new Action('fullscreen',    toggleFullscreen,                        'Toggles fullscreen'),
  'a'   : new Action('adjust layout', promptSize,                              'Prompts to select new row/column inputs'),
  'b'   : new Action('backend',       toggleBackend,                           'Enables use of the backend for fetching video data'),
  '`'   : new Action('settings',      () => toggleOverlay(overlaySettings),    'Toggles the settings menu'),
  '\\'  : new Action('modify list',   () => toggleOverlay(overlayMod),         'Toggles the window for modifying the streamer list'),
  ' '   : new Action('interact',      allowStreamInteractions,                 'Disable page interactions and allow access to the stream'),
  'e'   : new Action('embed',         embedLink,                               'Embeds the target link'),
  'x'   : new Action('cut',           cutElement,                              'Deletes the stream and saves the link to local storage'),
  'v'   : new Action('paste',         pasteElement,                            'Uses local storage to select a stream'),
  'z'   : new Action('rotate',        rotateElement,                           'Rotates the video by 90°'),
  'escape' : new Action('',          () => toggleOverlays(),                   'Closes all overlay windows'),
}

function rotateElement(element) {
  if (element && element.classList.contains('grid-element')) {
    /* Grab the number of rows/columns to calculate vh/vw sizing */
    var params = new URLSearchParams(window.location.search)
    var rows    = parseInt(params.get('rows') ?? '1')
    var columns = parseInt(params.get('columns') ?? '1')

    /* Operate upon the actual content size */
    element = element.contentDiv.content

    /* Preserve the transform/rotation center and rotate/resize the content */
    var transform = 'translate(-50%, -50%) '
    if (element.style.transform == '' || element.style.transform.includes('rotate(0deg)')) {
      element.style.width = (100 / rows) + 'vh'
      element.style.height = (100 / columns) + 'vw'
      element.style.transform = transform + 'rotate(90deg)'
    } else if (element.style.transform.includes('rotate(90deg)')) {
      element.style.width = '100%'
      element.style.height = '100%'
      element.style.transform = transform + 'rotate(180deg)'
    } else if (element.style.transform.includes('rotate(180deg)')) {
      element.style.width = (100 / rows) + 'vh'
      element.style.height = (100 / columns) + 'vw'
      element.style.transform = transform + 'rotate(270deg)'
    } else if (element.style.transform.includes('rotate(270deg)')) {
      element.style.width = '100%'
      element.style.height = '100%'
      element.style.transform = transform + 'rotate(0deg)'
    }
  }
}

function setElementFromDrop(element, event) {
  /* Prevent the default action that reloads the page with the dropped link */
  event.preventDefault()
  
  /* Extract the text from the drop event */
  setElementFromString(element, event.dataTransfer.getData('text/plain'))
}

function setElementFromPrompt(element) {
  if (element && element.classList.contains('grid-element')) {
    globalThis.listElement = element
    toggleOverlayInput(true)
  }
}

function cutElement(element) {
  if (element && element.classList.contains('grid-element')) {
    copyToClipboard(convertElementDataToLink(element.type, element.value))
    removeElement(element)
  }
}

function pasteElement(element) {
  var clip = localStorage.getItem('clipboard')
  if (clip) {
    setElementFromString(element, clip)
    localStorage.removeItem('clipboard')
  }
}

function setElementFromString(element, str) {
  if (element && element.classList.contains('grid-element')) {
    const YT_PREFIX = 'yt-'
    if (getBackendEnabled() && str.startsWith(YT_PREFIX)) {
      setElementFromBackend(element, 'yt_search', str.slice(YT_PREFIX.length))
    } else {
      var [type, value, extras] = checkReferers(str)
      setElement(element, type, value, extras)
    }
  }
}

function convertElementDataToLink(type, value) {
  var conversions = {
    'name' : value,
    'yt_video'   : 'www.youtube.com/watch?v=' + value,
    'yt_id'      : 'www.youtube.com/channel/' + value,
    'yt_handle'  : 'www.youtube.com/@' + value,
    'ttv_video'  : 'www.twitch.tv/videos/' + value,
    'ttv_handle' : 'www.twitch.tv/' + value,
  }

  if (type in conversions) {
    return 'http://' + conversions[type]
  } else {
    return null
  }
}

function copyToClipboard(text) {
  if (text) {
    localStorage.setItem('clipboard', text)
  } else {
    localStorage.removeItem('clipboard')
  }
}

function deleteElement(element) {
  if (element && element.classList.contains('grid-element')) {
    removeElement(element)
  }
}

function removeElement(element) {
  if (element && element.classList.contains('grid-element')) {
    /* Remove any attributes */
    setElementBookkeeping(element, 'blank', null, null)

    /* Create and set up the blank content */
    var div = document.createElement('div')
    
    /* last child is the actual content */
    element.contentDiv.replaceChild(div, element.contentDiv.content)
    element.contentDiv.content = div
    
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
  globalThis.currentAction = action
  globalThis.originalElement = element

  /* Add the overlay text for the active action */
  document.querySelectorAll('.grid-overlay :first-child').forEach(function(overlay) {
    overlay.textContent = action ? action.name : ''
  })
}

function clearCurrentAction() {
  setCurrentAction(null, null)
}

function activateAction(action, element) {
  if (action && action == globalThis.currentAction) {
    action.action(element, globalThis.originalElement)

    clearCurrentAction()
  }
}

function getAction(key, shift) {
  /* Based on shift, try upper/lower first/second */
  var key1 = shift ? key.toUpperCase() : key.toLowerCase()
  var key2 = shift ? key.toLowerCase() : key.toUpperCase()

  return key1 in actions ? actions[key1] : key2 in actions ? actions[key2] : null
}

function myKeyDown(event) {
  /* Find the action */
  var action = getAction(event.key, event.shiftKey)

  /* Only do something if the action exists */
  if (action) {
    /* Prevent anything associated with the original action */
    if (event.preventDefault) { event.preventDefault() }
    /* Grab whatever is underneath when an action is started */
    globalThis.originalElement = globalThis.originalElement ? globalThis.originalElement : document.querySelector('.grid-element:hover')
    setCurrentAction(action, globalThis.originalElement)
  }
}

function myKeyUp(event) {
  /* Find the action */
  var action = getAction(event.key)

  /* Only do something if the action exists */
  if (action) {
    /* Prevent anything associated with the original action */
    if (event.preventDefault) { event.preventDefault() }
    /* Grab whatever is underneath when an action is completed */
    activateAction(action, document.querySelector('.grid-element:hover'))
    globalThis.originalElement = null
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
  element.gridOverlay.gridStatus.textContent = name.charAt(0).toUpperCase() + name.slice(1)
  
  /* Clear any existing timers */
  if (element.channelNameTimeout != null) {
    clearTimeout(element.channelNameTimeout)
  }
  
  /* Create a new one remove the text */
  element.channelNameTimeout = setTimeout(
    function() {
      element.firstChild.lastChild.textContent = ''
    }, 1500
  )
}

function findStreamer(type, value) {
  var streamer = null
  if (type in globalThis.lookup && value in globalThis.lookup[type]) {
    streamer = globalThis.lookup[type][value]
  }
  return streamer
}

function findStreamerFromSimilar(streamerData) {
  const searchParams = ['yt_id', 'name', 'ttv_handle', 'yt_handle', 'yt_old_handle']

  var streamer = null
  for (var param of searchParams) {
    if (streamerData[param]) {
      var streamer = findStreamer(param, streamerData[param])
      if (streamer) {
        break
      }
    }
  }

  return streamer
}

function findListElementFromGridElement(element) {
  var streamer = globalThis.lookup[element.type]?.[element.value]
  streamer = streamer ?? findStreamer(element.type, element.value)
  streamer = streamer ?? findStreamer(element.getAttribute('type'), element.getAttribute('value'))
  return streamer?.listElement
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

  return adjElement
}

function setElementRelativeToGroup(element, offset) {
  var listElement = findListElementFromGridElement(element)
  var parentElements = listElement ? listElement.parentElement.querySelectorAll('.overlayListElement') : null
  var adjElement = setElementRelative(element, listElement, parentElements, offset)
  setChannelNameTimer(element, adjElement.name)
}

function setElementRelativeToGlobal(element, offset) {
  var listElement = findListElementFromGridElement(element)
  var parentElements = overlayList.querySelectorAll('.overlayListElement')
  var adjElement = setElementRelative(element, listElement, parentElements, offset)
  setChannelNameTimer(element, adjElement.name)
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
  globalThis.listElement = element
  toggleOverlays(overlayList)
}

function hideOverlays() {
  /* Reset the overlay elements */
  globalThis.listElement = null
  toggleOverlays(null)
}

function toggleBackend() {
  globalThis.backendInput.checked = !globalThis.backendInput.checked
  updateBackendEnabled()
}

function getBackendEnabled() {
  return localStorage.getItem('backendEnabled') === 'true'
}

function setBackendEnabled(enabled) {
  localStorage.setItem('backendEnabled', enabled)
}

function updateBackendEnabled() {
  setBackendEnabled(globalThis.backendInput.checked == true)
}

function canLearnFromBackend(type, value) {
  if (type == 'yt_video' && globalThis.lookup['yt_video'][value] == null) {
    return true
  }
  return false
}

function canUpgradeFromBackend(type) {
  const upgradableTypes = [
    'yt_id',
    'yt_handle',
    'name',
  ]
  return getBackendEnabled() && upgradableTypes.includes(type)
}

function setElementFromBackend(element, type, value) {
  if (element && element.classList.contains('grid-element')) {
    if (getBackendEnabled()) {
      if (type == 'name') {
        var streamer = findStreamer(type, value)
        if (streamer.yt_id) {
          [type, value] = ['yt_id', streamer.yt_id]
        }
      }

      if (type == 'yt_search') {
        fetch('/search?query_type=channel&query=' + value)
        .then(response => response.json())
        .then(json => setElementFromBackendResponse(element, json, type, value))
      } else {
        fetch('/live?id_type=' + type + '&id=' + value)
        .then(response => response.json())
        .then(json => setElementFromBackendResponse(element, json, type, value))
      }
    }
  }
}

function setElementFromBackendResponse(element, response, type, value) {
  if (element && element.classList.contains('grid-element')) {
    updateStreamer(response)
    if (response.yt_video) {
      setElement(element, 'yt_video', response.yt_video)
    } else {
      /* Set bookkeeping when blank so that we know what we tried to set it to */
      setElement(element, 'blank')
      setElementBookkeeping(element, type, value)
      setChannelNameTimer(element, response.name + '\nNot Live')
    }
  }
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
    
    globalThis.dragStartX = event.clientX
    globalThis.dragStartY = event.clientY
    
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
  var dragX = event.clientX - globalThis.dragStartX
  var dragY = event.clientY - globalThis.dragStartY
  
  var box = element.getBoundingClientRect()
  
  /* Terrible looking clamp code*/
  /* Ensures the element stays entirely within the window */
  dragX = Math.min(Math.max(dragX, -box.left), window.innerWidth - box.right)
  dragY = Math.min(Math.max(dragY, -box.top), window.innerHeight - box.bottom)
  
  element.style.left = (100 * (element.offsetLeft + dragX) / window.innerWidth)+ '%'
  element.style.top  = (100 * (element.offsetTop  + dragY) / window.innerHeight)+ '%'
  
  globalThis.dragStartX = event.clientX
  globalThis.dragStartY = event.clientY
  
  /* Prevent text selection while dragging */
  event.preventDefault()
}

function updateGroups(name, group) {
  updateOverlayListGroup(overlayList, name, group)
}

function updateStreamerTerms(streamer, term) {
  term = term.toLowerCase()
  if (!streamer.terms.includes(term)) {
    streamer.terms.push(term)
  }
}

function updateLookups(streamer) {
  for (var lookup in globalThis.lookup) {
    if (lookup in streamer) {
      globalThis.lookup[lookup][streamer[lookup]] = streamer
    }
  }

  if (streamer.aliases) {
    for (var alias of streamer.aliases) {
      globalThis.lookup['alias'][alias] = streamer
    }
  }

  /* Add name lookups */
  for (var subname of streamer.name.split(' ')) {
    updateStreamerTerms(streamer, subname)
  }

  /* Add group lookups */
  for (var subgroup of streamer.grouping) {
    updateStreamerTerms(streamer, subgroup)
  }

  /* Add alias lookups */
  for (var alias of streamer.aliases) {
    updateStreamerTerms(streamer, alias)
  }
}

function updateStreamer(streamerData) {
  var streamer = findStreamerFromSimilar(streamerData)
  if (streamer == null) {
    /* Streamer not found, create one */
    streamer = globalThis.streamers[streamerData.name] = streamerData
    streamer.grouping = streamerData.grouping ? streamerData.grouping.split(', ') : []
    streamer.aliases = streamerData.aliases ? streamerData.aliases.split(',') : []
    streamer.terms = []

    /* New streamer added, update the groups */
    updateGroups(streamer.name, streamer.grouping)
  }

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
      setElementFromString(globalThis.listElement, lookup)
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
    var streamerMatches = Object.values(globalThis.streamers).filter(
      streamer => searchTerms.every(term => streamer.terms.some(info => info.startsWith(term)))
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
  globalThis.streamers = new Map()
  
  globalThis.lookup = {}
  for (var lookup of ['name', 'yt_id', 'yt_handle', 'ttv_handle', 'yt_video', 'alias']) {
    globalThis.lookup[lookup] = new Map()
  }

  globalThis.ignoreNextGesture = false

  setBackendEnabled(getBackendEnabled() || false)
  globalThis.crossReference = new Map()

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
  globalThis.initialized = globalThis.initialized ?? false

  if (!globalThis.initialized) {
    globalThis.initialized = true

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
}

function fetchStreamers() {
  return globalThis.defaultStreamers.map(
    streamer => 
      fetch(streamer)
      .then(response => response.json())
  )
}

globalThis.defaultStreamers = [
  'streamers/HoloEN.json',
  'streamers/HoloJP.json',
  'streamers/HoloID.json',
  'streamers/NijiEN.json',
  'streamers/VOMS.json',
  'streamers/PhaseConnect.json',
  'streamers/PRISM.json',
  'streamers/Idol.json',
  'streamers/Tsunderia.json',
  'streamers/4V.json',
  'streamers/AkioAIR.json',
  'streamers/VShojo.json',
  'streamers/VReverie.json',
  'streamers/Indie.json',
  'streamers/Ungrouped.json',
]

window.addEventListener('load', setup)
