import { assign } from 'lodash'
import { executeSafely, randomHex, openInBrowser } from '../../util'
import { trace } from '../../logger'
import createBridgedWebUI from '../bridge/host'
import analytics from '../../analytics'

/**
 * Important to note:
 *
 * stringByEvaluatingJavaScriptFromString (used by WebUI.eval) has limits:
 *
 *  - JavaScript allocations greater than 10MB are not allowed
 *  - JavaScript that takes longer than 10 seconds to execute is not allowed
 *
 * In the former, you'll get an exception generated, but in the latter it may
 * well fail 'silently'.
 *
 * via https://stackoverflow.com/a/7389032
 */
export default function (context, options) {
  // default options
  options = assign(
    {
      identifier: `jira-sketch-plugin.${options.name}.` + randomHex(0xffffffff),
      page: `${options.name}.html`,
      onlyShowCloseButton: true,
      hideTitleBar: false,
      title: ' ',
      styleMask: NSTitledWindowMask | NSClosableWindowMask
    },
    options
  )

  if (options.backgroundColor) {
    options.background = MSImmutableColor.colorWithSVGString(
        options.backgroundColor
      ).NSColorWithColorSpace(null)
  }

  // default handlers
  options.handlers = assign(
    {
      analytics (eventName, properties) {
        analytics[eventName](properties)
      },
      openInBrowser (url) {
        executeSafely(context, function () {
          openInBrowser(url)
        })
      },
      resizePanel (width, height, animate) {
        // resize WebView
        const webViewFrame = webUI.webView.frame()
        webUI.webView.setFrame(NSMakeRect(
          webViewFrame.origin.x,
          options.hideTitleBar ? -24 : 0,
          width,
          height - (options.hideTitleBar ? 0 : 24)
        ))

        // resize NSPanel
        const panelFrame = webUI.panel.frame()
        const newPanelY = panelFrame.origin.y + panelFrame.size.height - height
        webUI.panel.setFrame_display_animate(NSMakeRect(panelFrame.origin.x, newPanelY, width, height), true, animate)
      }
    },
    options.handlers
  )

  const webUI = createBridgedWebUI(context, options.page, options)

  // default panel behaviour
  // webUI.panel.hidesOnDeactivate = false
  // webUI.panel.setLevel(NSNormalWindowLevel)

  return webUI
}
