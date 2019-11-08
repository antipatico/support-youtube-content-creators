// ==UserScript==
// @name         Support Youtube Content Creators
// @author       antipatico 
// @version      0.4
// @description  Whitelisting your loved content creators videos from your ADBlocker is now as easy as a click! Tested with Firefox + uBlock Origin + Violentmonkey.
// @homepageURL  https://github.com/antipatico/support-youtube-content-creators
// @updateURL    https://raw.githubusercontent.com/antipatico/support-youtube-content-creators/master/SupportYoutubeContentCreators.js
// @downloadURL  https://raw.githubusercontent.com/antipatico/support-youtube-content-creators/master/SupportYoutubeContentCreators.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @include      /^https?://(www\.)?youtube\.com/.*$/
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*

VERY REASONABLE LICENSE FOR SOURCE CODE version 1
AUTHOR antipatico (github.com/antipatico)
SOFTWARE support-youtube-content-creators
YEAR 2018-2019

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

/* Log module */
let log = {
  /* Log levels constants */
  get ERROR() { return 0; },
  get WARNING() { return 1; },
  get INFO() { return 2; },
  get DEBUG() { return 3; },
  
  get verbosity() {
    return this.INFO; // Change log verbosity from here.
  },
  
  /* Log functions, basic functions */
  log: function() {
    var args = [].slice.call(arguments);
    args.unshift('%c[SYCC]:', 'font-weight: bold;color: #ef9f09;');
    console.log.apply(console, args);
  },
  error: function(message) { this.log("Error: "+message); },
  warning: function(message) { if(this.verbosity >= this.WARNING) this.log("Warning: "+message); },
  info: function(message) { if(this.verbosity >= this.INFO) this.log(message); },
  debug: function(message) { if(this.verbosity >= this.DEBUG) this.log(message); } 
}


/* Persistent data module */
let data = {
  /* Constant fallback tag */
  get DEFAULT_TAG() { return "support"; },
  
  /* Used to sanitize custom tags */
  get REGEX_TAG() { return /^\w+$/; },
  
  /* Sanitize the custom tag (custom tag not yet implemented) */
  sanitizeTag: function(tag) {
    return (this.REGEX_TAG.test(tag))?tag:this.DEFAULT_TAG;
  },

  get tag() {
    return this.sanitizeTag(GM_getValue("tag", this.DEFAULT_TAG));
  },
  
  set tag(val) {
    GM_setValue("tag", this.sanitizeTag(val));
  },
  
  get htag() {
    return "#" + this.tag;
  },
  
  whitelist: {
    get: function() { return GM_getValue("whitelist", []); },
    
    set: function(val) {
      if(Array.isArray(val)) {
        GM_setValue("whitelist", val);
      } else {
        log.error("Passed value to set whitelist(val) is NOT an array");
      }
    },
    
    contains: function(cc) {
      return data.whitelist.get().includes(cc);
    },
    
    append: function(cc) {
      if(!data.whitelist.contains(cc)) {
        let wl = data.whitelist.get();
        wl.push(cc);
        data.whitelist.set(wl);
      }
    },
    
    remove: function(cc) {
      if(data.whitelist.contains(cc)) {
        let wl = data.whitelist.get();
        wl.pop(cc);
        data.whitelist.set(wl);
      }
    },
    
    clear: function() {
      data.whitelist.set([]);
    }
  }
}

