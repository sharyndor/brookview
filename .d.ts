type BrookviewGridElement = HTMLDivElement & {
  rows?    : string;
  columns? : string;
}

declare var overlayInput        : HTMLDivElement
declare var inputText           : HTMLInputElement
declare var inputList           : HTMLDivElement
declare var overlaySize         : HTMLDivElement
declare var gridSizeForm        : HTMLFormElement
declare var gridSizeInputRows   : HTMLInputElement
declare var gridSizeInputCols   : HTMLInputElement
declare var gridSizeInputAccept : HTMLInputElement
declare var overlayBlur         : HTMLDivElement
declare var overlayHelp         : HTMLDivElement
declare var overlayList         : HTMLDivElement
declare var overlaySettings     : HTMLDivElement
declare var overlayMod          : HTMLDivElement
declare var grid                : BrookviewGridElement
declare var chat                : HTMLDivElement
declare var chatOptions         : HTMLSelectElement
declare var chatFrame           : HTMLIFrameElement