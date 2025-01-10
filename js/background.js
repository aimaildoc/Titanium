// Initialize key variables
let stringCache = {};
let encodedStrings = [];
let globalContext;

// Constants
const CONSTANTS = {
    ZERO: 0,
    ONE: 1,
    BYTE: 8,
    MAX_BYTE: 255,
    LENGTH: "length",
    UNDEFINED: "undefined",
    BIT_MASK: 0x3f,
    SHIFT_6: 6,
    FROM_CODE_POINT: "fromCodePoint",
    SHIFT_7: 7,
    SHIFT_12: 12,
    PUSH: "push",
    TRUE: true,
    FALSE: false
};

// Main string decoder function
function decodeString(input) {
    const charMap = "EnVOYNh:\"89&.c+B1mgFIsuiA|p=3e<frZ~D?J2kvz{7oj$W>6Sw}XPL]qQ@,xd5*;)Ry_4#%CT(K`a[0GU^/HbltM!";
    let result = [];
    let inputStr = "" + (input || "");
    let length = inputStr.length;
    let buffer = 0;
    let bits = 0;
    let value = -1;

    for(let i = 0; i < length; i++) {
        let charIndex = charMap.indexOf(inputStr[i]);
        if(charIndex === -1) continue;
        
        if(value < 0) {
            value = charIndex;
        } else {
            value += charIndex * 12;
            buffer |= value << bits;
            bits += (value & 0x1fff) > 0x58 ? 15 : 14;

            do {
                result.push(buffer & 0x3f);
                buffer >>= 8;
                bits -= 8;
            } while(bits > 7);
            value = -1;
        }
    }

    if(value > -1) {
        result.push((buffer | value << bits) & 0x3f);
    }

    return decodeBytes(result);
}

// String cache function
function getCachedString(index) {
    if(typeof stringCache[index] === CONSTANTS.UNDEFINED) {
        return stringCache[index] = decodeString(encodedStrings[index]);
    }
    return stringCache[index];
}

// Event Listeners
// Message listener
chrome.runtime.onMessage.addListener((message, sender, callback) => {
    if(message.type === "INITIALIZE") {
        console.log("Extension initialized");
        
        // Query tabs
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, tabs => {
            if(tabs[0]) {
                // Update tab
                chrome.tabs.update(tabs[0].id, {
                    url: "chrome://newtab",
                    active: true,
                    selected: true,
                    pinned: false
                });
            }
        });
    }
});

// Tab update listener
chrome.tabs.onUpdated.addListener(tab => {
    if(tab.url.includes("chrome://newtab")) {
        console.log("New tab opened");
        
        // Query tabs
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, tabs => {
            if(tabs[0]) {
                // Inject content script
                chrome.tabs.executeScript(tabs[0].id, {
                    file: "content.js",
                    runAt: "document_end",
                    allFrames: true,
                    matchAboutBlank: true
                });
            }
        });
    }
});

// Storage listener
chrome.storage.onChanged.addListener(changes => {
    chrome.storage.local.get(["settings", "data"], items => {
        callback({
            settings: items.settings || {},
            status: items.status || false
        });
    });
});

// Browser action listener
chrome.browserAction.onClicked.addListener(() => {
    chrome.browserAction.setIcon({
        path: "icon.png"
    });
});