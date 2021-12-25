# Brookview
A webpage for watching multiple streams/videos.

Set streams based on streamer name, channel link, or video link. A complete list of supported streamers is available via the list ``(l)`` command. Nicknames can be found in the page source in ```getAliases()```.

Completely self-contained. No cookies, no trackers, no external scripts/calls.

# Available Commands
Commands can be activated by either pressing the associated key over the desired pane or by holding the key and clicking.

Note: Commands cannot be activated while a stream has focus. Easy ways to reset focus include enabling/clicking the floating tab (see below) or by double-tapping F6.

- ``h`` - Toggles the help overlay
- ``l`` - Toggles the stream list overlay
- ``t`` - Toggles a floating tab for resetting stream focus
- ``s`` - Prompts to select a new stream
- ``n`` - Skips to the next stream within the current group
- ``p`` - Skips to the previous stream within the current group
- ``j`` - Skips to the next stream, regardless of current group
- ``k`` - Skips to the previous stream, regardless of current group
- ``d`` - Removes the stream
- ``m`` - Moves the stream between locations
- ``c`` - Copies the stream between locations
- ``r`` - Reloads the stream
- ``o`` - Opens the stream/channel in a new tab
- ``f`` - Toggles fullscreen
- ``a`` - Prompts to select new row/column inputs

# Less Obvious Features
- Drag and Drop
    - Links can be opened by dropping them onto empty streams
- VOD Support
    - Supports both VODs and stream links along with timetags
- Extensibility
    - Easily add new streamers and streamer groups
        - See ``getReferDicts()``
        - Note: Channel IDs only, custom URLs do not work
    - Easily add aliases to existing streamers
        - See ``getAliases()``
    - Reasonably straightforward addition of other embed types
        - See ``getEmbeds()`` and ``getReferFunctions()``

# Future Plans
- YouTube Chat Support
    - Embed requires a suitable parent domain
    - Requires the video link, not the channel
        - No known way to fetch this while remaining standalone
- Twitch Support
    - Embed requires a suitable parent domain

# Unlikely Plans
- Full YouTube iframe integration
    - Requires dependency on external JavaScript - https://www.youtube.com/iframe_api

# License
- GNU General Public License v3