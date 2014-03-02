var inFullscreen = false;
var mainCanvas = null;
var fullscreenCanvas = null;
var showAsMinimal = false;
var keyZones = [
    ["right", [39]],
    ["left", [37]],
    ["up", [38]],
    ["down", [40]],
    ["a", [90, 81, 89]],
    ["b", [88, 74]],
    ["select", [16]],
    ["start", [13]]
];
function windowingInitialize() {
    cout("windowingInitialize() called.", 0);
    windowStacks[0] = windowCreate("GameBoy", true);
    windowStacks[1] = windowCreate("terminal", false);
    windowStacks[2] = windowCreate("about", false);
    windowStacks[3] = windowCreate("settings", false);
    windowStacks[4] = windowCreate("input_select", false);
    windowStacks[5] = windowCreate("instructions", false);
    windowStacks[6] = windowCreate("local_storage_popup", false);
    windowStacks[7] = windowCreate("local_storage_listing", false);
    windowStacks[8] = windowCreate("freeze_listing", false);
    windowStacks[9] = windowCreate("save_importer", false);
    mainCanvas = getOrCreateElementById("mainCanvas");
    fullscreenCanvas = getOrCreateElementById("fullscreen");
    try {
        //Hook the GUI controls.
        registerGUIEvents();
    }
    catch (error) {
        console.log(error);
        cout("Fatal windowing error: \"" + error.message + "\" file:" + error.fileName + " line: " + error.lineNumber, 2);
    }
    //Update the settings to the emulator's default:
    getOrCreateElementById("enable_sound").checked = settings[0];
    getOrCreateElementById("enable_gbc_bios").checked = settings[1];
    getOrCreateElementById("disable_colors").checked = settings[2];
    getOrCreateElementById("rom_only_override").checked = settings[9];
    getOrCreateElementById("mbc_enable_override").checked = settings[10];
    getOrCreateElementById("enable_colorization").checked = settings[4];
    getOrCreateElementById("do_minimal").checked = showAsMinimal;
    getOrCreateElementById("software_resizing").checked = settings[12];
    getOrCreateElementById("typed_arrays_disallow").checked = settings[5];
    getOrCreateElementById("gb_boot_rom_utilized").checked = settings[11];
    getOrCreateElementById("resize_smoothing").checked = settings[13];
    getOrCreateElementById("channel1").checked = settings[14][0];
    getOrCreateElementById("channel2").checked = settings[14][1];
    getOrCreateElementById("channel3").checked = settings[14][2];
    getOrCreateElementById("channel4").checked = settings[14][3];
}
function loadB64DataUri(datauri) {
    if (datauri != null && datauri.length > 0) {
        try {
            cout(Math.floor(datauri.length * 3 / 4) + " bytes of data submitted by form (text length of " + datauri.length + ").", 0);
            initPlayer();
            start(mainCanvas, base64_decode(datauri));
        }
        catch (error) {
            console.error(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
        }
    }
}
function registerGUIEvents() {
    cout("In registerGUIEvents() : Registering GUI Events.", -1);
    addEvent("click", getOrCreateElementById("terminal_clear_button"), clear_terminal);
    addEvent("click", getOrCreateElementById("local_storage_list_refresh_button"), refreshStorageListing);
    addEvent("click", getOrCreateElementById("terminal_close_button"), function () { windowStacks[1].hide() });
    addEvent("click", getOrCreateElementById("about_close_button"), function () { windowStacks[2].hide() });
    addEvent("click", getOrCreateElementById("settings_close_button"), function () { windowStacks[3].hide() });
    addEvent("click", getOrCreateElementById("input_select_close_button"), function () { windowStacks[4].hide() });
    addEvent("click", getOrCreateElementById("instructions_close_button"), function () { windowStacks[5].hide() });
    addEvent("click", getOrCreateElementById("local_storage_list_close_button"), function () { windowStacks[7].hide() });
    addEvent("click", getOrCreateElementById("local_storage_popup_close_button"), function () { windowStacks[6].hide() });
    addEvent("click", getOrCreateElementById("save_importer_close_button"), function () { windowStacks[9].hide() });
    addEvent("click", getOrCreateElementById("freeze_list_close_button"), function () { windowStacks[8].hide() });
    addEvent("click", getOrCreateElementById("GameBoy_about_menu"), function () { windowStacks[2].show() });
    addEvent("click", getOrCreateElementById("GameBoy_settings_menu"), function () { windowStacks[3].show() });
    addEvent("click", getOrCreateElementById("local_storage_list_menu"), function () { refreshStorageListing(); windowStacks[7].show(); });
    addEvent("click", getOrCreateElementById("freeze_list_menu"), function () { refreshFreezeListing(); windowStacks[8].show(); });
    addEvent("click", getOrCreateElementById("view_importer"), function () { windowStacks[9].show() });
    addEvent("keydown", document, keyDown);
    addEvent("keyup", document,  function (event) {
        if (event.keyCode == 27) {
            //Fullscreen on/off
            fullscreenPlayer();
        }
        else {
            //Control keys / other
            keyUp(event);
        }
    });
    addEvent("MozOrientation", window, GameBoyGyroSignalHandler);
    addEvent("deviceorientation", window, GameBoyGyroSignalHandler);
    new popupMenu(getOrCreateElementById("GameBoy_file_menu"), getOrCreateElementById("GameBoy_file_popup"));
    addEvent("click", getOrCreateElementById("data_uri_clicker"), function () {
        var datauri = prompt("Please input the ROM image's Base 64 Encoded Text:", "");
        loadB64DataUri(datauri);
    });
    addEvent("click", getOrCreateElementById("set_volume"), function () {
        if (GameBoyEmulatorInitialized()) {
            var volume = prompt("Set the volume here:", "1.0");
            if (volume != null && volume.length > 0) {
                settings[3] = Math.min(Math.max(parseFloat(volume), 0), 1);
                gameboy.changeVolume();
            }
        }
    });
    addEvent("click", getOrCreateElementById("set_speed"), function () {
        if (GameBoyEmulatorInitialized()) {
            var speed = prompt("Set the emulator speed here:", "1.0");
            if (speed != null && speed.length > 0) {
                gameboy.setSpeed(Math.max(parseFloat(speed), 0.001));
            }
        }
    });
    addEvent("click", getOrCreateElementById("internal_file_clicker"), function () {
        var file_opener = getOrCreateElementById("local_file_open");
        windowStacks[4].show();
        file_opener.click();
    });
    addEvent("blur", getOrCreateElementById("input_select"), function () {
        windowStacks[4].hide();
    });
    addEvent("change", getOrCreateElementById("local_file_open"), function () {
        windowStacks[4].hide();
        console.log(this.files);
        if (typeof this.files != "undefined") {
            try {
                if (this.files.length >= 1) {
                    cout("Reading the local file \"" + this.files[0].name + "\"", 0);
                    try {
                        //Gecko 1.9.2+ (Standard Method)
                        var binaryHandle = new FileReader();
                        binaryHandle.onload = function () {
                            if (this.readyState == 2) {
                                cout("file loaded.", 0);
                                try {
                                    initPlayer();
                                    start(mainCanvas, this.result);
                                }
                                catch (error) {
                                    console.error(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                                }
                            }
                            else {
                                cout("loading file, please wait...", 0);
                            }
                        }
                        binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
                    }
                    catch (error) {
                        cout("Browser does not support the FileReader object, falling back to the non-standard File object access,", 2);
                        //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
                        var romImageString = this.files[this.files.length - 1].getAsBinary();
                        try {
                            initPlayer();
                            start(mainCanvas, romImageString);
                        }
                        catch (error) {
                            console.error(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                        }

                    }
                }
                else {
                    cout("Incorrect number of files selected for local loading.", 1);
                }
            }
            catch (error) {
                cout("Could not load in a locally stored ROM file.", 2);
            }
        }
        else {
            cout("could not find the handle on the file to open.", 2);
        }
    });
    addEvent("change", getOrCreateElementById("save_open"), function () {
        windowStacks[9].hide();
        if (typeof this.files != "undefined") {
            try {
                if (this.files.length >= 1) {
                    cout("Reading the local file \"" + this.files[0].name + "\" for importing.", 0);
                    try {
                        //Gecko 1.9.2+ (Standard Method)
                        var binaryHandle = new FileReader();
                        binaryHandle.onload = function () {
                            if (this.readyState == 2) {
                                cout("file imported.", 0);
                                try {
                                    import_save(this.result);
                                    refreshStorageListing();
                                }
                                catch (error) {
                                    console.error(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                                }
                            }
                            else {
                                cout("importing file, please wait...", 0);
                            }
                        }
                        binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
                    }
                    catch (error) {
                        cout("Browser does not support the FileReader object, falling back to the non-standard File object access,", 2);
                        //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
                        var romImageString = this.files[this.files.length - 1].getAsBinary();
                        try {
                            import_save(romImageString);
                            refreshStorageListing();
                        }
                        catch (error) {
                            console.error(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                        }

                    }
                }
                else {
                    cout("Incorrect number of files selected for local loading.", 1);
                }
            }
            catch (error) {
                cout("Could not load in a locally stored ROM file.", 2);
            }
        }
        else {
            cout("could not find the handle on the file to open.", 2);
        }
    });
    addEvent("click", getOrCreateElementById("restart_cpu_clicker"), function () {
        if (GameBoyEmulatorInitialized()) {
            try {
                if (!gameboy.fromSaveState) {
                    initPlayer();
                    start(mainCanvas, gameboy.getROMImage());
                }
                else {
                    initPlayer();
                    openState(gameboy.savedStateFileName, mainCanvas);
                }
            }
            catch (error) {
                console.error(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
            }
        }
        else {
            cout("Could not restart, as a previous emulation session could not be found.", 1);
        }
    });
    addEvent("click", getOrCreateElementById("run_cpu_clicker"), function () {
        run();
    });
    addEvent("click", getOrCreateElementById("kill_cpu_clicker"), function () {
        pause();
    });
    addEvent("click", getOrCreateElementById("save_state_clicker"), function () {
        save();
    });
    addEvent("click", getOrCreateElementById("save_SRAM_state_clicker"), function () {
        saveSRAM();
    });
    addEvent("click", getOrCreateElementById("enable_sound"), function () {
        settings[0] = getOrCreateElementById("enable_sound").checked;
        if (GameBoyEmulatorInitialized()) {
            gameboy.initSound();
        }
    });
    addEvent("click", getOrCreateElementById("disable_colors"), function () {
        settings[2] = getOrCreateElementById("disable_colors").checked;
    });
    addEvent("click", getOrCreateElementById("rom_only_override"), function () {
        settings[9] = getOrCreateElementById("rom_only_override").checked;
    });
    addEvent("click", getOrCreateElementById("mbc_enable_override"), function () {
        settings[10] = getOrCreateElementById("mbc_enable_override").checked;
    });
    addEvent("click", getOrCreateElementById("enable_gbc_bios"), function () {
        settings[1] = getOrCreateElementById("enable_gbc_bios").checked;
    });
    addEvent("click", getOrCreateElementById("enable_colorization"), function () {
        settings[4] = getOrCreateElementById("enable_colorization").checked;
    });
    addEvent("click", getOrCreateElementById("do_minimal"), function () {
        showAsMinimal = getOrCreateElementById("do_minimal").checked;
        fullscreenCanvas.className = (showAsMinimal) ? "minimum" : "maximum";
    });
    addEvent("click", getOrCreateElementById("software_resizing"), function () {
        settings[12] = getOrCreateElementById("software_resizing").checked;
        if (GameBoyEmulatorInitialized()) {
            gameboy.initLCD();
        }
    });
    addEvent("click", getOrCreateElementById("typed_arrays_disallow"), function () {
        settings[5] = getOrCreateElementById("typed_arrays_disallow").checked;
    });
    addEvent("click", getOrCreateElementById("gb_boot_rom_utilized"), function () {
        settings[11] = getOrCreateElementById("gb_boot_rom_utilized").checked;
    });
    addEvent("click", getOrCreateElementById("resize_smoothing"), function () {
        settings[13] = getOrCreateElementById("resize_smoothing").checked;
        if (GameBoyEmulatorInitialized()) {
            gameboy.initLCD();
        }
    });
    addEvent("click", getOrCreateElementById("channel1"), function () {
        settings[14][0] = getOrCreateElementById("channel1").checked;
    });
    addEvent("click", getOrCreateElementById("channel2"), function () {
        settings[14][1] = getOrCreateElementById("channel2").checked;
    });
    addEvent("click", getOrCreateElementById("channel3"), function () {
        settings[14][2] = getOrCreateElementById("channel3").checked;
    });
    addEvent("click", getOrCreateElementById("channel4"), function () {
        settings[14][3] = getOrCreateElementById("channel4").checked;
    });
    addEvent("click", getOrCreateElementById("view_fullscreen"), fullscreenPlayer);
    new popupMenu(getOrCreateElementById("GameBoy_view_menu"), getOrCreateElementById("GameBoy_view_popup"));
    addEvent("click", getOrCreateElementById("view_terminal"), function () { windowStacks[1].show() });
    addEvent("click", getOrCreateElementById("view_instructions"), function () { windowStacks[5].show() });
    addEvent("mouseup", getOrCreateElementById("gfx"), initNewCanvasSize);
    addEvent("resize", window, initNewCanvasSize);
    addEvent("unload", window, function () {
        autoSave();
    });
}
function keyDown(event) {
    var keyCode = event.keyCode;
    var keyMapLength = keyZones.length;
    for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
        var keyCheck = keyZones[keyMapIndex];
        var keysMapped = keyCheck[1];
        var keysTotal = keysMapped.length;
        for (var index = 0; index < keysTotal; ++index) {
            if (keysMapped[index] == keyCode) {
                GameBoyKeyDown(keyCheck[0]);
                try {
                    event.preventDefault();
                }
                catch (error) { }
            }
        }
    }
}
function keyUp(event) {
    var keyCode = event.keyCode;
    var keyMapLength = keyZones.length;
    for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
        var keyCheck = keyZones[keyMapIndex];
        var keysMapped = keyCheck[1];
        var keysTotal = keysMapped.length;
        for (var index = 0; index < keysTotal; ++index) {
            if (keysMapped[index] == keyCode) {
                GameBoyKeyUp(keyCheck[0]);
                try {
                    event.preventDefault();
                }
                catch (error) { }
            }
        }
    }
}
function initPlayer() {
    getOrCreateElementById("title").style.display = "none";
    getOrCreateElementById("port_title").style.display = "none";
    getOrCreateElementById("fullscreenContainer").style.display = "none";
}
function fullscreenPlayer() {
    if (GameBoyEmulatorInitialized()) {
        if (!inFullscreen) {
            gameboy.canvas = fullscreenCanvas;
            fullscreenCanvas.className = (showAsMinimal) ? "minimum" : "maximum";
            getOrCreateElementById("fullscreenContainer").style.display = "block";
            windowStacks[0].hide();
        }
        else {
            gameboy.canvas = mainCanvas;
            getOrCreateElementById("fullscreenContainer").style.display = "none";
            windowStacks[0].show();
        }
        gameboy.initLCD();
        inFullscreen = !inFullscreen;
    }
    else {
        cout("Cannot go into fullscreen mode.", 2);
    }
}
function runFreeze(keyName) {
    try {
        windowStacks[8].hide();
        initPlayer();
        openState(keyName, mainCanvas);
    }
    catch (error) {
        cout("A problem with attempting to open the selected save state occurred.", 2);
    }
}
//Wrapper for localStorage getItem, so that data can be retrieved in various types.
function findValue(key) {
    try {
        if (window.localStorage.getItem(key) != null) {
            return JSON.parse(window.localStorage.getItem(key));
        }
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        if (window.globalStorage[location.hostname].getItem(key) != null) {
            return JSON.parse(window.globalStorage[location.hostname].getItem(key));
        }
    }
    return null;
}
//Wrapper for localStorage setItem, so that data can be set in various types.
function setValue(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        window.globalStorage[location.hostname].setItem(key, JSON.stringify(value));
    }
}
//Wrapper for localStorage removeItem, so that data can be set in various types.
function deleteValue(key) {
    try {
        window.localStorage.removeItem(key);
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        window.globalStorage[location.hostname].removeItem(key);
    }
}
function outputLocalStorageLink(keyName, dataFound, downloadName) {
    return generateDownloadLink("data:application/octet-stream;base64," + dataFound, keyName, downloadName);
}
function refreshFreezeListing() {
    var storageListMasterDivSub = getOrCreateElementById("freezeListingMasterContainerSub");
    var storageListMasterDiv = getOrCreateElementById("freezeListingMasterContainer");
    storageListMasterDiv.removeChild(storageListMasterDivSub);
    storageListMasterDivSub = document.createElement("div");
    storageListMasterDivSub.id = "freezeListingMasterContainerSub";
    var keys = getLocalStorageKeys();
    while (keys.length > 0) {
        key = keys.shift();
        if (key.substring(0, 7) == "FREEZE_") {
            storageListMasterDivSub.appendChild(outputFreezeStateRequestLink(key));
        }
    }
    storageListMasterDiv.appendChild(storageListMasterDivSub);
}
function outputFreezeStateRequestLink(keyName) {
    var linkNode = generateLink("javascript:runFreeze(\"" + keyName + "\")", keyName);
    var storageContainerDiv = document.createElement("div");
    storageContainerDiv.className = "storageListingContainer";
    storageContainerDiv.appendChild(linkNode)
    return storageContainerDiv;
}
function refreshStorageListing() {
    var storageListMasterDivSub = getOrCreateElementById("storageListingMasterContainerSub");
    var storageListMasterDiv = getOrCreateElementById("storageListingMasterContainer");
    storageListMasterDiv.removeChild(storageListMasterDivSub);
    storageListMasterDivSub = document.createElement("div");
    storageListMasterDivSub.id = "storageListingMasterContainerSub";
    var keys = getLocalStorageKeys();
    var blobPairs = [];
    for (var index = 0; index < keys.length; ++index) {
        blobPairs[index] = getBlobPreEncoded(keys[index]);
        storageListMasterDivSub.appendChild(outputLocalStorageRequestLink(keys[index]));
    }
    storageListMasterDiv.appendChild(storageListMasterDivSub);
    var linkToManipulate = getOrCreateElementById("download_local_storage_dba");
    linkToManipulate.href = "data:application/octet-stream;base64," + base64(generateMultiBlob(blobPairs));
    linkToManipulate.download = "gameboy_color_saves.export";
}
function getBlobPreEncoded(keyName) {
    if (keyName.substring(0, 9) == "B64_SRAM_") {
        return [keyName.substring(4), base64_decode(findValue(keyName))];
    }
    else if (keyName.substring(0, 5) == "SRAM_") {
        return [keyName, convertToBinary(findValue(keyName))];
    }
    else {
        return [keyName, JSON.stringify(findValue(keyName))];
    }
}
function outputLocalStorageRequestLink(keyName) {
    var linkNode = generateLink("javascript:popupStorageDialog(\"" + keyName + "\")", keyName);
    var storageContainerDiv = document.createElement("div");
    storageContainerDiv.className = "storageListingContainer";
    storageContainerDiv.appendChild(linkNode)
    return storageContainerDiv;
}
function popupStorageDialog(keyName) {
    var subContainer = getOrCreateElementById("storagePopupMasterContainer");
    var parentContainer = getOrCreateElementById("storagePopupMasterParent");
    parentContainer.removeChild(subContainer);
    subContainer = document.createElement("div");
    subContainer.id = "storagePopupMasterContainer";
    parentContainer.appendChild(subContainer);
    var downloadDiv = document.createElement("div");
    downloadDiv.id = "storagePopupDownload";
    if (keyName.substring(0, 9) == "B64_SRAM_") {
        var downloadDiv2 = document.createElement("div");
        downloadDiv2.id = "storagePopupDownloadRAW";
        downloadDiv2.appendChild(outputLocalStorageLink("Download RAW save data.", findValue(keyName), keyName));
        subContainer.appendChild(downloadDiv2);
        downloadDiv.appendChild(outputLocalStorageLink("Download in import compatible format.", base64(generateBlob(keyName.substring(4), base64_decode(findValue(keyName)))), keyName));
    }
    else if (keyName.substring(0, 5) == "SRAM_") {
        var downloadDiv2 = document.createElement("div");
        downloadDiv2.id = "storagePopupDownloadRAW";
        downloadDiv2.appendChild(outputLocalStorageLink("Download RAW save data.", base64(convertToBinary(findValue(keyName))), keyName));
        subContainer.appendChild(downloadDiv2);
        downloadDiv.appendChild(outputLocalStorageLink("Download in import compatible format.", base64(generateBlob(keyName, convertToBinary(findValue(keyName)))), keyName));
    }
    else {
        downloadDiv.appendChild(outputLocalStorageLink("Download in import compatible format.", base64(generateBlob(keyName, JSON.stringify(findValue(keyName)))), keyName));
    }
    var deleteLink = generateLink("javascript:deleteStorageSlot(\"" + keyName + "\")", "Delete data item from HTML5 local storage.");
    deleteLink.id = "storagePopupDelete";
    subContainer.appendChild(downloadDiv);
    subContainer.appendChild(deleteLink);
    windowStacks[6].show();
}
function convertToBinary(jsArray) {
    var length = jsArray.length;
    var binString = "";
    for (var indexBin = 0; indexBin < length; indexBin++) {
        binString += String.fromCharCode(jsArray[indexBin]);
    }
    return binString;
}
function deleteStorageSlot(keyName) {
    deleteValue(keyName);
    windowStacks[6].hide();
    refreshStorageListing();
}
function generateLink(address, textData) {
    var link = document.createElement("a");
    link.href = address;
    link.appendChild(document.createTextNode(textData));
    return link;
}
function generateDownloadLink(address, textData, keyName) {
    var link = generateLink(address, textData);
    link.download = keyName + ".sav";
    return link;
}
function checkStorageLength() {
    try {
        return window.localStorage.length;
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        return window.globalStorage[location.hostname].length;
    }
}
function getLocalStorageKeys() {
    var storageLength = checkStorageLength();
    var keysFound = [];
    var index = 0;
    var nextKey = null;
    while (index < storageLength) {
        nextKey = findKey(index++);
        if (nextKey !== null && nextKey.length > 0) {
            if (nextKey.substring(0, 5) == "SRAM_" || nextKey.substring(0, 9) == "B64_SRAM_" || nextKey.substring(0, 7) == "FREEZE_" || nextKey.substring(0, 4) == "RTC_") {
                keysFound.push(nextKey);
            }
        }
        else {
            break;
        }
    }
    return keysFound;
}
function findKey(keyNum) {
    try {
        return window.localStorage.key(keyNum);
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        return window.globalStorage[location.hostname].key(keyNum);
    }
    return null;
}
//Some wrappers and extensions for non-DOM3 browsers:
function isDescendantOf(ParentElement, toCheck) {
    if (!ParentElement || !toCheck) {
        return false;
    }
    //Verify an object as either a direct or indirect child to another object.
    function traverseTree(domElement) {
        while (domElement != null) {
            if (domElement.nodeType == 1) {
                if (isSameNode(domElement, toCheck)) {
                    return true;
                }
                if (hasChildNodes(domElement)) {
                    if (traverseTree(domElement.firstChild)) {
                        return true;
                    }
                }
            }
            domElement = domElement.nextSibling;
        }
        return false;
    }
    return traverseTree(ParentElement.firstChild);
}
function hasChildNodes(oElement) {
    return (typeof oElement.hasChildNodes == "function") ? oElement.hasChildNodes() : ((oElement.firstChild != null) ? true : false);
}
function isSameNode(oCheck1, oCheck2) {
    return (typeof oCheck1.isSameNode == "function") ? oCheck1.isSameNode(oCheck2) : (oCheck1 === oCheck2);
}
function pageXCoord(event) {
    if (typeof event.pageX == "undefined") {
        return event.clientX + document.documentElement.scrollLeft;
    }
    return event.pageX;
}
function pageYCoord(event) {
    if (typeof event.pageY == "undefined") {
        return event.clientY + document.documentElement.scrollTop;
    }
    return event.pageY;
}
function mouseLeaveVerify(oElement, event) {
    //Hook target element with onmouseout and use this function to verify onmouseleave.
    return isDescendantOf(oElement, (typeof event.target != "undefined") ? event.target : event.srcElement) && !isDescendantOf(oElement, (typeof event.relatedTarget != "undefined") ? event.relatedTarget : event.toElement);
}
function mouseEnterVerify(oElement, event) {
    //Hook target element with onmouseover and use this function to verify onmouseenter.
    return !isDescendantOf(oElement, (typeof event.target != "undefined") ? event.target : event.srcElement) && isDescendantOf(oElement, (typeof event.relatedTarget != "undefined") ? event.relatedTarget : event.fromElement);
}
function addEvent(sEvent, oElement, fListener) {
    try {
        oElement.addEventListener(sEvent, fListener, false);
        cout("In addEvent() : Standard addEventListener() called to add a(n) \"" + sEvent + "\" event.", -1);
    }
    catch (error) {
        oElement.attachEvent("on" + sEvent, fListener);    //Pity for IE.
        cout("In addEvent() : Nonstandard attachEvent() called to add an \"on" + sEvent + "\" event.", -1);
    }
}
function removeEvent(sEvent, oElement, fListener) {
    try {
        oElement.removeEventListener(sEvent, fListener, false);
        cout("In removeEvent() : Standard removeEventListener() called to remove a(n) \"" + sEvent + "\" event.", -1);
    }
    catch (error) {
        oElement.detachEvent("on" + sEvent, fListener);    //Pity for IE.
        cout("In removeEvent() : Nonstandard detachEvent() called to remove an \"on" + sEvent + "\" event.", -1);
    }
}