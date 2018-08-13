# support-youtube-content-creators
Whitelist your favorite YoutTube Content Creators from uBlock (Origin) with a click!
## How-To
### Install
0. Install Firefox + uBlock Origin (it should work on other browsers / adblockers, it's not tested tho)
1. Install [Violentmonkey](https://violentmonkey.github.io/) (it should work also with Tampermonkey, also not tested)
2. Open Violentmonkey's **dashboard** and click on the **Add (+) button**.
3. Select **Install from URL** and paste in
```
https://raw.githubusercontent.com/antipatico/support-youtube-content-creators/master/SupportYoutubeContentCreators.js
```
4. Open uBlock Origin's dashboard and add `youtube.com/*#support` to your whitelist.

## Usage
1. Open a video of a content creator you want to whitelist
2. Click on the Violentmonkey button
3. Click on `Script commands` and the `[SYCC] Toggle whitelist for current Content Creator`
4. ???
5. Profit

### Architectures Tested
* Linux + Firefox + uBlock + Violentmonkey
* Windows + Firefox + uBlock + Violentmonkey

### Suggestions
If you have some suggestions open an issue or fork and try with a pull request!

# Copyright
Open the file `LICENSE.txt`.
A copy of the license can be found in the source file itself.

# Author
* antipatico - _"Meglio soli che male accompagnati"_

# Contributors
/dev/null