/* Core module */
let core = {
  /* Constants used across the script */
  get REGEX_CHANNEL() { return /\/channel\/([A-Za-z0-9\-_]+)/; },
  get REGEX_USER() { return /\/user\/(\w+)/; },
  get REGEX_USER_FEATURED() { return /\/user\/(\w+)\/featured/; },
  get REGEX_VIDEO() { return /\/watch\?v=\w+/; },
  
  /* Location identifying functions */
  inVideoPage: function() { return this.REGEX_VIDEO.test(document.location); },
  inChannelPage: function() { return this.REGEX_CHANNEL.test(document.location); },
  inUserPage: function() { return this.REGEX_USER.test(document.location); },
  inFeaturedPage: function() { return this.REGEX_USER_FEATURED.test(document.location); },

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
   getContentCreator: function() {
    log.debug("Attempting to retrieve content creator for this page");
    let channelURL = "";

    if (core.inChannelPage()) {
      log.debug("Detected channel page");
      channelURL = document.location.href;
    } else if (core.inUserPage()) {
      channelURL = document.querySelector("meta[property='og:url']").content;
    } else if (core.inVideoPage()) {
      let DOMel = document.querySelector("div#upload-info.ytd-video-owner-renderer").querySelector("a");
      if(DOMel == undefined) {
        log.error("Can't find channel URL inside video page"); // with new hooks it should never happen.
        return null;
      }
      channelURL = DOMel.href;
    } else {
      log.debug("Not in a content page, no REGEX matched");
    }
    return (channelURL)?channelURL.match(this.REGEX_CHANNEL)[1]:null;
  },

  /* Function responsible to redirect in case of whitelisted content */
  redirectStep: function() {
     /* 1. Check if we are whitelisted already
      * 2. Retrieve content creator
      * 2. Is the content creator whitelisted?
      * 3. If yes redirect to tagged URL
      */
    if (document.location.href.includes(data.htag)) {
      log.info("Already in whitelist, nothing to do :)");
      return;
    }

    /* Disable redirecting in non-content page */
    if(core.inUserPage() && !core.inFeaturedPage()) {
      log.debug("Not in content page");
      return;
    }


    log.debug("URL not whitelisted (yet), starting redirectStep!");
    let cc = core.getContentCreator();
    log.debug("Content creator: "+cc);
    if(cc && data.whitelist.contains(cc)) {
      log.info("Content creator in whitelist, redirecting..");
      document.location.assign(document.location.href + data.htag);
    } else  {
      if(cc) {
        log.info("Content creator not in whitelist");
      }
    }
  },

  /* Add or remove a content creator from the whitelist */
  toggleWhitelist: function(cc) {
    //let cc = event.data.cc;
    let refreshURL = "";
    if(cc && data.whitelist.contains(cc)) {
      log.debug("Removing content creator to whitelist");
      data.whitelist.remove(cc);
      refreshURL = document.location.href.replace(data.htag, "");
    } else {
      log.debug("Adding content creator to whitelist");
      data.whitelist.append(cc);
      refreshURL = document.location.href + data.htag;
    }
    document.location.assign(refreshURL);
  }
}

/* Commands module */
let commands = {
  init: function() {
    GM_registerMenuCommand("[SYCC] Change whitelisted tag", commands.onChangeTag);
    GM_registerMenuCommand("[SYCC] Toggle whitelist for current Content Creator (will refresh the page)", commands.onToggleWhitelist);
    GM_registerMenuCommand("[SYCC] Clear whitelist", commands.onClearWhitelist);
  },
  
  onChangeTag: function() {
    let input = prompt('The current tag is "' + data.tag + '".\n Enter the new desired tag');
    if(input && input != "") {
      data.tag = input;
    }
  },
  
  onToggleWhitelist: function() {
    let cc = core.getContentCreator();
    if(!cc) {
      alert("Can't understand who you want to whitelist. Try again in a video page!");
      log.warning("Content Creator not found!");
      return;
    }
    core.toggleWhitelist(cc);
    log.info(data.whitelist.contains(cc)?"Successfully added to the whitelist":"Content Creator removed from the whitelist"); 
  },
  
  onClearWhitelist: function() {
    if(confirm("Are you sure you want to empty your whitelist?\nYou won't be able to recover your current whitelist anymore!")) {
      data.whitelist.clear();
    }
  }
}

/* Main function
 * First we hook the redirectStep function (used to actually whitelist stuff)
 * then we init the commands module.
 */
log.info("Support Youtube Content Creators by antipatico loaded, now running");
log.info("Consider to star me on GitHub!");
/* Hook to first page loaded */
window.addEventListener("yt-service-request-completed", core.redirectStep);
/* Hook to new video link loaded, wait to let the youtube's scripts do their job */
window.addEventListener("yt-navigate-finish", function() { setTimeout(core.redirectStep, 1); });
commands.init();

