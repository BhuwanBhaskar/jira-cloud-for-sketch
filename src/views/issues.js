import '../defaultImports'
import jiraWebUI from '../jira-webui'
import {
  executeSafely,
  executeSafelyAsync,
  openInBrowser,
  normalizeFilepath
} from '../util'
import { isAuthorized, getBearerToken, getJiraHost } from '../auth'
import JIRA from '../jira'
import Connect from './connect'
import { OFFLINE_DEV } from '../config'
import { getDraggedFiles } from '../pasteboard'
import { trace } from '../logger'

export default async function (context) {
  executeSafelyAsync(context, async function () {
    if (!OFFLINE_DEV && !isAuthorized()) {
      return Connect(context)
    }

    const jiraHost = getJiraHost()
    const token = OFFLINE_DEV ? null : await getBearerToken()
    var jira = new JIRA(jiraHost, token)

    var ready = false
    var uploadRequests = []
    var nextFilterKey = null
    var currentFilterKey = null

    const webUI = jiraWebUI(context, {
      name: 'issues',
      background: MSImmutableColor.colorWithSVGString(
        '#e7e7e7'
      ).NSColorWithColorSpace(null),
      height: 325,
      width: 450,
      handlers: {
        onReady () {
          ready = true
        },
        openInBrowser (url) {
          executeSafely(context, function () {
            openInBrowser(url)
          })
        },
        uploadDroppedFiles (issueKey) {
          executeSafely(context, function () {
            // allowing a handler to run too long seems causes Sketch to crash
            // due to a failing Mocha context. Hence we add these to a queue!
            uploadRequests.push({
              issueKey: issueKey,
              files: getDraggedFiles()
            })
          })
        },
        filterSelected (filterKey) {
          nextFilterKey = filterKey
        }
      }
    })

    var checkOnReady = function () {
      if (ready) {
        nextFilterKey = 'recently-viewed'
        dispatchWindowEvent(webUI, 'jira.filters.updated', {
          filters: jira.jqlFilters,
          filterSelected: nextFilterKey
        })
        /* only run once */
        checkOnReady = function () {}
      }
    }

    var checkingActions = false

    function checkActions () {
      if (!checkingActions) {
        checkingActions = true
        executeSafelyAsync(context, async function () {
          checkOnReady()
          await checkNewFilter()
          await checkUploadRequests()
        })
        checkingActions = false
      }
    }

    setInterval(checkActions, 100)

    async function checkNewFilter () {
      if (nextFilterKey) {
        let loadingFilter = (currentFilterKey = nextFilterKey)
        nextFilterKey = null
        dispatchWindowEvent(webUI, 'jira.issues.loading', {
          filterKey: loadingFilter
        })

        return new Promise(async function (resolve, reject) {
          setTimeout(async function () {
            var issues = OFFLINE_DEV ? require('../mock-issues.json') : await jira.getFilteredIssues(loadingFilter)
            // if another filter has been selected in the meantime, ignore this result
            if (loadingFilter == currentFilterKey) {
              dispatchWindowEvent(webUI, 'jira.issues.loaded', {
                issues: issues.issues
              })
            }
            resolve()
          }, 5000)
        })
      }
    }

    async function checkUploadRequests () {
      if (uploadRequests.length > 0) {
        var uploadRequest = uploadRequests.pop()
        var issueKey = uploadRequest.issueKey
        var files = uploadRequest.files
        var noun = files.length == 1 ? 'attachment' : 'attachments'
        if (OFFLINE_DEV) {
          context.document.showMessage(
            `Can't upload ${files.length} ${noun} to ${issueKey} (offline)`
          )
        } else {
          dispatchWindowEvent(webUI, 'jira.upload.queued', {
            issueKey: issueKey,
            count: files.length
          })
          for (var i = 0; i < files.length; i++) {
            var filepath = files[i]
            filepath = normalizeFilepath(filepath)
            var resp = OFFLINE_DEV ? 'Upload skipped (offline)' : await jira.uploadAttachment(issueKey, filepath)
            trace(resp)
            dispatchWindowEvent(webUI, 'jira.upload.complete', {
              issueKey: issueKey,
              count: 1
            })
          }
        }
      }
    }
  })
}

function dispatchWindowEvent (webUI, eventName, eventDetail) {
  var eventJson = JSON.stringify({ detail: eventDetail })
  webUI.eval(
    `window.dispatchEvent(new CustomEvent('${eventName}', ${eventJson}))`
  )
}
