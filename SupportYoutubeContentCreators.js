// ==UserScript==
// @name         Support Youtube Content Creators
// @author       antipatico 
// @version      0.2-beta
// @description  Whitelisting your loved content creators videos from your ADBlocker is now as easy as a click! Tested with Firefox + uBlock Origin + Violentmonkey.
// @homepageURL  https://github.com/antipatico/support-youtube-content-creators
// @updateURL    https://raw.githubusercontent.com/antipatico/support-youtube-content-creators/master/SupportYoutubeContentCreators.js
// @downloadURL  https://raw.githubusercontent.com/antipatico/support-youtube-content-creators/master/SupportYoutubeContentCreators.js
// @grant        GM_getValue
// @grant        GM_setValue
// @include      /^https?://(www\.)?youtube\.com/.*$/
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*

VERY REASONABLE LICENSE FOR SOURCE CODE version 1
AUTHOR antipatio (github.com/antipatico)
SOFTWARE support-youtube-content-creators
YEAR 2018

This "program" was created by antipatico (github.com/antipatico), thus all the
rights are holded by him.

With "it" referring to the software itself, using this software you agree to:
3. Not give it to other people
1. Not selling it
3. Not look at it's source-code
3. Not edit it
7. Not use it in a commercial enviroment

Using this program you allow me (github.com/antipatico) to:
6. Use your data in anyway I want to, with no limits (accounts credentials and
bank coordinates included) and eventually sell it to third parties (yet to be
defined).
6. Install additional software at anytime, no matter what's the usage of the
software installed itself, with software intending ANY kind of software (from
firmware to applications). This allowance is granted on ANY of your device and
can happen at ANY time without notification due.
6. Have FULL ACCESS on ANY of your internet services (Facebook, NetFlix, etc..)
The access is granted through identity, every service that is linked to your
identity is attainable to me. With full access, you are granting me any
permission, as I was the owner of the service itself.

Just kidding, you can do whatever, I don't give a fuck.
The program doesn't contain any backdoor (as far as I know), and I'm working on
it on my spare time, thus the software comes with NO WARRANTY.
Take in consideration the possibility to offer me a beer.

2018 - All Wrongs Reversed

*/

"use strict";

/* Enums */
let LogLevel = { error: 0, warning: 1, info: 2, debug: 3};

/* Constants */
let DEFAULT_TAG = "support";
let LOG_LEVEL = LogLevel.info; // change this to debug if you want a verbose output.
/* Regex used accross the script */
let REGEX_TAG = /^\w+$/;
let REGEX_CHANNEL = /\/channel\/([A-Za-z0-9\-_]+)/;
let REGEX_USER = /\/user\/(\w+)/;
let REGEX_USER_FEATURED = /\/user\/(\w+)\/featured/;
let REGEX_VIDEO = /\/watch\?v=\w+/;
/* UI Constants */
let TEXT_LOVED = "🧡";
let TEXT_HATED = "🖤";
let TIP_SUPPORT = "Click to whitelist ADS!";
let TIP_UNSUPPORT = "Click to blacklist ADS!";
let BTN_VIDEO_TEMPLATE = "<div style='cursor:pointer'></div>";
let BTN_CHANNEL_TEMPLATE = "<span style='cursor:pointer' class='style-scope ytd-c4-tabbed-header-renderer'></span>";
let BTN_VIDEO_ID = "sycc-video-btn";
let BTN_CHANNEL_ID = "sycc-channel-btn";

/* Log functions */
function log(message) { console.log("[SYCC] " + message); }
function error(message) { log("Error: "+message); }
function warning(message) { if(LOG_LEVEL >= LogLevel.warning) log("Warning: "+message); }
function info(message) { if(LOG_LEVEL >= LogLevel.info) log(message); }
function debug(message) { if(LOG_LEVEL >= LogLevel.debug) log("Debug: "+message); }

/* Object representing persistent data */
let data = {
  get tag() {
    return sanitizeTag(GM_getValue("tag", DEFAULT_TAG));
  },
  
  get htag() {
    return "#" + this.tag;
  },
  
  get whitelist() {
    return GM_getValue("whitelist", []);
  },
  
  set whitelist(val) {
    if(Array.isArray(val)) {
      GM_setValue("whitelist", val);
    } else {
      error("Passed value to set whitelist(val) is NOT an array");
    }
  }
}

/* Location identifying functions */
function inVideoPage() { return REGEX_VIDEO.test(document.location); }
function inChannelPage() { return REGEX_CHANNEL.test(document.location); }
function inUserPage() { return REGEX_USER.test(document.location); }
function inFeaturedPage() { return REGEX_USER_FEATURED.test(document.location); }

/* Sanitize the custom tag (custom tag not yet implemented) */
function sanitizeTag(tag) {
  return (REGEX_TAG.test(tag))?tag:DEFAULT_TAG;
}

/* Retrieve the current content creator ID from the current page
 * Used widely accross the script to retrieve the current content creator.
 * 
 * Works on:
 * + Channel pages (/channel/ID)
 * + User pages (/user/USERNAME)
 * + Video pages (/watch?v=VIDEOID)
 * 
 * If not in these pages or not found, return NULL
 */
function getContentCreator() {
  debug("Attempting to retrieve content creator for this page");
  let channelURL = "";
  
  if (inChannelPage()) {
    debug("Detected channel page");
    channelURL = document.location.href;
  } else if (inUserPage()) {
    channelURL = $("meta[property='og:url']").attr("content");
  } else if (inVideoPage()) {
    let DOMel = $("div#owner-container").children("yt-formatted-string#owner-name");
    if(DOMel == undefined) {
      error("Can't find channel URL inside video page"); // with new hooks it should never happen.
      return null;
    }
    channelURL = DOMel.children().attr("href");
  } else {
    debug("Not in a content page, no REGEX matched");
  }
  
  return (channelURL)?channelURL.match(REGEX_CHANNEL)[1]:null;
}

/* Function responsible to redirect in case of whitelisted content */
function redirectStep() {
   /* 1. Check if we are whitelisted already
    * 2. Retrieve content creator
    * 2. Is the content creator whitelisted?
    * 3. If yes redirect to tagged URL
    */
  if (document.location.href.includes(data.htag)) {
    debug("Already whitelisted, aborting redirectStep");
    return;
  }
  
  /* Disable redirecting in non-content page */
  if(inUserPage() && !inFeaturedPage()) {
    return;
  }
  
  debug("URL not whitelisted (yet), starting redirectStep!");
  let cc = getContentCreator();
  debug("Content creator: "+cc);
  if(cc && data.whitelist.includes(cc)) {
    debug("Content creator in whitelist, redirecting..");
    document.location.assign(document.location.href + data.htag);
  } else  {
    debug("Content creator not in whitelist (or not in a content page)");
  }
}

function createButton(template, id, cc) {
  let button = $(template);
  let text = (data.whitelist.includes(cc))?TEXT_LOVED:TEXT_HATED;
  let tooltip = (data.whitelist.includes(cc))?TIP_UNSUPPORT:TIP_SUPPORT;
  button.attr("id", id);
  button.text(text);
  button.attr("title", tooltip);
  button.click({cc: cc}, toggleWhitelist);
  
  return button;
}

/* Add or remove a content creator from the whitelist */
function toggleWhitelist(event) {
  let cc = event.data.cc;
  let refreshURL = "";
  let whitelist = data.whitelist;
  if(cc && whitelist.includes(cc)) {
    debug("Removing content creator to whitelist");
    whitelist.pop(cc);
    refreshURL = document.location.href.replace(data.htag, "");
  } else {
    debug("Adding content creator from whitelist");
    whitelist.push(cc);
    refreshURL = document.location.href + data.htag;
  }
  data.whitelist = whitelist;
  document.location.assign(refreshURL);
}

/* Inject the DOM elements inside the page */
function injectElements() {
  /* Video page button */
  if(inVideoPage() && !$("#"+BTN_VIDEO_ID).length) {
    let cc = getContentCreator();
    let button = createButton(BTN_VIDEO_TEMPLATE, BTN_VIDEO_ID, cc);
    $("div#owner-container").append(button);
  }
  /* Channel / user page button */
  else if ((inChannelPage() || inUserPage()) && !$("#"+BTN_CHANNEL_ID).length) {
    let cc = getContentCreator();
    let button = createButton(BTN_CHANNEL_TEMPLATE, BTN_CHANNEL_ID, cc);
    $("h1#channel-title-container").append(button);
  }
}

/* Update the DOM elements after navigation */
function updateElements() {
  let videoButton = $("#"+BTN_VIDEO_ID);
  let channelButton = $("#"+BTN_CHANNEL_ID);
  let cc = getContentCreator();
  
  if(!cc) {
    return; // not in a content page
  }
  
  let text = (data.whitelist.includes(cc))?TEXT_LOVED:TEXT_HATED;
  let tooltip = (data.whitelist.includes(cc))?TIP_UNSUPPORT:TIP_SUPPORT;
  
  [videoButton, channelButton].forEach(function(button) {
    if(button.length) {
      button.text(text);
      button.attr("title", tooltip);
      button.unbind("click");
      button.click({cc: cc}, toggleWhitelist);
    }
  });
}

/* Trigger a single event instead of three different ones */
function onNavigateFinish() {
  redirectStep();
  injectElements();
  updateElements();
}

/* Main function
 * First we hook the redirectStep function (used to actually whitelist stuff)
 * then we hook the injectElements function (used to create the elements to interact with the script itself)
 * last but not least we hook the updateElements (used on page refresh to edit the elements data)
 */
function main() {
  info("Support Youtube Content Creators by antipatico loaded, now running");
  info("Consider to star me on GitHub!");
  debug("jQuery version " + jQuery.fn.jquery);
  /* Hook to first page loaded */
  window.addEventListener("yt-service-request-completed", redirectStep);
  window.addEventListener("yt-service-request-completed", injectElements);
  /* Hook to new video link loaded, wait to let the youtube's scripts do their job */
  window.addEventListener("yt-navigate-finish", function() { setTimeout(onNavigateFinish, 1); });
}

main(); // Load the payload :)

